import Link from "next/link";
import { Box, Film } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f7f8] text-[#152026]">
      <section className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-6 py-12">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5c717c]">OperatorLab</p>
        <h1 className="mt-3 text-4xl font-semibold">Operatorlar va ularning geometrik yechim laboratoriyasi</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#50626b]">
          Analyzer operatorlarni geometrik tahlil qilish uchun, keyingi laboratoriyalar esa shu geometriyani kengaytirish uchun.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link href="/analyzer" className="rounded border border-[#cfd9dd] bg-white p-5 transition hover:border-[#0f766e] hover:bg-[#eef8f6]">
            <Box size={24} />
            <div className="mt-4 text-xl font-semibold">Analyzer</div>
            <div className="mt-2 text-sm leading-6 text-[#5c717c]">ODE, integral va PDE geometriyasini 3D tahlil qilish.</div>
          </Link>
          <Link href="/video-lab" className="rounded border border-[#cfd9dd] bg-white p-5 transition hover:border-[#14222b] hover:bg-[#eef4f5]">
            <Film size={24} />
            <div className="mt-4 text-xl font-semibold">Geometry Studio</div>
            <div className="mt-2 text-sm leading-6 text-[#5c717c]">Vizual sahnalar va animatsion prezentatsiyalar uchun.</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
