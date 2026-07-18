# CLAUDE.md — Academia SaaS

## Arquitetura de produção

**VPS:** 31.220.107.103 (Hostinger KVM2, Ubuntu 22.04, 8GB RAM)
**Acesso:** `ssh root@31.220.107.103`
**Projeto no servidor:** `/opt/pyra/saas-academia/` (symlink de `/root/Saas-academia/`)
**Repositório:** `https://github.com/Sa-Bispo/Saas-academia.git` (branch `main`)

### Stack Docker (docker-compose.prod.yml)

| Container      | Descrição                  | Porta |
|----------------|----------------------------|-------|
| academia_web   | Next.js dashboard          | 3000  |
| bot            | Python WhatsApp bot        | 8000  |
| evolution_api  | WhatsApp bridge            | 8080  |
| postgres       | Banco principal            | 5432  |
| redis          | Cache/sessões bot          | 6379  |

**Nginx** na frente com SSL:
- `pyralabs.com.br` → academia_web:3000
- `api.pyralabs.com.br` → bot:8000

### Banco de dados

- **Postgres local (Docker)** é o banco principal — NÃO é o Supabase
- **Supabase** = apenas autenticação (login/JWT)
- **Supabase Storage** = arquivos (comprovantes, PAR-Q, assinaturas)
- `assinaturaBase64` no banco é intencional (PDF sem CORS) — não alterar

### Endpoints de saúde

```
GET https://pyralabs.com.br/api/health  → {"status":"ok","db":"ok"}
GET http://api.pyralabs.com.br/health   → {status, uptime_seconds, redis}
```

---

## Regras críticas de banco de dados

### NUNCA faça isso
- Editar `prisma/schema.prisma` diretamente na VPS via SSH
- Rodar `prisma db push` em produção
- Rodar `prisma migrate deploy` com `--accept-data-loss` sem decisão explícita do dono
- Commitar alterações de schema sem a migration gerada junto

### Workflow obrigatório para qualquer mudança no banco

**Todo o trabalho começa localmente (Windows), nunca na VPS:**

```
1. Editar prisma/schema.prisma localmente
2. npx prisma migrate dev --name descricao_da_mudanca
3. git add prisma/   →   git commit   →   git push
4. Deploy aplica automaticamente com prisma migrate deploy
```

### Por quê essa regra existe

Em junho/2026 o servidor ficou fora do ar porque:
- Alguém editou `schema.prisma` direto na VPS sem commitar
- O `_prisma_migrations` não existia (banco provisionado com `db push`)
- O Dockerfile mascarava falhas de build com `|| echo "warnings"`
- O container `academia_web` foi iniciado fora do docker compose, impedindo recriação automática

Todos esses problemas foram corrigidos, mas a causa raiz é workflow: mudanças de schema sem migration.

---

## Deploy

### Manual (na VPS)
```bash
cd /opt/pyra/saas-academia
./deploy.sh web      # só o Next.js
./deploy.sh bot      # só o bot
./deploy.sh all      # tudo
```

### Rebuild forçado
```bash
docker compose -f docker-compose.prod.yml up -d --build academia_web
```

### Se o db_migrator bloquear o academia_web
```bash
# Sobe o web sem passar pelo migrator (emergência)
docker compose -f docker-compose.prod.yml up -d --no-deps academia_web
```

---

## Problemas conhecidos e soluções

### Migração travada (P3005 — banco sem _prisma_migrations)
```bash
# Dentro do container db_migrator ou academia_web:
npx prisma migrate resolve --applied <nome_da_migration>
# Repetir para cada migration existente, depois:
npx prisma migrate deploy
```

### Binário nativo perdido no build (@resvg/resvg-js)
- Causa: Dockerfile rodava `npm ci --production` no stage final, perdendo optional dependencies nativas
- Correção já aplicada no `Dockerfile.fast`: stage final copia `node_modules` do builder e roda `npm prune --omit=dev`

### Container rodando fora do docker compose
```bash
docker ps -a  # verificar se academia_web tem label do compose
docker stop academia_web && docker rm academia_web
docker compose -f docker-compose.prod.yml up -d academia_web
```

### Schema.prisma modificado na VPS (drift)
```bash
# Descartar mudanças não commitadas no servidor
git checkout prisma/schema.prisma
# Depois recriar as mudanças localmente com prisma migrate dev
```
