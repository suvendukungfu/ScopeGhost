export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface OllamaHealth {
  ok: boolean;
  availableModels: string[];
  selectedModelAvailable: boolean;
  status: "AVAILABLE" | "MODEL_UNAVAILABLE" | "OFFLINE";
  error?: string;
}

export type OllamaErrorCategory =
  | "MODEL_UNAVAILABLE"
  | "TIMEOUT"
  | "CANCELLED"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE";

export class OllamaClientError extends Error {
  constructor(
    message: string,
    readonly category: OllamaErrorCategory
  ) {
    super(message);
    this.name = "OllamaClientError";
  }
}

const MODEL_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/;

function validateModelName(model: string): string {
  if (!MODEL_NAME_PATTERN.test(model)) {
    throw new Error(
      "Invalid OLLAMA_MODEL. Use 1-128 letters, numbers, periods, underscores, colons, slashes, or hyphens."
    );
  }
  return model;
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(config?: OllamaConfig) {
    this.baseUrl = (config?.baseUrl || process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(
      /\/$/,
      ""
    );
    this.model = validateModelName(config?.model || process.env.OLLAMA_MODEL || "gemma3:4b");
    this.timeoutMs = config?.timeoutMs || 60000;

    // Security check: By default, ensure baseUrl is loopback to prevent SSRF
    this.validateHostSafety(this.baseUrl);
  }

  private validateHostSafety(urlStr: string): void {
    try {
      const parsed = new URL(urlStr);
      const isLoopback =
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "[::1]";

      if (!isLoopback && process.env.ALLOW_REMOTE_OLLAMA !== "true") {
        throw new Error(
          `Security Warning: Ollama URL '${urlStr}' is not a local loopback address (127.0.0.1 or localhost). Set ALLOW_REMOTE_OLLAMA=true if intentional.`
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Security Warning")) throw e;
      throw new Error(`Invalid Ollama URL: ${urlStr}`);
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getModel(): string {
    return this.model;
  }

  /**
   * Pings the Ollama instance and returns available model tags
   */
  async checkHealth(): Promise<OllamaHealth> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!res.ok) {
        return {
          ok: false,
          availableModels: [],
          selectedModelAvailable: false,
          status: res.status === 404 ? "MODEL_UNAVAILABLE" : "OFFLINE",
          error: `Ollama responded with HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data: unknown = await res.json();
      if (
        data === null ||
        typeof data !== "object" ||
        !("models" in data) ||
        !Array.isArray(data.models) ||
        !data.models.every(
          (model): model is { name: string } =>
            model !== null &&
            typeof model === "object" &&
            "name" in model &&
            typeof model.name === "string"
        )
      ) {
        return {
          ok: false,
          availableModels: [],
          selectedModelAvailable: false,
          status: "OFFLINE",
          error: "Ollama returned an invalid model list",
        };
      }
      const models = data.models.map((model) => model.name);
      const selectedAvailable = models.some(
        (m) => m === this.model || m.startsWith(`${this.model}:`) || m.split(":")[0] === this.model.split(":")[0]
      );

      return {
        ok: true,
        availableModels: models,
        selectedModelAvailable: selectedAvailable,
        status: selectedAvailable ? "AVAILABLE" : "MODEL_UNAVAILABLE",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        availableModels: [],
        selectedModelAvailable: false,
        status: "OFFLINE",
        error: `Cannot connect to Ollama at ${this.baseUrl}: ${message}`,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Generates a completion from Ollama with strict JSON formatting
   */
  async generateCompletion(
    prompt: string,
    systemPrompt?: string,
    customTimeoutMs?: number,
    options: { signal?: AbortSignal; maxRetries?: number } = {}
  ): Promise<string> {
    const controller = new AbortController();
    const signal = options.signal
      ? AbortSignal.any([controller.signal, options.signal])
      : controller.signal;
    const timeout = setTimeout(
      () => controller.abort(),
      customTimeoutMs || this.timeoutMs
    );

    try {
      const payload = {
        model: this.model,
        prompt,
        system: systemPrompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.1, // low temperature for deterministic, factual extraction
        },
      };

      const maxRetries = Math.min(2, Math.max(0, options.maxRetries ?? 1));
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const res = await fetch(`${this.baseUrl}/api/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal,
          });

          if (!res.ok) {
            const category = res.status === 404 ? "MODEL_UNAVAILABLE" : "HTTP_ERROR";
            if (attempt < maxRetries && res.status >= 500) {
              continue;
            }
            throw new OllamaClientError(
              `Ollama generate failed (${res.status} ${res.statusText})`,
              category
            );
          }

          let json: unknown;
          try {
            json = await res.json();
          } catch {
            throw new OllamaClientError(
              "Ollama returned malformed JSON",
              "INVALID_RESPONSE"
            );
          }
          if (
            json === null ||
            typeof json !== "object" ||
            !("response" in json) ||
            typeof json.response !== "string" ||
            json.response.length === 0
          ) {
            throw new OllamaClientError(
              "Ollama returned an invalid or empty response body",
              "INVALID_RESPONSE"
            );
          }
          return json.response;
        } catch (err: unknown) {
          if (options.signal?.aborted) {
            throw new OllamaClientError("Analysis request was cancelled", "CANCELLED");
          }
          if (controller.signal.aborted) {
            throw new OllamaClientError("Ollama request timed out", "TIMEOUT");
          }
          if (err instanceof OllamaClientError) {
            throw err;
          }
          if (attempt < maxRetries) continue;
          const message = err instanceof Error ? err.message : String(err);
          throw new OllamaClientError(
            `Cannot connect to Ollama at ${this.baseUrl}: ${message}`,
            "MODEL_UNAVAILABLE"
          );
        }
      }
      throw new OllamaClientError("Ollama request failed after retries", "HTTP_ERROR");
    } finally {
      clearTimeout(timeout);
    }
  }
}
