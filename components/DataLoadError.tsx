export interface DataLoadErrorProps {
  message: string;
}

export default function DataLoadError({ message }: DataLoadErrorProps) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
      <div className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6">
        <h1 className="text-lg font-semibold text-sand-50">
          Community gap data unavailable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-sand-50/75">
          {message}
        </p>
        <p className="mt-4 text-sm text-sand-50/60">
          Regenerate the pipeline output from the repo root:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-night-900/80 p-3 text-xs text-sand-50/80">
          pip install -r requirements.txt{"\n"}
          python scripts/build_community_gap_data.py
        </pre>
      </div>
    </main>
  );
}
