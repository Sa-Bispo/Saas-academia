# Estratégia de Landing Pages — PyraLabs

## Lógica de organização

Separamos os domínios por **produto**, não por nicho. Cada produto resolve um problema diferente e pode ter precificação, bot e painel próprios.

Dentro de cada produto, **subpastas** segmentam o nicho com copy personalizada — mas o sistema por trás é o mesmo.

```
pyralabs.com.br                        → marca principal (visão geral, portfólio de produtos)
│
├── academia.pyralabs.com.br           → produto Academia
│   └── (index único — nicho já é específico)
│
└── delivery.pyralabs.com.br           → produto Delivery (futuro)
    ├── /pizzaria
    ├── /restaurante
    └── /lanchonete
```

## Por que subdomínio separa produto, e subpasta separa nicho?

- Subdomínio = produto diferente (bot diferente, painel diferente, precificação diferente)
- Subpasta = mesmo produto, copy adaptada pro nicho (mesmo sistema, mesma venda)
- SEO de cada produto fica concentrado no próprio subdomínio
- Fácil de escalar: novo produto = novo subdomínio; novo nicho dentro de um produto = nova subpasta

## Status atual

| Domínio                        | Status       | Prioridade |
|-------------------------------|--------------|------------|
| pyralabs.com.br               | placeholder  | baixa      |
| academia.pyralabs.com.br      | em construção | **FOCO**   |
| delivery.pyralabs.com.br      | placeholder  | futura     |

## Foco agora: academia.pyralabs.com.br

Produto validado com cliente real. O objetivo da landing é escalar aquisição.

**O que precisa comunicar:**
1. Bot de WhatsApp que responde 24h (atendimento automático)
2. Cobrança automática via Pix (disparo de mensagens para inadimplentes)
3. Painel único para matrícula, frequência e financeiro
4. Prova social / cases reais

**Stack escolhida:** a definir (Next.js ou HTML/CSS estático)

## Regra de deploy

Cada subdomínio é configurado no Nginx da VPS e aponta para o container ou pasta correspondente.
Novos subdomínios precisam de:
1. Registro DNS no painel do domínio (registro.br)
2. Bloco `server {}` no nginx/pyralabs.conf
3. Certificado SSL (`certbot --nginx -d subdominio.pyralabs.com.br`)
