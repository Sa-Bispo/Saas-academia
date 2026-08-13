# Foto do Aluno no Formulário PAR-Q

**Data:** 2026-08-13  
**Status:** Aprovado

---

## Objetivo

Adicionar uma etapa de foto de identificação no formulário público PAR-Q (`/parq/[tenantId]`). O aluno tira uma selfie ou seleciona da galeria. A foto é obrigatória para enviar o formulário e é salva no Supabase Storage, com a URL persistida no banco de dados.

---

## Modelo de dados

### Schema Prisma (`alunos`)

Novo campo no modelo `Aluno`:

```prisma
fotoUrl  String?  @map("foto_url") @db.Text
```

### Migration

```bash
npx prisma migrate dev --name add-foto-url-aluno
```

### Supabase Storage

- Bucket: `fotos-alunos`
- Path por arquivo: `{tenantId}/{alunoId}.jpg`
- Acesso: público (URL não é adivinhável)
- Upload: server-side via admin client (sem necessidade de auth pública no bucket)

---

## UI — `parq-form.tsx`

Nova seção **"Foto de identificação"** inserida logo antes da seção de Assinatura.

### Componentes

- `<input type="file" accept="image/*" capture="user">` — abre câmera frontal no celular ou galeria; seletor de arquivo no desktop
- Preview circular (avatar) após captura
- Botão "Trocar foto" para refazer
- Erro visual (borda vermelha + mensagem) se tentar enviar sem foto

### Compressão client-side (Canvas API)

- Redimensiona para no máximo 600×600px mantendo proporção
- Converte para JPEG qualidade 0.8
- Resultado esperado: 30–80KB

### Estado adicionado

```ts
const [foto, setFoto] = useState<string | null>(null); // base64 JPEG data URL
```

### Validação em `handleSubmit`

```ts
if (!foto) {
  setErro("A foto de identificação é obrigatória.");
  return;
}
```

### Payload enviado

A foto é incluída no JSON existente:

```ts
body: JSON.stringify({ nome, cpf, telefone, dataNascimento, respostas, assinatura, foto, consentimentoLgpd })
```

---

## API — `/api/parq/[tenantId]/route.ts`

### Mudanças no body

```ts
foto: string | null  // data URL base64 JPEG
```

### Validação

```ts
if (!foto || typeof foto !== "string" || !foto.startsWith("data:image/")) {
  return NextResponse.json({ error: "Foto obrigatória." }, { status: 422 });
}
```

### Fluxo de upload

1. Criar/encontrar `Aluno` (fluxo atual)
2. Converter base64 → `Buffer`
3. Upload para Supabase Storage: `fotos-alunos/{tenantId}/{alunoId}.jpg`
4. Obter URL pública
5. `prisma.aluno.update({ where: { id: aluno.id }, data: { fotoUrl: url } })`
6. Criar `FichaParq` (fluxo atual)

### Tratamento de falha no upload

Se o upload para o Supabase falhar, o PAR-Q é salvo normalmente. A falha é logada (`console.error`) mas não exposta ao aluno — `fotoUrl` fica `null`.

---

## Arquivos alterados

| Arquivo | Tipo de mudança |
|---|---|
| `prisma/schema.prisma` | Novo campo `fotoUrl` em `Aluno` |
| `prisma/migrations/...` | Nova migration gerada |
| `src/app/parq/[tenantId]/parq-form.tsx` | Nova seção de foto + compressão + validação |
| `src/app/api/parq/[tenantId]/route.ts` | Recebe `foto`, faz upload, salva URL |

---

## Fora de escopo

- Exibição da foto no dashboard (modal do aluno) — pode ser adicionado depois
- Upload de foto pelo funcionário via dashboard
- Substituição/atualização da foto após o PAR-Q inicial
