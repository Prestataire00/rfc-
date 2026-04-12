"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content: "Bonjour ! Je suis votre assistant RFC. Posez-moi vos questions sur l'utilisation du CRM (creer un devis, gerer un prospect, Qualiopi, etc.). Comment puis-je vous aider ?",
};

export function Chatbot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.slice(-10), currentPath: pathname }),
      });
      const data = await res.json();
      if (res.ok && data.text) {
        setMessages((p) => [...p, { role: "assistant", content: data.text }]);
      } else {
        setMessages((p) => [...p, { role: "assistant", content: "Erreur : " + (data.error || "service indisponible") }]);
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Erreur reseau. Reessayez dans un instant." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleReset = () => setMessages([WELCOME]);

  // Ne pas afficher le chatbot sur les pages publiques
  const PUBLIC = ["/login", "/evaluation/", "/inscription-stagiaire"];
  if (PUBLIC.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-all hover:scale-105"
          aria-label="Ouvrir l'assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Panneau chat */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-100">Assistant RFC</p>
                <p className="text-[11px] text-gray-400">Propulse par Claude</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded" title="Nouvelle conversation">Reset</button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400" aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-red-600 text-white"
                      : "bg-gray-800 border border-gray-700 text-gray-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reflexion...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-700 bg-gray-800">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez votre question..."
                rows={1}
                className="flex-1 resize-none rounded-md border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-red-500 max-h-24"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1.5 text-center">Entree pour envoyer · Shift+Entree pour une nouvelle ligne</p>
          </div>
        </div>
      )}
    </>
  );
}
