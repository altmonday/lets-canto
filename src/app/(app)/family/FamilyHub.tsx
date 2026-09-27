"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CantoLine } from "@/components/CantoLine";
import { LayerToggles } from "@/components/Prefs";
import { PlayButton } from "@/components/Audio";
import { Button, Card, Pill } from "@/components/ui";
import type { FamilyActivity, FamilyStory, Line } from "@/lib/schemas";

type Member = { id: string; nickname: string; age_band: string; interests: string | null };
type LibraryItem = { id: string; source: string; title: string; content: unknown; family_member_id: string | null; created_at: string };

export function FamilyHub({
  members,
  library,
  activities,
  storiesAvailable,
}: {
  members: Member[];
  library: LibraryItem[];
  activities: { id: string; day: number; family: FamilyActivity }[];
  storiesAvailable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const stories = library.filter((l) => l.source === "family_story");
  const passages = library.filter((l) => l.source === "lesson");

  return (
    <div className="space-y-8">
      <LayerToggles />

      <section>
        <h2 className="text-xl font-extrabold">Recent family activities</h2>
        <div className="mt-3 space-y-3">
          {activities.length === 0 && <p className="text-muted">Each lesson includes a family activity — they&apos;ll collect here.</p>}
          {activities.slice(0, 4).map((a) => (
            <Card key={a.id} className="space-y-3 bg-clay">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="clay">{a.family.kind.toUpperCase()}</Pill>
                <span className="text-xs text-muted">From Day {a.day}</span>
              </div>
              <h3 className="text-lg font-bold">{a.family.title}</h3>
              <p className="text-sm">{a.family.instructions}</p>
              {a.family.lines.map((l, i) => (
                <CantoLine key={i} line={l} size="sm" compactAudio />
              ))}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Story library</h2>
        {storiesAvailable && <StoryMaker members={members} onCreated={() => router.refresh()} />}
        <div className="mt-3 space-y-2">
          {stories.length === 0 && <p className="text-muted">No stories yet.</p>}
          {stories.map((s) => (
            <LibraryEntry key={s.id} item={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} members={members} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-extrabold">Reading from your lessons</h2>
        <div className="mt-3 space-y-2">
          {passages.length === 0 && <p className="text-muted">Passages from completed lessons appear here.</p>}
          {passages.map((s) => (
            <LibraryEntry key={s.id} item={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} members={members} />
          ))}
        </div>
      </section>

      <FamilyMembers members={members} onChange={() => router.refresh()} />
    </div>
  );
}

function LibraryEntry({ item, open, onToggle, members }: { item: LibraryItem; open: boolean; onToggle: () => void; members: Member[] }) {
  const member = members.find((m) => m.id === item.family_member_id);
  return (
    <Card className="p-4">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex min-h-11 w-full items-center justify-between text-left">
        <span>
          <b>{item.title}</b>
          <span className="block text-xs text-muted">
            {member ? `For ${member.nickname} · ` : ""}
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        </span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="mt-3 border-t border-line pt-3">{item.source === "family_story" ? <StoryReader story={item.content as FamilyStory} /> : <PassageReader content={item.content as { passage: Line[]; register_note: string | null }} />}</div>}
    </Card>
  );
}

function PassageReader({ content }: { content: { passage: Line[]; register_note: string | null } }) {
  return (
    <div className="space-y-3">
      {content.passage.map((l, i) => (
        <CantoLine key={i} line={l} compactAudio />
      ))}
      {content.register_note && <p className="text-sm text-muted">{content.register_note}</p>}
    </div>
  );
}

function StoryReader({ story }: { story: FamilyStory }) {
  const [page, setPage] = useState(0);
  const p = story.pages[page];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{story.age_note}</p>
      <div className="rounded-2xl bg-clay p-5 text-center">
        <p className="text-xs font-bold text-muted">
          PAGE {page + 1} / {story.pages.length}
        </p>
        <p className="mt-1 text-sm italic text-muted">Picture: {p.picture_idea}</p>
        <div className="mt-3 flex justify-center">
          <CantoLine line={p.line} size="lg" />
        </div>
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
          ← Back
        </Button>
        <PlayButton text={story.pages.map((x) => x.line.zh).join("")} label="Read it all" compact />
        <Button variant="secondary" disabled={page === story.pages.length - 1} onClick={() => setPage(page + 1)}>
          Next →
        </Button>
      </div>
      {story.questions_to_ask.length > 0 && (
        <div className="space-y-2">
          <p className="font-bold">Ask while reading</p>
          {story.questions_to_ask.map((q, i) => (
            <CantoLine key={i} line={q} size="sm" compactAudio />
          ))}
        </div>
      )}
      {story.register_note && <p className="text-sm text-muted">{story.register_note}</p>}
    </div>
  );
}

function StoryMaker({ members, onCreated }: { members: Member[]; onCreated: () => void }) {
  const [memberId, setMemberId] = useState<string>(members[0]?.id ?? "");
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/family/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: memberId || null, theme }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't write a story right now.");
    setTheme("");
    onCreated();
  };
  return (
    <Card className="mt-3">
      <form onSubmit={submit} className="space-y-3">
        <p className="font-bold">Write a new picture-book story</p>
        {members.length > 0 && (
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="min-h-11 w-full rounded-lg border border-line bg-white px-3" aria-label="For which child">
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                For {m.nickname} ({m.age_band})
              </option>
            ))}
            <option value="">For the whole family</option>
          </select>
        )}
        <input
          required
          maxLength={200}
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="What's it about? e.g. a trip to the beach, brushing teeth"
          className="min-h-11 w-full rounded-lg border border-line bg-white px-3"
          aria-label="Story theme"
        />
        {error && <p className="text-sm text-rose">{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Writing your story…" : "Create story"}
        </Button>
      </form>
    </Card>
  );
}

function FamilyMembers({ members, onChange }: { members: Member[]; onChange: () => void }) {
  const [form, setForm] = useState({ nickname: "", ageBand: "3-5", interests: "" });
  const post = async (body: Record<string, unknown>) => {
    await fetch("/api/family/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    onChange();
  };
  const input = "min-h-11 w-full rounded-lg border border-line bg-white px-3";
  return (
    <section>
      <h2 className="text-xl font-extrabold">Your family profile</h2>
      <p className="text-sm text-muted">Only a nickname, age band and interests — children don&apos;t have accounts.</p>
      <div className="mt-3 space-y-2">
        {members.map((m) => (
          <Card key={m.id} className="flex items-center justify-between p-4">
            <div>
              <b>{m.nickname}</b> <span className="text-sm text-muted">· {m.age_band}</span>
              {m.interests && <p className="text-sm text-muted">Loves {m.interests}</p>}
            </div>
            <button type="button" className="min-h-11 px-3 text-sm text-rose" onClick={() => post({ action: "remove", id: m.id })}>
              Remove
            </button>
          </Card>
        ))}
        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.nickname.trim()) return;
              post({ action: "add", ...form });
              setForm({ nickname: "", ageBand: "3-5", interests: "" });
            }}
            className="grid gap-2 sm:grid-cols-4"
          >
            <input className={input} placeholder="Nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} aria-label="Nickname" />
            <select className={input} value={form.ageBand} onChange={(e) => setForm({ ...form, ageBand: e.target.value })} aria-label="Age band">
              {["0-2", "3-5", "6-8", "9-12", "13+"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
            <input className={input} placeholder="Interests" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} aria-label="Interests" />
            <Button type="submit" variant="secondary">
              Add child
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}
