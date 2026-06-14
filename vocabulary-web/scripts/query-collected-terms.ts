import { db } from "../lib/db";
import type { CollectedTermSource } from "../lib/types";

type Range = "recent" | "today";
type Source = CollectedTermSource | "all";

type CliArgs = {
  range: Range;
  source: Source;
  limit: number;
  includeIgnored: boolean;
};

type CollectedTermRow = {
  term: string;
  simple_translation: string | null;
  source: CollectedTermSource;
  status: string;
  seen_count: number;
  first_seen_at: number;
  last_seen_at: number;
};

const SOURCE_LABELS: Record<Source, string> = {
  all: "全部来源",
  both: "Codex + OpenClaw",
  codex: "Codex",
  openclaw: "OpenClaw"
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    range: "recent",
    source: "all",
    limit: 50,
    includeIgnored: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];

    if (key === "--include-ignored") {
      args.includeIgnored = true;
      continue;
    }

    if (!key.startsWith("--")) {
      continue;
    }

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }

    if (key === "--range") {
      if (value !== "recent" && value !== "today") {
        throw new Error("--range must be one of: recent, today");
      }
      args.range = value;
    } else if (key === "--source") {
      if (value !== "all" && value !== "codex" && value !== "openclaw" && value !== "both") {
        throw new Error("--source must be one of: all, codex, openclaw, both");
      }
      args.source = value;
    } else if (key === "--limit") {
      const limit = Number.parseInt(value, 10);
      if (!Number.isFinite(limit) || limit < 1 || limit > 500) {
        throw new Error("--limit must be an integer from 1 to 500");
      }
      args.limit = limit;
    } else {
      throw new Error(`Unknown option: ${key}`);
    }

    index += 1;
  }

  return args;
}

function getSince(range: Range) {
  const now = new Date();
  if (range === "recent") {
    return now.getTime() - 60 * 60 * 1000;
  }

  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(timestamp));
}

function queryTerms(args: CliArgs) {
  const params: Array<number | string> = [getSince(args.range)];
  let sourceWhere = "";
  const statusWhere = args.includeIgnored ? "" : "AND status <> 'ignored'";

  if (args.source === "codex") {
    sourceWhere = "AND source IN ('codex', 'both')";
  } else if (args.source === "openclaw") {
    sourceWhere = "AND source IN ('openclaw', 'both')";
  } else if (args.source === "both") {
    sourceWhere = "AND source = 'both'";
  }

  params.push(args.limit);

  return db
    .prepare(
      `
        SELECT
          term,
          simple_translation,
          source,
          status,
          seen_count,
          first_seen_at,
          last_seen_at
        FROM collected_terms
        WHERE last_seen_at >= ?
          ${sourceWhere}
          ${statusWhere}
        ORDER BY last_seen_at DESC, id DESC
        LIMIT ?
      `
    )
    .all(...params) as CollectedTermRow[];
}

function formatMarkdown(args: CliArgs, rows: CollectedTermRow[]) {
  const rangeLabel = args.range === "today" ? "今天" : "最近 1 小时";
  const title = `${rangeLabel} ${SOURCE_LABELS[args.source]} 收集的新词`;

  if (rows.length === 0) {
    return `${title}：无`;
  }

  const lines = [`${title}：${rows.length} 个`];
  for (const row of rows) {
    const translation = row.simple_translation ? `，${row.simple_translation}` : "";
    lines.push(
      `- ${row.term}${translation}（${row.source}，${row.status}，${row.seen_count} 次，${formatDateTime(
        row.last_seen_at
      )}）`
    );
  }

  return lines.join("\n");
}

const args = parseArgs(process.argv.slice(2));
const rows = queryTerms(args);
console.log(formatMarkdown(args, rows));
