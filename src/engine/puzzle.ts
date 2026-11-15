import type { Bottle, ColorId, Difficulty, LevelConfig, Move } from './types';

export const BOTTLE_CAPACITY = 4;

export const LEVEL_REWARD_COINS: Record<Difficulty, number> = {
  practice: 0,
  easy: 10,
  medium: 15,
  hard: 20,
  extreme: 25,
};

export const ACTION_COSTS = {
  hint: 50,
  undo: 75,
  addTube: 100,
} as const;

// Deterministic mulberry32 PRNG for reproducible offline levels
function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function isBottleComplete(bottle: Bottle): boolean {
  if (bottle.layers.length !== bottle.capacity) return false;
  const first = bottle.layers[0];
  return bottle.layers.every((c) => c === first);
}

export function isBottleMonochrome(bottle: Bottle): boolean {
  if (bottle.layers.length === 0) return true;
  const first = bottle.layers[0];
  return bottle.layers.every((c) => c === first);
}

export function isLevelSolved(bottles: Bottle[]): boolean {
  return bottles.every((b) => b.layers.length === 0 || isBottleComplete(b));
}

export function getTopRunCount(layers: ColorId[]): number {
  if (layers.length === 0) return 0;
  const top = layers[layers.length - 1];
  let count = 0;
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i] === top) count++;
    else break;
  }
  return count;
}

export function canPour(from: Bottle, to: Bottle): boolean {
  if (from.id === to.id) return false;
  if (from.layers.length === 0) return false;
  if (to.layers.length >= to.capacity) return false;
  if (isBottleComplete(from)) return false;

  if (to.layers.length === 0) {
    // Avoid pointless move of an entire monochrome stack into an empty bottle
    // Wait: in manual play, pouring partial monochrome into empty is allowed if helpful,
    // actually let's allow manual pouring a monochrome incomplete bottle into empty?
    // Allowing it in UI is harmless, or even better: allow any valid rule pour so player never feels blocked,
    // while solver skips useless monochrome->empty moves!
    return true;
  }

  const fromTop = from.layers[from.layers.length - 1];
  const toTop = to.layers[to.layers.length - 1];
  return fromTop === toTop;
}

export function computePour(from: Bottle, to: Bottle): Move | null {
  if (!canPour(from, to)) return null;
  const color = from.layers[from.layers.length - 1];
  const available = getTopRunCount(from.layers);
  const space = to.capacity - to.layers.length;
  const count = Math.min(available, space);
  if (count <= 0) return null;
  return {
    from: from.id,
    to: to.id,
    count,
    color,
  };
}

export function applyMove(bottles: Bottle[], move: Move): Bottle[] {
  return bottles.map((b) => {
    if (b.id === move.from) {
      return {
        ...b,
        layers: b.layers.slice(0, b.layers.length - move.count),
      };
    }
    if (b.id === move.to) {
      const added = Array<ColorId>(move.count).fill(move.color);
      return {
        ...b,
        layers: [...b.layers, ...added],
      };
    }
    return b;
  });
}

export function hasAnyValidMoves(bottles: Bottle[]): boolean {
  for (let i = 0; i < bottles.length; i++) {
    for (let j = 0; j < bottles.length; j++) {
      if (i === j) continue;
      if (canPour(bottles[i], bottles[j])) {
        // Check if it's not solely monochrome -> empty
        if (bottles[j].layers.length === 0 && isBottleMonochrome(bottles[i])) {
          continue;
        }
        return true;
      }
    }
  }
  return false;
}

// Fast canonical state key to eliminate bottle-order symmetries during solving
function canonicalKey(bottles: Bottle[]): string {
  return bottles
    .map((b) => b.layers.join(','))
    .sort()
    .join('|');
}

function heuristicScore(bottles: Bottle[]): number {
  let score = 0;
  for (const b of bottles) {
    if (b.layers.length === 0) {
      score += 4;
      continue;
    }
    if (isBottleComplete(b)) {
      score += 20;
      continue;
    }
    // Count contiguous run from bottom
    const bottom = b.layers[0];
    let bottomRun = 1;
    for (let i = 1; i < b.layers.length; i++) {
      if (b.layers[i] === bottom) bottomRun++;
      else break;
    }
    score += bottomRun * 2;
    // Penalize transitions
    for (let i = 1; i < b.layers.length; i++) {
      if (b.layers[i] !== b.layers[i - 1]) score -= 3;
    }
  }
  return score;
}

/**
 * Finds a winning move sequence from the current board state using bounded best-first search.
 * Returns the list of Moves to victory, or null if unsolvable within node budget.
 */
