import { db } from "@/lib/db";
import { getNextReviewAt } from "@/lib/time";
import type { EntryStatus, ReviewResult, VocabularyEntry, VocabularyStats } from "@/lib/types";

type EntryRow = {
  id: number;
  english: string;
  chinese: string;
  plain_explanation: string;
  type: string;
  part_of_speech: string;
  ipa: string | null;
  speech_text: string | null;
  common_scenarios: string | null;
  example: string | null;
  example_chinese: string | null;
  professional_explanation: string | null;
  status: EntryStatus;
  learned_at: number | null;
  unlearned_at: number | null;
  created_at: number;
  review_level: string;
  last_reviewed_at: number | null;
  next_review_at: number | null;
  last_review_result: string | null;
  review_count: number;
  correct_count: number;
  wrong_count: number;
  fuzzy_count: number;
  streak: number;
};

function mapEntry(row: EntryRow): VocabularyEntry {
  return {
    id: row.id,
    english: row.english,
    chinese: row.chinese,
    plainExplanation: row.plain_explanation,
    type: row.type,
    partOfSpeech: row.part_of_speech,
    ipa: row.ipa,
    speechText: row.speech_text,
    commonScenarios: row.common_scenarios,
    example: row.example,
    exampleChinese: row.example_chinese,
    professionalExplanation: row.professional_explanation,
    status: row.status,
    learnedAt: row.learned_at,
    unlearnedAt: row.unlearned_at,
    createdAt: row.created_at,
    reviewLevel: row.review_level,
    lastReviewedAt: row.last_reviewed_at,
    nextReviewAt: row.next_review_at,
    lastReviewResult: row.last_review_result,
    reviewCount: row.review_count,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    fuzzyCount: row.fuzzy_count,
    streak: row.streak
  };
}

const entrySelect = `
  SELECT
    e.id,
    e.english,
    e.chinese,
    e.plain_explanation,
    e.type,
    e.part_of_speech,
    e.ipa,
    e.speech_text,
    e.common_scenarios,
    e.example,
    e.example_chinese,
    e.professional_explanation,
    s.status,
    s.learned_at,
    s.unlearned_at,
    s.created_at,
    r.review_level,
    r.last_reviewed_at,
    r.next_review_at,
    r.last_review_result,
    r.review_count,
    r.correct_count,
    r.wrong_count,
    r.fuzzy_count,
    r.streak
  FROM entries e
  JOIN entry_states s ON s.entry_id = e.id
  JOIN review_states r ON r.entry_id = e.id
`;

export function listEntries() {
  const rows = db.prepare(
    `${entrySelect}
      ORDER BY
        CASE WHEN s.status = '未学会' THEN 0 ELSE 1 END,
        CASE
          WHEN s.status = '未学会' THEN COALESCE(s.unlearned_at, s.created_at)
          ELSE COALESCE(s.learned_at, s.created_at)
        END DESC,
        e.id DESC`
  ).all() as EntryRow[];
  return rows.map(mapEntry);
}

export function getStats(entries = listEntries()): VocabularyStats {
  const now = Date.now();
  return {
    total: entries.length,
    learned: entries.filter((entry) => entry.status === "已学会").length,
    unlearned: entries.filter((entry) => entry.status === "未学会").length,
    due: entries.filter((entry) => isReviewable(entry, now)).length,
    newCount: entries.filter((entry) => entry.reviewCount === 0 || entry.reviewLevel === "new").length
  };
}

export function isReviewable(entry: VocabularyEntry, now = Date.now()) {
  return (
    entry.status === "未学会" ||
    entry.reviewCount === 0 ||
    entry.reviewLevel === "new" ||
    Boolean(entry.nextReviewAt && entry.nextReviewAt <= now)
  );
}

export function listReviewEntries(source: "today" | "unlearned" = "today") {
  const now = Date.now();
  const entries = listEntries().filter((entry) =>
    source === "unlearned" ? entry.status === "未学会" : isReviewable(entry, now)
  );

  return entries.sort((left, right) => {
    const leftScore = scoreReviewItem(left, now);
    const rightScore = scoreReviewItem(right, now);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    const leftTime = left.unlearnedAt || left.nextReviewAt || left.createdAt || 0;
    const rightTime = right.unlearnedAt || right.nextReviewAt || right.createdAt || 0;
    return rightTime - leftTime;
  });
}

function scoreReviewItem(entry: VocabularyEntry, now: number) {
  if (entry.lastReviewResult === "forgot" && entry.nextReviewAt && entry.nextReviewAt <= now) {
    return 50;
  }
  if (entry.unlearnedAt) {
    return 40;
  }
  if (entry.reviewCount === 0 || entry.reviewLevel === "new") {
    return 30;
  }
  if (entry.status === "未学会") {
    return 20;
  }
  if (entry.nextReviewAt && entry.nextReviewAt <= now) {
    return 10;
  }
  return 0;
}

export function updateEntryStatus(entryId: number, status: EntryStatus) {
  const now = Date.now();
  const learnedAt = status === "已学会" ? now : null;
  const unlearnedAt = status === "未学会" ? now : null;

  db.prepare(
    `
      UPDATE entry_states
      SET status = ?, learned_at = ?, unlearned_at = ?, updated_at = ?
      WHERE entry_id = ?
    `
  ).run(status, learnedAt, unlearnedAt, now, entryId);

  return getEntry(entryId);
}

export function applyReviewResult(entryId: number, result: ReviewResult) {
  const now = Date.now();
  const entry = getEntry(entryId);

  if (!entry) {
    return null;
  }

  const nextStatus: EntryStatus = result === "good" ? "已学会" : "未学会";
  const nextStreak = result === "good" ? entry.streak + 1 : 0;
  const nextReviewAt = getNextReviewAt(result, nextStreak, now);

  db.exec("BEGIN");
  try {
    db.prepare(
      `
        UPDATE entry_states
        SET status = ?, learned_at = ?, unlearned_at = ?, updated_at = ?
        WHERE entry_id = ?
      `
    ).run(nextStatus, result === "good" ? now : null, result === "good" ? null : now, now, entryId);

    db.prepare(
      `
        UPDATE review_states
        SET
          review_level = ?,
          last_reviewed_at = ?,
          next_review_at = ?,
          last_review_result = ?,
          review_count = review_count + 1,
          correct_count = correct_count + ?,
          wrong_count = wrong_count + ?,
          fuzzy_count = fuzzy_count + ?,
          streak = ?,
          updated_at = ?
        WHERE entry_id = ?
      `
    ).run(
      result === "good" && nextStreak >= 3 ? "mastered" : "learning",
      now,
      nextReviewAt,
      result,
      result === "good" ? 1 : 0,
      result === "forgot" ? 1 : 0,
      result === "fuzzy" ? 1 : 0,
      nextStreak,
      now,
      entryId
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getEntry(entryId);
}

export function getEntry(entryId: number) {
  const row = db.prepare(`${entrySelect} WHERE e.id = ?`).get(entryId) as EntryRow | undefined;
  return row ? mapEntry(row) : null;
}
