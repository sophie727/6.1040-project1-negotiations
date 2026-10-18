import { afterEach, describe, expect, test } from "bun:test";
import { ReasonerFailure } from "../../src/agents/reusable/agent.ts";
import { claude, gemini, listModels, type Model, modelFromEnvironment } from "../../src/agents/reusable/models.ts";

/** The servers each test starts, stopped once it ends. */
const servers: ReturnType<typeof Bun.serve>[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true);
});

/**
 * A stand-in for a model's API at a local address: it records each request and answers with `status`, streaming
 * `chunks` as the body, so a test can split one event across chunks.
 */
function fakeApi(status: number, chunks: string[], contentType = "text/event-stream") {
  const requests: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const server = Bun.serve({
    port: 0,
    async fetch(request) {
      requests.push({ url: request.url, headers: request.headers, body: request.method === "POST" ? await request.json() : {} });
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
          controller.close();
        },
      });
      return new Response(stream, { status, headers: { "content-type": contentType } });
    },
  });
  servers.push(server);
  return { baseUrl: `http://localhost:${server.port}`, requests };
}

async function replyOf(model: Model) {
  const pieces: string[] = [];
  await model.reply({ system: "Be brief.", prompt: "Hello?", maxTokens: 50 }, async (text) => {
    pieces.push(text);
  });
  return pieces;
}

