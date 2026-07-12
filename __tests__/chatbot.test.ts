import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildChatbotRequestPayload,
  normalizeChatbotBackendResponse,
  sendChatbotMessage,
} from "@/lib/chatbot";

describe("chatbot helpers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds a normalized request payload", () => {
    const payload = buildChatbotRequestPayload({
      message: "  How many vehicles are on trip?  ",
      context: {
        page: "dashboard",
        role: "Fleet Manager",
        view: "default",
        filters: { region: "North" },
      },
      user: {
        id: "user-1",
        email: "user@example.com",
        role: "Fleet Manager",
      },
    });

    expect(payload.message).toBe("How many vehicles are on trip?");
    expect(payload.source).toBe("transitops-dashboard");
    expect(payload.context?.page).toBe("dashboard");
    expect(payload.user.id).toBe("user-1");
  });

  it("normalizes multiple backend response shapes", () => {
    expect(normalizeChatbotBackendResponse({ reply: "Hello" })).toEqual({
      reply: "Hello",
    });

    expect(normalizeChatbotBackendResponse({ answer: "Hi" })).toEqual({
      reply: "Hi",
    });
  });

  it("sends messages to the backend and normalizes the response", async () => {
    vi.stubEnv("CHATBOT_BACKEND_URL", "http://localhost:4000/chat");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ reply: "There are 3 vehicles on trip." }),
      }) as unknown as typeof fetch
    );

    const response = await sendChatbotMessage({
      message: "How many vehicles are on trip?",
      context: {
        page: "dashboard",
        role: "Fleet Manager",
        view: "default",
      },
      user: {
        id: "user-1",
        email: "user@example.com",
        role: "Fleet Manager",
      },
    });

    expect(response.reply).toBe("There are 3 vehicles on trip.");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("throws when the backend is unavailable", async () => {
    vi.stubEnv("CHATBOT_BACKEND_URL", "http://localhost:4000/chat");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: vi.fn(),
      }) as unknown as typeof fetch
    );

    await expect(
      sendChatbotMessage({
        message: "Hello",
        user: { id: "user-1" },
      })
    ).rejects.toThrow("Chatbot backend request failed with status 502");
  });
});