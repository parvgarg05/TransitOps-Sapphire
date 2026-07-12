import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import {
  sendChatbotMessage,
  type DashboardChatContext,
} from "@/lib/chatbot";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      message?: string;
      context?: DashboardChatContext;
    };

    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long" },
        { status: 400 }
      );
    }

    const chatbotResponse = await sendChatbotMessage({
      message,
      context: body.context ?? { page: "dashboard" },
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
    });

    return NextResponse.json(chatbotResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process chatbot request";

    return NextResponse.json(
      { error: message },
      { status: message.includes("CHATBOT_BACKEND_URL") ? 500 : 502 }
    );
  }
}