import { z } from "zod";
import { authed } from "@/lib/api/handler";
import { aiConfigured } from "@/lib/ai/claude";
import { generateFamilyStory } from "@/lib/ai/generators";
import { targetLevel } from "@/lib/adaptive";
import { HttpError, checkAiQuota, getFamily, getProfile, loadSkills, logEvent } from "@/lib/lessons/service";

export const maxDuration = 300;

const Body = z.object({
  memberId: z.string().uuid().nullable(),
  theme: z.string().trim().min(1).max(200),
});

export const POST = authed(Body, async ({ db, userId }, body) => {
  if (!aiConfigured()) throw new HttpError(503, "Story generation isn't available right now");
  if (!(await checkAiQuota(db, userId, "ai_story", 10))) throw new HttpError(429, "You've reached today's story limit");

  const [family, profile, skills, { data: vocab }] = await Promise.all([
    getFamily(db, userId),
    getProfile(db, userId),
    loadSkills(db, userId),
    db.from("user_vocabulary").select("zh").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
  ]);
  const member = body.memberId ? family.find((f) => f.id === body.memberId) : undefined;
  if (body.memberId && !member) throw new HttpError(404, "Family member not found");
  const child = member ?? { nickname: "our family", age_band: "3-5", interests: null };

  await logEvent(db, userId, "ai_story", {});
  const { story, model } = await generateFamilyStory({
    child: { nickname: child.nickname, age_band: child.age_band, interests: child.interests },
    theme: body.theme,
    vocabulary: (vocab ?? []).map((v) => v.zh),
    learnerLevel: targetLevel(skills, profile?.difficulty_offset ?? 0),
  });
  const { data } = await db
    .from("reading_content")
    .insert({
      user_id: userId,
      family_member_id: member?.id ?? null,
      source: "family_story",
      title: story.title,
      content: story,
      generator: `claude:${model}`,
    })
    .select("id")
    .single();
  return { id: data?.id, story };
});
