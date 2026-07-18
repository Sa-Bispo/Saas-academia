import { WhatsAppConnectionClient } from "@/components/whatsapp/whatsapp-connection-client";

export default function WhatsAppPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">WhatsApp</h1>
        <p className="text-gray-600">
          Vincule uma instância já criada na Evolution API e gerencie a conexão
        </p>
      </div>

      {/* QR Code Connection Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Conectar WhatsApp
        </h2>
        <WhatsAppConnectionClient />
      </div>

      {/* Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-2">Como funciona?</h3>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>Informe o nome da instância e clique em "Vincular Instância"</li>
            <li>Clique em "Gerar QR Code"</li>
            <li>Abra WhatsApp no seu celular</li>
            <li>Vá para Configurações → Dispositivos Conectados</li>
            <li>Clique em "Conectar Dispositivo"</li>
            <li>Escaneie o QR Code</li>
            <li>A conexão será estabelecida automaticamente</li>
          </ul>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg bg-blue-50">
          <h3 className="font-semibold text-gray-900 mb-2">
            O que preciso saber?
          </h3>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>Você precisa de uma conta WhatsApp ativa</li>
            <li>A instância deve existir previamente na Evolution API</li>
            <li>Cada tenant pode vincular sua própria instância</li>
            <li>Mantenha o app WhatsApp aberto e conectado</li>
            <li>Desvincular no painel não apaga a instância central</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
