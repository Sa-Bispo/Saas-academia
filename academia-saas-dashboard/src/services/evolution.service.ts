export class EvolutionAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "EvolutionAPIError";
  }
}

interface EvolutionCreateInstanceResponse {
  instance: {
    instanceName: string;
    instanceId: string;
  };
  hash?: string;
}

interface EvolutionQrCodeResponse {
  qrcode?: {
    code?: string;
    base64?: string;
    count?: number;
  };
  code?: string;
  base64?: string;
}

interface EvolutionConnectionStateResponse {
  instance: {
    instanceName: string;
    // A Evolution API retorna o campo como "state", não "status"
    state?: "open" | "close" | "connecting";
    status?: "open" | "close" | "connecting";
  };
}

interface EvolutionSendTextResponse {
  key?: {
    id?: string;
  };
}

export class EvolutionService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl =
      baseUrl || process.env.EVOLUTION_API_URL || "http://localhost:8080";
    this.apiKey =
      apiKey || process.env.EVOLUTION_GLOBAL_KEY || "seu_global_key";
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    endpoint: string,
    body?: unknown,
    apiKeyOverride?: string | null,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      apikey: apiKeyOverride || this.apiKey,
    };

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detailMessage =
          (errorData as { response?: { message?: string } })?.response
            ?.message ??
          (errorData as { message?: string })?.message;

        throw new EvolutionAPIError(
          response.status,
          detailMessage
            ? `Evolution API Error: ${detailMessage}`
            : `Evolution API Error: ${response.statusText}`,
          errorData,
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof EvolutionAPIError) throw error;

      throw new EvolutionAPIError(
        500,
        `Failed to communicate with Evolution API: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Cria uma nova instância WhatsApp na Evolution API.
   * Configura o webhook para o bot automaticamente via BOT_WEBHOOK_URL.
   */
  async createInstance(instanceName: string, apiKeyOverride?: string | null): Promise<string> {
    const webhookUrl = process.env.BOT_WEBHOOK_URL;

    const body: Record<string, unknown> = {
      instanceName,
      integration: "WHATSAPP-BAILEYS",
    };

    if (webhookUrl) {
      body.webhook = {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ["MESSAGES_UPSERT"],
      };
    }

    try {
      const response = await this.request<EvolutionCreateInstanceResponse>(
        "POST",
        "/instance/create",
        body,
        apiKeyOverride,
      );

      return response.instance.instanceName;
    } catch (error) {
      console.error("Error creating Evolution instance:", error);
      throw error;
    }
  }

  /**
   * Obtém o QR Code para conectar a instância
   */
  async getQrCode(instanceName: string, apiKeyOverride?: string | null): Promise<string> {
    try {
      const response = await this.request<EvolutionQrCodeResponse>(
        "GET",
        `/instance/connect/${instanceName}`,
        undefined,
        apiKeyOverride,
      );
      const qrPayload =
        response.base64 ??
        response.qrcode?.base64 ??
        response.code ??
        response.qrcode?.code;

      if (!qrPayload) {
        throw new EvolutionAPIError(
          500,
          "Evolution API Error: resposta de QR Code sem campo base64",
          response,
        );
      }

      if (qrPayload.startsWith("data:image")) {
        return qrPayload;
      }

      return `data:image/png;base64,${qrPayload}`;
    } catch (error) {
      console.error("Error getting QR code from Evolution:", error);
      throw error;
    }
  }

  /**
   * Verifica o estado de conexão da instância
   */
  async getConnectionState(
    instanceName: string,
    apiKeyOverride?: string | null,
  ): Promise<"CONNECTED" | "DISCONNECTED" | "CONNECTING"> {
    try {
      const response = await this.request<EvolutionConnectionStateResponse>(
        "GET",
        `/instance/connectionState/${instanceName}`,
        undefined,
        apiKeyOverride,
      );

      // Evolution v2 usa "state", versões anteriores usavam "status"
      const raw = response.instance.state ?? response.instance.status;

      if (raw === "open") return "CONNECTED";
      if (raw === "connecting") return "CONNECTING";
      return "DISCONNECTED";
    } catch (error) {
      console.error("Error checking Evolution connection state:", error);
      // Em caso de erro, assumimos desconectado
      return "DISCONNECTED";
    }
  }

  /**
   * Deleta uma instância
   */
  async deleteInstance(instanceName: string): Promise<void> {
    try {
      await this.request("DELETE", `/instance/delete/${instanceName}`);
    } catch (error) {
      console.error("Error deleting Evolution instance:", error);
      throw error;
    }
  }

  /**
   * Envia uma mensagem de texto para um número via instância da Evolution.
   */
  private _normalizePhone(phone: string): string {
    const digits = (phone || "").replace(/\D/g, "");
    return digits.startsWith("55") ? digits : "55" + digits;
  }

  async sendImageMessage(
    instanceName: string,
    number: string,
    base64: string,
    caption: string,
    apiKeyOverride?: string | null,
  ): Promise<void> {
    const normalizedInstance = (instanceName || "").trim();
    const normalizedNumber = this._normalizePhone(number);

    if (!normalizedInstance || !normalizedNumber) {
      throw new EvolutionAPIError(400, "sendImageMessage requer instanceName e number válidos.");
    }

    await this.request(
      "POST",
      `/message/sendMedia/${normalizedInstance}`,
      {
        number: normalizedNumber,
        mediatype: "image",
        mimetype: "image/png",
        caption: caption.trim(),
        media: base64,
        fileName: "recibo.png",
      },
      apiKeyOverride,
    );
  }

  async sendTextMessage(
    instanceName: string,
    number: string,
    text: string,
    apiKeyOverride?: string | null,
  ): Promise<void> {
    const normalizedInstance = (instanceName || "").trim();
    const normalizedNumber = this._normalizePhone(number);
    const normalizedText = (text || "").trim();

    if (!normalizedInstance || !normalizedNumber || !normalizedText) {
      throw new EvolutionAPIError(
        400,
        "sendTextMessage requer instanceName, number e text válidos.",
      );
    }

    await this.request<EvolutionSendTextResponse>(
      "POST",
      `/message/sendText/${normalizedInstance}`,
      {
        number: normalizedNumber,
        text: normalizedText,
      },
      apiKeyOverride,
    );
  }
}

export const evolutionService = new EvolutionService();
