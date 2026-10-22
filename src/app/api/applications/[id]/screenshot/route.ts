import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth/user";

export async function GET(_req: Request, { params }: RouteContext<"/api/applications/[id]/screenshot">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const [row] = await db
    .select({ screenshot: schema.applications.screenshot })
    .from(schema.applications)
    .where(and(eq(schema.applications.id, id), eq(schema.applications.userId, user.id)));
  if (!row?.screenshot) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(row.screenshot), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}
