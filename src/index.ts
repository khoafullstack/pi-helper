/**
 * pi-helper extension
 *
 * A Pi Coding Agent extension with useful helper tools and commands.
 *
 * Features:
 * - /hello command - A friendly greeting
 * - /echo command - Echo back arguments
 * - greet tool - Greet someone by name
 * - Session event monitoring
 */

import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  // ─── Commands ───────────────────────────────────────────

  pi.registerCommand("hello", {
    description: "Say hello to the user",
    handler: async (_args: string, ctx: ExtensionContext) => {
      const name = _args?.trim() || "world";
      ctx.ui.notify(`Hello, ${name}! 👋`, "info");
    },
  });

  pi.registerCommand("echo", {
    description: "Echo back the arguments",
    handler: async (_args: string, ctx: ExtensionContext) => {
      ctx.ui.notify(`Echo: ${_args || "(nothing to echo)"}`, "info");
    },
  });

  // ─── Custom Tools ──────────────────────────────────────

  pi.registerTool({
    name: "greet",
    label: "Greet",
    description: "Greet someone by name with a friendly message",
    parameters: Type.Object({
      name: Type.String({ description: "Name to greet" }),
      language: Type.Optional(
        Type.String({ description: "Language code (en, vi, ja, etc.)" }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const greetings: Record<string, string> = {
        en: "Hello",
        vi: "Xin chào",
        ja: "こんにちは",
        ko: "안녕하세요",
        fr: "Bonjour",
        de: "Hallo",
        es: "Hola",
        it: "Ciao",
        zh: "你好",
        ru: "Здравствуйте",
      };

      const greeting = greetings[params.language || "en"] || greetings.en;
      return {
        content: [{ type: "text", text: `${greeting}, ${params.name}!` }],
        details: { greeted: params.name, language: params.language || "en" },
      };
    },
  });

  pi.registerTool({
    name: "pi_helper_count_words",
    label: "Count Words",
    description: "Count words, characters, and lines in a text",
    parameters: Type.Object({
      text: Type.String({ description: "Text to analyze" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const text = params.text;
      const words = text.split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      const lines = text.split("\n").length;
      const charsNoSpaces = text.replace(/\s/g, "").length;

      return {
        content: [
          {
            type: "text",
            text: [
              `Words: ${words}`,
              `Characters: ${chars}`,
              `Characters (no spaces): ${charsNoSpaces}`,
              `Lines: ${lines}`,
            ].join("\n"),
          },
        ],
        details: { words, chars, charsNoSpaces, lines },
      };
    },
  });

  // ─── Event Handlers ────────────────────────────────────

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("pi-helper", "pi-helper loaded ✓");
  });

  pi.on("session_shutdown", async (_event, _ctx) => {
    // Clean up if needed
  });
}
