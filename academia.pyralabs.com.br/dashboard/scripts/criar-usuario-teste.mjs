// Script único para criar um usuário de teste no Supabase Auth.
// Uso (na pasta academia.pyralabs.com.br/dashboard):
//   node scripts/criar-usuario-teste.mjs
//
// Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY do .env e cria
// um usuário já confirmado (sem precisar clicar em link de e-mail).

import { readFileSync } from "fs";

function lerEnv(caminho) {
  try {
    const conteudo = readFileSync(caminho, "utf-8");
    const env = {};
    for (const linha of conteudo.split("\n")) {
      const match = linha.trimEnd().match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) env[match[1]] = match[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = { ...lerEnv(".env"), ...lerEnv(".env.local") };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const EMAIL = process.argv[2] || "teste@academiasaas.dev";
const SENHA = process.argv[3] || "Teste@1234";

const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
  method: "POST",
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: EMAIL,
    password: SENHA,
    email_confirm: true,
  }),
});

const data = await resp.json();

if (!resp.ok) {
  console.error("Erro ao criar usuário:", resp.status, data);
  process.exit(1);
}

console.log("Usuário criado com sucesso!");
console.log("Email:", EMAIL);
console.log("Senha:", SENHA);
console.log("ID:", data.id);
