/**
 * Garante que o bucket de fotos de alunos exista no Supabase Storage.
 * Uso: node --env-file=.env.local scripts/ensure-fotos-bucket.mjs
 */
import { createClient } from "@supabase/supabase-js";

const BUCKET = "fotos-alunos";

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
  fileSizeLimit: "5MB",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
});
if (createErr) { console.error("✗ Erro ao criar bucket:", createErr.message); process.exit(1); }

console.log(`✅ Bucket "${BUCKET}" criado (público).`);
