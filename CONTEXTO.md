# Contexto do Projeto — academia-saas

## O que é este projeto

SaaS de gestão para academias de ginástica, entregue via dashboard web + bot de WhatsApp com IA.

O produto foi extraído de um SaaS multi-nicho maior (que atendia adega, lanchonete, pizzaria, clínica, empresa) e transformado em um produto independente, focado 100% no nicho academia.

---

## Problema que resolve

Donos de academia têm dificuldade em:
- Controlar alunos, matrículas, planos e inadimplência.
- Realizar cobranças de forma recorrente e acompanhar pagamentos.
- Responder dúvidas de clientes no WhatsApp sem precisar de atendente humano.

Este produto resolve os três pontos: dashboard para gestão + bot de IA no WhatsApp para atendimento automatizado.

---

## Subprojetos

### `academia-saas-dashboard`

Dashboard web construído em Next.js 16 (App Router) com TypeScript, Prisma (PostgreSQL via Supabase) e TailwindCSS v4.

**Funcionalidades implementadas:**
- Cadastro e listagem de alunos com status (ATIVO, INADIMPLENTE, INATIVO, SUSPENSO).
- Gestão de matrículas e planos da academia.
- Controle de cobranças com tracking de pendentes/vencidos.
- Controle de frequência.
- Configuração do bot de WhatsApp (persona, regras, instância Evolution API).
- Onboarding guiado para novos tenants.
- Painel administrativo interno.
- Integração com MercadoPago para pagamentos.
- Arquitetura multi-tenant: cada academia é um `Tenant` isolado.

### `academia-saas-bot`

Bot de WhatsApp construído em Python com FastAPI, que usa Google Gemini (gemini-2.5-flash) como modelo principal de IA e LangChain para RAG.

**Funcionalidades implementadas:**
- Recebimento de mensagens via webhook da Evolution API.
- Roteamento de intenção (saudação, horário, fora do horário, flow academia, flow IA).
- Flow específico de academia: verificação de matrícula, cobranças pendentes, geração de PIX, recebimento de comprovantes.
- Buffer de mensagens com debounce (agrega mensagens antes de processar).
- Memória de sessão por usuário no Redis.
- RAG com ChromaDB para responder perguntas com base em documentos da academia.
- Worker assíncrono de cobranças.

---

## Estado atual de desenvolvimento

### Concluído
- Poda completa dos nichos CLINICA e EMPRESA do dashboard.
- Poda do bot para atender apenas o flow de academia.
- Correção de bug no `setup-wizard.tsx` (rota removida ainda referenciada).
- Correção de dois arquivos corrompidos por byte nulo (`(dashboard)/layout.tsx` e `dashboard/page.tsx`).
- Estruturação do workspace em `academia-saas/` separado dos projetos originais.

### Pendências conhecidas

1. **Limpar ramos mortos no `setup-wizard.tsx`**: modos `agendamentos`/`empresa` e perfis de delivery (adega, lanchonete, pizzaria) nunca serão executados neste fork — código morto.

2. **Podar o `prisma/schema.prisma`**: modelos `StockItem`, `Order`, `Motoboy`, `Combo`, `Appointment` e outros de nichos não-academia ainda estão no schema. Precisam ser removidos junto com uma migration.

3. **Gap na `subscription-modal.tsx`**: as listas `PLACEHOLDER_BY_NICHO`/`NICHO_OPTIONS` não incluem "academia". Mesmo gap existe em `/test-drive`.

4. **Rodar `npx prisma generate` localmente**: a geração do client Prisma não foi executada após o último ajuste no schema. Necessário rodar no terminal local.

5. **Decisão sobre bug de import no bot original**: o `academia-saas-bot` tem uma correção de import de `datetime` que o `whatsapp_ai_bot` original ainda não tem. Decidir se aplica ou não no original.

---

## Repositório oficial

O repositório oficial do projeto é **https://github.com/Sa-Bispo/Saas-academia**, criado em 18/06/2026 com histórico de commits limpo — sem herdar o histórico de versões anteriores do projeto multi-nicho.

---

## Regra crítica

Os projetos abaixo são originais de produção e **nunca devem ser tocados**:

- `C:\Users\samue\projeto-wpp-samuel\wpp-bot-samuel\`
- `C:\Users\samue\projeto-wpp-samuel\whatsapp_ai_bot\`

Todo trabalho novo acontece apenas dentro de `academia-saas-dashboard` e `academia-saas-bot`.
