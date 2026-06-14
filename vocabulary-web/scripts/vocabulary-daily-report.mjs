#!/usr/bin/env node

import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DEFAULT_DB_PATH =
  "/Users/laiming/Documents/Workspace/Codex/vocabulary-web/data/vocabulary.sqlite";

const MAX_TERMS_PER_SECTION = 20;
const DOTTED_TERM_ALLOWLIST = new Set(["next.js", "node.js", "react.js", "vue.js"]);
const TERM_WITH_TRANSLATION_SELECT = `
  term,
  COALESCE(
    (
      SELECT chinese
      FROM entries e
      WHERE e.id = collected_terms.entry_id
         OR lower(trim(e.english)) = collected_terms.normalized_term
      LIMIT 1
    ),
    simple_translation
  ) AS translation
`;

function parseArgs(argv) {
  const args = {
    dbPath: process.env.VOCABULARY_DB_PATH || DEFAULT_DB_PATH,
    hours: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--db" && next) {
      args.dbPath = next;
      i += 1;
    } else if (arg === "--hours" && next) {
      const parsed = Number(next);
      if (Number.isFinite(parsed) && parsed > 0) args.hours = parsed;
      i += 1;
    }
  }

  return args;
}

function getReportRange(now, args) {
  if (Number.isFinite(args.hours) && args.hours > 0) {
    return {
      since: now - args.hours * 60 * 60 * 1000,
      until: now
    };
  }

  const cycleEnd = new Date(now);
  cycleEnd.setHours(1, 0, 0, 0);
  if (cycleEnd.getTime() > now) {
    cycleEnd.setDate(cycleEnd.getDate() - 1);
  }

  return {
    since: cycleEnd.getTime() - 24 * 60 * 60 * 1000,
    until: cycleEnd.getTime()
  };
}

function formatDateTime(ms) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(ms));
}

function getCount(db, sql, params = []) {
  const row = db.prepare(sql).get(...params);
  return Number(row?.count || 0);
}

