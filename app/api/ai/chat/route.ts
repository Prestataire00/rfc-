export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { checkAIKey, AI_MODEL } from "@/lib/ai";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ChatMessage = { role: "user" | "assistant"; content: string };

// Contexte complet du CRM pour guider Claude
const CRM_CONTEXT = `Tu es l'assistant IA du CRM RFC (Rescue Formation Conseil), une plateforme de gestion pour organisme de formation professionnelle (securite, incendie, premiers secours, habilitations).

Tu dois repondre en francais, de maniere concise et pragmatique. Si l'utilisateur demande ou aller pour une action, donne-lui le chemin exact (ex: /contacts/nouveau, /commercial/devis/nouveau).

## Structure du CRM

### CRM (gestion clientele)
- **/contacts** : gestion des contacts (stagiaires, clients, prospects)
  - Sous-vues : /contacts?type=stagiaire, /contacts?type=client, /contacts?type=prospect
  - Fiche contact avec onglets : Informations, Formations, Documents, Devis, Evaluations, Besoins
  - Bouton "Convertir en client" sur les prospects
- **/entreprises** : gestion des entreprises clientes (sous Contacts)
- **/besoins** : gestion des besoins de formation exprimes par les clients

### Pedagogie
- **/formations** : catalogue de formations (vue grille avec images, vue liste)
  - Sous-vues : /formations (catalogue), /lieux-formation (salles)
  - Fiche formation avec onglets : Description, Sessions, Documents, Evaluations, Programme, Espace Apprenant
- **/sessions** : sessions de formation planifiees
- **/formateurs** : equipe de formateurs (avec photo, CV, specialites)

### Commercial
- **/commercial** : tableau de bord devis et factures
- **/commercial/devis/nouveau** : creer un devis (peut etre pre-rempli via ?contactId= ou ?entrepriseId= ou ?besoinId=)
- **/commercial/factures/nouveau** : creer une facture (peut etre pre-rempli via ?devisId=)
- **/bpf** : Bilan Pedagogique et Financier

### Qualite (Qualiopi)
- **/evaluations** : gestion des evaluations (satisfaction chaud/froid, acquis)
- **/qualiopi** : suivi qualite avec tableau et vue Qualiopi (7 criteres RNQ)
- **/qualiopi/indicateurs** : KPIs qualite
- **/qualiopi/amelioration** : actions d'amelioration continue (Critere 32)
- **/qualiopi/incidents** : incidents et reclamations
- **/qualiopi/audits** : suivi des audits

### Admin
- **/utilisateurs** : gestion des utilisateurs
- **/parametres** : parametres de l'entreprise, SMTP, questionnaires
- **/dashboard/analytics** : statistiques

## Fonctionnalites IA disponibles
Dans chaque formulaire, des boutons violets "Generer avec IA" permettent de :
- Generer une description, des objectifs, un programme de formation
- Rediger un email de prise de contact, de relance
- Generer un brief de besoin
- Analyser la qualite et proposer un plan d'amelioration

## Regles
- Si une question necessite des donnees, utilise les stats fournies dans le contexte utilisateur
- Si l'utilisateur veut creer/modifier quelque chose, donne le lien direct
- Si tu ne sais pas, dis-le et suggere de contacter le support
- Reste professionnel, concis, et utile`;

export async function POST(req: NextRequest) {
  if (!checkAIKey()) {
    return NextResponse.json({ error: "Cle Anthropic manquante (ANTHROPIC_API_KEY)" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { messages, currentPath } = body as { messages: ChatMessage[]; currentPath?: string };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Aucun message" }, { status: 400 });
    }

    // Recupere stats utiles pour contextualiser
    const [nbContacts, nbFormations, nbSessions, nbDevis, nbFactures, nbBesoins] = await Promise.all([
      prisma.contact.count().catch(() => 0),
      prisma.formation.count({ where: { actif: true } }).catch(() => 0),
      prisma.session.count().catch(() => 0),
      prisma.devis.count().catch(() => 0),
      prisma.facture.count().catch(() => 0),
      prisma.besoinFormation.count().catch(() => 0),
    ]);

    const contextStats = `
## Donnees actuelles du CRM
- ${nbContacts} contacts
- ${nbFormations} formations actives
- ${nbSessions} sessions
- ${nbDevis} devis
- ${nbFactures} factures
- ${nbBesoins} besoins de formation
${currentPath ? `\nPage actuelle de l'utilisateur : ${currentPath}` : ""}
`.trim();

    const systemPrompt = `${CRM_CONTEXT}\n\n${contextStats}`;

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ text });
  } catch (err: unknown) {
    console.error("AI chat error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur IA" }, { status: 500 });
  }
}
