#!/usr/bin/env node
import { Command } from "commander";
import { Ollama } from "ollama";
import { runExample, EXAMPLES } from "./examples.js";

export const MODEL = "qwen2.5:7b";

function handleErr(err: any): never {
  if (String(err?.message).includes("not found")) {
    console.error(`Model "${MODEL}" is not available. Run: ollama pull ${MODEL}`);
  } else {
    console.error(`Error: ${err?.message ?? err}`);
  }
  process.exit(1);
}

const program = new Command();
program.name("hermit").description("A toy local coding agent CLI.");

// Default: `hermit "<prompt>"` streams a completion.
program
  .command("run", { isDefault: true })
  .description("send a prompt to the model and stream the completion")
  .argument("<prompt...>", "the prompt to send to the model")
  .action(async (prompt: string[]) => {
    const ollama = new Ollama();
    try {
      const stream = await ollama.generate({
        model: MODEL,
        prompt: prompt.join(" "),
        stream: true,
      });
      for await (const chunk of stream) process.stdout.write(chunk.response);
      process.stdout.write("\n");
    } catch (err) {
      handleErr(err);
    }
  });

// `hermit examples <name>` runs a small, self-contained API demo.
program
  .command("examples <name>")
  .description(`run an API example: ${Object.keys(EXAMPLES).join(" | ")}`)
  .action(async (name: string) => {
    if (!(name in EXAMPLES)) {
      console.error(`Unknown example "${name}". Available: ${Object.keys(EXAMPLES).join(", ")}`);
      process.exit(1);
    }
    try {
      await runExample(name as keyof typeof EXAMPLES);
    } catch (err) {
      handleErr(err);
    }
  });

program.parseAsync();
