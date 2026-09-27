import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type CardInput, type Grade } from "ts-fsrs";

/**
 * FSRS spaced repetition. Each vocabulary item has two independent cards:
 * recognition (see/hear → meaning) and production (meaning → say/write).
 */

const scheduler = fsrs(generatorParameters({ enable_fuzz: true, request_retention: 0.9 }));

export type StoredCard = Omit<CardInput, "due" | "last_review"> & { due: string; last_review?: string | null };

export type ReviewGrade = "again" | "hard" | "good" | "easy";

const GRADES: Record<ReviewGrade, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

function serialise(card: Card): StoredCard {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

export function newCard(now = new Date()): StoredCard {
  return serialise(createEmptyCard(now));
}

export function reviewCard(card: StoredCard, grade: ReviewGrade, now = new Date()): StoredCard {
  const { card: next } = scheduler.next(card as CardInput, now, GRADES[grade]);
  return serialise(next);
}

/** A word counts as mastered once FSRS expects to retain it for three weeks or more. */
export function isMastered(card: StoredCard): boolean {
  return card.state === State.Review && card.stability >= 21;
}

/** Map an in-lesson answer to an FSRS grade without overreacting to one mistake. */
export function gradeFromAnswer(correct: boolean, firstTry: boolean): ReviewGrade {
  if (!correct) return "again";
  return firstTry ? "good" : "hard";
}
