// Lightweight, self-contained demos of the Ollama JS API surface.
// Each function is intentionally standalone (a little repetition over shared
// abstraction) so you can read any one in isolation.
import { Ollama, type Message, type Tool } from "ollama";
import { z } from "zod";
import { MODEL } from "./index.js";

const ollama = new Ollama();

// 1. FORMAT — constrain the response to a JSON schema and get back typed data.
//    No actions, no loop: just "give me this shape". Great for extraction.
async function formatExample() {
  const Snippet = z.object({
    language: z.string(),
    summary: z.string(),
    isAsync: z.boolean(),
  });

  const res = await ollama.chat({
    model: MODEL,
    messages: [
      { role: "user", content: "Describe this code:\n\nasync function f() { await fetch('/x') }" },
    ],
    format: z.toJSONSchema(Snippet), // the schema constrains decoding
    stream: false,
    options: { temperature: 0 }, // determinism helps schema adherence
  });

  // The model returns JSON as a *string*; parse, then validate with zod.
  const parsed = Snippet.parse(JSON.parse(res.message.content));
  console.log("Typed object:", parsed);
}

// A trivial tool the model can choose to call. We execute it; the model can't.
const multiplyTool: Tool = {
  type: "function",
  function: {
    name: "multiply",
    description: "Multiply two numbers together",
    parameters: {
      type: "object",
      properties: {
        a: { type: "number", description: "first number" },
        b: { type: "number", description: "second number" },
      },
      required: ["a", "b"],
    },
  },
};

function multiply(args: { a: number; b: number }) {
  return args.a * args.b;
}

// 2. TOOL CALLING — the model decides to call a tool; we run it and feed the
//    result back, looping until it produces a final text answer.
async function toolsExample() {
  const messages: Message[] = [{ role: "user", content: "What is 23 times 19? Use the tool." }];

  while (true) {
    const res = await ollama.chat({ model: MODEL, messages, tools: [multiplyTool] });
    messages.push(res.message); // record the assistant turn (incl. any tool calls)

    if (!res.message.tool_calls?.length) {
      console.log("Final answer:", res.message.content);
      break;
    }

    for (const call of res.message.tool_calls) {
      const result = multiply(call.function.arguments as any);
      console.log(`→ model called ${call.function.name}(${JSON.stringify(call.function.arguments)}) = ${result}`);
      messages.push({ role: "tool", content: String(result) }); // feed result back
    }
  }
}

// 3. FORMAT + TOOLS — use a tool to gather facts, then constrain the *final*
//    answer to a schema. `format` is passed on every call; the model still
//    emits tool_calls when it wants the tool, and structured JSON at the end.
async function formatToolsExample() {
  const Report = z.object({
    results: z.array(z.object({ expression: z.string(), value: z.number() })),
  });

  const messages: Message[] = [
    { role: "user", content: "Use the tool to compute 12*8 and 5*5, then report both results." },
  ];

  while (true) {
    const res = await ollama.chat({
      model: MODEL,
      messages,
      tools: [multiplyTool],
      format: z.toJSONSchema(Report),
      options: { temperature: 0 },
    });
    messages.push(res.message);

    if (!res.message.tool_calls?.length) {
      const parsed = Report.parse(JSON.parse(res.message.content));
      console.log("Structured final answer:", JSON.stringify(parsed, null, 2));
      break;
    }

    for (const call of res.message.tool_calls) {
      const result = multiply(call.function.arguments as any);
      console.log(`→ ${call.function.name}(${JSON.stringify(call.function.arguments)}) = ${result}`);
      messages.push({ role: "tool", content: String(result) });
    }
  }
}

// 4. CHAT — multi-turn with a system prompt and history. The model "remembers"
//    earlier turns because we resend the whole messages array each time.
async function chatExample() {
  const messages: Message[] = [
    { role: "system", content: "You are terse. Answer in one short sentence." },
    { role: "user", content: "My name is Sam and I love Rust." },
  ];

  let res = await ollama.chat({ model: MODEL, messages, stream: false });
  console.log("Assistant:", res.message.content);
  messages.push(res.message);

  messages.push({ role: "user", content: "What's my name and favourite language?" });
  res = await ollama.chat({ model: MODEL, messages, stream: false });
  console.log("Assistant:", res.message.content); // recalls Sam / Rust from history
}

export const EXAMPLES = {
  format: formatExample,
  tools: toolsExample,
  "format-tools": formatToolsExample,
  chat: chatExample,
} as const;

export async function runExample(name: keyof typeof EXAMPLES) {
  console.log(`\n=== ${name} ===`);
  await EXAMPLES[name]();
}