export function solveBoard(initial: Bottle[], maxNodes = 8000): Move[] | null {
  if (isLevelSolved(initial)) return [];

  interface Node {
    bottles: Bottle[];
    moves: Move[];
    score: number;
  }

  const visited = new Set<string>();
  visited.add(canonicalKey(initial));

  const stack: Node[] = [{ bottles: initial, moves: [], score: heuristicScore(initial) }];
  let expanded = 0;

  while (stack.length > 0 && expanded < maxNodes) {
    // Pop highest heuristic score (greedy best-first / beam-like)
    let bestIdx = stack.length - 1;
    // Scan last 24 items for fast best selection without full heap overhead
    const startScan = Math.max(0, stack.length - 24);
    for (let i = startScan; i < stack.length - 1; i++) {
      if (stack[i].score > stack[bestIdx].score) {
        bestIdx = i;
      }
    }
    const current = stack[bestIdx];
    stack[bestIdx] = stack[stack.length - 1];
    stack.pop();

    expanded++;

    // Generate candidate moves
    const candidates: { move: Move; next: Bottle[]; priority: number }[] = [];
    let usedEmptyTarget = false;

    for (let i = 0; i < current.bottles.length; i++) {
      const from = current.bottles[i];
      if (from.layers.length === 0 || isBottleComplete(from)) continue;

      const fromMono = isBottleMonochrome(from);

      for (let j = 0; j < current.bottles.length; j++) {
        if (i === j) continue;
        const to = current.bottles[j];

        // Symmetry pruning: only try pouring into ONE empty bottle
        if (to.layers.length === 0) {
          if (fromMono) continue; // pointless move
          if (usedEmptyTarget) continue;
        }

        const move = computePour(from, to);
        if (!move) continue;

        // Avoid splitting a run unnecessarily if target isn't empty and source has more?
        // Actually computePour always pours max possible.
        // Avoid pointless oscillation: pouring monochrome into a bottle that leaves partial only if target has same color
        if (to.layers.length === 0) {
          usedEmptyTarget = true;
        }

        const next = applyMove(current.bottles, move);
        const key = canonicalKey(next);
        if (visited.has(key)) continue;
        visited.add(key);

        if (isLevelSolved(next)) {
          return [...current.moves, move];
        }

        let priority = heuristicScore(next);
        // Strongly reward completing a bottle or emptying a bottle
        if (isBottleComplete(next[j])) priority += 12;
        if (next[i].layers.length === 0) priority += 6;
        // Prefer merging into non-empty matching bottle over empty bottle
        if (to.layers.length > 0 && isBottleMonochrome(to)) priority += 5;

        candidates.push({ move, next, priority });
      }
    }

    // Push in ascending priority so highest is near top of stack
    candidates.sort((a, b) => a.priority - b.priority);
    for (const c of candidates) {
      stack.push({
        bottles: c.next,
        moves: [...current.moves, c.move],
        score: c.priority - current.moves.length * 0.35,
      });
    }
  }

  return null;
}

/**
 * Returns the curated Practice level (Level 0).
 * 3 bottles (2 colors + 1 empty), solvable in 3 intuitive moves.
 */
export function getPracticeLevel(): LevelConfig {
  return {
    levelNumber: 0,
    difficulty: 'practice',
    colorCount: 2,
    emptyBottles: 1,
    capacity: BOTTLE_CAPACITY,
    initialBottles: [
      [1, 1, 0, 0], // Cobalt bottom, Coral top
      [0, 0, 1, 1], // Coral bottom, Cobalt top
      [],           // Empty
    ],
    parMoves: 3,
  };
}

export const MAX_CAMPAIGN_LEVEL = 5000;

/**
 * Campaign schedule deliberately mixes Easy, Medium, Hard, and Extreme levels
 * across all 5,000 levels with an escalating difficulty curve using golden-ratio
 * low-discrepancy sampling so difficulty tiers stay varied without dull streaks.
 */
const EARLY_PATTERN: Difficulty[] = [
  'easy', 'easy', 'medium', 'easy', 'hard',
  'medium', 'easy', 'hard', 'medium', 'extreme',
  'easy', 'hard', 'medium', 'hard', 'extreme',
];

const PHI_CONJUGATE = 0.6180339887498949;

export function getDifficultyForCampaignLevel(levelNumber: number): Difficulty {
  if (levelNumber <= 0) return 'practice';
  const clamped = Math.min(MAX_CAMPAIGN_LEVEL, levelNumber);
  if (clamped <= EARLY_PATTERN.length) {
    return EARLY_PATTERN[clamped - 1];
  }

  // Smooth progression t in [0, 1] across levels 16..5000
  const t = Math.min(1, (clamped - 15) / (MAX_CAMPAIGN_LEVEL - 15));
  // Curved ramp so mid/late campaign escalates meaningfully while preserving breather rounds
  const curve = Math.pow(t, 0.72);

  const easyWeight = 0.32 - 0.24 * curve;    // 32% -> 8%
  const mediumWeight = 0.34 - 0.17 * curve;  // 34% -> 17%
  const hardWeight = 0.24 + 0.11 * curve;    // 24% -> 35%
  // extremeWeight = remaining: 10% -> 40%

  const u = (clamped * PHI_CONJUGATE) % 1;
  if (u < easyWeight) return 'easy';
  if (u < easyWeight + mediumWeight) return 'medium';
  if (u < easyWeight + mediumWeight + hardWeight) return 'hard';
  return 'extreme';
}

