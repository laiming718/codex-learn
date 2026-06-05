"use client";

import { BookOpen, CheckCircle2, ListFilter, Search, Volume2 } from "lucide-react";
import { useEffect, useMemo, useState, startTransition } from "react";
import type { ReviewResult, VocabularyEntry, VocabularyStats } from "@/lib/types";

type ViewMode = "library" | "review";
type ReviewSource = "today" | "unlearned";

type EntriesResponse = {
  entries: VocabularyEntry[];
  stats: VocabularyStats;
};

const emptyStats: VocabularyStats = {
  total: 0,
  learned: 0,
  unlearned: 0,
  due: 0,
  newCount: 0
};

let cachedEnglishVoice: SpeechSynthesisVoice | null = null;

function normalizeSpeechText(text: string) {
  return text
    .replace(/\bAPI\b/g, "A P I")
    .replace(/\bCLI\b/g, "C L I")
    .replace(/\bGUI\b/g, "G U I")
    .replace(/\bUI\b/g, "U I")
    .replace(/\bUX\b/g, "U X")
    .replace(/\bRAG\b/g, "R A G")
    .replace(/\bLLM\b/g, "L L M")
    .replace(/\bMCP\b/g, "M C P")
    .replace(/\bSSR\b/g, "S S R");
}

function cachePreferredEnglishVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const preferredNames = ["Samantha", "Ava", "Allison", "Susan", "Alex", "Tom"];
  const roughVoiceNames = ["Eddy", "Flo", "Grandma", "Grandpa", "Reed", "Rocko", "Sandy", "Shelley"];
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const stableVoices = englishVoices.filter((voice) =>
    roughVoiceNames.every((name) => !voice.name.toLowerCase().includes(name.toLowerCase()))
  );

  cachedEnglishVoice =
    preferredNames
      .map((name) => stableVoices.find((voice) => voice.name.toLowerCase().includes(name.toLowerCase())))
      .find(Boolean) ||
    stableVoices.find((voice) => voice.lang.toLowerCase() === "en-us") ||
    stableVoices[0] ||
    englishVoices[0] ||
    null;

  return cachedEnglishVoice;
}

function speak(text: string, rate = 0.84) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(normalizeSpeechText(text));
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = cachedEnglishVoice || cachePreferredEnglishVoice();
  if (voice) {
    utterance.voice = voice;
  }

  window.setTimeout(() => synth.speak(utterance), 35);
}

function getSortTime(entry: VocabularyEntry) {
  if (entry.status === "已学会") {
    return entry.learnedAt || entry.createdAt || 0;
  }

  return entry.unlearnedAt || entry.createdAt || 0;
}

function sortEntriesForLibrary(entries: VocabularyEntry[]) {
  return [...entries].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "未学会" ? -1 : 1;
    }

    const timeDiff = getSortTime(right) - getSortTime(left);
    if (timeDiff !== 0) {
      return timeDiff;
    }

    return right.id - left.id;
  });
}

function formatPartOfSpeech(partOfSpeech: string) {
  return partOfSpeech
    .replace(/\badjective\b/gi, "adj.")
    .replace(/\badverb\b/gi, "adv.")
    .replace(/\bnoun\b/gi, "n.")
    .replace(/\bverb\b/gi, "v.")
    .replace(/\bpronoun\b/gi, "pron.")
    .replace(/\bpreposition\b/gi, "prep.")
    .replace(/\bconjunction\b/gi, "conj.")
    .replace(/\binterjection\b/gi, "interj.")
    .split(/\s*(?:\/|\bor\b|,|;)\s*/i)
    .filter(Boolean);
}

