import React, { useState } from 'react';
import { Coins, Download, Layers, Music, Play, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../engine/audio';
import { BOTTLE_COLORS } from '../engine/colors';
import type { SavedProgress } from '../engine/types';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface TitleScreenProps {
  progress: SavedProgress;
  onStartPractice: () => void;
  onStartCampaign: () => void;
  onOpenLevelSelect: () => void;
  onToggleMute: () => void;
  onToggleMusic: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  onStartPractice,
  onStartCampaign,
  onOpenLevelSelect,
  onToggleMute,
  onToggleMusic,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [liftedVial, setLiftedVial] = useState<number | null>(null);

  const handleVialTap = (idx: number) => {
    setLiftedVial((prev) => (prev === idx ? null : idx));
    soundEngine.playPour(idx + 1, 1);
  };

  const heroVials = [
    [BOTTLE_COLORS[1].hex, BOTTLE_COLORS[1].hex, BOTTLE_COLORS[0].hex, BOTTLE_COLORS[0].hex],
    [BOTTLE_COLORS[2].hex, BOTTLE_COLORS[2].hex, BOTTLE_COLORS[3].hex, BOTTLE_COLORS[3].hex],
    [BOTTLE_COLORS[0].hex, BOTTLE_COLORS[3].hex, BOTTLE_COLORS[1].hex],
  ];

  const completedCount = Object.keys(progress.completedLevels).length;

  return (
    <main className="relative h-dvh w-full flex flex-col justify-between bg-[#F5F4F0] text-[#1A1917] px-6 py-6 sm:px-10 sm:py-8 overflow-hidden">
      {/* Top minimal utility bar */}
      <header className="flex items-center justify-between w-full max-w-5xl mx-auto">
        <div className="flex items-center gap-3 text-xs font-medium text-[#6B675E] tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-[#1A1917] font-semibold">
            <Coins className="w-4 h-4 text-[#C98A14]" aria-hidden="true" />
            <span className="font-mono">{progress.coins}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>Offline Ready</span>
          {completedCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>{completedCount} Cleared</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={() => install()}
              className="h-11 px-3.5 inline-flex items-center gap-2 rounded-lg border border-[#DCD9D0] bg-[#FFFFFF] text-xs font-medium text-[#1A1917] hover:bg-[#ECEAE3] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Install App</span>
            </button>
          )}
          {!isInstalled && !isInstallable && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="h-11 px-3.5 inline-flex items-center gap-2 rounded-lg border border-[#DCD9D0] bg-[#FFFFFF] text-xs font-medium text-[#1A1917] hover:bg-[#ECEAE3] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Install</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleMusic}
            aria-label={progress.musicEnabled ? 'Turn music off' : 'Turn music on'}
            title={progress.musicEnabled ? 'Music On' : 'Music Off'}
            className={`h-11 w-11 inline-flex items-center justify-center rounded-lg border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917] ${
              progress.musicEnabled && !progress.muted
                ? 'border-[#1A1917] bg-[#1A1917] text-[#F5F4F0]'
                : 'border-[#DCD9D0] bg-[#FFFFFF] text-[#6B675E] hover:bg-[#ECEAE3]'
            }`}
          >
            <Music className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={progress.muted ? 'Unmute sound' : 'Mute sound'}
            className="h-11 w-11 inline-flex items-center justify-center rounded-lg border border-[#DCD9D0] bg-[#FFFFFF] text-[#1A1917] hover:bg-[#ECEAE3] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
          >
            {progress.muted ? (
              <VolumeX className="w-4 h-4 text-[#6B675E]" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Center hero stage with generous negative space */}
      <section className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full text-center gap-8 sm:gap-10">
        {/* Interactive minimalist bottle trio */}
        <div className="flex items-end justify-center gap-5 sm:gap-7 py-2" aria-label="Interactive decorative bottles">
          {heroVials.map((layers, idx) => {
            const lifted = liftedVial === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleVialTap(idx)}
                aria-label={`Tap showcase bottle ${idx + 1}`}
                style={{
                  transform: lifted ? 'translateY(-12px)' : 'translateY(0px)',
                }}
                className="w-14 h-36 sm:w-16 sm:h-40 transition-transform duration-150 ease-out cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A1917] rounded-xl"
              >
                <svg viewBox="0 0 80 196" className="w-full h-full overflow-visible" aria-hidden="true">
                  <defs>
                    <clipPath id={`hero-clip-${idx}`}>
                      <path d="M 14 54 L 24 38 H 56 L 66 54 V 162 A 18 18 0 0 1 48 180 H 32 A 18 18 0 0 1 14 162 Z" />
                    </clipPath>
                  </defs>
                  <ellipse cx="40" cy="190" rx={lifted ? 16 : 20} ry="3.5" fill="#1A1917" opacity="0.1" />
                  <path
                    d="M 22 22 H 58 A 3 3 0 0 1 58 28 H 54 V 38 L 66 54 V 162 A 18 18 0 0 1 48 180 H 32 A 18 18 0 0 1 14 162 V 54 L 26 38 V 28 H 22 A 3 3 0 0 1 22 22 Z"
                    fill="#FFFFFF"
                    fillOpacity="0.82"
                  />
                  <g clipPath={`url(#hero-clip-${idx})`}>
                    {layers.map((hex, lIdx) => (
                      <rect
                        key={lIdx}
                        x="12"
                        y={180 - (lIdx + 1) * 32}
                        width="56"
                        height="33"
                        fill={hex}
                      />
                    ))}
                  </g>
                  <path d="M 20 60 V 158" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
                  <path
                    d="M 22 22 H 58 A 3 3 0 0 1 58 28 H 54 V 38 L 66 54 V 162 A 18 18 0 0 1 48 180 H 32 A 18 18 0 0 1 14 162 V 54 L 26 38 V 28 H 22 A 3 3 0 0 1 22 22 Z"
                    fill="none"
                    stroke="#1A1917"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            );
          })}
        </div>

        {/* Bespoke SVG Title Lockup */}
        <div className="flex flex-col items-center gap-3">
          <svg
            viewBox="0 0 280 56"
            className="w-56 sm:w-68 h-auto text-[#1A1917]"
            role="img"
            aria-label="DECANT"
          >
            <text
              x="140"
              y="42"
              textAnchor="middle"
              fill="currentColor"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontSize="44"
              fontWeight="700"
              letterSpacing="0.16em"
            >
              DECANT
            </text>
          </svg>
          <p className="text-sm sm:text-base text-[#5E5A52] max-w-md text-balance leading-relaxed">
            Sort layered pigments into pure bottles across 5,000 mixed easy, medium, hard, and extreme puzzles.
          </p>
        </div>

        {/* Action controls: Practice always accessible before starting */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          {!progress.practiceCompleted ? (
            <>
              <button
                type="button"
                onClick={onStartPractice}
                className="w-full sm:w-auto min-w-48 h-12 px-7 inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#1A1917] text-[#F5F4F0] text-sm font-semibold hover:bg-[#32302C] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Start Practice</span>
              </button>
              <button
                type="button"
                onClick={onOpenLevelSelect}
                className="w-full sm:w-auto h-12 px-5 inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] text-sm font-medium hover:bg-[#ECEAE3] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
              >
                <Layers className="w-4 h-4" aria-hidden="true" />
                <span>Levels</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onStartCampaign}
                className="w-full sm:w-auto min-w-48 h-12 px-7 inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#1A1917] text-[#F5F4F0] text-sm font-semibold hover:bg-[#32302C] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917] tabular-nums"
              >
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>Continue · Level {progress.highestUnlockedLevel}</span>
              </button>
              <button
                type="button"
                onClick={onStartPractice}
                className="w-full sm:w-auto h-12 px-5 inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] text-sm font-medium hover:bg-[#ECEAE3] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
              >
                <span>Practice</span>
              </button>
              <button
                type="button"
                onClick={onOpenLevelSelect}
                className="w-full sm:w-auto h-12 px-5 inline-flex items-center justify-center gap-2 rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] text-sm font-medium hover:bg-[#ECEAE3] active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
              >
                <Layers className="w-4 h-4" aria-hidden="true" />
                <span>Levels</span>
              </button>
            </>
          )}
        </div>
      </section>

      {/* Single flat control-hint line */}
      <footer className="w-full text-center">
        <p className="text-xs text-[#6B675E]">
          Tap or drag bottles to pour · Z Undo · H Hint · Enter to start
        </p>
      </footer>

      {/* iOS install guide modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#FFFFFF] border border-[#DCD9D0] p-6 shadow-xl text-left">
            <h2 className="text-base font-semibold text-[#1A1917]">Install Decant Offline</h2>
            <p className="mt-2 text-sm text-[#5E5A52] leading-relaxed">
              1. Tap the <strong>Share</strong> button in Safari.
              <br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full h-11 rounded-xl bg-[#1A1917] text-[#F5F4F0] text-sm font-medium hover:bg-[#32302C] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
