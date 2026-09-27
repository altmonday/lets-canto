import type { FamilyActivity, Line, Mcq, VocabItem } from "../schemas";

/**
 * Hand-authored seed content. Used for:
 *  - the safe fallback lesson when AI generation fails
 *  - the diagnostic item bank
 * Every Cantonese line is validated for Jyutping/character alignment in tests.
 * Flagged for fluent Hong Kong Cantonese review before public launch.
 */

export type TopicKey =
  | "greetings"
  | "family"
  | "questions"
  | "numbers"
  | "food"
  | "home"
  | "describing"
  | "feelings"
  | "places"
  | "play"
  | "animals"
  | "particles";

type Topic = {
  label: string;
  words: VocabItem[];
  passage: { title: string; lines: Line[]; questions: Mcq[] };
  family: FamilyActivity;
};

const L = (zh: string, jyutping: string, en: string): Line => ({ zh, jyutping, en });
const V = (zh: string, jyutping: string, en: string, category: string, example: Line, note: string | null = null): VocabItem => ({
  zh,
  jyutping,
  en,
  category,
  example,
  note,
});
const Q = (prompt: string, options: string[], answer_index: number, explanation: string): Mcq => ({
  prompt,
  audio: null,
  options,
  answer_index,
  explanation,
  skill: "reading",
  vocab_zh: null,
});

