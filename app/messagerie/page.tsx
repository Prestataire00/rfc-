"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Plus, Send, Loader2, MessageSquare, Users } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useApi, useApiMutation, invalidate } from "@/hooks/useApi";
import { notify } from "@/lib/toast";
import { ApiError, api } from "@/lib/fetcher";
import { formatDatetime } from "@/lib/utils";

interface ConvUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Participant {
  id: string;
  userId: string;
  joinedAt: string;
  lastReadAt: string | null;
  user: ConvUser;
}

interface Message {
  id: string;
  conversationId: string;
  userId: string;
  contenu: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  sujet: string | null;
  dernierMessageAt: string | null;
  createdAt: string;
  sessionId: string | null;
  participants: Participant[];
  _count?: { messages: number };
}

interface ConversationDetail extends Conversation {
  messages: Message[];
}

interface SessionItem {
  id: string;
  formation?: { titre: string };
  dateDebut: string;
}

interface SessionsResponse {
  data: SessionItem[];
}

export default function MessageriePage() {
  const { data: authSession } = useSession();
  const myUserId = authSession?.user?.id;

  const { data: conversations, error: conversationsError, isLoading: loadingConvs, mutate: mutateConvList } =
    useApi<Conversation[]>("/api/conversations");
  const { data: users } = useApi<ConvUser[]>("/api/utilisateurs");
  const { data: sessionsData } = useApi<SessionsResponse>("/api/sessions?limit=50");
  const sessions = sessionsData?.data;

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: selected, mutate: mutateConv } = useApi<ConversationDetail>(
    selectedId ? `/api/conversations/${selectedId}` : null
  );

  // Mark-as-read on open
  useEffect(() => {
    if (!selectedId) return;
    api.post(`/api/conversations/${selectedId}/read`).then(() => {
      mutateConvList();
    }).catch(() => {});
  }, [selectedId, mutateConvList]);

  const [openNew, setOpenNew] = useState(false);
  const [newConv, setNewConv] = useState({
    participantIds: [] as string[],
    sujet: "",
    sessionId: "",
  });

  const { trigger: createConv, isMutating: creatingConv } = useApiMutation<Record<string, unknown>, Conversation>(
    "/api/conversations",
    "POST"
  );

  const handleCreateConv = async () => {
    if (newConv.participantIds.length === 0) {
      notify.error("Selectionnez au moins un participant");
      return;
    }
    try {
      const created = await createConv({
        participantUserIds: newConv.participantIds,
        sujet: newConv.sujet || null,
        sessionId: newConv.sessionId || null,
      });
      await invalidate("/api/conversations");
      notify.success("Conversation creee");
      setSelectedId(created.id);
      setOpenNew(false);
      setNewConv({ participantIds: [], sujet: "", sessionId: "" });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Erreur";
      notify.error("Erreur", msg);
    }
  };

  // Send message
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    try {
      await api.post(`/api/conversations/${selectedId}/messages`, { contenu: draft.trim() });
      setDraft("");
      await mutateConv();
      await mutateConvList();
    } catch {
      notify.error("Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [selected?.messages.length]);

  const sortedConvs = useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort((a, b) => {
      const ad = a.dernierMessageAt ?? a.createdAt;
      const bd = b.dernierMessageAt ?? b.createdAt;
      return new Date(bd).getTime() - new Date(ad).getTime();
    });
  }, [conversations]);

  const isUnread = (c: Conversation) => {
    if (!myUserId || !c.dernierMessageAt) return false;
    const me = c.participants.find((p) => p.userId === myUserId);
    if (!me) return false;
    if (!me.lastReadAt) return true;
    return new Date(c.dernierMessageAt) > new Date(me.lastReadAt);
  };

  const convLabel = (c: Conversation) => {
    if (c.sujet) return c.sujet;
    const others = c.participants.filter((p) => p.userId !== myUserId);
    return others.map((p) => `${p.user.prenom} ${p.user.nom}`).join(", ") || "Conversation";
  };

  const otherUserOptions = (users ?? []).filter((u) => u.id !== myUserId);
  const sessionOptions = [
    { value: "", label: "Aucune session" },
    ...((sessions ?? []).map((s) => ({
      value: s.id,
      label: `${s.formation?.titre ?? "Session"} - ${new Date(s.dateDebut).toLocaleDateString("fr-FR")}`,
    }))),
  ];

  return (
    <div>
      <PageHeader title="Messagerie" description="Conversations multi-participants" />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Sidebar conversations */}
        <aside className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Conversations</h2>
            <button
              onClick={() => setOpenNew(true)}
              className="rounded-md bg-red-600 hover:bg-red-700 p-1.5 text-white"
              aria-label="Nouvelle conversation"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvs ? (
              <p className="text-xs text-gray-500 text-center py-8">Chargement...</p>
            ) : conversationsError ? (
              <p className="text-xs text-red-400 text-center py-8 px-3">
                Impossible de charger les conversations.
              </p>
            ) : sortedConvs.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">Aucune conversation</p>
            ) : (
              sortedConvs.map((c) => {
                const unread = isUnread(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-200 dark:border-gray-700/40 transition-colors ${
                      selectedId === c.id
                        ? "bg-red-600/10"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${unread ? "font-bold text-gray-50" : "font-medium text-gray-800 dark:text-gray-200"}`}>
                        {convLabel(c)}
                      </p>
                      {unread && <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {c.dernierMessageAt
                        ? formatDatetime(c.dernierMessageAt)
                        : "Pas encore de message"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main thread */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <MessageSquare className="h-10 w-10 mb-3 text-gray-500" />
              <p className="text-sm">Selectionnez une conversation</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{convLabel(selected)}</h3>
                <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <Users className="h-3 w-3" />
                  {selected.participants.length} participant{selected.participants.length > 1 ? "s" : ""}
                </p>
              </div>
              <div ref={messagesRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {[...selected.messages].reverse().map((m) => {
                  const isMe = m.userId === myUserId;
                  const author = selected.participants.find((p) => p.userId === m.userId)?.user;
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-3 py-2 ${
                          isMe
                            ? "bg-red-600 text-white"
                            : "bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        {!isMe && author && (
                          <p className="text-[11px] font-semibold opacity-80 mb-0.5">
                            {author.prenom} {author.nom}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.contenu}</p>
                        <p className="text-[10px] opacity-70 mt-1 text-right">
                          {formatDatetime(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {selected.messages.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-4">Pas encore de message.</p>
                )}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-end gap-2">
                <Textarea
                  placeholder="Votre message..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 resize-none"
                />
                <Button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="bg-red-600 hover:bg-red-700 h-10"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* New conversation modal */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent
          onClose={() => setOpenNew(false)}
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
        >
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Sujet (optionnel)</Label>
              <Input
                value={newConv.sujet}
                onChange={(e) => setNewConv({ ...newConv, sujet: e.target.value })}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Session associee (optionnel)</Label>
              <Select
                value={newConv.sessionId}
                onChange={(e) => setNewConv({ ...newConv, sessionId: e.target.value })}
                options={sessionOptions}
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Participants *</Label>
              <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 space-y-1">
                {otherUserOptions.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">Aucun utilisateur</p>
                ) : (
                  otherUserOptions.map((u) => {
                    const checked = newConv.participantIds.includes(u.id);
                    return (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white dark:hover:bg-gray-800 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setNewConv((prev) => ({
                              ...prev,
                              participantIds: checked
                                ? prev.participantIds.filter((x) => x !== u.id)
                                : [...prev.participantIds, u.id],
                            }));
                          }}
                          className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-red-600 focus:ring-red-600"
                        />
                        <span>{u.prenom} {u.nom}</span>
                        <span className="text-[11px] text-gray-500 ml-auto">{u.email}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                {newConv.participantIds.length} selectionne(s)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Annuler</Button>
            <Button
              onClick={handleCreateConv}
              disabled={creatingConv}
              className="bg-red-600 hover:bg-red-700"
            >
              {creatingConv ? "Creation..." : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
