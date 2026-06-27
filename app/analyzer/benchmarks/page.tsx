import Link from "next/link";
import { BenchmarkCards, BenchmarkDashboard } from "../benchmark-ui";
import { buildBenchmarkReport, buildScoreDimensions } from "../benchmark-utils";

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const report = buildBenchmarkReport(query);
  const dimensions = buildScoreDimensions(report.rows);

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-[#152026] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5c717c]">OperatorLab Benchmarks</p>
            <h1 className="text-3xl font-semibold">{report.title}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#50626b]">{report.subtitle}</p>
          </div>
          <Link href="/analyzer" className="rounded border border-[#cfd9dd] bg-white px-4 py-2 text-sm font-medium hover:bg-[#eef4f5]">
            Analyzer’ga qaytish
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Selected</div>
              <div className="mt-3 text-lg font-semibold text-[#152026]">{report.methodName}</div>
              <div className="mt-1 text-sm text-[#647780]">{report.exampleName}</div>
              <div className="mt-4 rounded border border-[#e2e8f0] bg-[#f8fbfc] p-3 text-sm leading-6 text-[#50626b]">{report.summary}</div>
            </div>
            <div className="rounded border border-[#dce4e7] bg-white p-4">
              <div className="text-sm font-semibold text-[#31424b]">Quick score</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <MetricCard label="Best" value={`${report.wins}`} tone="good" />
                <MetricCard label="Worst" value={`${report.losses}`} tone="bad" />
              </div>
              <Link href="/docs/benchmark-system" className="mt-4 inline-block text-sm font-medium text-[#0f766e] hover:text-[#115e59]">
                Benchmark hujjatini ko'rish
              </Link>
            </div>
          </aside>
          <div className="space-y-4">
            <BenchmarkDashboard dimensions={dimensions} />
            <BenchmarkCards rows={report.rows} />
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" }) {
  return (
    <div className={`rounded border px-3 py-3 text-center ${tone === "good" ? "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]" : "border-[#fecdd3] bg-[#fff1f2] text-[#9f1239]"}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.12em]">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
