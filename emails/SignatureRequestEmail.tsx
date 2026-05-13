import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface Props {
  signataireNom: string;
  documentTitre: string;
  expediteurNom: string;
  signUrl: string;
  expiresAt: Date;
}

export default function SignatureRequestEmail({
  signataireNom,
  documentTitre,
  expediteurNom,
  signUrl,
  expiresAt,
}: Props) {
  const expirationLabel = `${expiresAt.toLocaleDateString("fr-FR")} à ${expiresAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
  return (
    <Html>
      <Head />
      <Preview>{documentTitre} — Document à signer</Preview>
      <Body style={{ backgroundColor: "#f3f4f6", fontFamily: "Arial, sans-serif", padding: 32 }}>
        <Container
          style={{
            backgroundColor: "white",
            borderRadius: 8,
            padding: 32,
            maxWidth: 560,
            margin: "0 auto",
          }}
        >
          <Heading style={{ marginTop: 0 }}>Document à signer</Heading>
          <Text>Bonjour {signataireNom},</Text>
          <Text>
            {expediteurNom} (Rescue Formation Conseil) vous demande de signer
            électroniquement le document suivant :
          </Text>
          <Section
            style={{
              backgroundColor: "#f3f4f6",
              padding: 16,
              borderRadius: 4,
              marginTop: 16,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontWeight: "bold", margin: 0 }}>{documentTitre}</Text>
          </Section>
          <Section style={{ marginTop: 24, textAlign: "center" }}>
            <Button
              href={signUrl}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                padding: "12px 24px",
                borderRadius: 4,
                textDecoration: "none",
                display: "inline-block",
                fontWeight: 500,
              }}
            >
              Signer le document
            </Button>
          </Section>
          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 24 }}>
            Ce lien est personnel et expire le {expirationLabel}. Ne le partagez avec personne.
          </Text>
          <Hr style={{ borderColor: "#e5e7eb", marginTop: 24 }} />
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 16 }}>
            Rescue Formation Conseil — projetrfc.netlify.app
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
