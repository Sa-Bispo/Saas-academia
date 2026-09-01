import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sobe a foto de um aluno pro bucket "fotos-alunos" do Supabase Storage e
 * atualiza aluno.fotoUrl. Upsert por alunoId — subir de novo substitui a
 * foto anterior automaticamente, tanto faz se é a primeira vez ou uma troca.
 *
 * Usado pelos três pontos de entrada que uma foto de aluno pode vir:
 * - /api/parq/[tenantId] (cadastro novo, dentro da ficha PAR-Q)
 * - /api/foto/[tenantId] (auto-atendimento por CPF, aluno já cadastrado)
 * - atualizarFotoAluno() (painel de alunos, staff troca direto)
 */
export async function uploadFotoAluno(
  tenantId: string,
  alunoId: string,
  fotoBase64: string
): Promise<string> {
  const base64Data = fotoBase64.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const supabase = createAdminClient();
  const path = `${tenantId}/${alunoId}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("fotos-alunos")
    .upload(path, buffer, { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    throw new Error(`Não foi possível salvar a foto: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from("fotos-alunos").getPublicUrl(path);
  // Cache-buster: a URL pública é a mesma a cada troca; o timestamp força refresh.
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
  await prisma.aluno.update({ where: { id: alunoId }, data: { fotoUrl: publicUrl } });

  return publicUrl;
}

/** Remove a foto do aluno: apaga do Storage e limpa aluno.fotoUrl. */
export async function removerFotoAluno(tenantId: string, alunoId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.storage.from("fotos-alunos").remove([`${tenantId}/${alunoId}.jpg`]);
  await prisma.aluno.update({ where: { id: alunoId }, data: { fotoUrl: null } });
}
