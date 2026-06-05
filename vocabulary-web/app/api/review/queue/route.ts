import { getStats, listEntries, listReviewEntries } from "@/lib/repository";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") === "unlearned" ? "unlearned" : "today";
  const entries = listEntries();

  return NextResponse.json({
    entries: listReviewEntries(source),
    stats: getStats(entries)
  });
}
