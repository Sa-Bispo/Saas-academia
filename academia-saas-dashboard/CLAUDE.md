@AGENTS.md

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

---

## Arquitetura do Sistema

### Visão geral

SaaS multi-tenant de gestão de academias. Cada cliente (tenant) tem seu próprio painel e bot WhatsApp isolado.

```
pyralabs.com.br  ←→  Nginx (VPS Hostinger)  ←→  Docker Compose
                                                    ├── academia_web (Next.js :3000)
                                                    ├── bot (Python FastAPI :8000)
                                                    ├── evolution_api (:8080)
                                                    ├── postgres (:5432)  ← banco principal
                                                    └── redis (:6379)
```

### Banco de dados

- **Postgres local (Docker)** = banco principal de TODOS os dados da plataforma
- **Supabase** = APENAS autenticação (login/JWT). Não armazena dados de negócio.
- ORM: Prisma 7 — schema em `prisma/schema.prisma`, client gerado em `src/generated/prisma/`
- Migrations: `npx prisma migrate deploy` (produção) ou `npx prisma migrate dev` (dev)

### Fluxo de criação de cliente (tenant)

1. Admin acessa `/admin` com `samuel.bispon01@gmail.com` / `Admin@2026`
2. Preenche "Novo cliente": nome, email, senha, sub-nicho (academia)
3. Sistema cria usuário no **Supabase Auth** + tenant no **Postgres local**
4. Cliente acessa `pyralabs.com.br` com o email/senha cadastrado
5. Dashboard exibe dados do tenant isolado

### Fluxo de alunos

- `/alunos` lista todos os alunos do tenant autenticado
- Abrir um aluno: modal com `buscarAluno(alunoId)` via Server Action
- Estado do modal: `undefined`=carregando, `null`=não encontrado, `AlunoDetalhe`=ok
- Criar aluno: `criarAluno()` Server Action → Prisma → revalida `/alunos`

### Autenticação

- Login em `/login` → Supabase Auth → cookie de sessão SSR
- `getAuthenticatedTenantId()` em cada Server Action: busca user do Supabase → resolve tenant no Postgres
- Admin (`ADMIN_EMAIL=samuel.bispon01@gmail.com`) é redirecionado para `/admin` pelo layout

### Deploy

- **Auto:** push na `main` → GitHub Actions → SSH VPS → git pull + docker rebuild
- **Manual:** `./deploy.sh [bot|web|all]` no servidor
- Dashboard e bot no mesmo repositório: `github.com/Sa-Bispo/Saas-academia.git`

### Health checks

- Dashboard: `GET /api/health` → pinga Prisma/Postgres
- Bot: `GET /health` (porta 8000) → pinga Redis + retorna uptime

### Storage

- Supabase Storage para todos os arquivos (comprovantes, PAR-Q, assinaturas)
- `assinaturaBase64` no banco é intencional (PDF gerado sem CORS/roundtrip) — não remover

### Dev local

```bash
# 1. Subir banco
docker compose up -d postgres redis  # em /projeto-wpp-samuel/

# 2. Gerar Prisma client
npx prisma generate

# 3. Dev server
npm run dev  # em /academia-saas-dashboard/

# 4. Acesso
# Dashboard: http://localhost:3000
# Admin: http://localhost:3000/admin  (Admin@2026)
```

**Atenção:** Samuel (ADMIN_EMAIL) é redirecionado para `/admin` ao logar no dashboard.
Para testar `/alunos` localmente, use um tenant de teste criado via painel admin.