export const TOPICS: Record<TopicKey, Topic> = {
  greetings: {
    label: "Greetings",
    words: [
      V("早晨", "zou2 san4", "good morning", "greetings", L("早晨呀，媽媽！", "zou2 san4 aa3, maa4 maa1!", "Good morning, Mum!")),
      V("你好", "nei5 hou2", "hello", "greetings", L("你好，我叫小明。", "nei5 hou2, ngo5 giu3 siu2 ming4.", "Hello, I'm Siu Ming.")),
      V("多謝", "do1 ze6", "thank you (for a gift)", "greetings", L("多謝你嘅禮物！", "do1 ze6 nei5 ge3 lai5 mat6!", "Thank you for your present!"), "多謝 thanks for gifts or compliments; 唔該 thanks for a service."),
      V("唔該", "m4 goi1", "please / thank you (for a service)", "greetings", L("唔該，要一杯水。", "m4 goi1, jiu3 jat1 bui1 seoi2.", "Excuse me, a glass of water please.")),
      V("對唔住", "deoi3 m4 zyu6", "sorry", "greetings", L("對唔住，我遲到。", "deoi3 m4 zyu6, ngo5 ci4 dou3.", "Sorry, I'm late.")),
      V("拜拜", "baai1 baai3", "bye", "greetings", L("拜拜，聽日見！", "baai1 baai3, ting1 jat6 gin3!", "Bye, see you tomorrow!")),
      V("係", "hai6", "yes / to be", "verbs", L("係呀，我係老師。", "hai6 aa3, ngo5 hai6 lou5 si1.", "Yes, I'm a teacher.")),
      V("唔係", "m4 hai6", "no / is not", "verbs", L("佢唔係我哥哥。", "keoi5 m4 hai6 ngo5 go4 go1.", "He isn't my older brother.")),
    ],
    passage: {
      title: "Morning with Grandma",
      lines: [
        L("早晨呀，婆婆！", "zou2 san4 aa3, po4 po2!", "Good morning, Grandma!"),
        L("早晨！你食咗早餐未呀？", "zou2 san4! nei5 sik6 zo2 zou2 caan1 mei6 aa3?", "Good morning! Have you had breakfast yet?"),
        L("食咗喇，多謝婆婆。", "sik6 zo2 laa3, do1 ze6 po4 po2.", "Yes I have, thank you Grandma."),
        L("乖乖，拜拜！", "gwaai1 gwaai1, baai1 baai3!", "Good kid, bye-bye!"),
      ],
      questions: [
        Q("Who is the child greeting?", ["Grandma", "Mum", "A teacher"], 0, "婆婆 (po4 po2) is Grandma (mother's mother)."),
        Q("Has the child eaten breakfast?", ["Yes", "No", "The text doesn't say"], 0, "食咗喇 means 'I've eaten'."),
      ],
    },
    family: {
      kind: "routine",
      title: "Morning greetings",
      age_note: "All ages — say it every morning, no pressure to repeat.",
      instructions: "Greet each child when they wake up. Ask how they slept and celebrate any reply, in any language.",
      lines: [L("早晨呀！", "zou2 san4 aa3!", "Good morning!"), L("瞓得好唔好呀？", "fan3 dak1 hou2 m4 hou2 aa3?", "Did you sleep well?")],
    },
  },
  family: {
    label: "Family",
    words: [
      V("爸爸", "baa4 baa1", "dad", "family", L("爸爸返咗工。", "baa4 baa1 faan1 zo2 gung1.", "Dad has gone to work.")),
      V("媽媽", "maa4 maa1", "mum", "family", L("媽媽煮緊飯。", "maa4 maa1 zyu2 gan2 faan6.", "Mum is cooking.")),
      V("仔", "zai2", "son", "family", L("我有兩個仔。", "ngo5 jau5 loeng5 go3 zai2.", "I have two sons.")),
      V("女", "neoi2", "daughter", "family", L("佢個女好叻。", "keoi5 go3 neoi2 hou2 lek1.", "Her daughter is very clever."), "Spoken with a changed tone (neoi2) when it means daughter."),
      V("哥哥", "go4 go1", "older brother", "family", L("哥哥今年八歲。", "go4 go1 gam1 nin4 baat3 seoi3.", "Big brother is eight this year.")),
      V("細佬", "sai3 lou2", "younger brother", "family", L("我細佬好鍾意踢波。", "ngo5 sai3 lou2 hou2 zung1 ji3 tek3 bo1.", "My little brother loves playing football.")),
      V("婆婆", "po4 po2", "grandma (mother's mother)", "family", L("婆婆住喺香港。", "po4 po2 zyu6 hai2 hoeng1 gong2.", "Grandma lives in Hong Kong.")),
      V("屋企人", "uk1 kei2 jan4", "family members", "family", L("我好掛住屋企人。", "ngo5 hou2 gwaa3 zyu6 uk1 kei2 jan4.", "I really miss my family.")),
    ],
    passage: {
      title: "My family",
      lines: [
        L("我屋企有四個人。", "ngo5 uk1 kei2 jau5 sei3 go3 jan4.", "There are four people in my family."),
        L("爸爸、媽媽、哥哥同我。", "baa4 baa1, maa4 maa1, go4 go1 tung4 ngo5.", "Dad, Mum, my older brother and me."),
        L("婆婆住喺香港。", "po4 po2 zyu6 hai2 hoeng1 gong2.", "Grandma lives in Hong Kong."),
        L("我哋星期日同婆婆傾電話。", "ngo5 dei6 sing1 kei4 jat6 tung4 po4 po2 king1 din6 waa2.", "On Sundays we talk to Grandma on the phone."),
      ],
      questions: [
        Q("How many people are in the family?", ["Three", "Four", "Five"], 1, "四個人 — four people."),
        Q("Where does Grandma live?", ["Hong Kong", "London", "Sydney"], 0, "香港 (hoeng1 gong2) is Hong Kong."),
      ],
    },
    family: {
      kind: "game",
      title: "Who's who?",
      age_note: "Ages 2+. Use family photos.",
      instructions: "Point at family photos and ask who each person is. Answer for younger children and let them point.",
      lines: [L("呢個係邊個呀？", "ni1 go3 hai6 bin1 go3 aa3?", "Who is this?"), L("呢個係爸爸。", "ni1 go3 hai6 baa4 baa1.", "This is Dad.")],
    },
  },
  questions: {
    label: "Questions & people",
    words: [
      V("邊個", "bin1 go3", "who", "questions", L("佢係邊個呀？", "keoi5 hai6 bin1 go3 aa3?", "Who is he?")),
      V("咩", "me1", "what", "questions", L("你食緊咩呀？", "nei5 sik6 gan2 me1 aa3?", "What are you eating?")),
      V("邊度", "bin1 dou6", "where", "questions", L("你住喺邊度呀？", "nei5 zyu6 hai2 bin1 dou6 aa3?", "Where do you live?")),
      V("點解", "dim2 gaai2", "why", "questions", L("點解你唔開心呀？", "dim2 gaai2 nei5 m4 hoi1 sam1 aa3?", "Why are you unhappy?")),
      V("幾多", "gei2 do1", "how many / how much", "questions", L("呢個幾多錢呀？", "ni1 go3 gei2 do1 cin2 aa3?", "How much is this?")),
      V("點樣", "dim2 joeng2", "how", "questions", L("呢個字點樣讀呀？", "ni1 go3 zi6 dim2 joeng2 duk6 aa3?", "How do you read this character?")),
      V("我哋", "ngo5 dei6", "we / us", "pronouns", L("我哋一齊去公園。", "ngo5 dei6 jat1 cai4 heoi3 gung1 jyun2.", "Let's go to the park together.")),
      V("佢", "keoi5", "he / she / it", "pronouns", L("佢係我嘅朋友。", "keoi5 hai6 ngo5 ge3 pang4 jau5.", "She is my friend."), "Spoken Cantonese uses 佢 for he, she and it; written Chinese uses 他/她/它."),
    ],
    passage: {
      title: "Meeting someone new",
      lines: [
        L("你叫咩名呀？", "nei5 giu3 me1 meng2 aa3?", "What's your name?"),
        L("我叫阿明。", "ngo5 giu3 aa3 ming4.", "I'm Ming."),
        L("你住喺邊度呀？", "nei5 zyu6 hai2 bin1 dou6 aa3?", "Where do you live?"),
        L("我住喺倫敦，但係我喺香港出世。", "ngo5 zyu6 hai2 leon4 deon1, daan6 hai6 ngo5 hai2 hoeng1 gong2 ceot1 sai3.", "I live in London, but I was born in Hong Kong."),
      ],
      questions: [
        Q("Where does Ming live now?", ["London", "Hong Kong", "Tokyo"], 0, "住喺倫敦 — lives in London."),
        Q("Where was Ming born?", ["London", "Hong Kong", "Tokyo"], 1, "喺香港出世 — born in Hong Kong."),
      ],
    },
    family: {
      kind: "game",
      title: "Question time",
      age_note: "Ages 3+.",
      instructions: "Take turns asking each other simple questions at dinner. Model the answer first.",
      lines: [L("你鍾意咩呀？", "nei5 zung1 ji3 me1 aa3?", "What do you like?"), L("你想去邊度呀？", "nei5 soeng2 heoi3 bin1 dou6 aa3?", "Where do you want to go?")],
    },
  },
  numbers: {
    label: "Numbers & time",
    words: [
      V("一", "jat1", "one", "numbers", L("我要一個蘋果。", "ngo5 jiu3 jat1 go3 ping4 gwo2.", "I want one apple.")),
      V("兩", "loeng5", "two (before a classifier)", "numbers", L("我有兩隻貓。", "ngo5 jau5 loeng5 zek3 maau1.", "I have two cats."), "Use 兩 before classifiers (兩個); 二 when counting (一、二、三)."),
      V("三", "saam1", "three", "numbers", L("佢三歲。", "keoi5 saam1 seoi3.", "He is three years old.")),
      V("十", "sap6", "ten", "numbers", L("我數到十。", "ngo5 sou2 dou3 sap6.", "I'll count to ten.")),
      V("今日", "gam1 jat6", "today", "time", L("今日好熱。", "gam1 jat6 hou2 jit6.", "It's hot today.")),
      V("聽日", "ting1 jat6", "tomorrow", "time", L("聽日我哋去公園。", "ting1 jat6 ngo5 dei6 heoi3 gung1 jyun2.", "Tomorrow we're going to the park.")),
      V("尋日", "cam4 jat6", "yesterday", "time", L("尋日落雨。", "cam4 jat6 lok6 jyu5.", "It rained yesterday.")),
      V("幾點", "gei2 dim2", "what time", "time", L("而家幾點呀？", "ji4 gaa1 gei2 dim2 aa3?", "What time is it now?")),
    ],
    passage: {
      title: "Saturday plans",
      lines: [
        L("今日係星期六。", "gam1 jat6 hai6 sing1 kei4 luk6.", "Today is Saturday."),
        L("我哋十點去公園。", "ngo5 dei6 sap6 dim2 heoi3 gung1 jyun2.", "We're going to the park at ten."),
        L("哥哥帶兩個波。", "go4 go1 daai3 loeng5 go3 bo1.", "Big brother is bringing two balls."),
        L("聽日我哋去探婆婆。", "ting1 jat6 ngo5 dei6 heoi3 taam3 po4 po2.", "Tomorrow we're visiting Grandma."),
      ],
      questions: [
        Q("What day is it today?", ["Saturday", "Sunday", "Monday"], 0, "星期六 — Saturday (day six)."),
        Q("How many balls does big brother bring?", ["One", "Two", "Three"], 1, "兩個波 — two balls."),
      ],
    },
    family: {
      kind: "song",
      title: "Counting steps",
      age_note: "Ages 1+. Count stairs, toys or grapes.",
      instructions: "Count out loud together whenever you climb stairs or share snacks.",
      lines: [L("一、二、三！", "jat1, ji6, saam1!", "One, two, three!"), L("我哋一齊數。", "ngo5 dei6 jat1 cai4 sou2.", "Let's count together.")],
    },
  },
  food: {
    label: "Food & drink",
    words: [
      V("食", "sik6", "eat", "verbs", L("我哋食飯啦！", "ngo5 dei6 sik6 faan6 laa1!", "Let's eat!")),
      V("飲", "jam2", "drink", "verbs", L("你想飲咩呀？", "nei5 soeng2 jam2 me1 aa3?", "What would you like to drink?")),
      V("水", "seoi2", "water", "food", L("唔該俾杯水我。", "m4 goi1 bei2 bui1 seoi2 ngo5.", "Please give me a glass of water.")),
      V("飯", "faan6", "rice / a meal", "food", L("你食咗飯未呀？", "nei5 sik6 zo2 faan6 mei6 aa3?", "Have you eaten yet?"), "A common friendly greeting, not only a literal question."),
      V("麵", "min6", "noodles", "food", L("我想食雲吞麵。", "ngo5 soeng2 sik6 wan4 tan1 min6.", "I'd like wonton noodles.")),
      V("早餐", "zou2 caan1", "breakfast", "food", L("早餐食咗包。", "zou2 caan1 sik6 zo2 baau1.", "I had bread for breakfast.")),
      V("好食", "hou2 sik6", "delicious", "describing", L("媽媽煮嘅餸好好食。", "maa4 maa1 zyu2 ge3 sung3 hou2 hou2 sik6.", "The dishes Mum cooks are delicious.")),
      V("肚餓", "tou5 ngo6", "hungry", "feelings", L("我好肚餓呀！", "ngo5 hou2 tou5 ngo6 aa3!", "I'm so hungry!")),
    ],
    passage: {
      title: "Lunch time",
      lines: [
        L("我好肚餓呀！", "ngo5 hou2 tou5 ngo6 aa3!", "I'm so hungry!"),
        L("你想食咩呀？", "nei5 soeng2 sik6 me1 aa3?", "What do you want to eat?"),
        L("我想食雲吞麵，仲想飲杯奶茶。", "ngo5 soeng2 sik6 wan4 tan1 min6, zung6 soeng2 jam2 bui1 naai5 caa4.", "I want wonton noodles, and a cup of milk tea too."),
        L("好呀，我哋去茶餐廳啦。", "hou2 aa3, ngo5 dei6 heoi3 caa4 caan1 teng1 laa1.", "OK, let's go to a cha chaan teng."),
      ],
      questions: [
        Q("What drink do they want?", ["Milk tea", "Water", "Orange juice"], 0, "奶茶 (naai5 caa4) — Hong Kong milk tea."),
        Q("Where are they going?", ["A cha chaan teng", "The park", "School"], 0, "茶餐廳 — a Hong Kong-style café."),
      ],
    },
    family: {
      kind: "routine",
      title: "Mealtime words",
      age_note: "All ages.",
      instructions: "Call everyone to the table in Cantonese and ask if the food is tasty.",
      lines: [L("食飯啦！", "sik6 faan6 laa1!", "Time to eat!"), L("好唔好食呀？", "hou2 m4 hou2 sik6 aa3?", "Is it tasty?")],
    },
  },
  home: {
    label: "Home & routines",
    words: [
      V("起身", "hei2 san1", "get up", "routines", L("我七點起身。", "ngo5 cat1 dim2 hei2 san1.", "I get up at seven.")),
      V("刷牙", "caat3 ngaa4", "brush teeth", "routines", L("快啲去刷牙啦！", "faai3 di1 heoi3 caat3 ngaa4 laa1!", "Hurry and brush your teeth!")),
      V("著衫", "zoek3 saam1", "get dressed", "routines", L("佢自己識著衫。", "keoi5 zi6 gei2 sik1 zoek3 saam1.", "He can dress himself.")),
      V("返學", "faan1 hok6", "go to school", "routines", L("佢八點返學。", "keoi5 baat3 dim2 faan1 hok6.", "He goes to school at eight.")),
      V("返工", "faan1 gung1", "go to work", "routines", L("媽媽今日唔使返工。", "maa4 maa1 gam1 jat6 m4 sai2 faan1 gung1.", "Mum doesn't have to work today.")),
      V("沖涼", "cung1 loeng4", "have a shower / bath", "routines", L("食完飯先沖涼。", "sik6 jyun4 faan6 sin1 cung1 loeng4.", "Have a bath after dinner.")),
      V("瞓覺", "fan3 gaau3", "sleep", "routines", L("夠鐘瞓覺喇。", "gau3 zung1 fan3 gaau3 laa3.", "It's bedtime.")),
      V("屋企", "uk1 kei2", "home", "household", L("我哋返屋企啦。", "ngo5 dei6 faan1 uk1 kei2 laa1.", "Let's go home.")),
    ],
    passage: {
      title: "My day",
      lines: [
        L("我每日七點起身。", "ngo5 mui5 jat6 cat1 dim2 hei2 san1.", "I get up at seven every day."),
        L("刷完牙就食早餐。", "caat3 jyun4 ngaa4 zau6 sik6 zou2 caan1.", "After brushing my teeth I have breakfast."),
        L("八點返學，四點返屋企。", "baat3 dim2 faan1 hok6, sei3 dim2 faan1 uk1 kei2.", "School at eight, home at four."),
        L("夜晚九點瞓覺。", "je6 maan5 gau2 dim2 fan3 gaau3.", "Bed at nine at night."),
      ],
      questions: [
        Q("What time do they get up?", ["Seven", "Eight", "Nine"], 0, "七點 — seven o'clock."),
        Q("What happens after brushing teeth?", ["Breakfast", "A shower", "School"], 0, "刷完牙就食早餐 — after brushing, breakfast."),
      ],
    },
    family: {
      kind: "routine",
      title: "Bedtime",
      age_note: "All ages.",
      instructions: "Use the same two phrases every night so they become part of the routine.",
      lines: [L("夠鐘瞓覺喇。", "gau3 zung1 fan3 gaau3 laa3.", "It's bedtime."), L("早抖。", "zou2 tau2.", "Good night.")],
    },
  },
  describing: {
    label: "Describing things",
    words: [
      V("大", "daai6", "big", "describing", L("呢隻狗好大。", "ni1 zek3 gau2 hou2 daai6.", "This dog is very big.")),
      V("細", "sai3", "small", "describing", L("我間房好細。", "ngo5 gaan1 fong2 hou2 sai3.", "My room is very small.")),
      V("靚", "leng3", "pretty / nice", "describing", L("你件衫好靚。", "nei5 gin6 saam1 hou2 leng3.", "Your top is lovely.")),
      V("熱", "jit6", "hot", "describing", L("今日好熱呀。", "gam1 jat6 hou2 jit6 aa3.", "It's so hot today.")),
      V("凍", "dung3", "cold", "describing", L("杯水好凍。", "bui1 seoi2 hou2 dung3.", "The water is very cold.")),
      V("快", "faai3", "fast", "describing", L("佢跑得好快。", "keoi5 paau2 dak1 hou2 faai3.", "He runs very fast.")),
      V("慢", "maan6", "slow", "describing", L("唔該講慢啲。", "m4 goi1 gong2 maan6 di1.", "Please speak more slowly.")),
      V("多", "do1", "many / a lot", "describing", L("公園有好多人。", "gung1 jyun2 jau5 hou2 do1 jan4.", "There are lots of people in the park.")),
    ],
    passage: {
      title: "Our pets",
      lines: [
        L("我有一隻好大嘅狗。", "ngo5 jau5 jat1 zek3 hou2 daai6 ge3 gau2.", "I have a very big dog."),
        L("佢叫波波，跑得好快。", "keoi5 giu3 bo1 bo1, paau2 dak1 hou2 faai3.", "He's called Bobo and runs very fast."),
        L("我妹妹有一隻好細嘅貓。", "ngo5 mui6 mui2 jau5 jat1 zek3 hou2 sai3 ge3 maau1.", "My little sister has a very small cat."),
        L("隻貓好靚，但係好懶。", "zek3 maau1 hou2 leng3, daan6 hai6 hou2 laan5.", "The cat is pretty, but very lazy."),
      ],
      questions: [
        Q("What is the dog called?", ["Bobo", "Mimi", "Lulu"], 0, "佢叫波波 — he's called Bobo."),
        Q("What is the cat like?", ["Small, pretty and lazy", "Big and fast", "Old and noisy"], 0, "好細、好靚、好懶."),
      ],
    },
    family: {
      kind: "game",
      title: "Big or small?",
      age_note: "Ages 2-6.",
      instructions: "Hold up two objects and ask which is big and which is small.",
      lines: [L("呢個大定細呀？", "ni1 go3 daai6 ding6 sai3 aa3?", "Is this big or small?"), L("好大呀！", "hou2 daai6 aa3!", "Very big!")],
    },
  },
  feelings: {
    label: "Feelings",
    words: [
      V("開心", "hoi1 sam1", "happy", "feelings", L("見到你我好開心。", "gin3 dou2 nei5 ngo5 hou2 hoi1 sam1.", "I'm so happy to see you.")),
      V("攰", "gui6", "tired", "feelings", L("今日好攰呀。", "gam1 jat6 hou2 gui6 aa3.", "I'm so tired today."), "Colloquial Cantonese character; written Chinese uses 累."),
      V("驚", "geng1", "scared", "feelings", L("唔使驚，媽媽喺度。", "m4 sai2 geng1, maa4 maa1 hai2 dou6.", "Don't be scared, Mum's here.")),
      V("嬲", "nau1", "angry", "feelings", L("佢好嬲呀。", "keoi5 hou2 nau1 aa3.", "She's really angry.")),
      V("鍾意", "zung1 ji3", "like / love", "feelings", L("我好鍾意睇書。", "ngo5 hou2 zung1 ji3 tai2 syu1.", "I love reading.")),
      V("想", "soeng2", "want / would like", "verbs", L("我想去公園玩。", "ngo5 soeng2 heoi3 gung1 jyun2 waan2.", "I want to go play in the park.")),
      V("痛", "tung3", "hurt / painful", "feelings", L("你邊度痛呀？", "nei5 bin1 dou6 tung3 aa3?", "Where does it hurt?")),
      V("悶", "mun6", "bored", "feelings", L("喺屋企好悶呀。", "hai2 uk1 kei2 hou2 mun6 aa3.", "It's so boring at home.")),
    ],
    passage: {
      title: "A bumpy day",
      lines: [
        L("今日細佬好唔開心。", "gam1 jat6 sai3 lou2 hou2 m4 hoi1 sam1.", "Little brother is very unhappy today."),
        L("佢跌親，隻腳好痛。", "keoi5 dit3 can1, zek3 goek3 hou2 tung3.", "He fell over and his foot really hurts."),
        L("媽媽攬住佢話：「唔使驚。」", "maa4 maa1 laam5 zyu6 keoi5 waa6: m4 sai2 geng1.", "Mum hugged him and said, \"Don't be scared.\""),
        L("食完雪糕，佢又開心返喇。", "sik6 jyun4 syut3 gou1, keoi5 jau6 hoi1 sam1 faan1 laa3.", "After some ice cream, he was happy again."),
      ],
      questions: [
        Q("Why was little brother unhappy?", ["He fell and hurt his foot", "He lost a toy", "He was hungry"], 0, "跌親，隻腳好痛 — fell and his foot hurts."),
        Q("What made him happy again?", ["Ice cream", "A book", "A song"], 0, "雪糕 (syut3 gou1) — ice cream."),
      ],
    },
    family: {
      kind: "routine",
      title: "How do you feel?",
      age_note: "Ages 2+.",
      instructions: "At pick-up or bedtime, ask how they feel. Offer the words if they answer in English.",
      lines: [L("你開唔開心呀？", "nei5 hoi1 m4 hoi1 sam1 aa3?", "Are you happy?"), L("唔使驚。", "m4 sai2 geng1.", "Don't be scared.")],
    },
  },
  places: {
    label: "Places & going out",
    words: [
      V("公園", "gung1 jyun2", "park", "places", L("我哋去公園踩單車。", "ngo5 dei6 heoi3 gung1 jyun2 caai2 daan1 ce1.", "We're going to the park to ride bikes.")),
      V("學校", "hok6 haau6", "school", "places", L("佢間學校好近。", "keoi5 gaan1 hok6 haau6 hou2 kan5.", "His school is very close.")),
      V("街市", "gaai1 si5", "wet market", "places", L("婆婆去街市買餸。", "po4 po2 heoi3 gaai1 si5 maai5 sung3.", "Grandma goes to the market to buy groceries.")),
      V("餐廳", "caan1 teng1", "restaurant", "places", L("呢間餐廳好多人。", "ni1 gaan1 caan1 teng1 hou2 do1 jan4.", "This restaurant is very busy.")),
      V("去", "heoi3", "go", "verbs", L("你去邊度呀？", "nei5 heoi3 bin1 dou6 aa3?", "Where are you going?")),
      V("嚟", "lei4", "come", "verbs", L("快啲嚟睇！", "faai3 di1 lei4 tai2!", "Come and look, quick!")),
      V("搭車", "daap3 ce1", "take a bus / car", "transport", L("我哋搭車去。", "ngo5 dei6 daap3 ce1 heoi3.", "We'll go by bus.")),
      V("行街", "haang4 gaai1", "go out / go shopping", "verbs", L("星期日去行街。", "sing1 kei4 jat6 heoi3 haang4 gaai1.", "On Sunday we'll go out shopping.")),
    ],
    passage: {
      title: "A family day out",
      lines: [
        L("星期六我哋一家人去行街。", "sing1 kei4 luk6 ngo5 dei6 jat1 gaa1 jan4 heoi3 haang4 gaai1.", "On Saturday our whole family went out."),
        L("我哋搭巴士去海傍。", "ngo5 dei6 daap3 baa1 si2 heoi3 hoi2 bong6.", "We took the bus to the waterfront."),
        L("喺餐廳食咗午餐。", "hai2 caan1 teng1 sik6 zo2 ng5 caan1.", "We had lunch at a restaurant."),
        L("跟住去公園玩到五點。", "gan1 zyu6 heoi3 gung1 jyun2 waan2 dou3 ng5 dim2.", "Then we played in the park until five."),
      ],
      questions: [
        Q("How did the family travel?", ["By bus", "By train", "On foot"], 0, "搭巴士 — took the bus."),
        Q("Where did they have lunch?", ["A restaurant", "The park", "At home"], 0, "喺餐廳食咗午餐."),
      ],
    },
    family: {
      kind: "game",
      title: "Where are we going?",
      age_note: "Ages 2+. Use on the way out of the door.",
      instructions: "Before every outing, ask where you're going and answer together.",
      lines: [L("我哋去邊度呀？", "ngo5 dei6 heoi3 bin1 dou6 aa3?", "Where are we going?"), L("去公園！", "heoi3 gung1 jyun2!", "To the park!")],
    },
  },
  play: {
    label: "Play & stories",
    words: [
      V("玩", "waan2", "play", "verbs", L("我哋一齊玩啦！", "ngo5 dei6 jat1 cai4 waan2 laa1!", "Let's play together!")),
      V("書", "syu1", "book", "objects", L("呢本書好好睇。", "ni1 bun2 syu1 hou2 hou2 tai2.", "This book is really good.")),
      V("睇書", "tai2 syu1", "read (a book)", "verbs", L("瞓覺之前一齊睇書。", "fan3 gaau3 zi1 cin4 jat1 cai4 tai2 syu1.", "We read together before bed.")),
      V("故事", "gu3 si6", "story", "objects", L("講個故事俾我聽啦。", "gong2 go3 gu3 si6 bei2 ngo5 teng1 laa1.", "Tell me a story.")),
      V("唱歌", "coeng3 go1", "sing", "verbs", L("佢好鍾意唱歌。", "keoi5 hou2 zung1 ji3 coeng3 go1.", "She loves singing.")),
      V("畫畫", "waak6 waa2", "draw", "verbs", L("我哋今日畫畫。", "ngo5 dei6 gam1 jat6 waak6 waa2.", "We're drawing today.")),
      V("玩具", "wun6 geoi6", "toy", "objects", L("執好啲玩具啦。", "zap1 hou2 di1 wun6 geoi6 laa1.", "Tidy up the toys, please.")),
      V("一齊", "jat1 cai4", "together", "adverbs", L("我哋一齊睇書。", "ngo5 dei6 jat1 cai4 tai2 syu1.", "Let's read together.")),
    ],
    passage: {
      title: "Little Bear finds a friend",
      lines: [
        L("有一日，小熊想去搵朋友。", "jau5 jat1 jat6, siu2 hung4 soeng2 heoi3 wan2 pang4 jau5.", "One day, Little Bear wanted to go and find a friend."),
        L("佢見到一隻兔仔。", "keoi5 gin3 dou2 jat1 zek3 tou3 zai2.", "He saw a bunny."),
        L("兔仔話：「我哋一齊玩啦！」", "tou3 zai2 waa6: ngo5 dei6 jat1 cai4 waan2 laa1!", "The bunny said, \"Let's play together!\""),
        L("佢哋玩到好開心。", "keoi5 dei6 waan2 dou3 hou2 hoi1 sam1.", "They had a wonderful time playing."),
      ],
      questions: [
        Q("Who did Little Bear meet?", ["A bunny", "A cat", "A bird"], 0, "兔仔 (tou3 zai2) — bunny."),
        Q("What did they do?", ["Played together", "Went to sleep", "Ate lunch"], 0, "一齊玩 — play together."),
      ],
    },
    family: {
      kind: "story",
      title: "Little Bear",
      age_note: "Ages 2-6. Act it out with soft toys.",
      instructions: "Tell the Little Bear story with two soft toys. Let your child be the bunny.",
      lines: [L("小熊去搵朋友。", "siu2 hung4 heoi3 wan2 pang4 jau5.", "Little Bear goes to find a friend."), L("我哋一齊玩啦！", "ngo5 dei6 jat1 cai4 waan2 laa1!", "Let's play together!")],
    },
  },
  animals: {
    label: "Animals & nature",
    words: [
      V("狗", "gau2", "dog", "animals", L("隻狗好乖。", "zek3 gau2 hou2 gwaai1.", "The dog is very good.")),
      V("貓", "maau1", "cat", "animals", L("隻貓喺度瞓覺。", "zek3 maau1 hai2 dou6 fan3 gaau3.", "The cat is sleeping.")),
      V("雀仔", "zoek3 zai2", "bird", "animals", L("樹上面有隻雀仔。", "syu6 soeng6 min6 jau5 zek3 zoek3 zai2.", "There's a bird in the tree.")),
      V("魚", "jyu2", "fish", "animals", L("條魚識游水。", "tiu4 jyu2 sik1 jau4 seoi2.", "The fish can swim."), "Usually jyu2 when it means 'a fish'; jyu4 in some compounds."),
      V("樹", "syu6", "tree", "nature", L("公園有好多樹。", "gung1 jyun2 jau5 hou2 do1 syu6.", "There are many trees in the park.")),
      V("花", "faa1", "flower", "nature", L("呢啲花好香。", "ni1 di1 faa1 hou2 hoeng1.", "These flowers smell lovely.")),
      V("落雨", "lok6 jyu5", "rain", "weather", L("出面落緊雨。", "ceot1 min6 lok6 gan2 jyu5.", "It's raining outside.")),
      V("太陽", "taai3 joeng4", "sun", "weather", L("今日好大太陽。", "gam1 jat6 hou2 daai6 taai3 joeng4.", "It's very sunny today.")),
    ],
    passage: {
      title: "In the park",
      lines: [
        L("今日好大太陽。", "gam1 jat6 hou2 daai6 taai3 joeng4.", "It's very sunny today."),
        L("公園有好多花同樹。", "gung1 jyun2 jau5 hou2 do1 faa1 tung4 syu6.", "The park has many flowers and trees."),
        L("樹上面有兩隻雀仔唱緊歌。", "syu6 soeng6 min6 jau5 loeng5 zek3 zoek3 zai2 coeng3 gan2 go1.", "Two birds are singing in the tree."),
        L("池塘入面有好多魚。", "ci4 tong4 jap6 min6 jau5 hou2 do1 jyu2.", "There are lots of fish in the pond."),
      ],
      questions: [
        Q("What is the weather like?", ["Sunny", "Rainy", "Cold"], 0, "好大太陽 — very sunny."),
        Q("How many birds are singing?", ["Two", "Three", "One"], 0, "兩隻雀仔 — two birds."),
      ],
    },
    family: {
      kind: "game",
      title: "Animal sounds",
      age_note: "Ages 1-5.",
      instructions: "Ask what each animal says and make the sounds together.",
      lines: [L("狗仔點叫呀？", "gau2 zai2 dim2 giu3 aa3?", "What does the doggy say?"), L("汪汪！", "wong1 wong1!", "Woof woof!")],
    },
  },
  particles: {
    label: "Particles & natural speech",
    words: [
      V("咗", "zo2", "(completed action)", "particles", L("我食咗早餐。", "ngo5 sik6 zo2 zou2 caan1.", "I've had breakfast.")),
      V("緊", "gan2", "(action in progress)", "particles", L("佢做緊功課。", "keoi5 zou6 gan2 gung1 fo3.", "He's doing homework.")),
      V("未", "mei6", "not yet / yet?", "particles", L("你做完功課未呀？", "nei5 zou6 jyun4 gung1 fo3 mei6 aa3?", "Have you finished your homework?")),
      V("過", "gwo3", "(have ever done)", "particles", L("我去過香港。", "ngo5 heoi3 gwo3 hoeng1 gong2.", "I've been to Hong Kong.")),
      V("啦", "laa1", "(suggestion / urging)", "particles", L("行啦！", "haang4 laa1!", "Let's go!")),
      V("㗎", "gaa3", "(reassuring / explaining)", "particles", L("冇事㗎。", "mou5 si6 gaa3.", "It's fine, really.")),
      V("嘅", "ge3", "'s / of", "particles", L("呢本係我嘅書。", "ni1 bun2 hai6 ngo5 ge3 syu1.", "This is my book."), "Spoken 嘅 corresponds to written 的."),
      V("先", "sin1", "first", "adverbs", L("你先食啦。", "nei5 sin1 sik6 laa1.", "You eat first.")),
    ],
    passage: {
      title: "What I did this morning",
      lines: [
        L("今朝我先刷牙，跟住食早餐。", "gam1 ziu1 ngo5 sin1 caat3 ngaa4, gan1 zyu6 sik6 zou2 caan1.", "This morning I brushed my teeth first, then had breakfast."),
        L("食咗早餐，我就去咗公園。", "sik6 zo2 zou2 caan1, ngo5 zau6 heoi3 zo2 gung1 jyun2.", "After breakfast I went to the park."),
        L("而家我喺屋企睇緊書。", "ji4 gaa1 ngo5 hai2 uk1 kei2 tai2 gan2 syu1.", "Now I'm at home reading."),
        L("你食咗飯未呀？", "nei5 sik6 zo2 faan6 mei6 aa3?", "Have you eaten yet?"),
      ],
      questions: [
        Q("What did they do first this morning?", ["Brushed teeth", "Had breakfast", "Went to the park"], 0, "先刷牙 — brushed teeth first."),
        Q("What are they doing now?", ["Reading at home", "Eating", "Sleeping"], 0, "睇緊書 — reading (in progress)."),
      ],
    },
    family: {
      kind: "routine",
      title: "What are you doing?",
      age_note: "Ages 3+.",
      instructions: "Ask what your child is doing during play, and narrate your own actions with 緊.",
      lines: [L("你做緊咩呀？", "nei5 zou6 gan2 me1 aa3?", "What are you doing?"), L("我畫緊畫。", "ngo5 waak6 gan2 waa2.", "I'm drawing.")],
    },
  },
};

