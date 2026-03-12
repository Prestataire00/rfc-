import { LoginForm } from "@/components/auth/login-form";
import { GraduationCap } from "lucide-react";

export default function ConnexionPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">FormaPro</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Plateforme de gestion de la formation
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
