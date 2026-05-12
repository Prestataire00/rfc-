"use client";

// Wrapper qui charge la liste des utilisateurs assignables avant de rendre
// le PipelinePanel — pratique pour intégration en 1 ligne dans les fiches.

import { useApi } from "@/hooks/useApi";
import { PipelinePanel } from "./PipelinePanel";
import type { AssignableUser } from "./types";

type ApiUser = {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  actif: boolean;
};

type Props = {
  entityType: "session" | "prospect";
  entityId: string;
  currentUserRole: string;
  currentUserId?: string;
};

export function PipelinePanelLoader(props: Props) {
  const { data: users } = useApi<ApiUser[]>("/api/utilisateurs");
  const assignable: AssignableUser[] = (users ?? [])
    .filter((u) => u.actif && u.role !== "client")
    .map((u) => ({ id: u.id, nom: u.nom, prenom: u.prenom, role: u.role }));

  return <PipelinePanel {...props} assignableUsers={assignable} />;
}
