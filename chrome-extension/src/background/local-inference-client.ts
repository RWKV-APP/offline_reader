import { TRANSLATION_CACHE_POLICY_VERSION } from './translation-cache';
import { getPortFromApiBaseUrl, normalizeApiBaseUrl } from '@extension/storage';
import type { EngineStatus, ExtensionEngineConfig } from '@extension/storage';

interface ServerStatusResponse {
  status?: string;
  port?: number;
  models?: unknown;
}

interface ChatCompletionsResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
}

interface TranslateInput {
  source: string;
  nodeName: string;
  url: string;
}

interface ChatCompletionInput {
  source: string;
  maxTokens: number;
  temperature: number;
  markAsWebTranslation?: boolean;
}

const engineProbeSampleText = 'Translate this sentence into Chinese: The local inference server is ready.';

const extractErrorMessage = async (response: Response) => {
  try {
    const data = (await response.json()) as { error?: { message?: string } };
    const message = data.error?.message;

    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  } catch {
    // ignore json parsing failures
  }

  return `HTTP ${response.status}`;
};

const extractChatContent = (response: ChatCompletionsResponse) => {
  const content = response.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map(item => (typeof item?.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }

  return '';
};

const sanitizeTranslation = (value: string) =>
  value
    .replace(/<think[\s\S]*?<\/think>/gi, '')
    .replace(/^["“”'`]+|["“”'`]+$/g, '')
    .trim();

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit | undefined, timeoutMs: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`请求超时 (${timeoutMs}ms)`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export class LocalInferenceClient {
  private buildUrl(config: ExtensionEngineConfig, path: string) {
    return `${normalizeApiBaseUrl(config.apiBaseUrl)}${path}`;
  }

  private async requestChatCompletion(config: ExtensionEngineConfig, input: ChatCompletionInput) {
    const response = await fetchWithTimeout(
      this.buildUrl(config, '/v1/chat/completions'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'rwkv',
          stream: false,
          max_tokens: input.maxTokens,
          temperature: input.temperature,
          ...(input.markAsWebTranslation
            ? {
                metadata: {
                  rwkvOfflineReader: {
                    kind: 'web_translation',
                    cachePolicyVersion: TRANSLATION_CACHE_POLICY_VERSION,
                  },
                },
              }
            : {}),
          messages: [
            {
              role: 'user',
              content: input.source,
            },
          ],
        }),
      },
      config.requestTimeoutMs,
    );

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const data = (await response.json()) as ChatCompletionsResponse;
    return sanitizeTranslation(extractChatContent(data));
  }

  async getEngineStatus(config: ExtensionEngineConfig): Promise<EngineStatus> {
    const normalizedBaseUrl = normalizeApiBaseUrl(config.apiBaseUrl);
    const statusTimeoutMs = Math.min(config.requestTimeoutMs, 5000);

    try {
      const response = await fetchWithTimeout(this.buildUrl(config, '/v1/server/status'), undefined, statusTimeoutMs);

      if (!response.ok) {
        throw new Error(await extractErrorMessage(response));
      }

      const data = (await response.json()) as ServerStatusResponse;
      const models = Array.isArray(data.models)
        ? data.models.filter((item): item is string => typeof item === 'string')
        : [];

      return {
        connected: data.status === 'running',
        models,
        port: typeof data.port === 'number' ? data.port : getPortFromApiBaseUrl(normalizedBaseUrl),
        lastError: null,
      };
    } catch (error) {
      return {
        connected: false,
        models: [],
        port: getPortFromApiBaseUrl(normalizedBaseUrl),
        lastError: error instanceof Error ? error.message : '无法连接到本地 API',
      };
    }
  }

  async translate(config: ExtensionEngineConfig, input: TranslateInput) {
    const maxTokens = Math.min(2048, Math.max(256, input.source.length * 3));
    const translation = await this.requestChatCompletion(config, {
      source: input.source,
      maxTokens,
      temperature: 0.2,
      markAsWebTranslation: true,
    });

    if (translation === '') {
      throw new Error(`空翻译响应 (${input.nodeName} @ ${input.url})`);
    }

    return translation;
  }

  async probeCompletion(config: ExtensionEngineConfig) {
    const output = await this.requestChatCompletion(config, {
      source: engineProbeSampleText,
      maxTokens: 128,
      temperature: 0,
    });

    if (output === '') {
      throw new Error('空试译响应');
    }

    return output;
  }
}
