import { Card, PageTitle, Pill, Zh } from "@/components/ui";
import { positionFor } from "@/lib/curriculum/framework";
import { countDue, getActivePlan, loadSkills, requireUserId } from "@/lib/lessons/service";
import { bandLabel, OBJECTIVE_SKILLS, SKILL_LABELS, SKILLS, type Skill } from "@/lib/skills";
import { isMastered, type StoredCard } from "@/lib/srs";
import { createClient } from "@/lib/supabase/server";

function Meter({ value, baseline }: { value: number; baseline?: number }) {
  return (
    <div className="relative h-2.5 overflow-hidden rounded-full bg-mist" aria-hidden>
      <div className="h-full rounded-full bg-forest-soft" style={{ width: `${Math.max(2, value)}%` }} />
      {baseline !== undefined && <div className="absolute top-0 h-full w-0.5 bg-ink" style={{ left: `${baseline}%` }} />}
    </div>
  );
}

export default async function ProgressPage() {
  const db = await createClient();
  const userId = await requireUserId(db);
  const [skills, plan, due, { data: diag }, { data: lessons }, { data: vocab }, { data: attempts }] = await Promise.all([
    loadSkills(db, userId),
    getActivePlan(db, userId),
    countDue(db, userId),
    db.from("diagnostics").select("results, created_at").eq("user_id", userId).order("created_at").limit(1),
    db.from("lessons").select("day, kind, score, completed_at, content->>title").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: false }).limit(60),
    db.from("user_vocabulary").select("zh, jyutping, en, lapses, recognition_card, production_card").eq("user_id", userId).limit(2000),
    db.from("activity_attempts").select("skill, correct").eq("user_id", userId).neq("section", "diagnostic").not("correct", "is", null).order("created_at", { ascending: false }).limit(300),
  ]);

  const baseline = (diag?.[0]?.results ?? null) as Record<Skill, number> | null;
  const done = (lessons ?? []) as { day: number; kind: string; score: number | null; completed_at: string; title: string }[];
  const daily = done.filter((l) => l.kind === "daily");
  const words = (vocab ?? []) as { zh: string; jyutping: string; en: string; lapses: number; recognition_card: StoredCard; production_card: StoredCard }[];
  const masteredRecognition = words.filter((w) => isMastered(w.recognition_card)).length;
  const masteredProduction = words.filter((w) => isMastered(w.production_card)).length;
  const tricky = words.filter((w) => w.lapses >= 2).sort((a, b) => b.lapses - a.lapses).slice(0, 8);
  const recentScores = done.slice(0, 7).filter((l) => l.score !== null);
  const avg = recentScores.length ? Math.round((recentScores.reduce((s, l) => s + Number(l.score), 0) / recentScores.length) * 100) : null;
  const lastDay = Math.max(0, ...daily.map((l) => l.day));
  const pos = positionFor(Math.max(1, lastDay), plan?.start_month ?? 1);

  const bySkill = new Map<string, { n: number; wrong: number }>();
  for (const a of attempts ?? []) {
    const s = bySkill.get(a.skill) ?? { n: 0, wrong: 0 };
    s.n++;
    if (!a.correct) s.wrong++;
    bySkill.set(a.skill, s);
  }
  const struggles = [...bySkill.entries()]
    .filter(([, s]) => s.n >= 5 && s.wrong / s.n >= 0.35)
    .sort((a, b) => b[1].wrong / b[1].n - a[1].wrong / a[1].n)
    .slice(0, 3);

  const tiles = [
    { value: daily.length, label: "Daily lessons done" },
    { value: avg === null ? "—" : `${avg}%`, label: "Avg score, last 7" },
    { value: words.length, label: "Words in your bank" },
    { value: due, label: "Due for review" },
  ];

  return (
    <div>
      <PageTitle title="Progress" subtitle="Measured from your answers. Estimates are approximate and firm up as evidence builds." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="text-2xl font-extrabold">{t.value}</div>
            <div className="text-xs text-muted">{t.label}</div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-extrabold">Current milestone</h2>
        <p className="mt-1 text-sm text-muted">
          Month {pos.month} · {plan?.plan.months?.[pos.month - 1]?.title ?? pos.monthInfo.title}
        </p>
        <p className="mt-2">{plan?.plan.months?.[pos.month - 1]?.milestone ?? pos.monthInfo.milestone}</p>
      </Card>

      <h2 className="mt-8 text-xl font-extrabold">Skills</h2>
      <p className="mt-1 text-sm text-muted">
        Each skill is tracked separately — there&apos;s no single overall score. {baseline && "The dark tick marks your placement baseline."}
      </p>
      <Card className="mt-3 space-y-4">
        {SKILLS.map((s) => {
          const st = skills[s];
          const objective = OBJECTIVE_SKILLS.includes(s);
          return (
            <div key={s}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-bold">{SKILL_LABELS[s]}</span>
                <span className="text-muted">
                  {bandLabel(st.estimate)} · {Math.round(st.estimate)}/100 · {st.evidence < 10 ? "early estimate" : `${st.evidence} answers`}
                  {!objective && " · partly self-rated"}
                </span>
              </div>
              <Meter value={st.estimate} baseline={baseline?.[s]} />
            </div>
          );
        })}
      </Card>

      <h2 className="mt-8 text-xl font-extrabold">Vocabulary</h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-extrabold">{masteredRecognition}</div>
          <div className="text-xs text-muted">Words you reliably recognise</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-extrabold">{masteredProduction}</div>
          <div className="text-xs text-muted">Words you reliably produce</div>
        </Card>
      </div>
      <p className="mt-2 text-xs text-muted">“Reliably” = spaced repetition predicts you&apos;ll still remember it in three weeks.</p>

      <h2 className="mt-8 text-xl font-extrabold">Recurring difficulties</h2>
      <Card className="mt-3 space-y-3">
        {struggles.length === 0 && tricky.length === 0 && <p className="text-muted">Nothing persistent yet. Keep going!</p>}
        {struggles.map(([skill, s]) => (
          <p key={skill}>
            <Pill tone="rose">{SKILL_LABELS[skill as Skill] ?? skill}</Pill>{" "}
            <span className="text-sm">
              {s.wrong} of your last {s.n} answers missed — upcoming lessons include extra practice here.
            </span>
          </p>
        ))}
        {tricky.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold">Words that keep slipping</p>
            <ul className="flex flex-wrap gap-2">
              {tricky.map((w) => (
                <li key={w.zh} className="rounded-lg bg-paper px-3 py-2 text-sm">
                  <Zh className="font-bold">{w.zh}</Zh> <span className="text-jade">{w.jyutping}</span> · {w.en}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <h2 className="mt-8 text-xl font-extrabold">Recent lessons</h2>
      <Card className="mt-3">
        {done.length === 0 ? (
          <p className="text-muted">Complete your first lesson to see results here.</p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Recent lesson scores</caption>
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 font-semibold">Lesson</th>
                <th className="w-2/5 pb-2 font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {done.slice(0, 10).map((l, i) => {
                const pct = Math.round(Number(l.score ?? 0) * 100);
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="py-2 pr-2">
                      {l.kind === "extra" ? "Extra" : `Day ${l.day}`} · {l.title}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Meter value={pct} />
                        </div>
                        <span className="w-10 text-right font-bold">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
