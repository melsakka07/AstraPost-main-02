"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { Copy, Check, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { UserProfile } from "@/components/auth/user-profile";
import { Button } from "@/components/ui/button";
import { useUpgradeModal } from "@/components/ui/upgrade-modal";
import { useSession } from "@/lib/auth-client";
import type { Components } from "react-markdown";

const H1: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = (props) => (
  <h1 className="mt-2 mb-3 text-2xl font-bold" {...props} />
);
const H2: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = (props) => (
  <h2 className="mt-2 mb-2 text-xl font-semibold" {...props} />
);
const H3: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = (props) => (
  <h3 className="mt-2 mb-2 text-lg font-semibold" {...props} />
);
const Paragraph: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = (props) => (
  <p className="mb-3 text-sm leading-7" {...props} />
);
const UL: React.FC<React.HTMLAttributes<HTMLUListElement>> = (props) => (
  <ul className="ms-5 mb-3 list-disc space-y-1 text-sm" {...props} />
);
const OL: React.FC<React.OlHTMLAttributes<HTMLOListElement>> = (props) => (
  <ol className="ms-5 mb-3 list-decimal space-y-1 text-sm" {...props} />
);
const LI: React.FC<React.LiHTMLAttributes<HTMLLIElement>> = (props) => (
  <li className="leading-6" {...props} />
);
const Anchor: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = (props) => (
  <a
    className="text-primary underline underline-offset-2 hover:opacity-90"
    target="_blank"
    rel="noreferrer noopener"
    {...props}
  />
);
const Blockquote: React.FC<React.BlockquoteHTMLAttributes<HTMLElement>> = (props) => (
  <blockquote className="border-border text-muted-foreground mb-3 border-s-2 ps-3" {...props} />
);
const Code: Components["code"] = ({ children, className, ...props }) => {
  const match = /language-(\w+)/.exec(className || "");
  const isInline = !match;

  if (isInline) {
    return (
      <code className="bg-muted rounded px-1 py-0.5 text-xs" {...props}>
        {children}
      </code>
    );
  }
  return (
    <pre className="bg-muted mb-3 w-full overflow-x-auto rounded-md p-3">
      <code className="text-xs leading-5" {...props}>
        {children}
      </code>
    </pre>
  );
};
const HR: React.FC<React.HTMLAttributes<HTMLHRElement>> = (props) => (
  <hr className="border-border my-4" {...props} />
);
const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = (props) => (
  <div className="mb-3 overflow-x-auto">
    <table className="w-full border-collapse text-sm" {...props} />
  </div>
);
const TH: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = (props) => (
  <th className="border-border bg-muted border px-2 py-1 text-start" {...props} />
);
const TD: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = (props) => (
  <td className="border-border border px-2 py-1" {...props} />
);

const markdownComponents: Components = {
  h1: H1,
  h2: H2,
  h3: H3,
  p: Paragraph,
  ul: UL,
  ol: OL,
  li: LI,
  a: Anchor,
  blockquote: Blockquote,
  code: Code,
  hr: HR,
  table: Table,
  th: TH,
  td: TD,
};

type TextPart = { type?: string; text?: string };
type MaybePartsMessage = {
  display?: ReactNode;
  parts?: TextPart[];
  content?: TextPart[];
};

interface PlanLimitPayload {
  error?: string;
  code?: string;
  message?: string;
  feature?: string;
  plan?: string;
  limit?: number | null;
  used?: number;
  remaining?: number | null;
  upgrade_url?: string;
  suggested_plan?: string;
  trial_active?: boolean;
  reset_at?: string | null;
}

function extractPlanLimitPayloadFromErrorMessage(errorMessage: string): PlanLimitPayload | null {
  const start = errorMessage.indexOf("{");
  const end = errorMessage.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(errorMessage.slice(start, end + 1)) as PlanLimitPayload;
  } catch {
    return null;
  }
}

function extractPlanLimitPayload(error: Error): PlanLimitPayload | null {
  const withCause = error as Error & { cause?: unknown };
  const cause = withCause.cause as { data?: unknown; body?: unknown } | undefined;
  const fromCause = cause?.data || cause?.body;
  if (fromCause && typeof fromCause === "object") {
    const payload = fromCause as PlanLimitPayload;
    if (payload.code === "upgrade_required" || payload.code === "quota_exceeded") {
      return payload;
    }
  }

  return extractPlanLimitPayloadFromErrorMessage(error.message || "");
}

