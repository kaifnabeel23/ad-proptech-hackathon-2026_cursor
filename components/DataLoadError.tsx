export interface DataLoadErrorProps {
  message: string;
}

export default function DataLoadError({ message }: DataLoadErrorProps) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-slate-900">
          Community gap data unavailable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {message}
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Regenerate the pipeline output from the repo root:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700">
          pip install -r requirements.txt{"\n"}
          python scripts/build_community_gap_data.py
        </pre>
      </div>
    </main>
  );
}
