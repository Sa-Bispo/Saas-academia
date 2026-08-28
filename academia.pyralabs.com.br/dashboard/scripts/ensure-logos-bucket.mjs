/**
 * Garante que o bucket de logos das academias exista no Supabase Storage.
 * Uso: node --env-file=.env.local scripts/ensure-logos-bucket.mjs
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = "logos-academias";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
if (listErr) { console.error("✗ Erro ao listar buckets:", listErr.message); process.exit(1); }

if (buckets.some((b) => b.name === BUCKET)) {
  console.log(`✓ Bucket "${BUCKET}" já existe.`);
  process.exit(0);
}

const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
  public: true,
  fileSizeLimit: "2MB",
  allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/svg+xml"],
});
if (createErr) { console.error("✗ Erro ao criar bucket:", createErr.message); process.exit(1); }

console.log(`✅ Bucket "${BUCKET}" criado (público).`);
