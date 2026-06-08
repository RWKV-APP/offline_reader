import { normalizeApiBaseUrl } from '@extension/storage';
import type { TranslationCacheStats } from '@extension/shared';
import type { EngineStatus, ExtensionEngineConfig } from '@extension/storage';

export const TRANSLATION_CACHE_POLICY_VERSION = 'offline-reader-translation-v1';

const cacheDbName = 'rwkv-offline-reader-translation-cache';
const cacheStoreName = 'translations';
const cacheDbVersion = 1;
const cacheTtlMs = 30 * 24 * 60 * 60 * 1000;
const cacheTtlDays = 30;
const maxEntries = 20000;
const maxBytes = 200 * 1024 * 1024;
const pruneIntervalMs = 60 * 1000;

interface TranslationCacheRecord {
  key: string;
  source: string;
  translation: string;
  modelFingerprint: string;
  policyVersion: string;
  createdAt: number;
  lastAccessedAt: number;
  byteSize: number;
}

export interface TranslationCacheWriteInput {
  key: string;
  source: string;
  translation: string;
  modelFingerprint: string;
}

export interface TranslationCacheHit {
  translation: string;
  level: 'memory' | 'disk';
}

const textEncoder = new TextEncoder();

const byteLength = (value: string) => textEncoder.encode(value).length;

const estimateRecordBytes = (record: Omit<TranslationCacheRecord, 'byteSize'>) =>
  byteLength(
    JSON.stringify({
      key: record.key,
      source: record.source,
      translation: record.translation,
      modelFingerprint: record.modelFingerprint,
      policyVersion: record.policyVersion,
      createdAt: record.createdAt,
      lastAccessedAt: record.lastAccessedAt,
    }),
  );

const isExpired = (record: TranslationCacheRecord, now = Date.now()) => now - record.createdAt >= cacheTtlMs;

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');

const hashText = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value));
  return toHex(digest);
};

export const getTranslationCacheModelFingerprint = (engineConfig: ExtensionEngineConfig, engineStatus: EngineStatus) =>
  JSON.stringify({
    apiBaseUrl: normalizeApiBaseUrl(engineConfig.apiBaseUrl),
    models: engineStatus.models,
  });

export const createTranslationCacheKey = async ({
  source,
  modelFingerprint,
}: {
  source: string;
  modelFingerprint: string;
}) =>
  hashText(
    JSON.stringify({
      source,
      modelFingerprint,
      policyVersion: TRANSLATION_CACHE_POLICY_VERSION,
    }),
  );

export class TranslationCacheStore {
  private memory = new Map<string, TranslationCacheRecord>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private lastPruneAt = 0;
  private sessionMemoryHits = 0;
  private sessionDiskHits = 0;
  private sessionMisses = 0;
  private lastHitLevel: TranslationCacheStats['lastHitLevel'] = null;
  private lastUpdatedAt: string | null = null;

