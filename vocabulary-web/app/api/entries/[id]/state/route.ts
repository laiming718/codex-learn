import { getStats, listEntries, updateEntryStatus } from "@/lib/repository";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  status: z.enum(["已学会", "未学会"])
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const entryId = Number(params.id);
  const body = bodySchema.parse(await request.json());
  const entry = updateEntryStatus(entryId, body.status);
  const entries = listEntries();

  return NextResponse.json({
    entry,
    stats: getStats(entries)
  });
}
