import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Coins, Lock, Play, Shuffle, X } from 'lucide-react';
import {
  getDifficultyForCampaignLevel,
  LEVEL_REWARD_COINS,
  MAX_CAMPAIGN_LEVEL,
} from '../engine/puzzle';
import type { Difficulty, SavedProgress } from '../engine/types';

interface LevelSelectModalProps {
  progress: SavedProgress;
  onSelectPractice: () => void;
  onSelectCampaignLevel: (levelNumber: number) => void;
  onSelectCustomDifficulty: (difficulty: Exclude<Difficulty, 'practice'>) => void;
  onClose: () => void;
}

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  practice: 'Practice',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  extreme: 'Extreme',
};

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  practice: '#3A8E6B',
  easy: '#3A8E6B',
  medium: '#2E62B8',
  hard: '#D46D26',
  extreme: '#C93B3B',
};

type FilterTab = 'campaign' | 'easy' | 'medium' | 'hard' | 'extreme';

const PAGE_SIZE = 50;

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  progress,
  onSelectPractice,
  onSelectCampaignLevel,
  onSelectCustomDifficulty,
  onClose,
}) => {
  const [tab, setTab] = useState<FilterTab>('campaign');
  const [page, setPage] = useState<number>(() =>
    Math.floor((Math.min(MAX_CAMPAIGN_LEVEL, progress.highestUnlockedLevel) - 1) / PAGE_SIZE)
  );
  const [jumpInput, setJumpInput] = useState('');

  // Compute filtered list (5,000 integers is instant in JS; we only render 50 DOM cells per page)
  const filteredLevels = useMemo(() => {
    const list: { number: number; difficulty: Difficulty }[] = [];
    for (let i = 1; i <= MAX_CAMPAIGN_LEVEL; i++) {
      const difficulty = getDifficultyForCampaignLevel(i);
      if (tab === 'campaign' || tab === difficulty) {
        list.push({ number: i, difficulty });
      }
    }
    return list;
  }, [tab]);

  const totalPages = Math.max(1, Math.ceil(filteredLevels.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const pageItems = useMemo(() => {
    const start = safePage * PAGE_SIZE;
    return filteredLevels.slice(start, start + PAGE_SIZE);
  }, [filteredLevels, safePage]);

  const firstNum = pageItems[0]?.number ?? 1;
  const lastNum = pageItems[pageItems.length - 1]?.number ?? MAX_CAMPAIGN_LEVEL;

  const handleTabChange = (nextTab: FilterTab) => {
    setTab(nextTab);
    setPage(0);
  };

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number.parseInt(jumpInput.trim(), 10);
    if (Number.isNaN(target) || target < 1 || target > MAX_CAMPAIGN_LEVEL) return;
    setTab('campaign');
    setPage(Math.floor((target - 1) / PAGE_SIZE));
    setJumpInput('');
  };

  const jumpToCurrent = () => {
    setTab('campaign');
    setPage(Math.floor((Math.min(MAX_CAMPAIGN_LEVEL, progress.highestUnlockedLevel) - 1) / PAGE_SIZE));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1917]/40 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Level Select"
    >
      <div className="w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-2xl bg-[#F5F4F0] border border-[#D4D0C5] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[#FFFFFF] border-b border-[#E5E2D9]">
          <div>
            <h2 className="text-lg font-semibold text-[#1A1917] tabular-nums">
              5,000 Mixed Levels
            </h2>
            <p className="text-xs text-[#6B675E] mt-0.5 tabular-nums">
              Win prizes: Easy +10 · Medium +15 · Hard +20 · Extreme +25
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-[#1A1917] tabular-nums">
              <Coins className="w-4 h-4 text-[#C98A14]" aria-hidden="true" />
              <span>{progress.coins}</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close level select"
              className="h-11 w-11 inline-flex items-center justify-center rounded-lg hover:bg-[#ECEAE3] text-[#1A1917] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Practice Row + Difficulty Filter Tabs */}
        <div className="px-5 sm:px-6 py-3.5 bg-[#F5F4F0] border-b border-[#E5E2D9] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onSelectPractice}
              className="h-11 px-4 inline-flex items-center justify-between sm:justify-start gap-3 rounded-xl bg-[#FFFFFF] border border-[#D4D0C5] hover:border-[#1A1917] text-sm font-medium text-[#1A1917] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Practice Level</span>
              </span>
              <span className="text-xs text-[#6B675E]">
                {progress.practiceCompleted ? 'Completed' : 'Recommended first'}
              </span>
            </button>

            <div className="flex items-center gap-2">
              {tab !== 'campaign' ? (
                <button
                  type="button"
                  onClick={() => onSelectCustomDifficulty(tab)}
                  className="flex-1 sm:flex-initial h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A1917] text-[#F5F4F0] text-sm font-medium hover:bg-[#32302C] transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                >
                  <Shuffle className="w-4 h-4" aria-hidden="true" />
                  <span>
                    Quick {DIFFICULTY_LABEL[tab]} (+{LEVEL_REWARD_COINS[tab]})
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={jumpToCurrent}
                  className="h-11 px-3.5 inline-flex items-center justify-center rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-xs font-medium text-[#1A1917] hover:bg-[#ECEAE3] transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
                >
                  Current · #{progress.highestUnlockedLevel}
                </button>
              )}
            </div>
          </div>

          {/* Interactive Filter Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-[#E7E4DC] rounded-xl overflow-x-auto">
            {(['campaign', 'easy', 'medium', 'hard', 'extreme'] as FilterTab[]).map((t) => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTabChange(t)}
                  className={`flex-1 min-w-16 h-9 px-3 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FFFFFF] text-[#1A1917] shadow-sm'
                      : 'text-[#5E5A52] hover:text-[#1A1917]'
                  }`}
                >
                  {t === 'campaign' ? 'All Mix' : DIFFICULTY_LABEL[t]}
                </button>
              );
            })}
          </div>

          {/* Pagination & Quick Jump Strip */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                aria-label="Previous 50 levels"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ECEAE3] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono font-medium text-[#1A1917] tabular-nums whitespace-nowrap">
                {firstNum}–{lastNum} <span className="text-[#6B675E]">({safePage + 1}/{totalPages})</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage >= totalPages - 1}
                aria-label="Next 50 levels"
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ECEAE3] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJump} className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={MAX_CAMPAIGN_LEVEL}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder="Go to #"
                aria-label="Jump to level number"
                className="w-20 h-9 px-2.5 rounded-lg border border-[#D4D0C5] bg-[#FFFFFF] text-xs font-mono text-[#1A1917] placeholder:text-[#8A857C] focus:outline-none focus:border-[#1A1917]"
              />
              <button
                type="submit"
                className="h-9 px-3 rounded-lg border border-[#D4D0C5] bg-[#FFFFFF] text-xs font-medium text-[#1A1917] hover:bg-[#ECEAE3] cursor-pointer"
              >
                Go
              </button>
            </form>
          </div>
        </div>

        {/* Paginated Level Grid (50 levels per page for instant rendering) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
            {pageItems.map(({ number, difficulty }) => {
              const unlocked = number <= progress.highestUnlockedLevel;
              const record = progress.completedLevels[number];
              const isCurrent = number === progress.highestUnlockedLevel;

              return (
                <button
                  key={number}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectCampaignLevel(number)}
                  className={`relative flex flex-col items-start justify-between p-3 rounded-xl border text-left transition-all min-h-20 ${
                    !unlocked
                      ? 'bg-[#ECEAE3]/60 border-[#E2DFD7] text-[#9A958B] cursor-not-allowed'
                      : isCurrent
                        ? 'bg-[#FFFFFF] border-[#1A1917] text-[#1A1917] shadow-sm cursor-pointer hover:bg-[#FAF9F5]'
                        : 'bg-[#FFFFFF] border-[#D8D4C9] text-[#1A1917] cursor-pointer hover:border-[#1A1917]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {number < 100 ? String(number).padStart(2, '0') : number}
                    </span>
                    {!unlocked ? (
                      <Lock className="w-3.5 h-3.5 text-[#A8A297]" aria-hidden="true" />
                    ) : record ? (
                      <Check className="w-3.5 h-3.5 text-[#3A8E6B]" aria-hidden="true" />
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-col gap-0.5 w-full">
                    <span
                      className="text-[11px] font-medium truncate"
                      style={{ color: unlocked ? DIFFICULTY_COLOR[difficulty] : '#9A958B' }}
                    >
                      {DIFFICULTY_LABEL[difficulty]}
                    </span>
                    {record && (
                      <span className="text-[11px] font-mono text-[#6B675E] tabular-nums">
                        {record.bestMoves}m
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
