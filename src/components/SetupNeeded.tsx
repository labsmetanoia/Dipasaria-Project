import type { SetupProblem } from "@/lib/setup";

/** Shown instead of the site while the deployment is missing a required setting. Lists variable names only. */
export function SetupNeeded({ problems }: { problems: SetupProblem[] }) {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <p className="eyebrow">Dipasaria · pengaturan</p>
      <h1 className="mt-2 text-[2.4rem] leading-none sm:text-[3rem]">Situs belum siap dibuka</h1>
      <p className="mt-4 font-sans text-[15px] text-mute">Server sengaja tidak menjalankan toko sampai pengaturan berikut lengkap, agar pesanan tidak hilang dan sesi tidak bisa dipalsukan. Atur di Vercel → Project → Settings → Environment Variables, lalu Redeploy.</p>
      <ol className="mt-6 space-y-3">
        {problems.map((p, i) => (
          <li key={p.id} className="border border-line bg-white p-4">
            <p className="font-sans text-sm font-bold">{i + 1}. {p.title}</p>
            <p className="mt-1 font-sans text-sm text-ink/80">{p.fix}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 font-sans text-xs text-mute">Panduan lengkap: README → “Go live on Supabase + Vercel”. Halaman ini hilang sendiri setelah pengaturan benar.</p>
    </main>
  );
}
