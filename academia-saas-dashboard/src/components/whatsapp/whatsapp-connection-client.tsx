"use client";

import { useState, useEffect, useCallback } from "react";
import {
  linkWhatsAppInstance,
  connectWhatsApp,
  checkWhatsAppStatus,
  disconnectWhatsApp,
  type LinkInstanceInput,
  type WhatsAppConnectionResponse,
  type WhatsAppStatusResponse,
} from "@/actions/whatsapp.actions";

export function WhatsAppConnectionClient() {
  const [status, setStatus] = useState<
    "CONNECTED" | "DISCONNECTED" | "CONNECTING"
  >("DISCONNECTED");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [instanceInput, setInstanceInput] = useState("");
  const [instanceKeyInput, setInstanceKeyInput] = useState("");

  // Busca o QR Code
  const handleGenerateQR = useCallback(async () => {
    setLoading(true);
    setError(null);
    setQrCode(null);

    try {
      const response: WhatsAppConnectionResponse = await connectWhatsApp();

      if (response.success && response.qrCode) {
        setQrCode(response.qrCode);
        setStatus("CONNECTING");
      } else {
        setError(response.error || "Erro ao gerar QR Code");
      }
    } catch (err) {
      setError(
        `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Função para atualizar status
  const handleCheckStatus = useCallback(async () => {
    try {
      const response: WhatsAppStatusResponse = await checkWhatsAppStatus();

      if (response.error) {
        setError(response.error);
      }

      setStatus(response.status);
      setInstanceName(response.instanceName);

      if (response.status === "CONNECTED") {
        setQrCode(null); // Limpa QR Code quando conectado
      }

      return response.status;
    } catch (err) {
      console.error("Erro ao verificar status:", err);
      return null;
    }
  }, []);

  const handleLinkInstance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: LinkInstanceInput = {
        instanceName: instanceInput,
        evolutionApiKey: instanceKeyInput || undefined,
      };

      const response = await linkWhatsAppInstance(payload);
      if (!response.success) {
        setError(response.error || "Erro ao vincular instância");
        return;
      }

      setInstanceName(instanceInput.trim());
      await handleCheckStatus();
    } catch (err) {
      setError(
        `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      );
    } finally {
      setLoading(false);
    }
  }, [instanceInput, instanceKeyInput, handleCheckStatus]);

  // Função para desconectar
  const handleDisconnect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await disconnectWhatsApp();

      if (response.success) {
        setStatus("DISCONNECTED");
        setQrCode(null);
        setInstanceName(null);
      } else {
        setError(response.error || "Erro ao desconectar");
      }
    } catch (err) {
      setError(
        `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Verifica status automaticamente quando há QR Code
  useEffect(() => {
    if (status === "CONNECTING" && qrCode) {
      setPollCount(0);
      const interval = setInterval(async () => {
        setPollCount((c) => c + 1);
        const newStatus = await handleCheckStatus();
        if (newStatus === "CONNECTED") {
          clearInterval(interval);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [status, qrCode, handleCheckStatus]);

  useEffect(() => {
    handleCheckStatus();
  }, [handleCheckStatus]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Conexão WhatsApp
          </h2>
          <p className="text-gray-600">
            Conecte sua conta WhatsApp para receber e enviar mensagens
          </p>
        </div>

        {/* Status Display */}
        <div className="mb-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <div
              className={`w-3 h-3 rounded-full ${
                status === "CONNECTED"
                  ? "bg-green-500"
                  : status === "CONNECTING"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
              }`}
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Status:</p>
              <p
                className={`text-lg font-bold ${
                  status === "CONNECTED"
                    ? "text-green-600"
                    : status === "CONNECTING"
                      ? "text-yellow-600"
                      : "text-red-600"
                }`}
              >
                {status === "CONNECTED"
                  ? "Conectado"
                  : status === "CONNECTING"
                    ? "Aguardando QR Code"
                    : "Desconectado"}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700" htmlFor="instanceName">
            Nome da instância (Evolution)
          </label>
          <input
            id="instanceName"
            type="text"
            value={instanceInput}
            onChange={(e) => setInstanceInput(e.target.value)}
            placeholder="ex: tenant-acme-01"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
          <label className="block text-sm font-medium text-gray-700" htmlFor="instanceKey">
            API key da instância (opcional)
          </label>
          <input
            id="instanceKey"
            type="password"
            value={instanceKeyInput}
            onChange={(e) => setInstanceKeyInput(e.target.value)}
            placeholder="Se vazio, usa EVOLUTION_GLOBAL_KEY"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleLinkInstance}
            disabled={loading || instanceInput.trim().length === 0}
            className="w-full bg-slate-700 hover:bg-slate-800 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? "Salvando..." : "Vincular Instância"}
          </button>
        </div>

        {/* Instance Name Display */}
        {instanceName && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-gray-600">Instância:</p>
            <p className="text-sm font-mono text-blue-900 break-all">
              {instanceName}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Erro:</strong> {error}
            </p>
          </div>
        )}

        {/* Conectado */}
        {status === "CONNECTED" && (
          <div className="mb-6 flex flex-col items-center gap-3 p-6 bg-green-50 border border-green-300 rounded-lg">
            <div className="text-5xl">✅</div>
            <p className="text-lg font-bold text-green-700">WhatsApp Conectado!</p>
            <p className="text-sm text-green-600 text-center">
              Sua instância está ativa e pronta para receber mensagens.
            </p>
          </div>
        )}

        {/* QR Code Display */}
        {qrCode && status === "CONNECTING" && (
          <div className="mb-6 flex flex-col items-center">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Escaneie o QR Code com seu WhatsApp:
            </p>
            <div className="bg-white border-4 border-gray-200 rounded-lg p-4">
              <img
                src={qrCode}
                alt="QR Code WhatsApp"
                className="w-64 h-64 object-contain"
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center animate-pulse">
              Verificando conexão... ({pollCount} verificações)
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === "DISCONNECTED" ? (
            <button
              onClick={handleGenerateQR}
              disabled={loading || !instanceName}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? "Gerando..." : "Gerar QR Code"}
            </button>
          ) : (
            <>
              <button
                onClick={handleCheckStatus}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? "Verificando..." : "Verificar Status"}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {loading ? "Desvinculando..." : "Desvincular Instância"}
              </button>
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900 leading-relaxed">
            <strong>Dica:</strong> Mantenha esta página aberta enquanto escaneia
            o QR Code. A conexão será estabelecida automaticamente após o
            escaneamento.
          </p>
        </div>
      </div>
    </div>
  );
}
