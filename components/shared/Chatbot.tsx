"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, Sparkles, RotateCcw } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content: "Bonjour, je suis votre assistant RFC. Posez-moi vos questions sur le CRM, les devis, les prospects ou la conformite Qualiopi.",
};

export function Chatbot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.slice(-10), currentPath: pathname, stream: true }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("stream failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const data = JSON.parse(payload);
            if (data.text) {
              setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", content: data.text }; return copy; });
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", content: "Desole, une erreur est survenue." }; return copy; });
      }
    } finally { setStreaming(false); abortRef.current = null; }
  }

  function stop() { abortRef.current?.abort(); setStreaming(false); }
  function handleKey(e: React.KeyboardEvent) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }
  function handleReset() { if (streaming) stop(); setMessages([WELCOME]); }

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105">
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center"><Sparkles className="h-4 w-4 text-white" /></div>
              <div><p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Assistant RFC</p><p className="text-[11px] text-gray-500">Propulse par Claude</p></div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-1 rounded inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> Reset</button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => {
              const showCursor = i === messages.length - 1 && streaming && m.role === "assistant";
              return (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${m.role === "user" ? "bg-red-600 text-white" : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200"}`}>
                    {m.content}{showCursor && <span className="inline-block w-2 h-4 ml-0.5 bg-gray-400 animate-pulse" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-end gap-2">
              <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Posez votre question" rows={1} disabled={streaming}
                className="flex-1 resize-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-red-500 max-h-24 disabled:opacity-60" />
              {streaming ? (
                <button onClick={stop} className="h-9 w-9 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white flex items-center justify-center"><X className="h-4 w-4" /></button>
              ) : (
                <button onClick={send} disabled={!input.trim()} className="h-9 w-9 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center disabled:opacity-40"><Send className="h-4 w-4" /></button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
