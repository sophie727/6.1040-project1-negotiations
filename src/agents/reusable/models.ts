/**
 * Language models the agents write with: Anthropic's Claude or Google's Gemini, each streaming its reply as it writes.
 * The Gemini client follows conceptbox's (https://github.com/mit-sdg/conceptbox), MIT License, Copyright (c) 2026 Eagon Meng.
 */
import { ReasonerFailure } from "./agent.ts";

/** A language model that writes a reply to one prompt under standing instructions. */
export interface Model {
  /** A name for the server's startup log, such as the model's. */
  name: string;
  /**
   * Writes a reply to `prompt`, following `system`, and passes each piece of it to `write` in order. Throws a
   * ReasonerFailure, with a reason a person can read, when the model can't be reached or writes no reply.
   * `maxTokens` limits everything the model writes, including any thinking it does before replying.
   */
  reply(request: { system: string; prompt: string; maxTokens: number }, write: (text: string) => Promise<void>): Promise<void>;
}

/** How long a model gets to finish one reply, including the time it spends streaming it. */
const TIMEOUT_MS = 60_000;
const TOO_LONG = "The model took too long to answer.";
const UNREACHABLE = "The model couldn't be reached.";
const BUSY = "The model is busy. Try again in a minute.";

const ANTHROPIC = "https://api.anthropic.com";

/**
 * Claude, through Anthropic's Messages API, or through a proxy that offers the same API at `baseUrl`, such as MIT's
 * Parley. A proxy that answers with the whole message at once, instead of streaming it, works too.
 */
export function claude({ apiKey, model, baseUrl = ANTHROPIC }: { apiKey: string; model: string; baseUrl?: string }): Model {
  return {
    name: model,
    async reply({ system, prompt, maxTokens }, write) {
      const response = await post(`${withoutSlash(baseUrl)}/v1/messages`, {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: { model, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }], stream: true },
      });
      // Claude 5 models think before they reply, and the thinking isn't sent, so only the reply's text is written.
      let wrote = false;
      let stopReason: string | undefined;
      if (!response.headers.get("content-type")?.includes("text/event-stream")) {
        const message: { content?: { type?: string; text?: string }[]; stop_reason?: string } = await response.json().catch(() => ({}));
        const text = (message.content ?? []).map((block) => (block.type === "text" ? (block.text ?? "") : "")).join("");
        if (text) await write(text);
        if (!text) throw new ReasonerFailure(noReply(message.stop_reason));
        return;
      }
      type Event = { type?: string; delta?: { type?: string; text?: string; stop_reason?: string }; error?: { type?: string } };
      await readEvents(response, async (event: Event) => {
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
          wrote = true;
          await write(event.delta.text);
        }
        if (event.type === "message_delta") stopReason = event.delta?.stop_reason;
        if (event.type === "error") throw new ReasonerFailure(event.error?.type === "overloaded_error" ? BUSY : UNREACHABLE);
      });
      if (!wrote) throw new ReasonerFailure(noReply(stopReason));
    },
  };
}

/** Why a model wrote no reply, from why it stopped: it can run out of room while thinking, or decline. */
function noReply(stopReason: string | undefined): string {
  if (stopReason === "max_tokens") return "The model ran out of room before it wrote a reply.";
  if (stopReason === "refusal") return "The model declined to answer.";
  return "The model's reply was empty.";
}

/**
 * The models the Anthropic API at ANTHROPIC_BASE_URL offers to ANTHROPIC_API_KEY, by id, or undefined when the
 * environment names no key or the API doesn't list its models.
 */
