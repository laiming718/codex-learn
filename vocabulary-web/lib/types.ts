export type EntryStatus = "已学会" | "未学会";
export type ReviewResult = "forgot" | "fuzzy" | "good";

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
