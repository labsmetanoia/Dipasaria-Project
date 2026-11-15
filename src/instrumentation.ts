// Next.js calls onRequestError for every uncaught error while rendering a page, a route handler or a server action.
// The errors go to the error log (/admin/sistem) and, if ALERT_WEBHOOK_URL is set, to the owner's chat.
export async function register() {}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/monitor");
  const e = err as Error & { digest?: string };
  await reportError("server", e, {
    path: context.routePath || request.path,
    digest: e?.digest ?? null,
    detail: `${request.method} ${context.routeType} ${request.path.split("?")[0]}\n${e?.stack?.slice(0, 3000) ?? ""}`,
  });
}
