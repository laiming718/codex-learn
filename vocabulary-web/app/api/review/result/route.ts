import { applyReviewResult, getStats, listEntries } from "@/lib/repository";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  entryId: z.number(),
  result: z.enum(["forgot", "fuzzy", "good"])
});

export async function POST(request: Request) {
  const body = bodySchema.parse(await request.json());
  const entry = applyReviewResult(body.entryId, body.result);
  const entries = listEntries();

  return NextResponse.json({
    entry,
    stats: getStats(entries)
  });
}
