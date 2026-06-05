import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const dbPath = path.resolve(process.cwd(), process.env.VOCABULARY_DB_PATH || "./data/vocabulary.sqlite");
mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    english TEXT NOT NULL UNIQUE,
    chinese TEXT NOT NULL,
    plain_explanation TEXT NOT NULL,
    type TEXT NOT NULL,
    part_of_speech TEXT NOT NULL,
    ipa TEXT,
    speech_text TEXT,
    common_scenarios TEXT,
    example TEXT,
    example_chinese TEXT,
    professional_explanation TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entry_states (
    entry_id INTEGER PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT '未学会',
    learned_at INTEGER,
    unlearned_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS review_states (
    entry_id INTEGER PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
    review_level TEXT NOT NULL DEFAULT 'new',
    last_reviewed_at INTEGER,
    next_review_at INTEGER,
    last_review_result TEXT,
    review_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    fuzzy_count INTEGER NOT NULL DEFAULT 0,
    streak INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
`);

export { db };
