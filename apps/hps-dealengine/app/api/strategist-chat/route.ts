/* apps/hps-dealengine/app/api/strategist-chat/route.ts */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY; // server-only
    if (!apiKey) {
      return NextResponse.json(
        { html: '<p class="text-accent-orange">Strategist Chat is offline: missing GOOGLE_GENAI_API_KEY on server.</p>' },
        { status: 503 }
      );
    }

    const { systemInstruction, question, settings } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = [
      systemInstruction,
      "",
      "User question:",
      question,
      "",
      "Current sandbox settings (JSON):",
      "```json",
      JSON.stringify(settings ?? {}, null, 2),
      "```",
      "",
      "Answer requirements:",
      "• Stay strictly within the sandbox blueprint/settings.",
      "• Explain what the setting does, business impact, and interactions.",
      "• Be concise and professional. No fluff.",
    ].join("\n");

    const resp = await model.generateContent(prompt);
    const text = resp.response.text();

    // Minimal markdown→HTML for strong/em/code + bullet lines
    const lines = text.split("\n");
    const mapped = lines
      .map((line: string) => line.trim().startsWith("* ") ? `<li>${line.trim().substring(2)}</li>` : line);
    let html = mapped.join("\n")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

    if (html.includes("<li>")) {
      html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>").replace(/<\/ul>\s*<ul>/g, "");
    }

    return NextResponse.json({ html }, { status: 200 });
  } catch (err) {
    console.error("strategist-chat error", err);
    return NextResponse.json(
      { html: '<p class="text-accent-orange">Sorry, Strategist Chat hit an error.</p>' },
      { status: 500 }
    );
  }
}
