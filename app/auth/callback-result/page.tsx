"use client";

import { useState, useCallback } from "react";
import mockPayload from "@/lib/mock-singpass-payload.json";

type Patch = Record<string, unknown>;

const MOCK_MYINFO = JSON.stringify(mockPayload.myinfo, null, 2);

export default function CallbackResultPage() {
  const [rawJson, setRawJson]     = useState(MOCK_MYINFO);
  const [patch, setPatch]         = useState<Patch | null>(null);
  const [rawPayload, setRawPayload] = useState<unknown>(null);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState<"patch" | "raw">("patch");

  const process = useCallback(async () => {
    setError(null);
    setPatch(null);
    setRawPayload(null);
    setLoading(true);
    try {
      let myinfo: unknown;
      try {
        myinfo = JSON.parse(rawJson);
      } catch {
        setError("Invalid JSON — check your input.");
        return;
      }

      // If the pasted JSON is a full webhook payload ({ myinfo: {...} }), unwrap it
      const myinfoObj =
        myinfo && typeof myinfo === "object" && "myinfo" in (myinfo as Record<string, unknown>)
          ? (myinfo as Record<string, unknown>).myinfo
          : myinfo;

      const res = await fetch("/api/dev/myinfo-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myinfo: myinfoObj }),
      });
      if (!res.ok) {
        setError(`Server error ${res.status}`);
        return;
      }
      const data = (await res.json()) as { patch: Patch };
      setPatch(data.patch);
      setRawPayload(myinfoObj);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [rawJson]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-5 p-6 font-mono text-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900">MyInfo payload preview</h1>
        <p className="mt-1 text-xs text-slate-500">
          Paste a raw MyInfo object (or full webhook JSON) and click Process to see what
          the form would extract. URL: <code>/auth/callback-result</code>
        </p>
      </div>

      {/* Input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            MyInfo JSON input
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setRawJson(MOCK_MYINFO)}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50 active:bg-slate-100"
            >
              Load mock
            </button>
            <button
              onClick={() => { setRawJson(""); setPatch(null); setRawPayload(null); setError(null); }}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-50 active:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={rawJson}
          onChange={(e) => setRawJson(e.target.value)}
          rows={14}
          className="w-full rounded-lg border border-slate-300 bg-slate-950 p-4 text-xs text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder='Paste raw myinfo JSON here, or a full webhook payload { "myinfo": { ... } }'
          spellCheck={false}
        />
        <button
          onClick={() => void process()}
          disabled={loading || !rawJson.trim()}
          className="self-start rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Processing…" : "Process →"}
        </button>
        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>
        )}
      </div>

      {/* Output */}
      {patch && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Output</span>
            <div className="flex overflow-hidden rounded-md border border-slate-300">
              {(["patch", "raw"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs font-medium transition ${
                    activeTab === tab
                      ? "bg-slate-800 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab === "patch" ? "Processed patch" : "Raw myinfo"}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "patch" && (
            <div className="rounded-lg border border-slate-200 bg-slate-950 p-4">
              {/* Quick field summary */}
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-md border border-slate-700 bg-slate-900 p-3 sm:grid-cols-3">
                {(
                  [
                    ["authMethod",    patch.authMethod],
                    ["idType",        patch.idType],
                    ["fullName",      patch.fullName],
                    ["nric",          patch.nric],
                    ["dob",           patch.dob],
                    ["mobile",        patch.mobile],
                    ["email",         patch.email],
                    ["maritalStatus", patch.maritalStatus],
                    ["monthlyIncome", patch.monthlyIncome ? `$${patch.monthlyIncome}/mo` : undefined],
                    ["postalCode",    patch.postalCode],
                    ["address",       patch.address],
                    ["noaHistory",    Array.isArray(patch.noaHistory) ? `${(patch.noaHistory as unknown[]).length} record(s)` : undefined],
                    ["cpfContribs",   Array.isArray(patch.cpfContributions) ? `${(patch.cpfContributions as unknown[]).length} month(s)` : undefined],
                  ] as [string, unknown][]
                )
                  .filter(([, v]) => v !== undefined && v !== "" && v !== null)
                  .map(([label, value]) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500">{label}</span>
                      <span className="truncate text-xs text-green-400">{String(value)}</span>
                    </div>
                  ))}
              </div>
              <pre className="overflow-auto text-xs text-slate-100">
                {JSON.stringify(patch, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === "raw" && (
            <pre className="overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(rawPayload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </main>
  );
}
