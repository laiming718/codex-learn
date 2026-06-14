export type EntryStatus = "已学会" | "未学会";
export type ReviewResult = "forgot" | "fuzzy" | "good";
export type CollectedTermSource = "codex" | "openclaw" | "both";
export type CollectedTermStatus = "pending" | "imported" | "ignored" | "known";

export type VocabularyEntry = {
  id: number;
  english: string;
  chinese: string;
  plainExplanation: string;
  type: string;
  partOfSpeech: string;
  ipa: string | null;
  speechText: string | null;
  commonScenarios: string | null;
  example: string | null;
  exampleChinese: string | null;
  professionalExplanation: string | null;
  status: EntryStatus;
  learnedAt: number | null;
  unlearnedAt: number | null;
  createdAt: number;
  reviewLevel: string;
  lastReviewedAt: number | null;
  nextReviewAt: number | null;
  lastReviewResult: string | null;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  fuzzyCount: number;
  streak: number;
};

export type VocabularyStats = {
  total: number;
  learned: number;
  unlearned: number;
  due: number;
  newCount: number;
};

export type CollectedTerm = {
  id: number;
  term: string;
  normalizedTerm: string;
  simpleTranslation: string | null;
  source: CollectedTermSource;
  status: CollectedTermStatus;
  seenCount: number;
  contextSample: string | null;
  firstSeenAt: number;
  lastSeenAt: number;
  processedAt: number | null;
  entryId: number | null;
};