export async function listModels(environment: Record<string, string | undefined> = process.env): Promise<string[] | undefined> {
  const { ANTHROPIC_API_KEY, ANTHROPIC_BASE_URL } = environment;
  if (!ANTHROPIC_API_KEY) return undefined;
  const response = await fetch(`${withoutSlash(ANTHROPIC_BASE_URL || ANTHROPIC)}/v1/models?limit=100`, {
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => undefined);
  if (response === undefined || !response.ok) return undefined;
  const listed: { data?: { id?: string }[] } = await response.json().catch(() => ({}));
  return (listed.data ?? []).flatMap(({ id }) => (typeof id === "string" ? [id] : []));
}

const withoutSlash = (url: string) => url.replace(/\/+$/, "");

/** Gemini, through Google's Generative Language API. */
export function gemini({
  apiKey,
  model,
  baseUrl = "https://generativelanguage.googleapis.com",
}: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}): Model {
  return {
    name: model,
    async reply({ system, prompt }, write) {
      // Gemini counts its thinking toward an output limit, so a short reply is asked for in the prompt instead.
      const response = await post(`${withoutSlash(baseUrl)}/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
        headers: { "x-goog-api-key": apiKey },
        body: { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }] },
      });
      let wrote = false;
      await readEvents(response, async (event: { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }) => {
        const parts = event.candidates?.[0]?.content?.parts ?? [];
        const text = parts.map((part) => (part.thought ? "" : (part.text ?? ""))).join("");
        if (text) {
          wrote = true;
          await write(text);
        }
      });
      if (!wrote) throw new ReasonerFailure(noReply(undefined));
    },
  };
}

/**
 * The model the server's environment names: Claude when ANTHROPIC_API_KEY is set (ANTHROPIC_MODEL picks which one),
 * otherwise Gemini when GEMINI_API_KEY is set (GEMINI_MODEL picks which one), and none without either key.
 * ANTHROPIC_BASE_URL and GEMINI_BASE_URL send requests to another address, such as a proxy.
 */
export function modelFromEnvironment(environment: Record<string, string | undefined> = process.env): Model | undefined {
  const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_BASE_URL, GEMINI_API_KEY, GEMINI_MODEL, GEMINI_BASE_URL } = environment;
  if (ANTHROPIC_API_KEY) {
    return claude({ apiKey: ANTHROPIC_API_KEY, model: ANTHROPIC_MODEL || "claude-opus-5-5", baseUrl: ANTHROPIC_BASE_URL || undefined });
  }
  if (GEMINI_API_KEY) return gemini({ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL || "gemini-3.7-flash", baseUrl: GEMINI_BASE_URL || undefined });
  return undefined;
}

/**
 * Posts JSON to a model's API, and returns the response once the model has started answering. When the API refuses,
 * the server's log gets what it said, such as an unknown model or a spent quota, and the person gets a short reason.
 */
async function post(url: string, { headers, body }: { headers: Record<string, string>; body: object }) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: unknown) => {
    console.warn(`The model's API at ${new URL(url).origin} couldn't be reached:`, error instanceof Error ? error.message : error);
    throw new ReasonerFailure(timedOut(error) ? TOO_LONG : UNREACHABLE);
  });
  if (!response.ok || response.body === null) {
    const said = await response.text().catch(() => "");
    console.warn(`The model's API at ${new URL(url).origin} answered ${response.status}: ${said.slice(0, 500)}`);
    throw new ReasonerFailure(failureFor(response.status, said));
  }
  return response as Response & { body: NonNullable<Response["body"]> };
}

/**
 * Reads server-sent events, passing the JSON of each event's `data` line to `handle`. Each event ends with a blank
 * line, and a network chunk can end partway through an event, so the unfinished last piece waits for the next chunk.
 */
async function readEvents<Event>({ body }: { body: NonNullable<Response["body"]> }, handle: (event: Event) => Promise<void>) {
  const handleEvent = async (event: string) => {
    const data = event.match(/^data: ?(.*)$/m)?.[1];
    if (data === undefined || data === "[DONE]") return;
    let parsed: Event;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    await handle(parsed);
  };
  let buffered = "";
  try {
    for await (const chunk of body.pipeThrough(new TextDecoderStream())) {
      const events = (buffered + chunk).split(/\r?\n\r?\n/);
      buffered = events.pop() ?? "";
      for (const event of events) await handleEvent(event);
    }
  } catch (error) {
    throw timedOut(error) ? new ReasonerFailure(TOO_LONG) : error;
  }
  await handleEvent(buffered);
}

const timedOut = (error: unknown) => error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");

function failureFor(status: number, body: string): string {
  if (status === 401 || status === 403 || body.includes("API_KEY_INVALID")) return "The model didn't accept this server's API key.";
  if (status === 429 || status === 529) return BUSY;
  if (status === 404 || (status === 400 && /model/i.test(body))) return "The server asked for a model it can't use. Check ANTHROPIC_MODEL or GEMINI_MODEL.";
  return UNREACHABLE;
}
