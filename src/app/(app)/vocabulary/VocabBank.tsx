"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayButton } from "@/components/Audio";
import { CantoLine } from "@/components/CantoLine";
import { Button, Card, Pill, Zh } from "@/components/ui";

export type BankWord = {
  id: string;
  zh: string;
  jyutping: string;
  en: string;
  category: string;
  example: { zh: string; jyutping: string; en: string } | null;
  bookmarked: boolean;
  note: string | null;
  lapses: number;
  recognitionDue: boolean;
  productionDue: boolean;
  recognitionMastered: boolean;
  productionMastered: boolean;
  nextReview: string;
  sourceLessonId: string | null;
};

type Phrase = { id: string; zh: string; jyutping: string | null; en: string | null; note: string | null };
type Filter = "all" | "due" | "bookmarked" | "mastered" | "difficult";

export function VocabBank({ words, phrases, startInReview }: { words: BankWord[]; phrases: Phrase[]; startInReview: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<"bank" | "review" | "notebook">(startInReview ? "review" : "bank");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState("all");
  const [local, setLocal] = useState(words);

  const categories = useMemo(() => [...new Set(words.map((w) => w.category))].sort(), [words]);
  const due = local.filter((w) => w.recognitionDue || w.productionDue);

  const shown = local.filter((w) => {
    const q = query.trim().toLowerCase();
    if (q && !`${w.zh} ${w.jyutping} ${w.en}`.toLowerCase().includes(q)) return false;
    if (category !== "all" && w.category !== category) return false;
    if (filter === "due") return w.recognitionDue || w.productionDue;
    if (filter === "bookmarked") return w.bookmarked;
    if (filter === "mastered") return w.recognitionMastered;
    if (filter === "difficult") return w.lapses >= 2;
    return true;
  });

  const update = async (id: string, patch: { bookmarked?: boolean; personalNote?: string | null }) => {
    setLocal((ws) => ws.map((w) => (w.id === id ? { ...w, bookmarked: patch.bookmarked ?? w.bookmarked, note: patch.personalNote !== undefined ? patch.personalNote : w.note } : w)));
    await fetch("/api/vocab/update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vocabId: id, ...patch }) });
  };

  const tabBtn = (id: typeof tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`min-h-10 flex-1 rounded-lg text-sm font-bold ${tab === id ? "bg-forest text-white" : "text-muted"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-mist p-1">
        {tabBtn("bank", `Word bank (${local.length})`)}
        {tabBtn("review", `Review (${due.length})`)}
        {tabBtn("notebook", "Notebook")}
      </div>

      {tab === "bank" && (
        <>
          {local.length === 0 ? (
            <Card>
              <p>Words appear here automatically as you complete lessons.</p>
            </Card>
          ) : (
            <>
              <input
                type="search"
                placeholder="Search Chinese, Jyutping or English"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-line bg-white px-3"
                aria-label="Search vocabulary"
              />
              <div className="flex flex-wrap gap-2">
                {(["all", "due", "bookmarked", "mastered", "difficult"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={`min-h-9 rounded-lg px-3 text-sm font-bold capitalize ${filter === f ? "bg-forest text-white" : "bg-white text-muted"}`}
                  >
                    {f}
                  </button>
                ))}
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="min-h-9 rounded-lg border border-line bg-white px-2 text-sm" aria-label="Category">
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {shown.map((w) => (
                  <WordRow key={w.id} word={w} onUpdate={update} />
                ))}
                {shown.length === 0 && <p className="text-muted">No words match.</p>}
              </div>
            </>
          )}
        </>
      )}

      {tab === "review" && (
        <ReviewSession
          words={due}
          onDone={() => {
            router.refresh();
            setTab("bank");
          }}
          onGraded={(id, direction) =>
            setLocal((ws) => ws.map((w) => (w.id === id ? { ...w, [direction === "recognition" ? "recognitionDue" : "productionDue"]: false } : w)))
          }
        />
      )}

      {tab === "notebook" && <Notebook initial={phrases} />}
    </div>
  );
}

function WordRow({ word, onUpdate }: { word: BankWord; onUpdate: (id: string, p: { bookmarked?: boolean; personalNote?: string | null }) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(word.note ?? "");
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-h-11 flex-1 text-left" aria-expanded={open}>
          <Zh className="text-xl font-bold">{word.zh}</Zh> <span className="ml-2 text-jade">{word.jyutping}</span>
          <span className="block text-sm text-muted">{word.en}</span>
        </button>
        <PlayButton text={word.zh} compact />
        <button
          type="button"
          onClick={() => onUpdate(word.id, { bookmarked: !word.bookmarked })}
          aria-pressed={word.bookmarked}
          aria-label={word.bookmarked ? "Remove bookmark" : "Bookmark"}
          className="min-h-11 min-w-11 rounded-lg text-xl"
        >
          {word.bookmarked ? "★" : "☆"}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Pill>{word.category}</Pill>
            <Pill tone={word.recognitionMastered ? "forest" : "mist"}>Recognise: {word.recognitionMastered ? "mastered" : "learning"}</Pill>
            <Pill tone={word.productionMastered ? "forest" : "mist"}>Produce: {word.productionMastered ? "mastered" : "learning"}</Pill>
            {word.lapses >= 2 && <Pill tone="rose">Tricky ({word.lapses} slips)</Pill>}
          </div>
          {word.example && <CantoLine line={word.example} size="sm" compactAudio forceAll />}
          <p className="text-muted">Next review: {new Date(word.nextReview).toLocaleDateString()}</p>
          {word.sourceLessonId && (
            <Link className="text-forest underline" href={`/lesson/${word.sourceLessonId}`}>
              From this lesson
            </Link>
          )}
          <label className="block">
            <span className="mb-1 block font-bold">Personal note</span>
            <textarea
              value={note}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== (word.note ?? "") && onUpdate(word.id, { personalNote: note || null })}
              className="min-h-16 w-full rounded-lg border border-line p-2"
            />
          </label>
        </div>
      )}
    </Card>
  );
}

function ReviewSession({ words, onDone, onGraded }: { words: BankWord[]; onDone: () => void; onGraded: (id: string, d: "recognition" | "production") => void }) {
  const queue = useMemo(
    () =>
      words.flatMap((w) => [
        ...(w.recognitionDue ? [{ w, direction: "recognition" as const }] : []),
        ...(w.productionDue ? [{ w, direction: "production" as const }] : []),
      ]),
    // Build the queue once per session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (queue.length === 0) return <Card>Nothing due right now — nice work. New words are added as you complete lessons.</Card>;
  if (i >= queue.length)
    return (
      <Card className="space-y-3">
        <p className="text-lg font-bold">Review done ✓</p>
        <p className="text-muted">FSRS has scheduled each word&apos;s next review based on how well you remembered it.</p>
        <Button onClick={onDone}>Back to word bank</Button>
      </Card>
    );

  const { w, direction } = queue[i];
  const grade = async (g: "again" | "hard" | "good" | "easy") => {
    setBusy(true);
    await fetch("/api/vocab/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vocabId: w.id, direction, grade: g }) });
    onGraded(w.id, direction);
    setBusy(false);
    setRevealed(false);
    setI((n) => n + 1);
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <Pill>{direction === "production" ? "SAY IT IN CANTONESE" : "WHAT DOES THIS MEAN?"}</Pill>
        <span className="text-sm text-muted">
          {i + 1} / {queue.length}
        </span>
      </div>
      {direction === "production" ? (
        <p className="text-2xl font-bold">{w.en}</p>
      ) : (
        <div className="flex items-center gap-3">
          <Zh className="text-4xl font-bold">{w.zh}</Zh>
          <PlayButton text={w.zh} compact />
        </div>
      )}
      {revealed ? (
        <>
          <div className="rounded-xl bg-paper p-3">
            <CantoLine line={{ zh: w.zh, jyutping: w.jyutping, en: w.en }} forceAll compactAudio />
            {w.example && (
              <div className="mt-3">
                <CantoLine line={w.example} size="sm" compactAudio forceAll />
              </div>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["again", "hard", "good", "easy"] as const).map((g) => (
              <button key={g} type="button" disabled={busy} onClick={() => grade(g)} className="min-h-12 rounded-lg bg-mist text-sm font-bold capitalize text-forest disabled:opacity-60">
                {g === "again" ? "Forgot" : g}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Button variant="dark" className="w-full" onClick={() => setRevealed(true)}>
          Reveal
        </Button>
      )}
    </Card>
  );
}

function Notebook({ initial }: { initial: Phrase[] }) {
  const [phrases, setPhrases] = useState(initial);
  const [form, setForm] = useState({ zh: "", jyutping: "", en: "", note: "" });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.zh.trim()) return;
    const res = await fetch("/api/phrases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", ...form }) });
    const data = await res.json();
    if (res.ok) {
      setPhrases((p) => [{ id: data.id, zh: form.zh, jyutping: form.jyutping || null, en: form.en || null, note: form.note || null }, ...p]);
      setForm({ zh: "", jyutping: "", en: "", note: "" });
    }
  };
  const remove = async (id: string) => {
    setPhrases((p) => p.filter((x) => x.id !== id));
    await fetch("/api/phrases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
  };
  const input = "min-h-11 w-full rounded-lg border border-line bg-white px-3";
  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={add} className="space-y-2">
          <p className="text-sm text-muted">Save phrases you hear from family, shows or friends.</p>
          <input className={input} placeholder="Chinese (e.g. 飲茶)" value={form.zh} onChange={(e) => setForm({ ...form, zh: e.target.value })} aria-label="Chinese" required />
          <input className={input} placeholder="Jyutping (optional)" value={form.jyutping} onChange={(e) => setForm({ ...form, jyutping: e.target.value })} aria-label="Jyutping" />
          <input className={input} placeholder="Meaning (optional)" value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} aria-label="Meaning" />
          <input className={input} placeholder="Where you heard it (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} aria-label="Note" />
          <Button type="submit">Save phrase</Button>
        </form>
      </Card>
      {phrases.map((p) => (
        <Card key={p.id} className="flex items-start justify-between gap-3 p-4">
          <div>
            <div className="flex items-center gap-2">
              <Zh className="text-lg font-bold">{p.zh}</Zh>
              <PlayButton text={p.zh} compact />
            </div>
            {p.jyutping && <p className="text-jade">{p.jyutping}</p>}
            {p.en && <p>{p.en}</p>}
            {p.note && <p className="text-sm text-muted">{p.note}</p>}
          </div>
          <button type="button" onClick={() => remove(p.id)} className="min-h-11 rounded-lg px-3 text-sm text-rose" aria-label={`Delete ${p.zh}`}>
            Delete
          </button>
        </Card>
      ))}
    </div>
  );
}