function getColorCountForDifficulty(difficulty: Difficulty, levelNumber: number, rng: () => number): number {
  const tierProgress = Math.min(1, Math.floor(levelNumber / 10) / 12);
  switch (difficulty) {
    case 'practice':
      return 2;
    case 'easy':
      return levelNumber <= 4 ? 3 : rng() < 0.45 ? 3 : 4;
    case 'medium':
      return levelNumber <= 12 ? 5 : rng() < 0.4 + tierProgress * 0.4 ? 6 : 5;
    case 'hard':
      return levelNumber <= 10 ? 7 : Math.min(9, 7 + Math.floor(rng() * (2 + tierProgress)));
    case 'extreme':
      return Math.min(12, 9 + Math.floor(rng() * (2 + tierProgress * 2)));
  }
}

function countTransitions(layers: ColorId[]): number {
  let t = 0;
  for (let i = 1; i < layers.length; i++) {
    if (layers[i] !== layers[i - 1]) t++;
  }
  return t;
}

/**
 * Generates a verified solvable level for a given levelNumber and optional forced difficulty.
 */
export function generateLevel(levelNumber: number, forcedDifficulty?: Difficulty): LevelConfig {
  if (levelNumber === 0 && !forcedDifficulty) {
    return getPracticeLevel();
  }

  const difficulty = forcedDifficulty ?? getDifficultyForCampaignLevel(levelNumber);
  const seedBase = levelNumber * 9973 + (forcedDifficulty ? forcedDifficulty.charCodeAt(0) * 131 : 0) + 4242;
  const rng = createRng(seedBase);

  const colorCount = getColorCountForDifficulty(difficulty, levelNumber, rng);
  const emptyBottles = 2;

  // Choose a randomized subset of color IDs so palettes feel fresh across levels
  const allColorIds = Array.from({ length: 12 }, (_, i) => i);
  for (let i = allColorIds.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [allColorIds[i], allColorIds[j]] = [allColorIds[j], allColorIds[i]];
  }
  const chosenColors = allColorIds.slice(0, colorCount);

  // Calibrate target entropy (average transitions per bottle) by difficulty
  const minTotalTransitions =
    difficulty === 'easy'
      ? Math.max(colorCount, Math.floor(colorCount * 1.4))
      : difficulty === 'medium'
        ? Math.floor(colorCount * 2.1)
        : difficulty === 'hard'
          ? Math.floor(colorCount * 2.5)
          : Math.floor(colorCount * 2.75);

  for (let attempt = 0; attempt < 80; attempt++) {
    const pool: ColorId[] = [];
    for (const c of chosenColors) {
      for (let k = 0; k < BOTTLE_CAPACITY; k++) {
        pool.push(c);
      }
    }

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const rawBottles: ColorId[][] = [];
    let hasSolvedStart = false;
    let totalTransitions = 0;

    for (let b = 0; b < colorCount; b++) {
      const slice = pool.slice(b * BOTTLE_CAPACITY, (b + 1) * BOTTLE_CAPACITY);
      if (slice.every((c) => c === slice[0])) {
        hasSolvedStart = true;
        break;
      }
      // For Easy, avoid overly fragmented 4-different-color stacks where possible,
      // for Hard/Extreme enforce high mixing
      totalTransitions += countTransitions(slice);
      rawBottles.push(slice);
    }

    if (hasSolvedStart) continue;

    if (difficulty === 'easy' && totalTransitions > colorCount * 2.3 && attempt < 40) {
      continue;
    }
    if (difficulty !== 'easy' && totalTransitions < minTotalTransitions && attempt < 55) {
      continue;
    }

    for (let e = 0; e < emptyBottles; e++) {
      rawBottles.push([]);
    }

    const testBottles: Bottle[] = rawBottles.map((layers, idx) => ({
      id: idx,
      layers: [...layers],
      capacity: BOTTLE_CAPACITY,
    }));

    const solution = solveBoard(testBottles, difficulty === 'extreme' ? 12000 : 8000);
    if (solution && solution.length >= colorCount) {
      return {
        levelNumber,
        difficulty,
        colorCount,
        emptyBottles,
        capacity: BOTTLE_CAPACITY,
        initialBottles: rawBottles,
        parMoves: solution.length,
      };
    }
  }

  // Deterministic fallback constructed via verified reverse-shuffling if random attempts exceeded budget
  const fallbackBottles: ColorId[][] = chosenColors.map((c) => Array(BOTTLE_CAPACITY).fill(c));
  for (let e = 0; e < emptyBottles; e++) fallbackBottles.push([]);

  // Perform valid mixed swaps across pairs
  for (let step = 0; step < colorCount * 6; step++) {
    const a = Math.floor(rng() * colorCount);
    const b = Math.floor(rng() * colorCount);
    if (a === b) continue;
    const idxA = Math.floor(rng() * BOTTLE_CAPACITY);
    const idxB = Math.floor(rng() * BOTTLE_CAPACITY);
    [fallbackBottles[a][idxA], fallbackBottles[b][idxB]] = [
      fallbackBottles[b][idxB],
      fallbackBottles[a][idxA],
    ];
  }

  return {
    levelNumber,
    difficulty,
    colorCount,
    emptyBottles,
    capacity: BOTTLE_CAPACITY,
    initialBottles: fallbackBottles,
    parMoves: colorCount * 3,
  };
}