  private async openDb() {
    if (!('indexedDB' in globalThis)) {
      return null;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise(resolve => {
      const request = indexedDB.open(cacheDbName, cacheDbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(cacheStoreName)) {
          const store = db.createObjectStore(cacheStoreName, { keyPath: 'key' });
          store.createIndex('lastAccessedAt', 'lastAccessedAt');
          store.createIndex('createdAt', 'createdAt');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('translation cache indexedDB open failed', request.error);
        resolve(null);
      };
      request.onblocked = () => resolve(null);
    });

    return this.dbPromise;
  }

  private async withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
    const db = await this.openDb();
    if (!db) return null;

    return new Promise<T | null>(resolve => {
      const transaction = db.transaction(cacheStoreName, mode);
      const store = transaction.objectStore(cacheStoreName);
      const request = work(store);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('translation cache indexedDB request failed', request.error);
        resolve(null);
      };
    });
  }

  private async getDiskRecord(key: string) {
    return this.withStore<TranslationCacheRecord | undefined>('readonly', store => store.get(key));
  }

  private async putDiskRecord(record: TranslationCacheRecord) {
    await this.withStore<IDBValidKey>('readwrite', store => store.put(record));
  }

  private async deleteDiskRecord(key: string) {
    await this.withStore<undefined>('readwrite', store => store.delete(key));
  }

  private async getAllDiskRecords() {
    return (await this.withStore<TranslationCacheRecord[]>('readonly', store => store.getAll())) ?? [];
  }

  private touch(record: TranslationCacheRecord, now = Date.now()) {
    const next = { ...record, lastAccessedAt: now };
    this.memory.set(record.key, next);
    void this.putDiskRecord(next);
    return next;
  }

  private rememberMiss() {
    this.sessionMisses++;
    this.lastHitLevel = null;
    this.lastUpdatedAt = new Date().toISOString();
  }

  async get(key: string): Promise<TranslationCacheHit | null> {
    const now = Date.now();
    const memoryRecord = this.memory.get(key);

    if (memoryRecord) {
      if (isExpired(memoryRecord, now)) {
        this.memory.delete(key);
        void this.deleteDiskRecord(key);
      } else {
        this.touch(memoryRecord, now);
        this.sessionMemoryHits++;
        this.lastHitLevel = 'memory';
        this.lastUpdatedAt = new Date().toISOString();
        return {
          translation: memoryRecord.translation,
          level: 'memory',
        };
      }
    }

    const diskRecord = await this.getDiskRecord(key);
    if (!diskRecord) {
      this.rememberMiss();
      return null;
    }

    if (isExpired(diskRecord, now)) {
      this.memory.delete(key);
      await this.deleteDiskRecord(key);
      this.rememberMiss();
      return null;
    }

    const touched = this.touch(diskRecord, now);
    this.sessionDiskHits++;
    this.lastHitLevel = 'disk';
    this.lastUpdatedAt = new Date().toISOString();
    return {
      translation: touched.translation,
      level: 'disk',
    };
  }

  async set(input: TranslationCacheWriteInput) {
    const now = Date.now();
    const recordWithoutSize = {
      key: input.key,
      source: input.source,
      translation: input.translation,
      modelFingerprint: input.modelFingerprint,
      policyVersion: TRANSLATION_CACHE_POLICY_VERSION,
      createdAt: now,
      lastAccessedAt: now,
    };
    const record: TranslationCacheRecord = {
      ...recordWithoutSize,
      byteSize: estimateRecordBytes(recordWithoutSize),
    };

    this.memory.set(record.key, record);
    await this.putDiskRecord(record);
    this.lastUpdatedAt = new Date().toISOString();
    await this.pruneIfNeeded();
  }

  async clear(scope: 'memory' | 'disk' | 'all') {
    if (scope === 'memory' || scope === 'all') {
      this.memory.clear();
    }

    if (scope === 'disk' || scope === 'all') {
      await this.withStore<undefined>('readwrite', store => store.clear());
    }

    this.lastUpdatedAt = new Date().toISOString();
  }

  private async pruneIfNeeded() {
    const now = Date.now();
    if (now - this.lastPruneAt < pruneIntervalMs) {
      return;
    }

    this.lastPruneAt = now;
    await this.prune();
  }

  async prune() {
    const now = Date.now();
    const records = await this.getAllDiskRecords();
    const activeRecords: TranslationCacheRecord[] = [];
    const keysToDelete = new Set<string>();

    for (const record of records) {
      if (isExpired(record, now)) {
        keysToDelete.add(record.key);
      } else {
        activeRecords.push(record);
      }
    }

    let totalBytes = activeRecords.reduce((sum, record) => sum + (record.byteSize || 0), 0);
    let totalEntries = activeRecords.length;

    if (totalEntries > maxEntries || totalBytes > maxBytes) {
      const byOldestAccess = [...activeRecords].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

      for (const record of byOldestAccess) {
        if (totalEntries <= maxEntries && totalBytes <= maxBytes) break;
        keysToDelete.add(record.key);
        totalEntries--;
        totalBytes -= record.byteSize || 0;
      }
    }

    if (keysToDelete.size === 0) {
      return;
    }

    for (const key of keysToDelete) {
      this.memory.delete(key);
      await this.deleteDiskRecord(key);
    }

    this.lastUpdatedAt = new Date().toISOString();
  }

  async getStats(): Promise<TranslationCacheStats> {
    await this.prune();
    const diskRecords = await this.getAllDiskRecords();
    const memoryRecords = [...this.memory.values()].filter(record => !isExpired(record));

    return {
      ttlDays: cacheTtlDays,
      maxEntries,
      maxBytes,
      memoryEntries: memoryRecords.length,
      memoryBytes: memoryRecords.reduce((sum, record) => sum + (record.byteSize || 0), 0),
      diskEntries: diskRecords.length,
      diskBytes: diskRecords.reduce((sum, record) => sum + (record.byteSize || 0), 0),
      sessionMemoryHits: this.sessionMemoryHits,
      sessionDiskHits: this.sessionDiskHits,
      sessionMisses: this.sessionMisses,
      lastHitLevel: this.lastHitLevel,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }
}
