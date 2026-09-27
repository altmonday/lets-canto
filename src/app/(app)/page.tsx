import Link from "next/link";
import { CantoLine } from "@/components/CantoLine";
import { Card, ButtonLink, Pill, ProgressBar } from "@/components/ui";
import { positionFor } from "@/lib/curriculum/framework";
import { TOPICS } from "@/lib/curriculum/seed";
import { countDue, getActivePlan, getProfile, requireUserId, type LessonRow } from "@/lib/lessons/service";
import { createClient } from "@/lib/supabase/server";
import { StartLessonButton } from "./StartLessonButton";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "早晨" : h < 18 ? "午安" : "晚安";
}

export default async function TodayPage() {
  const db = await createClient();
  const userId = await requireUserId(db);
  const [profile, plan, due, { data: lessons }, { count: wordCount }] = await Promise.all([
    getProfile(db, userId),
    getActivePlan(db, userId),
    countDue(db, userId),
    db
      .from("lessons")
      .select("id, day, kind, status, content, adaptations, completed_at, score, generator")
      .eq("user_id", userId)
      .eq("kind", "daily")
      .neq("status", "superseded")
      .order("day", { ascending: false })
      .limit(10),
    db.from("user_vocabulary").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  const rows = (lessons ?? []) as Pick<LessonRow, "id" | "day" | "kind" | "status" | "content" | "adaptations" | "completed_at" | "score" | "generator">[];
  const open = rows.find((l) => l.status === "in_progress" || l.status === "ready");
  const completed = rows.filter((l) => l.status === "completed");
  const lastDone = completed[0];
  const nextDay = open?.day ?? (lastDone?.day ?? 0) + 1;
  const pos = positionFor(nextDay, plan?.start_month ?? 1);
  const completedToday = lastDone?.completed_at && new Date(lastDone.completed_at).toDateString() === new Date().toDateString();
  const family = (open ?? lastDone)?.content.family ?? TOPICS[pos.weekInfo.topic].family;

  return (
    <div>
      <h1 className="mt-7 text-3xl font-extrabold tracking-tight sm:text-4xl">
        <span lang="zh-HK">{greeting()}</span>, {profile!.display_name}
      </h1>
      <p className="mt-1 text-muted">A little Cantonese, every day.</p>

      <section className="relative mt-6 overflow-hidden rounded-3xl bg-forest p-6 text-white" aria-labelledby="today-lesson">
        <span className="inline-block rounded-full bg-forest-soft px-3 py-1 text-xs font-bold tracking-wide">
          MONTH {pos.month} · WEEK {pos.week} · {pos.monthInfo.title.toUpperCase()}
        </span>
        <h2 id="today-lesson" className="mt-3 text-2xl font-extrabold">
          {open ? `Day ${open.day} · ${open.content.title}` : `Day ${nextDay} · ${pos.weekInfo.theme}`}
        </h2>
        <p className="mt-1 text-[#d9e9df]">
          {open ? open.content.summary : `This week: ${pos.weekInfo.objectives.join(" · ")}`}
        </p>
        {open?.adaptations?.length ? (
          <ul className="mt-3 space-y-1 text-sm text-[#d9e9df]">
            {open.adaptations.slice(0, 2).map((a) => (
              <li key={a.code}>✳ {a.explanation}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5">
          {open?.status === "in_progress" ? (
            <ButtonLink href={`/lesson/${open.id}`}>Continue lesson →</ButtonLink>
          ) : completedToday && open ? (
            <div className="space-y-3">
              <p className="font-bold">Today&apos;s lesson is done — 做得好！ Your next lesson is ready whenever you are.</p>
              <ButtonLink href={`/lesson/${open.id}`} variant="secondary">
                Start Day {open.day} early
              </ButtonLink>
            </div>
          ) : open ? (
            <ButtonLink href={`/lesson/${open.id}`}>Start lesson →</ButtonLink>
          ) : completedToday ? (
            <div className="space-y-3">
              <p className="font-bold">Today&apos;s lesson is done — 做得好！</p>
              <StartLessonButton label={`Start Day ${nextDay} early`} variant="secondary" />
            </div>
          ) : (
            <StartLessonButton label={`Start Day ${nextDay} →`} />
          )}
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-extrabold">{completed.length ? lastDone!.day : 0}</div>
          <div className="text-xs text-muted">Days completed</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-extrabold">{wordCount ?? 0}</div>
          <div className="text-xs text-muted">Words in your bank</div>
        </Card>
        <Link href="/vocabulary?review=1" className="block">
          <Card className="h-full p-4 hover:border-forest-soft">
            <div className="text-2xl font-extrabold">{due}</div>
            <div className="text-xs text-muted">Due for review →</div>
          </Card>
        </Link>
      </div>

      <h2 className="mt-8 text-xl font-extrabold">Family moment</h2>
      <Card className="mt-3 bg-clay">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Pill tone="clay">{family.kind.toUpperCase()} · 5 MIN</Pill>
            <h3 className="mt-2 text-lg font-bold">{family.title}</h3>
            <p className="text-sm text-muted">{family.age_note}</p>
          </div>
        </div>
        <p className="mt-2">{family.instructions}</p>
        <div className="mt-3 space-y-3">
          {family.lines.slice(0, 2).map((l, i) => (
            <CantoLine key={i} line={l} size="sm" compactAudio />
          ))}
        </div>
        <ButtonLink href="/family" variant="ghost" className="mt-2 px-0">
          More family activities →
        </ButtonLink>
      </Card>

      <h2 className="mt-8 text-xl font-extrabold">Your year</h2>
      <div className="mt-3">
        <ProgressBar value={((pos.curriculumDay - 1) / 365) * 100} label="Progress through the 12-month framework" />
        <p className="mt-2 text-sm text-muted">
          Framework day {pos.curriculumDay} of 365 {plan && plan.start_month > 1 ? `(you started at Month ${plan.start_month})` : ""} ·{" "}
          <Link href="/learn" className="underline">
            See your roadmap
          </Link>
        </p>
      </div>
    </div>
  );
}
