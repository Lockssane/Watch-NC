import { useState } from "react";
import type { ChatMessage } from "../types";

interface CossChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export function CossChat({ messages, onSend }: CossChatProps) {
  const [input, setInput] = useState("");

  function submit() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  }

  return (
    <section className="pointer-events-auto fixed bottom-6 right-6 z-30 w-[min(420px,calc(100vw-32px))] rounded-[28px] border border-radar/20 bg-slate-950/70 shadow-glass backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-radar/70">COSS</p>
          <p className="mt-1 text-sm text-slate-300">Assistant de quart et de navigation</p>
        </div>
        <div className="rounded-full border border-radar/20 bg-radar/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-radar">
          IA active
        </div>
      </div>

      <div className="max-h-[280px] space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "assistant" ? "mr-6" : "ml-10"}
          >
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {message.role === "assistant" ? "COSS" : "Operateur"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{message.content}</p>
            </div>
            {message.payload ? (
              <div className="mt-2 rounded-2xl border border-radar/10 bg-radar/[0.03] px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-radar/70">
                  {message.payload.action.type} {"->"} {message.payload.action.target}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.payload.suggestions.map((suggestion) => (
                    <span
                      key={suggestion}
                      className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-slate-400"
                    >
                      {suggestion}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex gap-3 border-t border-white/8 p-4">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          className="flex-1 rounded-full border border-radar/15 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-radar/40"
          placeholder="Demandez a COSS... navires en alerte, situation dans la zone nord, etc."
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-full border border-radar/30 bg-radar/10 px-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-radar/20"
        >
          Envoyer
        </button>
      </div>
    </section>
  );
}
