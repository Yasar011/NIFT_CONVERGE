import { handle, ok } from "@/lib/server/http";
import { requireAdmin, assertClubAccess } from "@/lib/server/auth";
import { queryEntries } from "@/lib/server/entries";

export const GET = handle(async (req: Request) => {
  const admin = await requireAdmin(req);
  const params = new URL(req.url).searchParams;
  const event = params.get("event");
  const category = admin.role === "club_admin" ? admin.club! : params.get("category");

  if (event) {
    assertClubAccess(admin, event.split(":")[0]);
    return ok({ entries: (await queryEntries("eventKey", event)).entries });
  }
  const { entries } = category ? await queryEntries("category", category) : await queryEntries(null);
  return ok({ entries });
});
