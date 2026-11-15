"use server";
import { allow, clientIp } from "@/lib/guard";
import { reportError } from "@/lib/monitor";

/** Browser errors (crashed screens, failed scripts). Rate-limited per device; only short text is stored. */
export async function reportClientErrorAction(input: { message: string; path?: string; digest?: string; stack?: string }): Promise<void> {
  if (!input || typeof input.message !== "string" || !input.message.trim()) return;
  if (!(await allow("clientError", await clientIp()))) return;
  await reportError("client", input.message.slice(0, 500), {
    path: typeof input.path === "string" ? input.path.slice(0, 300) : "",
    digest: typeof input.digest === "string" ? input.digest.slice(0, 100) : null,
    detail: typeof input.stack === "string" ? input.stack.slice(0, 2000) : null,
  });
}