export function VocabularyApp() {
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [stats, setStats] = useState<VocabularyStats>(emptyStats);
  const [mode, setMode] = useState<ViewMode>("library");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("全部类型");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [reviewQueue, setReviewQueue] = useState<VocabularyEntry[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewSource, setReviewSource] = useState<ReviewSource>("today");
  const [reviewDone, setReviewDone] = useState({ forgot: 0, fuzzy: 0, good: 0 });
  const [isLoading, setIsLoading] = useState(true);

  async function loadEntries() {
    const response = await fetch("/api/entries", { cache: "no-store" });
    const data = (await response.json()) as EntriesResponse;
    startTransition(() => {
      setEntries(sortEntriesForLibrary(data.entries));
      setStats(data.stats);
      setIsLoading(false);
    });
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      cachePreferredEnglishVoice();
      window.speechSynthesis.addEventListener("voiceschanged", cachePreferredEnglishVoice);

      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", cachePreferredEnglishVoice);
      };
    }
  }, []);

  const types = useMemo(() => {
    return ["全部类型", ...Array.from(new Set(entries.map((entry) => entry.type))).sort()];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return entries.filter((entry) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [
          entry.english,
          entry.chinese,
          entry.plainExplanation,
          entry.professionalExplanation,
          entry.example,
          entry.exampleChinese,
          entry.commonScenarios,
          entry.type
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesType = typeFilter === "全部类型" || entry.type === typeFilter;
      const matchesStatus = statusFilter === "全部状态" || entry.status === statusFilter;
      return matchesQuery && matchesType && matchesStatus;
    });
  }, [entries, query, statusFilter, typeFilter]);

  async function toggleStatus(entry: VocabularyEntry) {
    const nextStatus = entry.status === "已学会" ? "未学会" : "已学会";
    const response = await fetch(`/api/entries/${entry.id}/state`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = (await response.json()) as { entry: VocabularyEntry; stats: VocabularyStats };
    setStats(data.stats);
    setEntries((current) => sortEntriesForLibrary(current.map((item) => (item.id === entry.id ? data.entry : item))));
  }

  async function startReview(source: ReviewSource) {
    const response = await fetch(`/api/review/queue?source=${source}`, { cache: "no-store" });
    const data = (await response.json()) as EntriesResponse;
    setReviewSource(source);
    setReviewQueue(data.entries);
    setReviewIndex(0);
    setShowAnswer(false);
    setReviewDone({ forgot: 0, fuzzy: 0, good: 0 });
    setStats(data.stats);
    setMode("review");
  }

  async function submitReviewResult(result: ReviewResult) {
    const current = reviewQueue[reviewIndex];

    if (!current) {
      return;
    }

    const response = await fetch("/api/review/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: current.id, result })
    });
    const data = (await response.json()) as { entry: VocabularyEntry; stats: VocabularyStats };
    setStats(data.stats);
    setEntries((currentEntries) => sortEntriesForLibrary(currentEntries.map((entry) => (entry.id === current.id ? data.entry : entry))));
    setReviewDone((currentDone) => ({ ...currentDone, [result]: currentDone[result] + 1 }));

    const nextQueue = [...reviewQueue];
    if (result === "forgot" && data.entry) {
      nextQueue.splice(Math.min(reviewIndex + 4, nextQueue.length), 0, data.entry);
    }
    setReviewQueue(nextQueue);
    setReviewIndex((currentIndex) => currentIndex + 1);
    setShowAnswer(false);
  }

  const currentReview = reviewQueue[reviewIndex];
  const completedCount = reviewDone.forgot + reviewDone.fuzzy + reviewDone.good;

  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-top">
          <div>
            <h1>我的专业词库</h1>
            <p>AI / 编程词汇积累与复习都会继续整理在这里。</p>
          </div>
          <div className="mode-switch">
            <button className={mode === "library" ? "active" : ""} onClick={() => setMode("library")} type="button">
              词库
            </button>
            <button className={mode === "review" ? "active" : ""} onClick={() => setMode("review")} type="button">
              复习
            </button>
          </div>
        </div>
        <div className="stats-grid">
          <Stat label="总词库" value={stats.total} />
          <Stat label="已学会" value={stats.learned} />
          <Stat label="未学会" value={stats.unlearned} />
          <Stat label="待复习" value={stats.due} />
        </div>
      </section>

      {mode === "library" ? (
        <>
          <section className="filters">
            <label className="search-field">
              <span>搜索英文或中文</span>
              <div>
                <Search size={18} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="例如：schema / 结构 / issue" />
              </div>
            </label>
            <label>
              <span>按类型筛选</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>学习状态</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option>全部状态</option>
                <option>未学会</option>
                <option>已学会</option>
              </select>
            </label>
          </section>
          <VocabularyTable entries={filteredEntries} isLoading={isLoading} onToggleStatus={toggleStatus} />
        </>
      ) : (
        <section className="review-layout">
          <aside className="review-panel">
            <h2>今日复习</h2>
            <div className="review-metrics">
              <Stat label="待复习" value={stats.due} compact />
              <Stat label="新词" value={stats.newCount} compact />
              <Stat label="未学会" value={stats.unlearned} compact />
              <Stat label="本轮完成" value={completedCount} compact />
            </div>
            <button className="primary-button" onClick={() => void startReview("today")} type="button">
              开始今日复习
            </button>
            <button className="secondary-button" onClick={() => void startReview("unlearned")} type="button">
              只复习未学会
            </button>
          </aside>
          <ReviewCard
            current={currentReview}
            index={reviewIndex}
            total={reviewQueue.length}
            showAnswer={showAnswer}
            source={reviewSource}
            done={reviewDone}
            onShowAnswer={() => setShowAnswer(true)}
            onResult={(result) => void submitReviewResult(result)}
          />
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: number; compact?: boolean }) {
  return (
    <div className={compact ? "stat compact" : "stat"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function VocabularyTable({
  entries,
  isLoading,
  onToggleStatus
}: {
  entries: VocabularyEntry[];
  isLoading: boolean;
  onToggleStatus: (entry: VocabularyEntry) => void;
}) {
  if (isLoading) {
    return <div className="empty-state">正在加载词库。</div>;
  }

  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>英文</th>
            <th>中文</th>
            <th>通俗解释/专业解释</th>
            <th>例句</th>
            <th>常见场景</th>
            <th>学习状态</th>
            <th>类型</th>
            <th>词性</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td>
                <div className="term-line">
                  <strong>{entry.english}</strong>
                  <button aria-label={`播放 ${entry.english}`} onClick={() => speak(entry.speechText || entry.english)} type="button">
                    <Volume2 size={17} />
                  </button>
                </div>
                <div className="ipa">{entry.ipa}</div>
              </td>
              <td>{entry.chinese}</td>
              <td>
                <details>
                  <summary>{entry.plainExplanation}</summary>
                  <p>{entry.professionalExplanation}</p>
                </details>
              </td>
              <td>
                <details className="example-box">
                  <summary>
                    {entry.example}
                    {entry.example ? (
                      <button aria-label={`播放例句 ${entry.example}`} onClick={(event) => {
                        event.preventDefault();
                        speak(entry.example || "", 0.7);
                      }} type="button">
                        <Volume2 size={17} />
                      </button>
                    ) : null}
                  </summary>
                  <p>{entry.exampleChinese}</p>
                </details>
              </td>
              <td>{entry.commonScenarios}</td>
              <td>
                <button className={entry.status === "已学会" ? "status learned" : "status"} onClick={() => onToggleStatus(entry)} type="button">
                  {entry.status}
                </button>
              </td>
              <td>{entry.type}</td>
              <td>
                <span className="part-of-speech-list">
                  {formatPartOfSpeech(entry.partOfSpeech).map((part) => (
                    <span key={part}>{part}</span>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReviewCard({
  current,
  index,
  total,
  showAnswer,
  done,
  onShowAnswer,
  onResult
}: {
  current: VocabularyEntry | undefined;
  index: number;
  total: number;
  source: ReviewSource;
  showAnswer: boolean;
  done: Record<ReviewResult, number>;
  onShowAnswer: () => void;
  onResult: (result: ReviewResult) => void;
}) {
  if (!current) {
    return (
      <section className="review-card empty">
        <CheckCircle2 size={34} />
        <h2>今天没有需要复习的词</h2>
        <p>本轮完成：没记住 {done.forgot} · 有点印象 {done.fuzzy} · 记住了 {done.good}</p>
      </section>
    );
  }

  return (
    <section className="review-card">
      <div className="review-head">
        <span>第 {index + 1} / {total} 个</span>
        <span>没记住 {done.forgot} · 有点印象 {done.fuzzy} · 记住了 {done.good}</span>
      </div>
      <div className="review-word">{current.english}</div>
      <div className="review-ipa">
        {current.ipa}
        <button aria-label={`播放 ${current.english}`} onClick={() => speak(current.speechText || current.english)} type="button">
          <Volume2 size={22} />
        </button>
      </div>
      {!showAnswer ? (
        <button className="primary-button answer-button" onClick={onShowAnswer} type="button">
          显示答案
        </button>
      ) : (
        <div className="answer-panel">
          <h3>{current.chinese}</h3>
          <p>{current.plainExplanation}</p>
          <p className="muted">{current.professionalExplanation}</p>
          <div className="review-example">
            <BookOpen size={18} />
            <span>{current.example}</span>
          </div>
          <p className="muted">{current.exampleChinese}</p>
          <div className="feedback-row">
            <button className="forgot" onClick={() => onResult("forgot")} type="button">没记住</button>
            <button className="fuzzy" onClick={() => onResult("fuzzy")} type="button">有点印象</button>
            <button className="good" onClick={() => onResult("good")} type="button">记住了</button>
          </div>
        </div>
      )}
    </section>
  );
}
