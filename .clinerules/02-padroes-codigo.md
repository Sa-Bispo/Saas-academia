# Padrões de Código

---

## Dashboard (TypeScript / Next.js)

### Nomenclatura

- **Arquivos de componente**: kebab-case. Ex: `alunos-client.tsx`, `feature-gate.tsx`.
- **Arquivos de Server Action**: sufixo `.actions.ts`. Ex: `alunos.actions.ts`.
- **Arquivos de serviço**: sufixo `.service.ts`. Ex: `tenant.service.ts`.
- **Componentes Client**: sufixo `-client.tsx` no nome do arquivo e no nome do componente. Ex: `AlunosPageClient`.
- **Variáveis e funções**: camelCase. Ex: `tenantId`, `getAuthenticatedTenantId`.
- **Tipos e interfaces TypeScript**: PascalCase. Ex: `AcademiaState`, `PlanoAcademia`.
- **Entidades de negócio**: nomes em português. Ex: `aluno`, `cobranca`, `matricula`, `plano`.
- **Nomes de tabela no banco**: snake_case mapeados via `@@map()` no Prisma. Ex: `@@map("tenants")`.
- **Colunas do banco**: snake_case mapeadas via `@map()`. Ex: `@map("data_criacao")`.

### Estrutura de Server Actions

Todo arquivo em `src/actions/` deve começar com `"use server";` e seguir este padrão:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureTenantForUser } from "@/services/tenant.service";
import { prisma } from "@/lib/prisma";

async function getAuthenticatedTenantId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { tenant } = await ensureTenantForUser({ id: user.id, email: user.email });
  return tenant.id;
}

export async function nomeDaAction(params) {
  const tenantId = await getAuthenticatedTenantId();
  // lógica aqui
}
```

### Multi-tenancy — REGRA OBRIGATÓRIA

**Toda** consulta ao banco via Prisma deve incluir `where: { tenantId }`. Nunca busque dados sem filtrar pelo tenant do usuário autenticado.

### Estrutura de Server Page

Pages em `src/app/(dashboard)/` são Server Components que:
1. Autenticam via Supabase.
2. Resolvem o `tenantId`.
3. Buscam dados com Prisma.
4. Passam os dados para um Client Component (`*-client.tsx`).

### Import path

Use sempre o alias `@/` em vez de caminhos relativos longos. Ex: `@/lib/prisma`, `@/components/ui/button`, `@/actions/alunos.actions`.

### Utilitário de classes CSS

Use sempre `cn()` de `@/lib/utils` para combinar classes Tailwind:

```typescript
import { cn } from "@/lib/utils";
className={cn("base-class", isActive && "active-class")}
```

### Tipagem

- Prefira tipos explícitos em retornos de funções públicas.
- Use tipos derivados do Prisma onde possível (ex: `Prisma.AlunoGetPayload<...>`).
- Evite `any`. Se necessário, prefira `unknown` com type guard.

### Comentários

- Use comentários de seção com traço longo quando o arquivo tiver múltiplas seções. Ex:
  ```typescript
  // ─── Alunos ───────────────────────────────────────────
  ```
- Não documente o que o código já diz com nomes claros. Comente apenas o "por quê" quando não for óbvio.

---

## Bot (Python)

### Nomenclatura

- **Arquivos**: snake_case. Ex: `academia_flow.py`, `database_api.py`.
- **Funções e variáveis**: snake_case. Ex: `get_tenant_by_instance`, `tenant_id`.
- **Classes**: PascalCase. Ex: `AcademiaState`.
- **Constantes**: UPPER_SNAKE_CASE. Ex: `GEMINI_API_KEY`.

### Estrutura de módulos

- `config.py` centraliza **todas** as variáveis de ambiente. Nunca use `os.getenv()` diretamente em outros módulos — importe de `config`.
- `database_api.py` centraliza **todas** as queries ao banco.
- `app.py` contém apenas rotas FastAPI e wiring — sem lógica de negócio inline.

### Async

- Funções de IO (banco, HTTP, Redis) devem ser `async`. Use `asyncpg` para banco e `redis.asyncio` para Redis.
- Não misture código síncrono bloqueante dentro de funções `async`.

### Comentários

Mesma regra do dashboard: comente apenas o "por quê" quando não for óbvio.
