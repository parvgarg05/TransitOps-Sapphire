"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, SendHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DashboardFilters } from "./FilterBar";
import type { DashboardChatContext } from "@/lib/chatbot";

type ChatRole = "assistant" | "user";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface DashboardChatbotProps {
  dashboardContext: {
    role?: string;
    view: "default" | "full";
    filters: DashboardFilters;
    kpis?: Record<string, number | null | undefined>;
  };
}

function buildContext(
  dashboardContext: DashboardChatbotProps["dashboardContext"]
): DashboardChatContext {
  return {
    page: "dashboard",
    role: dashboardContext.role,
    view: dashboardContext.view,
    filters: dashboardContext.filters,
    kpis: dashboardContext.kpis,
  };
}

function createMessage(role: ChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

export function DashboardChatbot({ dashboardContext }: DashboardChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "Hi, I can help with dashboard metrics, vehicles, drivers, trips, maintenance, and reports. Ask me anything about the operations app."
    ),
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const context = useMemo(() => buildContext(dashboardContext), [dashboardContext]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();

    if (!trimmed || isSending) {
      return;
    }

    const userMessage = createMessage("user", trimmed);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          context,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "Failed to reach chatbot backend");
      }

      const data = (await response.json()) as { reply?: string };
      setMessages((current) => [
        ...current,
        createMessage("assistant", data.reply ?? "I could not generate a reply."),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chatbot request failed");
      setMessages((current) => [
        ...current,
        createMessage(
          "assistant",
          "I could not reach the chatbot backend right now. Please try again in a moment."
        ),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open dashboard assistant"
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/20"
        size="icon-lg"
      >
        <MessageCircle className="h-5 w-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(92vw,420px)] max-w-none gap-0 overflow-hidden rounded-2xl border border-border/60 p-0 shadow-2xl"
        >
          <div className="flex h-[min(78vh,760px)] flex-col bg-background">
            <DialogHeader className="border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-sm font-semibold tracking-[-0.02em]">
                      TransitOps Assistant
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      Ask about operations, dashboard KPIs, or workflow guidance.
                    </DialogDescription>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close dashboard assistant"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.00)_100%)] px-4 py-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border/60 bg-background px-4 py-3">
              {error && (
                <p className="mb-2 text-xs text-destructive">{error}</p>
              )}
              <div className="space-y-2">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a question and press Enter..."
                  className="min-h-24 resize-none"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Shift+Enter for a new line.
                  </p>
                  <Button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={isSending || !input.trim()}
                    className="gap-2"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}