#!/usr/bin/env node
import { once } from "node:events";
import { readLines } from "./source.js";
import { decode, encode, type Rec } from "./formats.js";
import { filter, head, stats, type Transform } from "./commands.js";

// Help text shown when the command is wrong.
const USAGE = `sift-mini <command> [--flags] [files...]

  filter <expr> [files...]   keep matching records
  head [files...]            first N records
  stats [files...]           count records

  --limit <n>    how many (head, default 10)
  --by <field>   group by (stats)
  --format <f>   jsonl | csv        (guessed from the file extension)
  --out <f>      jsonl | table      (default jsonl)

  sift-mini filter 'status == 500' log.jsonl
  cat log.jsonl | sift-mini head --limit 3 --out table`;

// Split what the user typed into:
//   flags       → things like --limit 3   (stored as limit → "3")
//   positionals → everything else         (the rule, file names)
function parseArgs(argv: string[]) {
  const flags = new Map<string, string>();
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token.startsWith("--")) flags.set(token.slice(2), argv[++i] ?? ""); // take the NEXT word as its value
    else positionals.push(token);
  }
  return { flags, positionals };
}

async function main(argv: string[]) {
  const command = argv[0]; // "filter", "head", or "stats"
  const { flags, positionals } = parseArgs(argv.slice(1));

  // For filter, the first positional is the rule. The rest are files.
  const files = command === "filter" ? positionals.slice(1) : positionals;

  // Pick the job.
  let transform: Transform;
  switch (command) {
    case "filter": {
      const expression = positionals[0];
      if (expression === undefined) throw new Error("filter needs an expression");
      transform = filter(expression);
      break;
    }
    case "head":
      transform = head(Number(flags.get("limit") ?? 10));
      break;
    case "stats":
      transform = stats(flags.get("by"));
      break;
    default:
      console.error(USAGE); // unknown command → show help
      process.exitCode = 2;
      return;
  }

  // Input format: --format if given, else guess from the file name.
  const input = flags.get("format") ?? (files[0]?.endsWith(".csv") ? "csv" : "jsonl");
  const output = flags.get("out") ?? "jsonl";

  // BUILD THE FACTORY LINE:  READ → DECODE → JOB → ENCODE
  // Nothing runs yet. It is only connected.
  const records: AsyncIterable<Rec> = decode(readLines(files), input);
  const chunks = encode(transform(records), output);

  // START THE LINE: pull text out of the end and print it.
  for await (const chunk of chunks) {
    // If the terminal is full, wait until it's ready ("drain").
    if (!process.stdout.write(chunk)) await once(process.stdout, "drain");
  }
}

// If the pipe closes early (like `| head -3`), just exit quietly.
process.stdout.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EPIPE") process.exit(0);
  throw e;
});

// Run main. If anything goes wrong, print the error nicely.
try {
  await main(process.argv.slice(2));
} catch (error) {
  console.error("error:", (error as Error).message);
  process.exitCode = 1;
}
