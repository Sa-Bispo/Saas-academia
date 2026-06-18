import { cookies } from "next/headers";

// Usado em Server Components, Server Actions e Route Handlers.
// No ambiente local, devolvemos um cliente mínimo com usuário fake
// para permitir navegar e editar o app sem depender do Supabase.
export async function createClient() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("academia_saas_dev_session")?.value;

  let user: { id: string; email: string; user_metadata: { nome?: string } } | null = null;

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie)) as {
        user?: { id: string; email: string; user_metadata?: { nome?: string } };
      };
      if (parsed?.user?.id && parsed?.user?.email) {
        user = {
          id: parsed.user.id,
          email: parsed.user.email,
          user_metadata: parsed.user.user_metadata ?? {},
        };
      }
    } catch {
      user = null;
    }
  }

  return {
    auth: {
      async getUser() {
        return {
          data: { user },
          error: null,
        };
      },
      async signOut() {
        try {
          cookieStore.delete("academia_saas_dev_session");
        } catch {
          // sem-op em contextos onde mutacao de cookies nao e permitida
        }
        return { error: null };
      },
    },
  };
}
