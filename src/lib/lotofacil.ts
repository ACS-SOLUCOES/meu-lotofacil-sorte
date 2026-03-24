export const TOTAL_NUMBERS = 25;
export const MIN_PICK = 15;
export const MAX_PICK = 20;

export type Game = number[];

// Rows of the Lotofácil grid (5x5)
export const ROWS = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
  [21, 22, 23, 24, 25],
];

export function parseMotor(motor: string): number[] | null {
  const parts = motor.split("x").map(Number);
  if (parts.length !== 5 || parts.some(isNaN)) return null;
  if (parts.some((p, i) => p < 0 || p > ROWS[i].length)) return null;
  return parts;
}

export function validateMotor(motor: number[], numbersPerGame: number): boolean {
  const total = motor.reduce((a, b) => a + b, 0);
  return total === numbersPerGame;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateGame(count: number, motor?: number[]): Game {
  if (motor) {
    const numbers: number[] = [];
    motor.forEach((pick, rowIdx) => {
      const selected = shuffle(ROWS[rowIdx]).slice(0, pick);
      numbers.push(...selected);
    });
    return numbers.sort((a, b) => a - b);
  }
  const numbers: number[] = [];
  while (numbers.length < count) {
    const n = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }
  return numbers.sort((a, b) => a - b);
}

export function generateGames(quantity: number, numbersPerGame: number, motor?: number[]): Game[] {
  return Array.from({ length: quantity }, () => generateGame(numbersPerGame, motor));
}

export function checkGame(game: Game, result: number[]): { matches: number; matched: number[]; missed: number[] } {
  const matched = game.filter((n) => result.includes(n));
  const missed = game.filter((n) => !result.includes(n));
  return { matches: matched.length, matched, missed };
}

export interface DrawResult {
  concurso: number;
  data: string;
  dezenas: string[];
}

export async function fetchLatestDraw(): Promise<DrawResult> {
  const res = await fetch("https://loteriascaixa-api.herokuapp.com/api/lotofacil/latest");
  if (!res.ok) throw new Error("Falha ao buscar resultado");
  const data = await res.json();
  return {
    concurso: data.concurso,
    data: data.data,
    dezenas: data.dezenas,
  };
}