function getMessageText(message: MaybePartsMessage): string {
  const parts = Array.isArray(message.parts)
    ? message.parts
    : Array.isArray(message.content)
      ? message.content
      : [];
  return parts
    .filter((p) => p?.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n");
}

function renderMessageContent(message: MaybePartsMessage): ReactNode {
  if (message.display) return message.display;
  const parts = Array.isArray(message.parts)
    ? message.parts
    : Array.isArray(message.content)
      ? message.content
      : [];
  return parts.map((p, idx) =>
    p?.type === "text" && p.text ? (
      <ReactMarkdown key={idx} components={markdownComponents}>
        {p.text}
      </ReactMarkdown>
    ) : null
  );
}

function formatTimestamp(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function CopyButton({
  text,
  labels,
}: {
  text: string;
  labels: { copied: string; failed: string; tooltip: string };
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(labels.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(labels.failed);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className="min-h-[44px] min-w-[44px]"
      aria-label={labels.tooltip}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="text-muted-foreground h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="bg-muted flex max-w-[80%] items-center gap-2 rounded-lg p-3">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  );
}

const STORAGE_KEY = "chat-messages";

export default function ChatPage() {
  const t = useTranslations("chat");
  const locale = useLocale();
  const { data: session, isPending } = useSession();
  const { openWithContext } = useUpgradeModal();
  const { messages, sendMessage, status, error, setMessages } = useChat({
    onError: (err) => {
      const payload = extractPlanLimitPayload(err);
      if (payload?.code === "upgrade_required" || payload?.code === "quota_exceeded") {
        openWithContext({
          error: payload.error,
          code: payload.code,
          message: payload.message,
          feature: payload.feature,
          plan: payload.plan,
          limit: payload.limit,
          used: payload.used,
          remaining: payload.remaining,
          upgradeUrl: payload.upgrade_url,
          suggestedPlan: payload.suggested_plan,
          trialActive: payload.trial_active,
          resetAt: payload.reset_at,
        });
      }
      toast.error(err.message || t("failed_to_send"));
    },
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, [setMessages]);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to the latest message whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Push content above the virtual keyboard on iOS (visualViewport API)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setKeyboardHeight(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    toast.success(t("chat_cleared"));
  };

  if (isPending) {
    return <div className="container mx-auto px-4 py-12">{t("loading")}</div>;
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <UserProfile />
        </div>
      </div>
    );
  }

  const isStreaming = status === "streaming";

  return (
    // Outer wrapper fills the visual viewport; paddingBottom shrinks content above the
    // virtual keyboard on iOS 15 and older (where dvh doesn't track the keyboard).
    // On Android / iOS 16+ dvh already adjusts, so keyboardHeight stays 0.
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={keyboardHeight > 0 ? { paddingBottom: `${keyboardHeight}px` } : undefined}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col px-4">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b py-4">
          <h1 className="text-xl font-bold sm:text-2xl">{t("title")}</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-muted-foreground hidden text-sm sm:block">
              {t("welcome", { name: session.user.name })}
            </span>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearMessages} className="min-h-[44px]">
                {t("clear_chat")}
              </Button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="shrink-0 py-2">
            <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-3">
              <p className="text-destructive text-sm">
                Error: {error.message || t("error_generic")}
              </p>
            </div>
          </div>
        )}

        {/* Messages — flex-1 so it fills available space and scrolls independently */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
          {messages.length === 0 && (
            <div className="text-muted-foreground py-12 text-center">{t("empty_state")}</div>
          )}
          {messages.map((message) => {
            const messageText = getMessageText(message as MaybePartsMessage);
            const createdAt = (message as { createdAt?: Date }).createdAt;
            const timestamp = createdAt ? formatTimestamp(new Date(createdAt), locale) : null;

            return (
              <div
                key={message.id}
                className={`group rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-auto max-w-[80%]"
                    : "bg-muted max-w-[80%]"
                }`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {message.role === "user" ? t("you") : t("ai")}
                    </span>
                    {timestamp && <span className="text-xs opacity-60">{timestamp}</span>}
                  </div>
                  {message.role === "assistant" && messageText && (
                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                      <CopyButton
                        text={messageText}
                        labels={{
                          copied: t("copied"),
                          failed: t("failed_to_copy"),
                          tooltip: t("copy_tooltip"),
                        }}
                      />
                    </div>
                  )}
                </div>
                <div>{renderMessageContent(message as MaybePartsMessage)}</div>
              </div>
            );
          })}
          {isStreaming && messages[messages.length - 1]?.role === "user" && (
            <ThinkingIndicator label={t("ai_thinking")} />
          )}
          {/* Scroll anchor — auto-scroll targets this element */}
          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

        {/* Input form — pinned to the bottom; safe-area inset for iPhone home bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const text = input.trim();
            if (!text) return;
            sendMessage({ role: "user", parts: [{ type: "text", text }] });
            setInput("");
          }}
          className="flex shrink-0 gap-2 border-t py-3"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* text-base prevents iOS from auto-zooming when input font-size < 16px */}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("placeholder")}
            className="border-border focus:ring-ring min-h-[44px] flex-1 rounded-md border px-3 py-2 text-base focus:ring-2 focus:outline-none"
            disabled={isStreaming}
          />
          <Button type="submit" disabled={!input.trim() || isStreaming} className="min-h-[44px]">
            {isStreaming ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("sending")}
              </>
            ) : (
              t("send")
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
