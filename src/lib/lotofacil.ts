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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateGame(count: number): Game {
  const numbers: number[] = [];
  while (numbers.length < count) {
    const n = Math.floor(Math.random() * TOTAL_NUMBERS) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }
  return numbers.sort((a, b) => a - b);
}

export function generateGames(quantity: number, numbersPerGame: number): Game[] {
  return Array.from({ length: quantity }, () => generateGame(numbersPerGame));
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

export async function fetchDraw(concurso: number): Promise<DrawResult> {
  const res = await fetch(`https://loteriascaixa-api.herokuapp.com/api/lotofacil/${concurso}`);
  if (!res.ok) throw new Error(`Falha ao buscar concurso ${concurso}`);
  const data = await res.json();
  return {
    concurso: data.concurso,
    data: data.data,
    dezenas: data.dezenas,
  };
}

// ============ MOTOR IA ============

export interface MotorAnalysis {
  draws: DrawResult[];
  frequency: Record<number, number>;       // how many times each number appeared in last 5
  hotNumbers: number[];                     // most frequent (sorted desc)
  coldNumbers: number[];                    // least frequent (sorted asc)
  rowDistribution: number[];                // avg picks per row across last 5
  pairFrequency: Map<string, number>;       // pairs that appear together
  consecutivePatterns: number[];            // how many consecutive numbers per draw avg
  evenOddRatio: { even: number; odd: number }; // average even/odd split
}

export async function fetchLast5Draws(): Promise<DrawResult[]> {
  const latest = await fetchLatestDraw();
  const concursoStart = latest.concurso;

  const promises = [
    Promise.resolve(latest),
    ...Array.from({ length: 4 }, (_, i) => fetchDraw(concursoStart - (i + 1))),
  ];

  const draws = await Promise.all(promises);
  return draws.sort((a, b) => a.concurso - b.concurso);
}

export function analyzeDraws(draws: DrawResult[]): MotorAnalysis {
  const frequency: Record<number, number> = {};
  for (let i = 1; i <= 25; i++) frequency[i] = 0;

  const pairFrequency = new Map<string, number>();
  let totalEven = 0;
  let totalOdd = 0;
  let totalConsecutive = 0;
  const rowTotals = [0, 0, 0, 0, 0];

  for (const draw of draws) {
    const nums = draw.dezenas.map(Number).sort((a, b) => a - b);

    // Frequency
    for (const n of nums) {
      frequency[n]++;
    }

    // Pairs
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const key = `${nums[i]}-${nums[j]}`;
        pairFrequency.set(key, (pairFrequency.get(key) || 0) + 1);
      }
    }

    // Even/Odd
    totalEven += nums.filter((n) => n % 2 === 0).length;
    totalOdd += nums.filter((n) => n % 2 !== 0).length;

    // Consecutive
    let consec = 0;
    for (let i = 1; i < nums.length; i++) {
      if (nums[i] === nums[i - 1] + 1) consec++;
    }
    totalConsecutive += consec;

    // Row distribution
    for (let r = 0; r < 5; r++) {
      rowTotals[r] += nums.filter((n) => ROWS[r].includes(n)).length;
    }
  }

  const count = draws.length;
  const entries = Object.entries(frequency).map(([k, v]) => ({ num: Number(k), freq: v }));
  const hotNumbers = [...entries].sort((a, b) => b.freq - a.freq).map((e) => e.num);
  const coldNumbers = [...entries].sort((a, b) => a.freq - b.freq).map((e) => e.num);

  return {
    draws,
    frequency,
    hotNumbers,
    coldNumbers,
    rowDistribution: rowTotals.map((t) => Math.round(t / count)),
    pairFrequency,
    consecutivePatterns: [Math.round(totalConsecutive / count)],
    evenOddRatio: {
      even: Math.round(totalEven / count),
      odd: Math.round(totalOdd / count),
    },
  };
}

/**
 * Generate a smart game using weighted probability based on analysis.
 * Strategy:
 * 1. Weight hot numbers higher (appeared more in last 5 draws)
 * 2. Respect average row distribution
 * 3. Maintain similar even/odd ratio
 * 4. Include some top pairs
 * 5. Add slight randomness to avoid identical games
 */
