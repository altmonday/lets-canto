import type { TopicKey } from "./seed";

/**
 * Centrally authored pedagogical framework. Claude personalises within this
 * structure (it never invents the year on its own):
 * 12-month roadmap → monthly milestones → weekly themes → daily lessons.
 */

export type WeekTheme = {
  theme: string;
  themeZh: string;
  objectives: string[];
  patterns: string[];
  topic: TopicKey;
};

export type FrameworkMonth = {
  month: number;
  phase: string;
  title: string;
  focus: string;
  milestone: string;
  weeks: [WeekTheme, WeekTheme, WeekTheme, WeekTheme];
};

const w = (theme: string, themeZh: string, topic: TopicKey, objectives: string[], patterns: string[]): WeekTheme => ({
  theme,
  themeZh,
  topic,
  objectives,
  patterns,
});

export const FRAMEWORK: FrameworkMonth[] = [
  {
    month: 1,
    phase: "Foundations",
    title: "Rediscover your voice",
    focus: "Jyutping, the six tones, greetings and family words",
    milestone: "Read and pronounce Jyutping for 60 everyday words; introduce yourself and your family",
    weeks: [
      w("Greetings & the six tones", "打招呼", "greetings", ["Say hello, thank you and sorry", "Hear the difference between tones 1, 2 and 4"], ["你好！", "唔該 vs 多謝"]),
      w("My family", "我嘅屋企", "family", ["Name family members", "Say who is in your family"], ["我有 + number + 個 + noun", "呢個係 + person"]),
      w("Me, you and them", "我同你", "questions", ["Use personal pronouns", "Ask simple who/what questions"], ["佢係邊個？", "你叫咩名？"]),
      w("Numbers & counting", "數字", "numbers", ["Count to ten and beyond", "Use 兩 vs 二"], ["number + 個 + noun", "幾多個？"]),
    ],
  },
  {
    month: 2,
    phase: "Foundations",
    title: "Around the house",
    focus: "Food, routines, questions and time",
    milestone: "Describe your daily routine and talk about meals in simple sentences",
    weeks: [
      w("Food & drink", "食嘢飲嘢", "food", ["Talk about eating and drinking", "Say what you want"], ["我想食 + food", "你食咗飯未呀？"]),
      w("Daily routines", "日常生活", "home", ["Describe morning and evening routines"], ["time + verb", "先…再…"]),
      w("Asking questions", "問問題", "questions", ["Ask where, why and how many"], ["喺邊度？", "點解…？"]),
      w("Time & days", "時間", "numbers", ["Talk about today, tomorrow, yesterday", "Ask the time"], ["而家幾點？", "聽日 + plan"]),
    ],
  },
  {
    month: 3,
    phase: "Foundations",
    title: "First picture books",
    focus: "Classifiers, descriptions and short stories",
    milestone: "Describe pictures using classifiers and adjectives; read a four-line story aloud",
    weeks: [
      w("Describing things", "形容嘢", "describing", ["Use common adjectives with 好/好似"], ["好 + adjective", "adjective + 過"]),
      w("Animals", "動物", "animals", ["Name animals with their classifiers"], ["一隻狗", "一條魚"]),
      w("Classifiers", "量詞", "describing", ["Choose 個/隻/條/本/件"], ["呢 + classifier + noun"]),
      w("First stories", "第一個故事", "play", ["Read a short picture story"], ["有一日…", "跟住…"]),
    ],
  },
  {
    month: 4,
    phase: "Conversation",
    title: "Feelings & relationships",
    focus: "Preferences, comfort and requests",
    milestone: "Hold a two-minute conversation about how you and your family feel",
    weeks: [
      w("Feelings", "感受", "feelings", ["Say how you feel and ask others"], ["你覺得點呀？", "我好 + feeling"]),
      w("Likes & wants", "鍾意同想", "feelings", ["Express preferences"], ["我鍾意…", "我唔想…"]),
      w("Requests & politeness", "禮貌", "greetings", ["Make polite requests"], ["唔該你…", "可唔可以…？"]),
      w("Comforting", "安慰", "feelings", ["Comfort a child or friend"], ["唔使驚", "冇事㗎"]),
    ],
  },
  {
    month: 5,
    phase: "Conversation",
    title: "Storytelling",
    focus: "Sequencing events and retelling stories",
    milestone: "Retell a simple story in order using 先, 跟住, 最後",
    weeks: [
      w("Sequencing events", "先後次序", "particles", ["Order events with 先/跟住/最後"], ["先…跟住…最後…"]),
      w("Completed actions", "做咗", "particles", ["Use 咗 and 未"], ["verb + 咗", "…未呀？"]),
      w("Going places", "去街", "places", ["Say where you went and how"], ["去 + place", "搭 + transport"]),
      w("Retelling stories", "講故事", "play", ["Retell a picture book"], ["從前…", "結果…"]),
    ],
  },
  {
    month: 6,
    phase: "Conversation",
    title: "Midyear immersion",
    focus: "Listening, natural particles and conversation",
    milestone: "Follow a slow natural-speed dialogue and respond with appropriate particles",
    weeks: [
      w("Natural particles", "語氣助詞", "particles", ["Use 呀, 啦, 喎, 㗎 naturally"], ["…啦！", "…㗎"]),
      w("Out and about", "出街", "places", ["Handle simple everyday exchanges"], ["幾多錢呀？"]),
      w("Listening at speed", "聽快啲", "questions", ["Catch key words at natural speed"], ["question words in fast speech"]),
      w("Midyear review", "半年回顧", "family", ["Consolidate the first six months"], ["review"]),
    ],
  },
  {
    month: 7,
    phase: "Literacy",
    title: "Character recognition",
    focus: "Traditional characters and colloquial writing",
    milestone: "Recognise 250+ characters; tell written Cantonese from Standard Written Chinese",
    weeks: [
      w("Character families", "部首", "describing", ["Use radicals to guess meaning"], ["口-radical particles"]),
      w("Written vs spoken", "書面語同口語", "particles", ["Compare 係/是, 佢/他, 嘅/的"], ["口語 vs 書面語"]),
      w("Signs & menus", "餐牌", "food", ["Read menu items and signs"], ["要 + dish"]),
      w("Reading short texts", "短文", "play", ["Read a short paragraph without Jyutping"], ["connectors"]),
    ],
  },
  {
    month: 8,
    phase: "Literacy",
    title: "Hong Kong Cantonese",
    focus: "Authentic listening and expressions",
    milestone: "Understand common Hong Kong expressions in context",
    weeks: [
      w("Hong Kong food culture", "香港美食", "food", ["Order at a cha chaan teng"], ["唔該，要一個…"]),
      w("Getting around", "搭車", "places", ["Ask for directions"], ["點去…？"]),
      w("Everyday expressions", "日常用語", "greetings", ["Use idiomatic everyday phrases"], ["set phrases"]),
      w("Festivals", "節日", "family", ["Talk about festivals and customs"], ["新年快樂！"]),
    ],
  },
  {
    month: 9,
    phase: "Literacy",
    title: "Storytime confidence",
    focus: "Expressive and interactive reading",
    milestone: "Read a children's picture book aloud and ask questions about it",
    weeks: [
      w("Expressive reading", "有感情咁讀", "play", ["Read with expression and pauses"], ["intonation with particles"]),
      w("Nature stories", "大自然", "animals", ["Describe weather and nature"], ["今日好 + weather"]),
      w("Asking children questions", "問小朋友", "questions", ["Ask open questions about a story"], ["你估…？", "跟住會點呀？"]),
      w("Songs & rhymes", "兒歌", "play", ["Learn a nursery rhyme"], ["repetition"]),
    ],
  },
  {
    month: 10,
    phase: "Independence",
    title: "Everyday immersion",
    focus: "Cantonese-first family routines",
    milestone: "Run a whole morning or bedtime routine in Cantonese",
    weeks: [
      w("Cantonese mornings", "朝早", "home", ["Morning routine language"], ["快啲…啦！"]),
      w("Mealtimes", "食飯時間", "food", ["Mealtime conversation"], ["食多啲啦"]),
      w("Bedtime", "瞓覺時間", "home", ["Bedtime routine and stories"], ["早啲瞓啦"]),
      w("Weekend plans", "週末", "places", ["Plan and discuss weekends"], ["不如…？"]),
    ],
  },
  {
    month: 11,
    phase: "Independence",
    title: "Independent reading",
    focus: "Unfamiliar books and paraphrasing",
    milestone: "Read an unfamiliar short text and paraphrase it in spoken Cantonese",
    weeks: [
      w("Unfamiliar books", "新書", "play", ["Use context to guess new words"], ["即係…"]),
      w("Paraphrasing", "用自己嘅說話", "describing", ["Restate ideas simply"], ["即係話…"]),
      w("Opinions", "意見", "feelings", ["Give and justify opinions"], ["我覺得…因為…"]),
      w("Longer passages", "長啲嘅文章", "animals", ["Follow a longer passage"], ["但係 / 所以"]),
    ],
  },
  {
    month: 12,
    phase: "Independence",
    title: "Our family speaks Cantonese",
    focus: "Consolidate, converse and celebrate",
    milestone: "Hold a 15-minute conversation on a familiar topic; compare against your Month 1 baseline",
    weeks: [
      w("Family history", "家族故事", "family", ["Tell your family's story"], ["以前…而家…"]),
      w("Celebrations", "慶祝", "family", ["Talk about celebrations"], ["祝你…"]),
      w("Conversation practice", "傾偈", "questions", ["Sustain longer conversation"], ["follow-up questions"]),
      w("Year in review", "一年回顧", "greetings", ["Reflect on your progress"], ["review"]),
    ],
  },
];

