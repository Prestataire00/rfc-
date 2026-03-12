import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
    formateurId?: string | null;
    entrepriseId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      formateurId?: string | null;
      entrepriseId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    formateurId?: string | null;
    entrepriseId?: string | null;
  }
}
