import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";

export default async function BenchmarkSystemDocPage() {
  const filePath = path.join(process.cwd(), "docs", "benchmark-system.md");
  const content = await readFile(filePath, "utf8");

  return (
    <main className="min-h-screen bg-[#f4f7f8] px-4 py-6 text-[#152026] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5c717c]">OperatorLab Docs</p>
            <h1 className="text-3xl font-semibold">Benchmark System</h1>
          </div>
          <Link href="/analyzer/benchmarks" className="rounded border border-[#cfd9dd] bg-white px-4 py-2 text-sm font-medium hover:bg-[#eef4f5]">
            Benchmark’ga qaytish
          </Link>
        </div>

        <article className="rounded border border-[#dce4e7] bg-white p-5 shadow-sm">
          <pre className="whitespace-pre-wrap text-sm leading-7 text-[#31424b]">{content}</pre>
        </article>
      </div>
    </main>
  );
}