const claudeEvent = (type: string, data: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const text = (piece: string) => claudeEvent("content_block_delta", { index: 0, delta: { type: "text_delta", text: piece } });

describe("models", () => {
  test("Claude's reply streams in piece by piece, from a request with the instructions, prompt, and key", async () => {
    const reply = [claudeEvent("message_start", { message: {} }), text("Thanks for "), text("coming in."), claudeEvent("message_stop", {})].join("");
    // The second event arrives split across two network chunks.
    const { baseUrl, requests } = fakeApi(200, [reply.slice(0, 150), reply.slice(150)]);
    const pieces = await replyOf(claude({ apiKey: "a-key", model: "claude-test", baseUrl }));

    expect(pieces.join("")).toBe("Thanks for coming in.");
    expect(requests[0]!.url).toEndWith("/v1/messages");
    expect(requests[0]!.headers.get("x-api-key")).toBe("a-key");
    expect(requests[0]!.headers.get("anthropic-version")).toBe("2023-06-01");
    expect(requests[0]!.body).toEqual({
      model: "claude-test",
      max_tokens: 50,
      system: "Be brief.",
      messages: [{ role: "user", content: "Hello?" }],
      stream: true,
    });
  });

  test("Gemini's reply streams in without its thoughts, from a request with the instructions and prompt", async () => {
    const event = (parts: object[]) => `data: ${JSON.stringify({ candidates: [{ content: { parts } }] })}\r\n\r\n`;
    const { baseUrl, requests } = fakeApi(200, [event([{ text: "Planning…", thought: true }]), event([{ text: "Hi! " }]), event([{ text: "Let's talk." }])]);
    const pieces = await replyOf(gemini({ apiKey: "g-key", model: "gemini-test", baseUrl }));

    expect(pieces).toEqual(["Hi! ", "Let's talk."]);
    expect(requests[0]!.url).toEndWith("/v1beta/models/gemini-test:streamGenerateContent?alt=sse");
    expect(requests[0]!.headers.get("x-goog-api-key")).toBe("g-key");
    expect(requests[0]!.body).toEqual({
      systemInstruction: { parts: [{ text: "Be brief." }] },
      contents: [{ role: "user", parts: [{ text: "Hello?" }] }],
    });
  });

  test("a refused key, a busy model, and an unreachable one each fail with a reason a person can read", async () => {
    const failure = (model: Model) => replyOf(model).then(() => null, (error: unknown) => error);

    const refused = await failure(claude({ apiKey: "wrong", model: "claude-test", baseUrl: fakeApi(401, ["{}"]).baseUrl }));
    expect(refused).toBeInstanceOf(ReasonerFailure);
    expect((refused as Error).message).toBe("The model didn't accept this server's API key.");

    const busy = await failure(gemini({ apiKey: "key", model: "gemini-test", baseUrl: fakeApi(429, ["{}"]).baseUrl }));
    expect((busy as Error).message).toBe("The model is busy. Try again in a minute.");

    const overloaded = await failure(claude({ apiKey: "key", model: "claude-test", baseUrl: fakeApi(200, [claudeEvent("error", { error: { type: "overloaded_error" } })]).baseUrl }));
    expect((overloaded as Error).message).toBe("The model is busy. Try again in a minute.");

    const closed = fakeApi(200, []);
    servers.pop()?.stop(true);
    const unreachable = await failure(claude({ apiKey: "key", model: "claude-test", baseUrl: closed.baseUrl }));
    expect((unreachable as Error).message).toBe("The model couldn't be reached.");
  });

  test("a proxy such as Parley works at a base URL with a trailing slash, even when it answers all at once", async () => {
    const message = { type: "message", content: [{ type: "text", text: "Thanks for " }, { type: "text", text: "coming in." }] };
    const { baseUrl, requests } = fakeApi(200, [JSON.stringify(message)], "application/json");
    const pieces = await replyOf(claude({ apiKey: "sk-parley-v1-test", model: "claude-test", baseUrl: `${baseUrl}/` }));

    expect(pieces.join("")).toBe("Thanks for coming in.");
    expect(new URL(requests[0]!.url).pathname).toBe("/v1/messages");
    expect(requests[0]!.headers.get("x-api-key")).toBe("sk-parley-v1-test");
  });

  test("a model that runs out of room while thinking, and writes no reply, fails with that reason", async () => {
    // What Parley sent for the reply that never came: only the signature of the model's thinking, then max_tokens.
    const thoughtOnly = [
      claudeEvent("message_start", { message: {} }),
      claudeEvent("content_block_delta", { index: 0, delta: { type: "signature_delta", signature: "abc" } }),
      claudeEvent("message_delta", { delta: { stop_reason: "max_tokens" }, usage: { output_tokens: 400 } }),
      claudeEvent("message_stop", {}),
    ].join("");
    const ranOut = await replyOf(claude({ apiKey: "key", model: "claude-test", baseUrl: fakeApi(200, [thoughtOnly]).baseUrl })).then(
      () => null,
      (error: unknown) => error,
    );
    expect(ranOut).toBeInstanceOf(ReasonerFailure);
    expect((ranOut as Error).message).toBe("The model ran out of room before it wrote a reply.");

    const empty = JSON.stringify({ type: "message", content: [], stop_reason: "end_turn" });
    const nothing = await replyOf(claude({ apiKey: "key", model: "claude-test", baseUrl: fakeApi(200, [empty], "application/json").baseUrl })).then(
      () => null,
      (error: unknown) => error,
    );
    expect((nothing as Error).message).toBe("The model's reply was empty.");
  });

  test("the models a key can use are listed from the API, and none without a key or with a refused one", async () => {
    const { baseUrl, requests } = fakeApi(200, [JSON.stringify({ data: [{ id: "claude-sonnet-5-5" }, { id: "claude-haiku-5-5" }] })], "application/json");
    expect(await listModels({ ANTHROPIC_API_KEY: "sk-parley-v1-test", ANTHROPIC_BASE_URL: baseUrl })).toEqual(["claude-sonnet-5-5", "claude-haiku-5-5"]);
    expect(new URL(requests[0]!.url).pathname).toBe("/v1/models");
    expect(requests[0]!.headers.get("x-api-key")).toBe("sk-parley-v1-test");

    expect(await listModels({})).toBeUndefined();
    expect(await listModels({ ANTHROPIC_API_KEY: "wrong", ANTHROPIC_BASE_URL: fakeApi(401, ["{}"], "application/json").baseUrl })).toBeUndefined();
  });

  test("the environment picks Claude, then Gemini, and no model without a key", () => {
    expect(modelFromEnvironment({ ANTHROPIC_API_KEY: "a", GEMINI_API_KEY: "g" })?.name).toBe("claude-opus-5-5");
    expect(modelFromEnvironment({ ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL: "claude-haiku-5-5" })?.name).toBe("claude-haiku-5-5");
    expect(modelFromEnvironment({ ANTHROPIC_API_KEY: "", GEMINI_API_KEY: "g" })?.name).toBe("gemini-3.7-flash");
    expect(modelFromEnvironment({})).toBeUndefined();
  });
});
