export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">TransformOps</h1>
        <p className="mt-4 text-lg text-zinc-300">
          Enterprise Data Transformation &amp; Validation Console
        </p>
        <p className="mt-8 max-w-2xl leading-7 text-zinc-400">
          Foundation scaffold for an independent candidate demonstrator. This implementation batch
          contains the application shell, PostgreSQL/Prisma data model, deterministic synthetic seed
          data, migration baseline and CI skeleton. The operational dashboard and validation engine
          are intentionally deferred to the next approved implementation phases.
        </p>
        <div className="mt-8 border-l border-zinc-700 pl-4 text-sm leading-6 text-zinc-400">
          Uses synthetic data only. Not an SNP, SAP or CrystalBridge product and does not represent
          any internal system, architecture, customer environment or proprietary process.
        </div>
      </div>
    </main>
  );
}