function normalizeTerm(term) {
  return String(term || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function termText(item) {
  return String(typeof item === "object" && item ? item.term : item || "").trim();
}

function looksLikeStructuredNoise(item) {
  const raw = termText(item);
  const normalized = normalizeTerm(raw);
  if (!normalized) return true;
  if (DOTTED_TERM_ALLOWLIST.has(normalized)) return false;
  if (raw.includes("=") || normalized.includes("--")) return true;
  if (normalized.includes("/") || normalized.includes("\\")) return true;
  if (/\s/.test(raw) && /[_./#-]|npm|run|json|暂存|英文词/i.test(raw)) return true;
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(normalized)) return true;
  if (/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/.test(normalized)) return true;
  return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(normalized);
}

function listTerms(db, sql, params = [], limit = 30) {
  return db
    .prepare(sql)
    .all(...params, limit)
    .map((row) => ({
      term: String(row.term || row.english || "").trim(),
      translation: String(row.translation || row.chinese || row.simple_translation || "").trim()
    }))
    .filter((row) => row.term);
}

function splitTermsForDisplay(terms, maxVisible = MAX_TERMS_PER_SECTION) {
  const visible = [];
  const hidden = [];
  const seen = new Set();

  for (const term of terms) {
    const normalized = normalizeTerm(termText(term));
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    if (looksLikeStructuredNoise(term)) {
      hidden.push(term);
    } else {
      visible.push(term);
    }
  }

  return {
    visible: visible.slice(0, maxVisible),
    overflow: visible.slice(maxVisible),
    hidden
  };
}

function formatTermLine(item) {
  const term = termText(item);
  const translation = String(item?.translation || "").trim();
  return translation ? `- ${term}｜${translation}` : `- ${term}｜待补充`;
}

function addTermSection(lines, title, terms) {
  const { visible, overflow, hidden } = splitTermsForDisplay(terms);
  lines.push(title);

  if (visible.length === 0) {
    lines.push("- 无");
  } else {
    for (const item of visible) {
      lines.push(formatTermLine(item));
    }
  }

  if (overflow.length > 0) {
    lines.push(`- 另有 ${overflow.length} 个未展示`);
  }

  if (hidden.length > 0) {
    lines.push(`- 已省略 ${hidden.length} 个噪音单词`);
  }

  return hidden.length;
}

function noiseObservation({ ignoredCount, pendingCount, newCount, structuredIgnored, hiddenNoiseCount }) {
  if (hiddenNoiseCount > 0 || structuredIgnored > 0) {
    const parts = [];
    if (hiddenNoiseCount > 0) parts.push(`本次日报已省略 ${hiddenNoiseCount} 个噪音单词`);
    if (structuredIgnored > 0) parts.push(`本期已忽略 ${structuredIgnored} 个结构化标识符`);
    return `${parts.join("，")}。后续收集和入库规则会继续拦截这类噪音。`;
  }
  if (ignoredCount > 0) {
    return `有 ${ignoredCount} 个词被忽略，建议晚点抽查是否属于误杀。`;
  }
  if (pendingCount > Math.max(30, newCount * 2)) {
    return "pending 数量偏高，建议继续观察收集规则是否过宽。";
  }
  return "暂无明显噪音，当前规则看起来比较稳。";
}

function main() {
  const args = parseArgs(process.argv);
  const dbPath = path.resolve(args.dbPath);
  const now = Date.now();
  const { since, until } = getReportRange(now, args);

  if (!existsSync(dbPath)) {
    console.log(`词库日报\n\n数据库不存在：${dbPath}`);
    return;
  }

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const table = db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'collected_terms' LIMIT 1")
      .get();
    if (!table) {
      console.log("词库日报\n\n暂存表 collected_terms 尚不存在。");
      return;
    }

    const newCount = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ?",
      [since, until]
    );
    const codexNew = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ? AND source = 'codex'",
      [since, until]
    );
    const openclawNew = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ? AND source = 'openclaw'",
      [since, until]
    );
    const bothNew = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ? AND source = 'both'",
      [since, until]
    );
    const importedCount = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'imported'",
      [since, until]
    );
    const knownCount = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'known'",
      [since, until]
    );
    const ignoredCount = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'ignored'",
      [since, until]
    );
    const pendingCount = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'pending'",
      [since, until]
    );
    const structuredIgnored = getCount(
      db,
      "SELECT COUNT(*) AS count FROM collected_terms WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'ignored' AND (normalized_term GLOB '*_*' OR normalized_term GLOB '*.*' OR normalized_term GLOB '*-*')",
      [since, until]
    );

    const newTerms = listTerms(
      db,
      `SELECT ${TERM_WITH_TRANSLATION_SELECT}
       FROM collected_terms
       WHERE first_seen_at >= ? AND first_seen_at < ?
       ORDER BY first_seen_at DESC, id DESC
       LIMIT ?`,
      [since, until]
    );
    const importedTerms = listTerms(
      db,
      `SELECT ${TERM_WITH_TRANSLATION_SELECT}
       FROM collected_terms
       WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'imported'
       ORDER BY processed_at DESC, id DESC
       LIMIT ?`,
      [since, until]
    );
    const knownTerms = listTerms(
      db,
      `SELECT ${TERM_WITH_TRANSLATION_SELECT}
       FROM collected_terms
       WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'known'
       ORDER BY processed_at DESC, id DESC
       LIMIT ?`,
      [since, until]
    );
    const ignoredTerms = listTerms(
      db,
      `SELECT ${TERM_WITH_TRANSLATION_SELECT}
       FROM collected_terms
       WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'ignored'
       ORDER BY processed_at DESC, id DESC
       LIMIT ?`,
      [since, until]
    );
    const pendingSample = listTerms(
      db,
      `SELECT ${TERM_WITH_TRANSLATION_SELECT}
       FROM collected_terms
       WHERE first_seen_at >= ? AND first_seen_at < ? AND status = 'pending'
       ORDER BY last_seen_at DESC, id DESC
       LIMIT ?`,
      [since, until]
    );

    const lines = [
      `词库日报｜${formatDateTime(since)} - ${formatDateTime(until)}`,
      "",
      "概览",
      `- 新收集：${newCount} 个`,
      `- 来源：Codex ${codexNew} / OpenClaw ${openclawNew} / both ${bothNew}`,
      `- 新入库：${importedCount} 个`,
      `- 已存在：${knownCount} 个`,
      `- 已忽略：${ignoredCount} 个`,
      `- 待处理：${pendingCount} 个`,
      ""
    ];

    let hiddenNoiseCount = 0;
    hiddenNoiseCount += addTermSection(lines, "新收集", newTerms);
    lines.push("");
    hiddenNoiseCount += addTermSection(lines, "新入库", importedTerms);
    lines.push("");
    hiddenNoiseCount += addTermSection(lines, "已存在", knownTerms);
    lines.push("");
    hiddenNoiseCount += addTermSection(lines, "已忽略", ignoredTerms);
    lines.push("");
    hiddenNoiseCount += addTermSection(lines, "待处理预览", pendingSample);
    lines.push("");
    lines.push(
      "噪音观察",
      `- ${noiseObservation({ ignoredCount, pendingCount, newCount, structuredIgnored, hiddenNoiseCount })}`
    );

    console.log(lines.join("\n"));
  } finally {
    db.close();
  }
}

main();
