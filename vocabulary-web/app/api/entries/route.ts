import { getStats, listEntries } from "@/lib/repository";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const entries = listEntries();
  return NextResponse.json({
    entries,
    stats: getStats(entries)
  });
}
