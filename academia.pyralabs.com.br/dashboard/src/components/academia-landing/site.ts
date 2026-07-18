// Configuração central da landing. Ajuste o número/links aqui.
export const site = {
  name: "PyraLabs",
  product: "PyraLabs Academia",
  // Número no formato internacional, só dígitos (ex.: 55 + DDD + número)
  whatsapp: "5599999999999",
  whatsappMessage:
    "Olá! Quero saber como o PyraLabs pode automatizar a gestão da minha academia.",
  appUrl: "https://pyralabs.com.br",
  email: "contato@pyralabs.com.br",
};

export const whatsappLink = () =>
  `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
    site.whatsappMessage
  )}`;

export const nav = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Cobrança", href: "#cobranca" },
  { label: "Planos", href: "#planos" },
];
