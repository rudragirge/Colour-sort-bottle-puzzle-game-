import React from 'react';
import { ArrowRight, Coins, Home, Layers, Play, RotateCcw } from 'lucide-react';
import { MAX_CAMPAIGN_LEVEL } from '../engine/puzzle';
import type { Difficulty, LevelConfig } from '../engine/types';

interface PauseModalProps {
  level: LevelConfig;
  onResume: () => void;
  onRestart: () => void;
  onPractice: () => void;
  onOpenLevels: () => void;
  onQuitToTitle: () => void;
}

const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  practice: 'Practice',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  extreme: 'Extreme',
};

export const PauseModal: React.FC<PauseModalProps> = ({
  level,
  onResume,
  onRestart,
  onPractice,
  onOpenLevels,
  onQuitToTitle,
}) => {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#1A1917]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Game Paused"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-[#D4D0C5] p-6 shadow-2xl">
        <div className="text-center mb-6">
          <p className="text-xs font-medium text-[#6B675E] tabular-nums">
            {level.difficulty === 'practice'
              ? 'Practice Level'
              : level.levelNumber > 0
                ? `Level ${String(level.levelNumber).padStart(2, '0')} · ${DIFFICULTY_TEXT[level.difficulty]}`
                : `Quick Puzzle · ${DIFFICULTY_TEXT[level.difficulty]}`}
          </p>
          <h2 className="text-xl font-semibold text-[#1A1917] mt-1">Paused</h2>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1917] text-[#F5F4F0] text-sm font-semibold hover:bg-[#32302C] transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Resume</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4D0C5] bg-[#F5F4F0] text-[#1A1917] text-sm font-medium hover:bg-[#EAE7DF] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Restart Level</span>
          </button>

          <button
            type="button"
            onClick={onOpenLevels}
            className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] text-sm font-medium hover:bg-[#F5F4F0] transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            <span>Select Level</span>
          </button>

          {level.difficulty !== 'practice' && (
            <button
              type="button"
              onClick={onPractice}
              className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] text-sm font-medium hover:bg-[#F5F4F0] transition-colors cursor-pointer"
            >
              <span>Practice Level</span>
            </button>
          )}

          <button
            type="button"
            onClick={onQuitToTitle}
            className="h-11 w-full inline-flex items-center justify-center gap-2 rounded-xl text-[#5E5A52] text-sm font-medium hover:text-[#1A1917] hover:bg-[#F5F4F0] transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Title Screen</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryModalProps {
  level: LevelConfig;
  movesCount: number;
  bestMoves?: number;
  earnedCoins: number;
  totalCoins: number;
  nextDifficulty?: Difficulty;
  onNext: () => void;
  onReplay: () => void;
  onOpenLevels: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  level,
  movesCount,
  bestMoves,
  earnedCoins,
  totalCoins,
  nextDifficulty,
  onNext,
  onReplay,
  onOpenLevels,
}) => {
  const isPractice = level.difficulty === 'practice';
  const isCustom = level.levelNumber < 0;
  const isFinalCampaignLevel = level.levelNumber >= MAX_CAMPAIGN_LEVEL;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#1A1917]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Level Completed"
    >
      <div className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-[#D4D0C5] p-6 shadow-2xl text-center">
        <p className="text-xs font-medium text-[#3A8E6B] tabular-nums">
          {isPractice
            ? 'Practice Complete'
            : isCustom
              ? `Quick ${DIFFICULTY_TEXT[level.difficulty]} Cleared`
              : `Level ${String(level.levelNumber).padStart(2, '0')} · ${DIFFICULTY_TEXT[level.difficulty]}`}
        </p>

        <h2 className="text-2xl font-semibold text-[#1A1917] mt-1.5">
          {isPractice
            ? 'Ready to Sort'
            : isFinalCampaignLevel
              ? 'All 5,000 Cleared'
              : 'Sorted Cleanly'}
        </h2>

        <p className="text-sm text-[#5E5A52] mt-2 leading-relaxed">
          {isPractice
            ? 'Matching top layers pour together. Win campaign levels to earn coins for Hint, Undo, and extra tubes.'
            : isFinalCampaignLevel
              ? 'You completed the 5,000-level campaign. Browse any stage or play endless quick puzzles.'
              : nextDifficulty
                ? `Next up: Level ${String(level.levelNumber + 1).padStart(2, '0')} · ${DIFFICULTY_TEXT[nextDifficulty]}`
                : 'Ready for another puzzle.'}
        </p>

        {/* Clean tabular stats row */}
        <div className="mt-5 py-3 px-4 rounded-xl bg-[#F5F4F0] flex items-center justify-center gap-5 text-sm tabular-nums">
          <div>
            <div className="text-xs text-[#6B675E]">Moves</div>
            <div className="font-mono font-semibold text-[#1A1917] text-base">{movesCount}</div>
          </div>
          {!isPractice && bestMoves !== undefined && (
            <>
              <div className="h-7 w-px bg-[#DCD9D0]" aria-hidden="true" />
              <div>
                <div className="text-xs text-[#6B675E]">Best</div>
                <div className="font-mono font-semibold text-[#1A1917] text-base">{bestMoves}</div>
              </div>
            </>
          )}
          {earnedCoins > 0 && (
            <>
              <div className="h-7 w-px bg-[#DCD9D0]" aria-hidden="true" />
              <div>
                <div className="text-xs text-[#6B675E]">Prize</div>
                <div className="font-mono font-semibold text-[#C98A14] text-base inline-flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>+{earnedCoins}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {!isPractice && (
          <p className="mt-2.5 text-xs text-[#6B675E] tabular-nums">
            Total Coins: <span className="font-mono font-semibold text-[#1A1917]">{totalCoins}</span>
          </p>
        )}

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onNext}
            className="h-12 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1917] text-[#F5F4F0] text-sm font-semibold hover:bg-[#32302C] transition-colors cursor-pointer"
          >
            <span>
              {isPractice
                ? 'Start Level 01'
                : isFinalCampaignLevel
                  ? 'Browse Levels'
                  : isCustom
                    ? 'Another Puzzle'
                    : 'Next Level'}
            </span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onReplay}
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] text-sm font-medium hover:bg-[#F5F4F0] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Replay</span>
            </button>
            <button
              type="button"
              onClick={onOpenLevels}
              className="flex-1 h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] text-sm font-medium hover:bg-[#F5F4F0] transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Levels</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
