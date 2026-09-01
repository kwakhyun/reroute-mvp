import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AuthenticationError, AuthorizationError } from "@/server/auth/errors";
import { requireUser } from "@/server/auth/session";
import { requireProjectAccess } from "@/server/auth/project-access";
import { db } from "@/server/db/client";
import { analyticsEvents } from "@/server/db/schema";
import { observeHttpRequest } from "@/server/observability/http";

const eventSchema = z.object({
  name: z.enum(["dashboard_viewed", "bids_opened", "recalculation_opened", "confirmation_opened"]),
  projectId: z.string().min(1),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});

export async function POST(request: Request) {
  return observeHttpRequest(request, "/api/analytics/events", async () => {
    try {
      const user = await requireUser();
      const parsed = eventSchema.safeParse(await request.json());
      if (!parsed.success) {
        return Response.json({ error: "invalid_payload" }, { status: 400 });
      }
      await requireProjectAccess(parsed.data.projectId);
      await db.insert(analyticsEvents).values({
        id: randomUUID(),
        userId: user.id,
        projectId: parsed.data.projectId,
        name: parsed.data.name,
        propertiesJson: JSON.stringify(parsed.data.properties),
      });
      return new Response(null, { status: 204 });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }
      if (error instanceof AuthorizationError) {
        return Response.json({ error: "not_found" }, { status: 404 });
      }
      throw error;
    }
  });
}
