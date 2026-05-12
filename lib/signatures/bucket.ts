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

export async function uploadSignatureFile(
  bucket: (typeof BUCKETS)[keyof typeof BUCKETS],
  path: string,
  file: Buffer,
  contentType: string = "application/pdf",
): Promise<{ path: string }> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType, upsert: false }); // upsert false : pas d'écrasement silencieux
  if (error) throw error;
  return data;
}

// URL signée TTL 5 min — pour téléchargement par signataire ou admin.
// Le bucket est privé, donc pas d'URL publique exposée.
export async function getSignedUrl(
  bucket: (typeof BUCKETS)[keyof typeof BUCKETS],
  path: string,
  ttlSeconds: number = 300,
): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttlSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteSignatureFile(
  bucket: (typeof BUCKETS)[keyof typeof BUCKETS],
  path: string,
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw error;
}
