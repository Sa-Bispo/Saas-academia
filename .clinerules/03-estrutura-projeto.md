# Estrutura do Projeto

```
academia-saas/                        ← raiz do workspace VS Code
├── .clinerules/                      ← regras para o agente Cline (este diretório)
├── CONTEXTO.md                       ← resumo do projeto para novas sessões
├── CONTEXTO-PARA-COPILOT.md          ← contexto legado (histórico, não editar)
│
├── academia-saas-dashboard/          ← SUBPROJETO 1: dashboard web (Next.js)
│   ├── src/
│   │   ├── app/                      ← rotas Next.js App Router
│   │   │   ├── (auth)/               ← rotas públicas de autenticação (login, cadastro)
│   │   │   ├── (dashboard)/          ← rotas protegidas do dashboard
│   │   │   │   ├── alunos/           ← gestão de alunos
│   │   │   │   ├── academia/         ← configurações da academia
│   │   │   │   ├── bot/              ← configuração do bot WhatsApp
│   │   │   │   ├── cobrancas/        ← cobranças e financeiro
│   │   │   │   ├── frequencia/       ← controle de frequência
│   │   │   │   ├── historico/        ← histórico de eventos
│   │   │   │   ├── planos-academia/  ← planos oferecidos pela academia
│   │   │   │   ├── plano-e-uso/      ← plano SaaS e consumo do tenant
│   │   │   │   ├── configuracoes/    ← configurações gerais do tenant
│   │   │   │   ├── whatsapp/         ← gerenciamento da instância WhatsApp
│   │   │   │   └── suporte/          ← chamados de suporte
│   │   │   ├── (marketing)/          ← páginas públicas (landing, pricing)
│   │   │   ├── (onboarding)/         ← fluxo de onboarding pós-cadastro
│   │   │   ├── admin/                ← painel administrativo interno
│   │   │   └── api/                  ← rotas de API (webhooks, endpoints)
│   │   │
│   │   ├── actions/                  ← Server Actions ("use server") por domínio
│   │   ├── components/               ← componentes React
│   │   │   ├── ui/                   ← componentes genéricos reutilizáveis
│   │   │   ├── academia/             ← componentes do módulo academia
│   │   │   ├── alunos/               ← componentes do módulo alunos
│   │   │   ├── dashboard/            ← componentes do dashboard principal
│   │   │   ├── onboarding/           ← componentes do fluxo de onboarding
│   │   │   ├── landing/              ← componentes das páginas públicas
│   │   │   ├── layout/               ← header, sidebar, shell da página
│   │   │   ├── navbar/               ← navegação
│   │   │   ├── whatsapp/             ← componentes do módulo WhatsApp
│   │   │   └── tour/                 ← tour guiado de onboarding
│   │   ├── lib/                      ← utilitários e clientes singleton
│   │   │   ├── prisma.ts             ← cliente Prisma singleton
│   │   │   ├── supabase/             ← clientes Supabase (server/client)
│   │   │   ├── utils.ts              ← função cn() e outros utilitários
│   │   │   └── plan-context.ts       ← contexto do plano SaaS ativo
│   │   ├── services/                 ← lógica de negócio (ex: tenant.service.ts)
│   │   ├── hooks/                    ← hooks React customizados
│   │   ├── types/                    ← declarações de tipos TypeScript
│   │   └── generated/                ← ⛔ gerado pelo Prisma — nunca edite manualmente
│   │
│   ├── prisma/
│   │   ├── schema.prisma             ← modelo de dados (fonte da verdade do banco)
│   │   ├── migrations/               ← histórico de migrações SQL
│   │   └── seed*.ts / seed*.mjs      ← scripts de seed de dados
│   │
│   ├── public/                       ← assets estáticos (imagens, fonts)
│   ├── scripts/                      ← scripts utilitários (ex: db-test.mjs)
│   ├── next.config.ts                ← configuração do Next.js
│   ├── tsconfig.json                 ← configuração TypeScript
│   ├── eslint.config.mjs             ← configuração ESLint
│   └── package.json                  ← dependências e scripts npm
│
└── academia-saas-bot/                ← SUBPROJETO 2: bot WhatsApp (Python)
    ├── app.py                        ← entry point FastAPI (rotas + wiring)
    ├── chains.py                     ← chains LangChain (geração de respostas)
    ├── router.py                     ← roteamento de intenção das mensagens
    ├── academia_flow.py              ← fluxo específico de academia (matrículas, cobranças)
    ├── database_api.py               ← todas as queries ao PostgreSQL
    ├── memory.py                     ← histórico de sessão por usuário
    ├── message_buffer.py             ← buffer/debounce de mensagens WhatsApp
    ├── vectorstore.py                ← inicialização do Chroma vector store
    ├── order_extractor.py            ← extração de pedidos da conversa
    ├── order_receipt.py              ← geração de comprovante de pedido
    ├── cobranca_worker.py            ← worker assíncrono de cobranças
    ├── evolution_api.py              ← cliente da Evolution API (WhatsApp)
    ├── script_responses.py           ← respostas fixas/scriptadas
    ├── prompts.py                    ← prompts de sistema para o modelo de IA
    ├── config.py                     ← variáveis de ambiente (única fonte)
    ├── requirements.txt              ← dependências Python
    ├── Dockerfile                    ← imagem Docker do bot
    ├── docker-compose.yml            ← orquestração local
    ├── rag_files/                    ← documentos fonte para o RAG
    └── vectorstore_data/             ← dados persistidos do Chroma (não versionar)
```

---

## Não edite — jamais modifique automaticamente

| Pasta / Arquivo | Motivo |
|---|---|
| `academia-saas-dashboard/src/generated/` | Gerado pelo Prisma. Sempre regenerar com `npx prisma generate`. |
| `academia-saas-dashboard/node_modules/` | Gerenciado pelo npm. |
| `academia-saas-dashboard/prisma/migrations/` | Histórico de SQL. Nunca editar arquivos existentes; só criar novas migrations. |
| `academia-saas-bot/vectorstore_data/` | Gerado pelo ChromaDB em runtime. |
| `academia-saas-dashboard/.next/` | Build do Next.js — gerado automaticamente. |
| `C:\Users\samue\projeto-wpp-samuel\wpp-bot-samuel\` | Projeto original de produção. **NUNCA TOCAR.** |
| `C:\Users\samue\projeto-wpp-samuel\whatsapp_ai_bot\` | Bot original de produção. **NUNCA TOCAR.** |
