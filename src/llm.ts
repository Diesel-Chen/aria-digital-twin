import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import type { z } from "zod";

const isLive = process.env.LIVE === "1";

const MODEL_ID = process.env.ARIA_MODEL?.trim() || "gpt-4o-mini";

function buildProvider() {
  const liteBase = process.env.LITELLM_BASE_URL?.trim();
  const liteKey = process.env.LITELLM_API_KEY?.trim();
  if (liteBase && liteKey) {
    return createOpenAI({ baseURL: liteBase, apiKey: liteKey });
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    throw new Error(
      "LIVE 模式需要 OPENAI_API_KEY 或 LITELLM_BASE_URL+LITELLM_API_KEY",
    );
  }
  return createOpenAI({ apiKey: openaiKey });
}

let cachedProvider: ReturnType<typeof createOpenAI> | undefined;
function getModel() {
  if (!cachedProvider) cachedProvider = buildProvider();
  return cachedProvider.chat(MODEL_ID);
}

export const ariaIsLive = isLive;
export const ariaModelId = MODEL_ID;

export async function ariaGenerateObject<T>(args: {
  schema: z.ZodSchema<T>;
  system: string;
  prompt: string;
  fallback: () => T;
}): Promise<{ value: T; via: "live" | "mock" }> {
  if (!isLive) return { value: args.fallback(), via: "mock" };
  const result = await generateObject({
    model: getModel(),
    schema: args.schema,
    system: args.system,
    prompt: args.prompt,
    temperature: 0.2,
  });
  return { value: result.object as T, via: "live" };
}

export async function ariaGenerateText(args: {
  system: string;
  prompt: string;
  fallback: () => string;
}): Promise<{ text: string; via: "live" | "mock" }> {
  if (!isLive) return { text: args.fallback(), via: "mock" };
  const result = await generateText({
    model: getModel(),
    system: args.system,
    prompt: args.prompt,
    temperature: 0.4,
  });
  return { text: result.text, via: "live" };
}
