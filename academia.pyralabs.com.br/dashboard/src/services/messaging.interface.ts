export interface IMessagingService {
  createInstance(instanceName: string, apiKeyOverride?: string | null): Promise<string>;
  getQrCode(instanceName: string, apiKeyOverride?: string | null): Promise<string>;
  getConnectionState(
    instanceName: string,
    apiKeyOverride?: string | null,
  ): Promise<"CONNECTED" | "DISCONNECTED" | "CONNECTING">;
  deleteInstance(instanceName: string): Promise<void>;
  sendTextMessage(
    instanceName: string,
    number: string,
    text: string,
    apiKeyOverride?: string | null,
  ): Promise<void>;
  sendImageMessage(
    instanceName: string,
    number: string,
    base64: string,
    caption: string,
    apiKeyOverride?: string | null,
  ): Promise<void>;
}