export const DAYS_PER_MONTH = 30;
export const CURRICULUM_DAYS = 365;
const WEEK_END_DAYS = [7, 15, 22, 30];

export type CurriculumPosition = {
  curriculumDay: number;
  month: number;
  week: number; // 1..4
  dayInMonth: number;
  isWeekReview: boolean;
  isMonthMilestone: boolean;
  monthInfo: FrameworkMonth;
  weekInfo: WeekTheme;
};

/**
 * Maps a learner's pathway day to a framework position. `startMonth` lets advanced
 * learners bypass foundations. Beyond day 365 the final month's themes cycle as
 * consolidation, so there is never an empty or placeholder day.
 */
export function positionFor(pathwayDay: number, startMonth = 1): CurriculumPosition {
  const offset = (Math.max(1, Math.min(12, startMonth)) - 1) * DAYS_PER_MONTH;
  const curriculumDay = pathwayDay + offset;
  let month = Math.min(12, Math.ceil(curriculumDay / DAYS_PER_MONTH));
  let dayInMonth = curriculumDay - (month - 1) * DAYS_PER_MONTH;
  if (curriculumDay > CURRICULUM_DAYS) {
    month = 12;
    dayInMonth = ((curriculumDay - 1) % DAYS_PER_MONTH) + 1;
  }
  const week = Math.min(4, Math.max(1, Math.ceil(dayInMonth / 7.5)));
  const monthInfo = FRAMEWORK[month - 1];
  return {
    curriculumDay,
    month,
    week,
    dayInMonth,
    isWeekReview: WEEK_END_DAYS.includes(dayInMonth),
    isMonthMilestone: dayInMonth === DAYS_PER_MONTH,
    monthInfo,
    weekInfo: monthInfo.weeks[week - 1],
  };
}
