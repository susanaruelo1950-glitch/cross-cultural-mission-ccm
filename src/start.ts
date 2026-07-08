import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

// Build/version tag stamped into every SSR error log so we can correlate
// failures with a specific deploy.
const BUILD_VERSION =
  (typeof process !== "undefined" && process.env?.CF_VERSION_METADATA) ||
  (typeof process !== "undefined" && process.env?.COMMIT_SHA) ||
  "unknown";

function logSsrError(scope: string, error: unknown, request?: Request) {
  const path = request?.url ?? "(no request)";
  const method = request?.method ?? "";
  try {
    console.error(
      `[ssr:${scope}] build=${BUILD_VERSION} ${method} ${path}`,
      error,
    );
    if (error instanceof Error && error.stack) {
      console.error(`[ssr:${scope}] stack:`, error.stack);
    }
  } catch {
    // never let logging itself throw
  }
}

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  try {
    return await next();
  } catch (error) {
    // Log EVERY thrown error before rethrowing status-coded ones so h3
    // cannot silently swallow them.
    logSsrError("request-middleware", error, request as Request | undefined);
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
