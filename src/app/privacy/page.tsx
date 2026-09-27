import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 leading-relaxed">
      <Link href="/" className="text-sm text-forest underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-3xl font-extrabold">Privacy &amp; your data</h1>
      <p className="mt-2 text-sm text-muted">Pre-launch family testing version. A formal privacy review is required before public release.</p>

      <h2 className="mt-8 text-xl font-bold">What we store</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>Your email address and password (managed by our authentication provider, Supabase).</li>
        <li>Your learning profile: name, language background, goals and preferences.</li>
        <li>For family mode: a nickname, age band and interests for each child you add. Children never get accounts.</li>
        <li>Lessons, answers, vocabulary, skill estimates and progress events.</li>
      </ul>

      <h2 className="mt-8 text-xl font-bold">Recordings</h2>
      <p className="mt-2">
        Speaking practice recordings stay in your browser tab and are discarded when you leave the page. They are never uploaded. If
        you ask for written feedback, only the text you type is sent.
      </p>

      <h2 className="mt-8 text-xl font-bold">AI processing</h2>
      <p className="mt-2">
        To personalise lessons, your profile (not your email), family nicknames and age bands, skill estimates and recent vocabulary are
        sent to Anthropic&apos;s Claude API from our server. Lessons are generated as structured content and checked automatically before
        you see them. AI-generated Cantonese is labelled until it has been reviewed by a fluent Hong Kong Cantonese speaker.
      </p>

      <h2 className="mt-8 text-xl font-bold">Retention, export and deletion</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6">
        <li>Your data is kept while your account exists.</li>
        <li>Settings → Export my data downloads everything we hold about you as JSON.</li>
        <li>
          Settings → Delete my account permanently deletes your account and all associated learning data immediately. Database backups
          managed by our hosting provider expire on their normal schedule (up to 7 days on Supabase&apos;s standard plans).
        </li>
      </ul>
    </main>
  );
}
