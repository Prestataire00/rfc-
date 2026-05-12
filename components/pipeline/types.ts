export type PipelineTask = {
  id: string;
  etape: string;
  titre: string;
  description: string | null;
  ordre: number;
  completed: boolean;
  completedAt: string | null;
  dueDate: string | null;
  assigneeId: string | null;
  source: "template" | "adhoc";
  createdAt: string;
  updatedAt: string;
};

export type PipelineTransition = {
  id: string;
  createdAt: string;
  entityType: string;
  entityId: string;
  fromEtape: string | null;
  toEtape: string;
  byUserId: string | null;
  notes: string | null;
};

export type PipelineData = {
  session?: { id: string; etape: string; etapeMajAt: string };
  prospect?: { id: string; etape: string; etapeMajAt: string };
  tasks: PipelineTask[];
  transitions: PipelineTransition[];
};

export type AssignableUser = {
  id: string;
  nom: string;
  prenom: string;
  role: string;
};
