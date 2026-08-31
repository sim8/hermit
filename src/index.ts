#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { Ollama, type Message } from "ollama";
import { TOOLS, runTool } from "./tools.js";

const MODEL = "qwen2.5:7b";
const ollama = new Ollama();

const SYSTEM = "You are a coding agent. Use the provided tools to inspect and edit files before answering.";

// Send the conversation to the model, executing any tools it asks for and
// feeding the results back, until it replies with plain text.
async function runTurn(messages: Message[]): Promise<string> {
  const specs = Object.values(TOOLS).map((t) => t.spec);

  while (true) {
    const res = await ollama.chat({
      model: MODEL,
      messages,
      tools: specs.length ? specs : undefined,
    });
    messages.push(res.message); // record the assistant turn (incl. tool calls)

    if (!res.message.tool_calls?.length) return res.message.content;

    for (const call of res.message.tool_calls) {
      const { name, arguments: args } = call.function;
      const result = await runTool(name, args);
      console.log(`→ ${name}(${JSON.stringify(args)})`);
      messages.push({ role: "tool", content: JSON.stringify(result) });
    }
  }
}

const logAgentOutput = (text: string) => console.log('\x1b[36m%s\x1b[0m', text);

async function main() {
  const messages: Message[] = [{ role: "system", content: SYSTEM }];
  const argv = process.argv.slice(2).join(" ").trim();

  // One-shot: `hermit "some prompt"`
  if (argv) {
    messages.push({ role: "user", content: argv });
    logAgentOutput(await runTurn(messages));
    return;
  }

  // Otherwise a REPL, sharing one message history across turns.
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on("SIGINT", () => process.exit(0));
  console.log(`hermit — ${MODEL}. "exit" or ctrl-c to quit.`);

  rl.setPrompt("\n> ");
  rl.prompt();

  // Iterating `rl` (rather than awaiting rl.question) applies backpressure, so
  // lines typed or piped in while the model is thinking aren't dropped.
  for await (const raw of rl) {
    const line = raw.trim();
    if (line === "exit") break;
    if (line) {
      messages.push({ role: "user", content: line });
      logAgentOutput(await runTurn(messages));
    }
    rl.prompt();
  }
  rl.close();
}

main().catch((err) => {
  const msg = String(err?.message ?? err);
  console.error(msg.includes("not found") ? `Model "${MODEL}" is not available. Run: ollama pull ${MODEL}` : `Error: ${msg}`);
  process.exit(1);
});
