export class SupabaseClientEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseClientEnvError";
  }
}

type DevSessionUser = {
  id: string;
  email: string;
  user_metadata: { nome?: string };
};

type DevSessionPayload = {
  user: DevSessionUser;
};

const DEV_SESSION_COOKIE = "academia_saas_dev_session";

function getLocalSessionCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${encodeURIComponent(DEV_SESSION_COOKIE)}=`));

  if (!cookie) {
    return null;
  }

  const value = cookie.split("=").slice(1).join("=");

  try {
    return JSON.parse(decodeURIComponent(value)) as DevSessionPayload;
  } catch {
    return null;
  }
}

function setLocalSession(payload: DevSessionPayload) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${encodeURIComponent(DEV_SESSION_COOKIE)}=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=2592000; samesite=lax`;
}

function clearLocalSession() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${encodeURIComponent(DEV_SESSION_COOKIE)}=; path=/; max-age=0; samesite=lax`;
}

function getSupabaseClientEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new SupabaseClientEnvError(
      "Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  try {
    new URL(supabaseUrl);
  } catch {
    throw new SupabaseClientEnvError(
      "NEXT_PUBLIC_SUPABASE_URL invalida. Use uma URL completa, por exemplo https://xxxx.supabase.co.",
    );
  }

  // Aceita formatos antigos (anon JWT) e novos (sb_publishable_*).
  const hasJwtShape = supabaseAnonKey.split(".").length === 3;
  const isPublishableKey = supabaseAnonKey.startsWith("sb_publishable_");
  if (!hasJwtShape && !isPublishableKey) {
    throw new SupabaseClientEnvError(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY invalida. Use uma anon key (JWT) ou publishable key (sb_publishable_*) do projeto Supabase.",
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

// Usado em Client Components e em qualquer código rodando no browser.
// No ambiente local usamos um cliente mínimo para evitar dependências
// de auth externas enquanto o app está sendo ajustado.
export function createClient() {
  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        if (!email || !password) {
          return { data: { user: null, session: null }, error: new Error("E-mail e senha sao obrigatorios.") };
        }

        // Gera UUID v4 deterministico a partir do email para manter consistência entre logins
        const hash = Array.from(email.toLowerCase()).reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const seedHex = hash.toString(16).padStart(8, "0");
        const devId = `${seedHex.slice(0, 8)}-${seedHex.slice(0, 4)}-4${seedHex.slice(1, 4)}-8${seedHex.slice(0, 3)}-${seedHex.padEnd(12, "0").slice(0, 12)}`;

        const session: DevSessionPayload = {
          user: {
            id: devId,
            email,
            user_metadata: { nome: email.split("@")[0] || "Cliente" },
          },
        };

        setLocalSession(session);

        return {
          data: {
            user: session.user,
            session: { user: session.user },
          },
          error: null,
        };
      },
      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: { nome?: string } };
      }) {
        if (!email || !password) {
          return { data: { user: null, session: null }, error: new Error("E-mail e senha sao obrigatorios.") };
        }

        const hash2 = Array.from(email.toLowerCase()).reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const seedHex2 = hash2.toString(16).padStart(8, "0");
        const devId2 = `${seedHex2.slice(0, 8)}-${seedHex2.slice(0, 4)}-4${seedHex2.slice(1, 4)}-8${seedHex2.slice(0, 3)}-${seedHex2.padEnd(12, "0").slice(0, 12)}`;

        const session: DevSessionPayload = {
          user: {
            id: devId2,
            email,
            user_metadata: { nome: options?.data?.nome ?? (email.split("@")[0] || "Cliente") },
          },
        };

        setLocalSession(session);

        return {
          data: {
            user: session.user,
            session: { user: session.user },
          },
          error: null,
        };
      },
      async signOut() {
        clearLocalSession();
        return { error: null };
      },
      async getUser() {
        const session = getLocalSessionCookie();

        return {
          data: { user: session?.user ?? null },
          error: null,
        };
      },
    },
  };
}