export const TONE_PAIRS: { a: Line; b: Line; same_tone: boolean; note: string }[] = [
  { a: L("詩", "si1", "poem"), b: L("史", "si2", "history"), same_tone: false, note: "Tone 1 stays high and level; tone 2 rises." },
  { a: L("媽", "maa1", "mum"), b: L("麻", "maa4", "numb"), same_tone: false, note: "Tone 1 high level vs tone 4 low falling." },
  { a: L("買", "maai5", "buy"), b: L("賣", "maai6", "sell"), same_tone: false, note: "Tone 5 rises from low; tone 6 stays low and level." },
  { a: L("返", "faan1", "return"), b: L("飯", "faan6", "rice"), same_tone: false, note: "High level vs low level." },
  { a: L("三", "saam1", "three"), b: L("衫", "saam1", "clothes"), same_tone: true, note: "Both tone 1 — only context tells them apart." },
  { a: L("湯", "tong1", "soup"), b: L("糖", "tong4", "sugar"), same_tone: false, note: "High level vs low falling." },
  { a: L("狗", "gau2", "dog"), b: L("九", "gau2", "nine"), same_tone: true, note: "Both tone 2 (rising)." },
  { a: L("時", "si4", "time"), b: L("事", "si6", "matter"), same_tone: false, note: "Tone 4 falls; tone 6 stays low and level." },
  { a: L("書", "syu1", "book"), b: L("樹", "syu6", "tree"), same_tone: false, note: "High level vs low level." },
  { a: L("有", "jau5", "have"), b: L("油", "jau4", "oil"), same_tone: false, note: "Tone 5 low rising vs tone 4 low falling." },
  { a: L("開", "hoi1", "open"), b: L("海", "hoi2", "sea"), same_tone: false, note: "High level vs rising." },
  { a: L("心", "sam1", "heart"), b: L("深", "sam1", "deep"), same_tone: true, note: "Both tone 1." },
];

export const TOPIC_KEYS = Object.keys(TOPICS) as TopicKey[];
