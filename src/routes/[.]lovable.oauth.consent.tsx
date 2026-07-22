import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

type AuthorizationDetails = {
  client?: { name?: string; redirect_uri?: string } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
};

// Beta namespace not yet in the SDK types.
type OAuthClient = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
};

function oauthClient(): OAuthClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auth = supabase.auth as any;
  if (!auth?.oauth) throw new Error("This project's Supabase client does not yet expose auth.oauth. Update @supabase/supabase-js.");
  return auth.oauth as OAuthClient;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthClient().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-6">
      <Card className="p-6">
        <h1 className="mb-2 font-display text-xl font-semibold">Authorization error</h1>
        <p className="text-sm text-muted-foreground">
          Could not load this authorization request: {String((error as Error)?.message ?? error)}
        </p>
      </Card>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const client = oauthClient();
    const { data, error } = approve
      ? await client.approveAuthorization(authorization_id)
      : await client.denyAuthorization(authorization_id);
    if (error) { setBusy(false); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an app";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  return (
    <main className="mx-auto max-w-md p-6">
      <Card className="p-6 sm:p-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-mission text-white shadow-soft">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold">Connect {clientName}</h1>
            <p className="text-sm text-muted-foreground">Cross-Cultural Ministry</p>
          </div>
        </div>

        <p className="mb-4 text-sm">
          <strong>{clientName}</strong> will be able to call this app's enabled tools while you are
          signed in. This does not bypass this app's permissions or backend policies.
        </p>

        {scopes.length > 0 ? (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-xs">
            <div className="mb-1 font-semibold uppercase tracking-wider text-muted-foreground">Requested access</div>
            <ul className="list-disc space-y-1 pl-4">
              {scopes.map((s: string) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        ) : null}

        {details?.client?.redirect_uri ? (
          <p className="mb-4 break-all text-xs text-muted-foreground">
            Redirect: <code>{details.client.redirect_uri}</code>
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="mb-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1 rounded-full"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full"
            disabled={busy}
            onClick={() => decide(false)}
          >
            Cancel connection
          </Button>
        </div>
      </Card>
    </main>
  );
}
