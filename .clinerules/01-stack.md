# Stack Tecnológica

Este projeto é composto por dois subprojetos independentes.

---

## academia-saas-dashboard (Frontend / BFF)

| Item | Detalhe |
|---|---|
| Linguagem | TypeScript 5 |
| Framework | Next.js 16.2.2 (App Router) |
| Runtime UI | React 19.2.4 |
| Gerenciador de pacotes | npm (package-lock.json presente) |
| ORM | Prisma 7.6.0 |
| Banco de dados | PostgreSQL via Supabase |
| Autenticação | Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`) |
| Estilização | TailwindCSS v4 + `clsx` + `tailwind-merge` |
| Validação de formulários | React Hook Form + Zod v4 |
| State management | Zustand 5 (principal), Redux 5 + Reselect (legado) |
| Data fetching | TanStack React Query v5 |
| Ícones | Lucide React |
| Gráficos | Recharts |
| Pagamentos | MercadoPago SDK v2 |
| Drag-and-drop | @hello-pangea/dnd |
| PDF | jsPDF |
| Linter | ESLint 9 + eslint-config-next |

---

## academia-saas-bot (Backend / Bot)

| Item | Detalhe |
|---|---|
| Linguagem | Python 3 |
| Framework | FastAPI + Uvicorn |
| IA principal | Google Gemini (`gemini-2.5-flash`) via `google-genai` |
| IA alternativa | OpenAI (`langchain-openai`) |
| Orquestração IA | LangChain (chains, RAG, text-splitters) |
| Vector store | ChromaDB (`langchain-chroma`) |
| Cache / sessão | Redis (asyncio) |
| Banco de dados | PostgreSQL via `asyncpg` |
| Validação | Pydantic |
| WhatsApp | Evolution API (HTTP via `requests`) |
| Planilhas | Google Sheets (`gspread`, `google-auth-oauthlib`) |
| Fuzzy matching | RapidFuzz |
| Env vars | `python-dotenv` |
