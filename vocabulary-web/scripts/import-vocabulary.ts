import { db } from "../lib/db";
import Papa from "papaparse";
import { readFileSync } from "node:fs";
import path from "node:path";

type CsvRow = {
  english: string;
  chinese: string;
  plain_explanation: string;
  domain: string;
  part_of_speech: string;
  ipa: string;
  speech_text: string;
  common_scenarios: string;
  example: string;
  example_chinese: string;
  details: string;
  learned: string;
};

const csvPath = path.resolve(process.cwd(), "../vocabulary/vocabulary.csv");
const csv = readFileSync(csvPath, "utf8");
const parsed = Papa.parse<CsvRow>(csv, {
  header: true,
  skipEmptyLines: true
});

if (parsed.errors.length > 0) {
  throw new Error(parsed.errors.map((error) => error.message).join("\n"));
}

const now = Date.now();

const insertEntry = db.prepare(`
  INSERT INTO entries (
    english,
    chinese,
    plain_explanation,
    type,
    part_of_speech,
    ipa,
    speech_text,
    common_scenarios,
    example,
    example_chinese,
    professional_explanation,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(english) DO UPDATE SET
    chinese = excluded.chinese,
    plain_explanation = excluded.plain_explanation,
    type = excluded.type,
    part_of_speech = excluded.part_of_speech,
    ipa = excluded.ipa,
    speech_text = excluded.speech_text,
    common_scenarios = excluded.common_scenarios,
    example = excluded.example,
    example_chinese = excluded.example_chinese,
    professional_explanation = excluded.professional_explanation,
    updated_at = excluded.updated_at
`);

const getEntryId = db.prepare("SELECT id FROM entries WHERE english = ?");
const insertState = db.prepare(`
  INSERT INTO entry_states (entry_id, status, learned_at, unlearned_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(entry_id) DO NOTHING
`);
const insertReviewState = db.prepare(`
  INSERT INTO review_states (entry_id, review_level, updated_at)
  VALUES (?, 'new', ?)
  ON CONFLICT(entry_id) DO NOTHING
`);

function importRows(rows: CsvRow[]) {
  db.exec("BEGIN");
  try {
  for (const row of rows) {
    const status = row.learned === "已学会" ? "已学会" : "未学会";
    insertEntry.run(
      row.english,
      row.chinese,
      row.plain_explanation,
      row.domain,
      row.part_of_speech,
      row.ipa,
      row.speech_text,
      row.common_scenarios,
      row.example,
      row.example_chinese,
      row.details,
      now,
      now
    );

    const entry = getEntryId.get(row.english) as { id: number };
    insertState.run(entry.id, status, status === "已学会" ? now : null, status === "未学会" ? now : null, now, now);
    insertReviewState.run(entry.id, now);
  }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

importRows(parsed.data);
console.log(`Imported ${parsed.data.length} vocabulary entries.`);