export function generateSmartGame(analysis: MotorAnalysis, count: number): Game {
  const { frequency, rowDistribution, evenOddRatio } = analysis;

  // Build weighted pool: each number gets weight = frequency + 1 (so cold numbers still have a chance)
  const weights: { num: number; weight: number }[] = [];
  for (let i = 1; i <= 25; i++) {
    // Base weight from frequency (higher = more likely)
    const freqWeight = frequency[i] + 1;
    // Small random factor to diversify
    const randomFactor = 0.5 + Math.random();
    weights.push({ num: i, weight: freqWeight * randomFactor });
  }

  // Target row distribution (scale to match count)
  const totalRowDist = rowDistribution.reduce((a, b) => a + b, 0);
  const targetRows = rowDistribution.map((r) => Math.round((r / totalRowDist) * count));

  // Adjust so sum equals count
  let diff = count - targetRows.reduce((a, b) => a + b, 0);
  while (diff !== 0) {
    const idx = Math.floor(Math.random() * 5);
    if (diff > 0 && targetRows[idx] < 5) {
      targetRows[idx]++;
      diff--;
    } else if (diff < 0 && targetRows[idx] > 0) {
      targetRows[idx]--;
      diff++;
    }
  }

  // Target even/odd
  const targetEven = Math.round((evenOddRatio.even / (evenOddRatio.even + evenOddRatio.odd)) * count);
  const targetOdd = count - targetEven;

  // Pick numbers row by row, weighted
  const selected: number[] = [];
  let evenCount = 0;
  let oddCount = 0;

  for (let r = 0; r < 5; r++) {
    const rowNums = ROWS[r];
    const rowWeights = rowNums
      .map((n) => {
        const w = weights.find((x) => x.num === n)!;
        // Boost or penalize based on even/odd balance
        let eoBonus = 1;
        if (n % 2 === 0 && evenCount >= targetEven) eoBonus = 0.3;
        if (n % 2 !== 0 && oddCount >= targetOdd) eoBonus = 0.3;
        return { num: n, weight: w.weight * eoBonus };
      })
      .sort((a, b) => b.weight - a.weight);

    const pickCount = Math.min(targetRows[r], rowNums.length);
    // Weighted random selection from this row
    const rowPool = [...rowWeights];
    for (let p = 0; p < pickCount && rowPool.length > 0; p++) {
      const totalW = rowPool.reduce((s, x) => s + x.weight, 0);
      let rand = Math.random() * totalW;
      let pickedIdx = 0;
      for (let i = 0; i < rowPool.length; i++) {
        rand -= rowPool[i].weight;
        if (rand <= 0) {
          pickedIdx = i;
          break;
        }
      }
      const picked = rowPool[pickedIdx];
      selected.push(picked.num);
      if (picked.num % 2 === 0) evenCount++;
      else oddCount++;
      rowPool.splice(pickedIdx, 1);
    }
  }

  // If we still need more numbers (rounding issues), fill from remaining weighted
  const remaining = Array.from({ length: 25 }, (_, i) => i + 1)
    .filter((n) => !selected.includes(n))
    .map((n) => ({ num: n, weight: (weights.find((w) => w.num === n)?.weight || 1) }))
    .sort((a, b) => b.weight - a.weight);

  while (selected.length < count && remaining.length > 0) {
    const totalW = remaining.reduce((s, x) => s + x.weight, 0);
    let rand = Math.random() * totalW;
    let idx = 0;
    for (let i = 0; i < remaining.length; i++) {
      rand -= remaining[i].weight;
      if (rand <= 0) { idx = i; break; }
    }
    selected.push(remaining[idx].num);
    remaining.splice(idx, 1);
  }

  return selected.sort((a, b) => a - b);
}

export function generateSmartGames(
  analysis: MotorAnalysis,
  quantity: number,
  numbersPerGame: number
): Game[] {
  const games: Game[] = [];
  const seen = new Set<string>();

  let attempts = 0;
  while (games.length < quantity && attempts < quantity * 10) {
    const game = generateSmartGame(analysis, numbersPerGame);
    const key = game.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      games.push(game);
    }
    attempts++;
  }

  return games;
}
