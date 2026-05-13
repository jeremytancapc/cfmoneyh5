import { consumeAuthCallbackPayload } from "@/lib/auth-callback-store";
import mockSingpassPayload from "@/lib/mock-singpass-payload.json";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CallbackResultPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const ridParam = params.rid;
  const sourceParam = params.source;
  const rid = Array.isArray(ridParam) ? ridParam[0] : ridParam;
  const source = Array.isArray(sourceParam) ? sourceParam[0] : sourceParam;
  const isMockSource = source === "mock";
  const payload = isMockSource ? mockSingpassPayload : rid ? consumeAuthCallbackPayload(rid) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Auth Callback Result</h1>
      <p className="text-sm text-slate-600">
        UI testing mode: open <code>/auth/callback-result?source=mock</code> to load local payload.
      </p>

      {!rid && !isMockSource ? (
        <p className="rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
          Missing request id (`rid`) in URL.
        </p>
      ) : payload ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm text-slate-600">
            {isMockSource ? (
              <>Showing local mock Singpass payload.</>
            ) : (
              <>
                Received payload for request id: <code>{rid}</code>
              </>
            )}
          </p>
          <pre className="overflow-auto rounded-md bg-slate-950 p-4 text-sm text-slate-100">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </section>
      ) : (
        <p className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No payload found for this request id. It may have expired or already been viewed.
        </p>
      )}
    </main>
  );
}
