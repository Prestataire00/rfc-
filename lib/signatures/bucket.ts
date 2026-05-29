import { supabase } from "@/lib/supabase";

// Buckets dédiés signature électronique — séparés des autres uploads RFC.
// Doivent être créés en private (pas de RLS publique) avec lifecycle = aucun
// (rétention à vie côté RGPD : obligation légale prévaut).
// Setup manuel à faire une fois dans le dashboard Supabase ou via :
//   supabase storage create signatures-original --private
//   supabase storage create signatures-signed --private
//   supabase storage create signatures-certificates --private

export const BUCKETS = {
  ORIGINAL: "signatures-original",
  SIGNED: "signatures-signed",
  CERTIFICATES: "signatures-certificates",
} as const;

type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

// Détecte les erreurs Supabase Storage liées à un bucket manquant (cause #1 en
// prod : étape de setup oubliée). Reformule en message actionnable plutôt que
// laisser remonter "Bucket not found" générique → "Erreur serveur" 500 opaque.
function wrapStorageError(bucket: BucketName, op: string, error: unknown): Error {
  const e = error as { message?: string; statusCode?: string; status?: number } | null;
  const msg = (e?.message ?? "").toLowerCase();
  const status = e?.status ?? Number(e?.statusCode);
  if (status === 404 || msg.includes("bucket not found") || msg.includes("not found")) {
    return new Error(
      `Bucket Supabase "${bucket}" introuvable (${op}). Créez-le dans Supabase Storage en private (Dashboard → Storage → New bucket).`,
    );
  }
  return new Error(`Supabase Storage ${op} sur "${bucket}" : ${e?.message ?? "erreur inconnue"}`);
}

export async function uploadSignatureFile(
  bucket: BucketName,
  path: string,
  file: Buffer,
  contentType: string = "application/pdf",
): Promise<{ path: string }> {
  // upsert: true pour permettre les ré-essais de finalize.ts (idempotence).
  // En V1 c'est OK puisque les paths sont stables ({id}/signed.pdf etc).
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: true });
  if (error) throw wrapStorageError(bucket, "upload", error);
  return data;
}

// Download d'un fichier signature depuis un bucket privé (lecture côté serveur).
// Utilisé par finalize.ts pour récupérer le PDF original avant stamping.
export async function downloadSignatureFile(
  bucket: BucketName,
  path: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) throw wrapStorageError(bucket, "download", error ?? new Error("no data"));
  return Buffer.from(await data.arrayBuffer());
}

// URL signée TTL 5 min — pour téléchargement par signataire ou admin.
// Le bucket est privé, donc pas d'URL publique exposée.
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  ttlSeconds: number = 300,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
  if (error) throw wrapStorageError(bucket, "signed-url", error);
  return data.signedUrl;
}

export async function deleteSignatureFile(
  bucket: BucketName,
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw wrapStorageError(bucket, "delete", error);
}
