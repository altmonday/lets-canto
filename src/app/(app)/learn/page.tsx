import Link from "next/link";
import { Card, Pill, PageTitle, Zh } from "@/components/ui";
import { FRAMEWORK, positionFor } from "@/lib/curriculum/framework";
import { getActivePlan, requireUserId } from "@/lib/lessons/service";
import { createClient } from "@/lib/supabase/server";
import { StartLessonButton } from "../StartLessonButton";

export default async function LearnPage() {
  const db = await createClient();
  const userId = await requireUserId(db);
  const [plan, { data: lessons }] = await Promise.all([
    getActivePlan(db, userId),
    db
      .from("lessons")
      .select("id, day, kind, status, score, completed_at, content->>title, content->>title_zh, month, week")
      .eq("user_id", userId)
      .in("status", ["completed", "in_progress", "ready"])
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  const rows = (lessons ?? []) as { id: string; day: number; kind: string; status: string; score: number | null; completed_at: string | null; title: string; title_zh: string; month: number; week: number }[];
  const lastDay = Math.max(0, ...rows.filter((r) => r.kind === "daily" && r.status === "completed").map((r) => r.day));
  const current = positionFor(lastDay + 1, plan?.start_month ?? 1);
  const upcoming = Array.from({ length: 7 }, (_, i) => ({ day: lastDay + 1 + i, pos: positionFor(lastDay + 1 + i, plan?.start_month ?? 1) }));
  const roadmap = plan?.plan;

  return (
    <div>
      <PageTitle title="Your learning pathway" subtitle={roadmap?.summary} />

      {roadmap?.priorities?.length ? (
        <Card className="mb-6">
          <h2 className="font-bold">Your priorities</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {roadmap.priorities.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            Plan version {plan!.version}
            {plan!.reason ? ` · ${plan!.reason}` : ""} · {plan!.generator.startsWith("claude") ? "personalised by AI" : "standard plan"}
          </p>
        </Card>
      ) : null}

      <h2 className="text-xl font-extrabold">Coming up this week</h2>
      <p className="mb-3 text-sm text-muted">Each lesson is written when you reach it, so it reflects how the previous ones went.</p>
      <div className="grid gap-2">
        {upcoming.map(({ day, pos }) => (
          <div key={day} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
            <div>
              <div className="text-sm font-bold">
                Day {day} · {pos.weekInfo.theme}
              </div>
              <div className="text-xs text-muted">
                {pos.isMonthMilestone ? "Monthly milestone check" : pos.isWeekReview ? "Weekly consolidation" : pos.weekInfo.objectives[0]}
              </div>
            </div>
            <Zh className="text-sm text-muted">{pos.weekInfo.themeZh}</Zh>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <StartLessonButton label="Extra practice session" endpoint="/api/lessons/extra" variant="secondary" />
      </div>

      <h2 className="mt-8 text-xl font-extrabold">12-month roadmap</h2>
      <div className="mt-3 space-y-3">
        {FRAMEWORK.map((m) => {
          const personal = roadmap?.months?.[m.month - 1];
          const skipped = plan && m.month < plan.start_month;
          const isCurrent = m.month === current.month;
          return (
            <Card key={m.month} className={`flex gap-4 ${isCurrent ? "border-forest-soft" : ""} ${skipped ? "opacity-60" : ""}`}>
              <div className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-mist font-extrabold">{String(m.month).padStart(2, "0")}</div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{personal?.title ?? m.title}</b>
                  {isCurrent && <Pill tone="forest">You are here</Pill>}
                  {skipped && <Pill>Placed out</Pill>}
                </div>
                <p className="mt-1 text-sm text-muted">{personal?.focus ?? m.focus}</p>
                <p className="mt-1 text-sm">
                  <b>Milestone:</b> {personal?.milestone ?? m.milestone}
                </p>
                {isCurrent && (
                  <ul className="mt-2 text-sm">
                    {m.weeks.map((w, i) => (
                      <li key={i} className={i + 1 === current.week ? "font-bold" : "text-muted"}>
                        Week {i + 1}: {w.theme}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="mt-8 text-xl font-extrabold">Your lessons</h2>
      <p className="mb-3 text-sm text-muted">Completed lessons stay exactly as you did them, for review.</p>
      <div className="grid gap-2">
        {rows.length === 0 && <p className="text-muted">No lessons yet.</p>}
        {rows.map((r) => (
          <Link key={r.id} href={`/lesson/${r.id}`} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3 hover:border-forest-soft">
            <div>
              <div className="font-bold">
                {r.kind === "extra" ? "Extra practice" : `Day ${r.day}`} · {r.title}
              </div>
              <div className="text-xs text-muted">
                <Zh>{r.title_zh}</Zh> · Month {r.month}, week {r.week}
              </div>
            </div>
            <span className="text-sm">
              {r.status === "completed" ? `✓ ${Math.round(Number(r.score ?? 0) * 100)}%` : r.status === "in_progress" ? "In progress" : "Ready"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
