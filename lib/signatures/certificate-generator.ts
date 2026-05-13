/**
 * Générateur du PDF "Certificat de signature électronique" — Sprint 5.
 *
 * Document de preuve qu'on joint au PDF signé pour le signataire et qu'on
 * stocke dans le bucket SIGNATURES_CERTIFICATES. Contient :
 *  - Identité signataire (nom, email, IP, UA)
 *  - Hashes SHA-256 (original + signé)
 *  - Horodatage TSA (FreeTSA, format ISO)
 *  - Audit log complet (timestamps + type + acteur + hash événement tronqué)
 *  - QR code → /verify?id=... pour vérification indépendante par un tiers
 *
 * Stack : pdfmake (déjà utilisé par lib/pdf/* RFC) + qrcode.
 */
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { verifyAuditChain } from "./audit-chain";
import { generatePdfBuffer } from "@/lib/pdf/generate";

export async function generateProofCertificate(requestId: string): Promise<Buffer> {
  const r = await prisma.signatureRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      signataire: true,
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  const auditValidity = await verifyAuditChain(requestId);

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://projetrfc.netlify.app";
  const verifyUrl = `${baseUrl}/verify?id=${r.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });

  const docDef = {
    info: { title: `Certificat de signature — ${r.titre}` },
    defaultStyle: { fontSize: 10 }, // Roboto (default) via vfs_fonts
    content: [
      { text: "Certificat de signature électronique", fontSize: 18, bold: true, margin: [0, 0, 0, 12] },
      { text: r.titre, fontSize: 14, margin: [0, 0, 0, 20] },

      { text: "Signataire", bold: true, margin: [0, 0, 0, 4] },
      { text: `${r.signataire?.nom ?? "-"} <${r.signataire?.email ?? "-"}>` },
      { text: `IP : ${r.signataire?.signatureIp ?? "-"}` },
      { text: `User-Agent : ${r.signataire?.signatureUserAgent ?? "-"}`, margin: [0, 0, 0, 16] },

      { text: "Document", bold: true, margin: [0, 0, 0, 4] },
      { text: `Hash original (SHA-256) :`, margin: [0, 0, 0, 0] },
      { text: r.originalFileSha256, fontSize: 8 },
      { text: `Hash signé (SHA-256) :`, margin: [0, 4, 0, 0] },
      { text: r.signedFileSha256 ?? "-", fontSize: 8 },
      { text: `Pages : ${r.originalPageCount}`, margin: [0, 4, 0, 16] },

      { text: "Horodatage", bold: true, margin: [0, 0, 0, 4] },
      { text: `Date de signature : ${r.signedAt?.toISOString() ?? "-"}` },
      { text: `Horodatage TSA (FreeTSA.org, RFC 3161) : ${r.tsaTimestampedAt?.toISOString() ?? "non disponible"}`, margin: [0, 0, 0, 4] },
      { text: r.tsaTimestamp ? `TSR length : ${r.tsaTimestamp.length} bytes (binaire, vérifiable via openssl ts -verify)` : "TSR non disponible — flag requiresTimestamp, job nocturne à venir", fontSize: 8, italics: true, margin: [0, 0, 0, 16] },

      { text: "Audit log", bold: true, margin: [0, 0, 0, 4] },
      {
        text: auditValidity.valid
          ? "✓ Chaîne d'audit intacte (vérifiée à la génération)"
          : `✗ Chaîne d'audit corrompue (event ${auditValidity.brokenAt})`,
        color: auditValidity.valid ? "#0a7c00" : "#b91c1c",
        fontSize: 9,
        margin: [0, 0, 0, 8],
      },
      {
        table: {
          widths: ["auto", "*", "*", "*"],
          body: [
            [
              { text: "Date", bold: true },
              { text: "Type", bold: true },
              { text: "Acteur", bold: true },
              { text: "Hash event (tronqué)", bold: true },
            ],
            ...r.events.map((e) => [
              e.createdAt.toISOString(),
              e.type,
              `${e.actorType}${e.actorId ? ":" + e.actorId.slice(0, 8) : ""}`,
              e.eventHash.slice(0, 16) + "…",
            ]),
          ],
        },
        fontSize: 8,
      },

      { image: qrDataUrl, width: 100, alignment: "right" as const, margin: [0, 16, 0, 0] },
      { text: `Vérification indépendante : ${verifyUrl}`, fontSize: 8, alignment: "right" as const, color: "#6b7280" },
    ],
  };

  const bytes = await generatePdfBuffer(docDef as unknown);
  return Buffer.from(bytes);
}
