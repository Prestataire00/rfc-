export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { askClaude, checkAIKey } from "@/lib/ai";
import { aiGuard } from "@/lib/ai-guard";

export async function POST(req: NextRequest) {
  const guard = await aiGuard(req);
  if (!guard.ok) return guard.response;
  if (!checkAIKey()) return NextResponse.json({ error: "Cle Anthropic manquante" }, { status: 500 });
  try {
    const body = await req.json();
    const { type, contactId, devisId, factureId, context } = body;
    // type: "prise_contact" | "relance_devis" | "relance_facture" | "suivi_prospect" | "custom"

    let contexte = context || "";

    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        include: { entreprise: { select: { nom: true } } },
      });
      if (contact) {
        contexte += `\n\nContact : ${contact.prenom} ${contact.nom}`;
        if (contact.entreprise) contexte += ` - ${contact.entreprise.nom}`;
        if (contact.type) contexte += ` (${contact.type})`;
        if (contact.poste) contexte += `\nPoste : ${contact.poste}`;
      }
    }

    if (devisId) {
      const devis = await prisma.devis.findUnique({
        where: { id: devisId },
        include: { contact: true, entreprise: true, lignes: true },
      });
      if (devis) {
        contexte += `\n\nDevis ${devis.numero} - ${devis.objet}`;
        contexte += `\nMontant : ${devis.montantTTC.toFixed(2)} EUR TTC`;
        contexte += `\nStatut : ${devis.statut}`;
        contexte += `\nDate validite : ${new Date(devis.dateValidite).toLocaleDateString("fr-FR")}`;
      }
    }

    if (factureId) {
      const facture = await prisma.facture.findUnique({
        where: { id: factureId },
        include: { entreprise: true, devis: true },
      });
      if (facture) {
        contexte += `\n\nFacture ${facture.numero}`;
        contexte += `\nMontant : ${facture.montantTTC.toFixed(2)} EUR TTC`;
        contexte += `\nStatut : ${facture.statut}`;
        contexte += `\nDate echeance : ${new Date(facture.dateEcheance).toLocaleDateString("fr-FR")}`;
      }
    }

    const prompts: Record<string, string> = {
      prise_contact: `Tu es un commercial en organisme de formation. Redige un email de prise de contact professionnel, chaleureux mais direct, en francais. Propose un echange pour comprendre les besoins en formation.\n\n${contexte}`,
      relance_devis: `Tu es un commercial en organisme de formation. Redige un email de relance poli et professionnel pour un devis envoye, en francais. Rappelle les points cles du devis, propose un appel pour repondre aux questions.\n\n${contexte}`,
      relance_facture: `Tu es un responsable administratif en organisme de formation. Redige un email de relance pour une facture en retard de paiement, en francais. Ton ferme mais cordial.\n\n${contexte}`,
      suivi_prospect: `Tu es un commercial. Redige un email de suivi pour un prospect, en francais. Reste pertinent, apporte de la valeur (ex: partage d'un cas client, d'une ressource).\n\n${contexte}`,
      custom: `Redige un email professionnel en francais.\n\n${contexte}`,
    };

    const prompt = `${prompts[type] || prompts.custom}

Format : objet + corps d'email, en francais, pret a envoyer.
Structure :
Objet : [objet clair]

Bonjour [Prenom],
[corps du message - 3 a 4 paragraphes]

Cordialement,
[Signature]

Reponds uniquement avec l'email, sans commentaire.`;

    const text = await askClaude(prompt, 1500);
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error("AI email error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur IA" }, { status: 500 });
  }
}
