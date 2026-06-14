import { collectTerm } from "../lib/repository";
import type { CollectedTermSource } from "../lib/types";

type CliArgs = {
  term?: string;
  source?: string;
  translation?: string;
  context?: string;
};

function parseArgs(argv: string[]) {
  const args: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (!key.startsWith("--")) {
      continue;
    }

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }

    if (key === "--term") {
      args.term = value;
    } else if (key === "--source") {
      args.source = value;
    } else if (key === "--translation") {
      args.translation = value;
    } else if (key === "--context") {
      args.context = value;
    } else {
      throw new Error(`Unknown option: ${key}`);
    }

    index += 1;
  }

  return args;
}

function parseSource(source: string | undefined): CollectedTermSource {
  if (source === "codex" || source === "openclaw" || source === "both") {
    return source;
  }

  throw new Error("--source must be one of: codex, openclaw, both");
}

const args = parseArgs(process.argv.slice(2));

if (!args.term) {
  throw new Error("--term is required");
}

const collected = collectTerm({
  term: args.term,
  source: parseSource(args.source),
  simpleTranslation: args.translation || null,
  contextSample: args.context || null
});

const output = {
  collected: collected.action === "created" && collected.outcome === "pending" ? [collected.term.term] : [],
  updated: collected.action === "updated" && collected.outcome === "pending" ? [collected.term.term] : [],
  known: collected.outcome === "known" ? [collected.term.term] : [],
  skipped: collected.outcome === "imported" || collected.outcome === "ignored" ? [collected.term.term] : [],
  terms: [collected.term]
};

console.log(JSON.stringify(output, null, 2));
