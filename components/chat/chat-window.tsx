"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import { Send, Paperclip, X, FileText, Image as ImageIcon, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface Sender {
  id: string;
  name: string | null;
  role: string;
}

interface Message {
  id: string;
  content: string | null;
  attachmentUrl:  string | null;
  attachmentName: string | null;
  senderId: string;
  createdAt: string;
  type?: string;
  inviteToken?: string | null;
  sender: Sender;
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
}

function formatTime(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string, locale: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale, { month: "long", day: "numeric" });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function isImage(name: string | null) {
  if (!name) return false;
  return /\.(jpe?g|png|webp|gif)$/i.test(name);
}

function InviteMessageBubble({ token, own }: { token: string; own: boolean }) {
  const t = useTranslations("messages");

  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 text-sm",
        own
          ? "bg-brand-500 text-white rounded-br-sm"
          : "bg-gray-100 text-gray-800 rounded-bl-sm"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList className="h-4 w-4 shrink-0" />
        <span className="font-semibold">{t("inviteTitle")}</span>
      </div>
      <p className="text-xs mb-2 opacity-80">
        {t("inviteHint")}
      </p>
      <a
        href={`/apply/${token}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
          own
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-brand-500 text-white hover:bg-brand-600"
        )}
      >
        <ClipboardList className="h-3.5 w-3.5" />
        {t("inviteAction")}
      </a>
    </div>
  );
}

function AttachmentBubble({ url, name, own }: { url: string; name: string | null; own: boolean }) {
  const t = useTranslations("messages");
  const displayName = name ?? t("attachment");
  const img = isImage(name);

  if (img) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={displayName}
          className="max-w-[220px] rounded-xl object-cover border border-white/20"
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "mt-1.5 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
        own
          ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
          : "border-gray-200 bg-white text-brand-600 hover:bg-brand-50"
      )}
    >
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[160px]">{displayName}</span>
    </a>
  );
}

export function ChatWindow({ conversationId, currentUserId, initialMessages }: ChatWindowProps) {
  const t       = useTranslations("messages");
  const tCommon = useTranslations("common");
  const locale  = useLocale();
  const [messages, setMessages]         = useState<Message[]>(initialMessages);
  const [input, setInput]               = useState("");
  const [sending, setSending]           = useState(false);
  const [attachment, setAttachment]     = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState("");
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const prevCountRef   = useRef(initialMessages.length);
  const isFirstRef     = useRef(true);

  // Scroll to bottom only on initial load or when a new message arrives
  useEffect(() => {
    if (isFirstRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isFirstRef.current = false;
    } else if (messages.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = messages.length;
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
    // 10s polling, de csak ha a fül látható (nem pazarol kérést háttérben)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") poll();
    }, 10000);
    // Azonnali frissítés, amikor a fül újra aktívvá válik
    const onVisible = () => { if (document.visibilityState === "visible") poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const ext        = file.name.split(".").pop() ?? "bin";
      const uniqueName = `chat-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const blob       = await upload(uniqueName, file, {
        access:          "public",
        handleUploadUrl: "/api/upload/attachment",
      });
      setAttachment({ url: blob.url, name: file.name });
    } catch {
      setUploadError(tCommon("uploadFailedRetry"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function sendMessage() {
    const content = input.trim();
    if ((!content && !attachment) || sending) return;

    setSending(true);
    const prev = input;
    const prevAttachment = attachment;
    setInput("");
    setAttachment(null);

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          content:        content || undefined,
          attachmentUrl:  prevAttachment?.url,
          attachmentName: prevAttachment?.name,
        }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
      } else {
        // Restore on failure
        setInput(prev);
        setAttachment(prevAttachment);
        toast.error(t("sendFailed"));
      }
    } catch {
      setInput(prev);
      setAttachment(prevAttachment);
      toast.error(tCommon("networkError"));
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
              {t("emptyThread")}<br />
              {t("startConversation")}
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn    = msg.senderId === currentUserId;
          const showDate = i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt);
          const showName = !isOwn && (i === 0 || messages[i - 1].senderId !== msg.senderId);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400">{formatDate(msg.createdAt, locale)}</span>
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
                      {msg.sender.name ?? tCommon("unknown")}
                      {msg.sender.role !== "USER" && (
                        <span className="ml-1 text-brand-500">({t("shelterTag")})</span>
                      )}
                    </span>
                  )}
                  {msg.type === "INVITE" && msg.inviteToken ? (
                    <InviteMessageBubble token={msg.inviteToken} own={isOwn} />
                  ) : (msg.content || msg.attachmentUrl) ? (
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                        isOwn
                          ? "bg-brand-500 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      )}
                    >
                      {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                      {msg.attachmentUrl && (
                        <AttachmentBubble
                          url={msg.attachmentUrl}
                          name={msg.attachmentName}
                          own={isOwn}
                        />
                      )}
                    </div>
                  ) : null}
                  <span className="text-[10px] text-gray-400 mx-1">{formatTime(msg.createdAt, locale)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-100 p-3 space-y-2">
        {/* Pending attachment preview */}
        {(attachment || uploading) && (
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                <span className="text-xs text-gray-500">{tCommon("uploading")}</span>
              </>
            ) : attachment ? (
              <>
                {isImage(attachment.name)
                  ? <ImageIcon className="h-4 w-4 shrink-0 text-brand-500" />
                  : <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                }
                <span className="flex-1 truncate text-xs text-gray-700">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
          </div>
        )}
        {uploadError && <p className="text-xs text-red-500 px-1">{uploadError}</p>}

        <div className="flex items-end gap-2">
          {/* Attach button */}
          <label className={cn(
            "flex h-[42px] w-[42px] shrink-0 cursor-pointer items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-brand-500",
            uploading && "pointer-events-none opacity-50"
          )}>
            <Paperclip className="h-4 w-4" />
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif"
              className="sr-only"
              disabled={uploading || sending}
              onChange={handleFileChange}
            />
          </label>

          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("inputPlaceholder")}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && !attachment) || sending || uploading}
            className="rounded-xl bg-brand-500 p-2.5 text-white hover:bg-brand-600 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
