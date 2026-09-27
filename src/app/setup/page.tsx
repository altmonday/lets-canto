export default function SetupPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-extrabold">Let&apos;s Canto needs configuring</h1>
      <p className="mt-3 text-muted">
        This deployment is missing its Supabase settings, so accounts can&apos;t be created yet. Add these environment variables in
        Vercel (Project → Settings → Environment Variables) and redeploy:
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-6 font-mono text-sm">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>
        <li>SUPABASE_SERVICE_ROLE_KEY (account deletion)</li>
        <li>ANTHROPIC_API_KEY (personalised lessons)</li>
      </ul>
      <p className="mt-4 text-muted">See the README for the full setup guide.</p>
    </main>
  );
}
