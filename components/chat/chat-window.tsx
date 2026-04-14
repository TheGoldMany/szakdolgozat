"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sender {
  id: string;
  name: string | null;
  role: string;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: Sender;
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("hu-HU", { month: "long", day: "numeric" });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

export function ChatWindow({ conversationId, currentUserId, initialMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      // silent
    }
  }, [conversationId]);

  useEffect(() => {
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [poll]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setInput("");

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400 text-center">
              Még nincsenek üzenetek.<br />
              Kezdd el a beszélgetést!
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.senderId === currentUserId;
          const showDate = i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt);
          const showName = !isOwn && (i === 0 || messages[i - 1].senderId !== msg.senderId);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}
              <div className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
                {!isOwn && (
                  <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-auto text-xs font-semibold text-brand-600">
                    {(msg.sender.name ?? "?")[0].toUpperCase()}
                  </div>
                )}
                <div className={cn("max-w-[75%]", isOwn ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
                  {showName && (
                    <span className="text-xs text-gray-400 ml-1">
                      {msg.sender.name ?? "Ismeretlen"}
                      {msg.sender.role !== "USER" && (
                        <span className="ml-1 text-brand-500">(Menhely)</span>
                      )}
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      isOwn
                        ? "bg-brand-500 text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 mx-1">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Írj üzenetet... (Enter = küld)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="rounded-xl bg-brand-500 p-2.5 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
