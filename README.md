# Hermit

A toy local coding agent, built on [Ollama](https://ollama.com). Runs a chat loop
against a local model and executes the tools the model asks for.

## Setup

1. Install and start [Ollama](https://ollama.com).
2. Pull the model (not part of this repo — a ~4.7GB runtime dependency managed by
   Ollama, stored under `~/.ollama/models`):
   ```sh
   ollama pull qwen2.5:7b
   ```
3. Install deps and build:
   ```sh
   npm install
   npm run build
   npm link   # makes `hermit` available on your PATH
   ```

## Usage

REPL (message history is shared across turns):

```sh
hermit
```

One-shot:

```sh
hermit "write a bash one-liner to count lines in all .ts files"
```

During development, skip the build step:

```sh
npm run dev
npm run dev -- "your prompt here"
```

## Structure

Everything lives in `src/index.ts`:

- `TOOLS` — registry mapping a tool name to the spec sent to the model plus the
  function we run locally. Currently empty.
- `runTurn` — sends the conversation to the model, runs any requested tools,
  feeds the results back, and repeats until the model replies with plain text.
- `main` — one-shot vs. REPL entry point.

> Tool calling needs an instruct-tuned model (`qwen2.5:7b`). The code-completion
> variant (`qwen2.5-coder`) emits tool calls as plain text rather than the
> structured `tool_calls` field, so native tool parsing won't fire.
