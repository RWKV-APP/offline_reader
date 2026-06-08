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

interface ChatCompletionsStreamResponse {
  choices?: Array<{
    delta?: {
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

interface ChatCompletionStreamInput extends ChatCompletionInput {
  signal?: AbortSignal;
  onDelta: (delta: string, accumulated: string) => void;
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

const extractStreamDelta = (response: ChatCompletionsStreamResponse) => {
  const content = response.choices?.[0]?.delta?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map(item => (typeof item?.text === 'string' ? item.text : '')).join('');
  }

  return '';
};

const sanitizeTranslation = (value: string) =>
  value
    .replace(/<think[\s\S]*?<\/think>/gi, '')
    .replace(/^["“”'`]+|["“”'`]+$/g, '')
    .trim();

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
  signal?: AbortSignal,
) => {
  const controller = new AbortController();
  const abortFromSignal = () => {
    controller.abort();
  };
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  signal?.addEventListener('abort', abortFromSignal, { once: true });

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      if (signal?.aborted) {
        throw new Error('请求已取消');
      }
      throw new Error(`请求超时 (${timeoutMs}ms)`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abortFromSignal);
  }
};

export class LocalInferenceClient {
  private buildUrl(config: ExtensionEngineConfig, path: string) {
    return `${normalizeApiBaseUrl(config.apiBaseUrl)}${path}`;
  }

  private buildChatCompletionBody(input: ChatCompletionInput, stream: boolean) {
    return {
      model: 'rwkv',
      stream,
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
    };
  }

  private async requestChatCompletion(config: ExtensionEngineConfig, input: ChatCompletionInput) {
    const response = await fetchWithTimeout(
      this.buildUrl(config, '/v1/chat/completions'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.buildChatCompletionBody(input, false)),
      },
      config.requestTimeoutMs,
    );

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    const data = (await response.json()) as ChatCompletionsResponse;
    return sanitizeTranslation(extractChatContent(data));
  }

  private async requestChatCompletionStream(config: ExtensionEngineConfig, input: ChatCompletionStreamInput) {
    const response = await fetchWithTimeout(
      this.buildUrl(config, '/v1/chat/completions'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.buildChatCompletionBody(input, true)),
      },
      config.requestTimeoutMs,
      input.signal,
    );

    if (!response.ok) {
      throw new Error(await extractErrorMessage(response));
    }

    if (response.body === null) {
      throw new Error('空流式响应');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let lineBuffer = '';
    let accumulated = '';

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        return;
      }

      const payload = trimmed.slice(5).trim();
      if (payload === '' || payload === '[DONE]') {
        return;
      }

      let data: ChatCompletionsStreamResponse;
      try {
        data = JSON.parse(payload) as ChatCompletionsStreamResponse;
      } catch {
        throw new Error('流式响应解析失败');
      }

      const delta = extractStreamDelta(data);
      if (delta === '') {
        return;
      }

      accumulated += delta;
      input.onDelta(delta, accumulated);
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split(/\r?\n/);
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        handleLine(line);
      }
    }

    lineBuffer += decoder.decode();
    if (lineBuffer.trim() !== '') {
      handleLine(lineBuffer);
    }

    return sanitizeTranslation(accumulated);
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

  async translateStream(
    config: ExtensionEngineConfig,
    input: TranslateInput,
    options: {
      signal?: AbortSignal;
      onDelta: (delta: string, accumulated: string) => void;
    },
  ) {
    const maxTokens = Math.min(2048, Math.max(256, input.source.length * 3));
    const translation = await this.requestChatCompletionStream(config, {
      source: input.source,
      maxTokens,
      temperature: 0.2,
      markAsWebTranslation: true,
      signal: options.signal,
      onDelta: options.onDelta,
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
