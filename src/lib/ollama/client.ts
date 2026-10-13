export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface OllamaHealth {
  ok: boolean;
  availableModels: string[];
  selectedModelAvailable: boolean;
  error?: string;
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
    this.model = config?.model || process.env.OLLAMA_MODEL || "gemma3:4b";
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
          error: `Ollama responded with HTTP ${res.status}: ${res.statusText}`,
        };
      }

      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const models = (data.models || []).map((m) => m.name);
      const selectedAvailable = models.some(
        (m) => m === this.model || m.startsWith(`${this.model}:`) || m.split(":")[0] === this.model.split(":")[0]
      );

      return {
        ok: true,
        availableModels: models,
        selectedModelAvailable: selectedAvailable,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        availableModels: [],
        selectedModelAvailable: false,
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
    customTimeoutMs?: number
  ): Promise<string> {
    const controller = new AbortController();
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

      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(
          `Ollama generate failed (${res.status} ${res.statusText}): ${errorText}`
        );
      }

      const json = (await res.json()) as { response?: string };
      if (!json.response) {
        throw new Error("Ollama returned an empty response body");
      }

      return json.response;
    } finally {
      clearTimeout(timeout);
    }
  }
}
