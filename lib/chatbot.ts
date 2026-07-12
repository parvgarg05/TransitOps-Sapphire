export interface DashboardChatFilters {
  vehicleType?: string;
  status?: string;
  region?: string;
}

export interface DashboardChatContext {
  page: "dashboard";
  role?: string;
  view?: "default" | "full";
  filters?: DashboardChatFilters;
  kpis?: Record<string, number | null | undefined>;
}

export interface ChatbotUserContext {
  id: string;
  email?: string | null;
  role?: string | null;
}

export interface ChatbotMessageRequest {
  message: string;
  context?: DashboardChatContext;
  user: ChatbotUserContext;
}

export interface ChatbotMessageResponse {
  reply: string;
  conversationId?: string;
  metadata?: Record<string, unknown>;
}

function getChatbotBackendUrl(): string {
  const backendUrl = process.env.CHATBOT_BACKEND_URL?.trim();

  if (!backendUrl) {
    throw new Error("CHATBOT_BACKEND_URL is not configured");
  }

  return backendUrl;
}

export function buildChatbotRequestPayload(request: ChatbotMessageRequest) {
  return {
    source: "transitops-dashboard",
    message: request.message.trim(),
    context: request.context ?? null,
    user: request.user,
    timestamp: new Date().toISOString(),
  };
}

export function normalizeChatbotBackendResponse(
  data: unknown
): ChatbotMessageResponse {
  const payload = data as Record<string, unknown> | null | undefined;
  const replyCandidate =
    typeof payload?.reply === "string"
      ? payload.reply
      : typeof payload?.answer === "string"
        ? payload.answer
        : typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.text === "string"
            ? payload.text
            : "";

  if (!replyCandidate) {
    throw new Error("Invalid chatbot response received from backend");
  }

  const response: ChatbotMessageResponse = {
    reply: replyCandidate,
  };

  if (typeof payload?.conversationId === "string") {
    response.conversationId = payload.conversationId;
  }

  if (payload?.metadata && typeof payload.metadata === "object") {
    response.metadata = payload.metadata as Record<string, unknown>;
  }

  return response;
}

export async function sendChatbotMessage(
  request: ChatbotMessageRequest
): Promise<ChatbotMessageResponse> {
  const response = await fetch(getChatbotBackendUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildChatbotRequestPayload(request)),
  });

  if (!response.ok) {
    throw new Error(`Chatbot backend request failed with status ${response.status}`);
  }

  const data = await response.json();
  return normalizeChatbotBackendResponse(data);
}