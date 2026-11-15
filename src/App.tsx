import { useCallback, useEffect, useRef, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { LevelSelectModal } from './components/LevelSelectModal';
import { PauseModal, VictoryModal } from './components/Overlays';
import { TitleScreen } from './components/TitleScreen';
import { soundEngine } from './engine/audio';
import {
  generateLevel,
  getDifficultyForCampaignLevel,
  getPracticeLevel,
  LEVEL_REWARD_COINS,
  MAX_CAMPAIGN_LEVEL,
} from './engine/puzzle';
import { loadProgress, saveProgress } from './engine/storage';
import type { Difficulty, GameScreen, LevelConfig, SavedProgress } from './engine/types';

export default function App() {
  const [progress, setProgress] = useState<SavedProgress>(() => {
    const loaded = loadProgress();
    soundEngine.setMuted(loaded.muted);
    soundEngine.setMusicEnabled(loaded.musicEnabled);
    return loaded;
  });
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const [screen, setScreen] = useState<GameScreen>('TITLE');
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<LevelConfig>(() => getPracticeLevel());
  const [lastMovesCount, setLastMovesCount] = useState(0);
  const [lastEarnedCoins, setLastEarnedCoins] = useState(0);
  const [customCounter, setCustomCounter] = useState(1);

  // Unlock Web Audio and start ambient music on the player's first interaction
  useEffect(() => {
    const unlock = () => {
      soundEngine.unlockAndStartMusic();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const updateProgress = useCallback((updater: (prev: SavedProgress) => SavedProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      saveProgress(next);
      return next;
    });
  }, []);

  const handleSpendCoins = useCallback((amount: number): boolean => {
    if (amount <= 0) return true;
    if (progressRef.current.coins < amount) return false;
    progressRef.current = {
      ...progressRef.current,
      coins: progressRef.current.coins - amount,
    };
    setProgress((prev) => {
      const next = { ...prev, coins: Math.max(0, prev.coins - amount) };
      saveProgress(next);
      return next;
    });
    return true;
  }, []);

  const handleToggleMute = useCallback(() => {
    updateProgress((prev) => {
      const nextMuted = !prev.muted;
      soundEngine.setMuted(nextMuted);
      return { ...prev, muted: nextMuted };
    });
  }, [updateProgress]);

  const handleToggleMusic = useCallback(() => {
    updateProgress((prev) => {
      const nextMusic = !prev.musicEnabled;
      soundEngine.setMusicEnabled(nextMusic);
      if (nextMusic && !prev.muted) {
        soundEngine.unlockAndStartMusic();
      }
      return { ...prev, musicEnabled: nextMusic };
    });
  }, [updateProgress]);

  const handleToggleSymbols = useCallback(() => {
    updateProgress((prev) => ({
      ...prev,
      showSymbols: !prev.showSymbols,
    }));
  }, [updateProgress]);

  const startPractice = useCallback(() => {
    setCurrentLevel(getPracticeLevel());
    setShowLevelSelect(false);
    setScreen('PLAYING');
  }, []);

  const startCampaignLevel = useCallback((levelNum: number) => {
    const clamped = Math.max(1, Math.min(MAX_CAMPAIGN_LEVEL, levelNum));
    setCurrentLevel(generateLevel(clamped));
    setShowLevelSelect(false);
    setScreen('PLAYING');
  }, []);

  const startCustomDifficulty = useCallback(
    (difficulty: Exclude<Difficulty, 'practice'>) => {
      const seedIndex = 6000 + customCounter * 7;
      setCustomCounter((c) => c + 1);
      const generated = generateLevel(seedIndex, difficulty);
      setCurrentLevel({ ...generated, levelNumber: -seedIndex });
      setShowLevelSelect(false);
      setScreen('PLAYING');
    },
    [customCounter]
  );

  const handleLevelComplete = useCallback(
    (movesCount: number) => {
      const reward = LEVEL_REWARD_COINS[currentLevel.difficulty];
      setLastMovesCount(movesCount);
      setLastEarnedCoins(reward);

      if (currentLevel.difficulty === 'practice') {
        updateProgress((prev) => ({
          ...prev,
          practiceCompleted: true,
        }));
      } else if (currentLevel.levelNumber > 0) {
        updateProgress((prev) => {
          const existing = prev.completedLevels[currentLevel.levelNumber];
          const bestMoves = existing ? Math.min(existing.bestMoves, movesCount) : movesCount;
          const nextUnlocked = Math.min(
            MAX_CAMPAIGN_LEVEL,
            Math.max(prev.highestUnlockedLevel, currentLevel.levelNumber + 1)
          );
          return {
            ...prev,
            coins: prev.coins + reward,
            highestUnlockedLevel: nextUnlocked,
            completedLevels: {
              ...prev.completedLevels,
              [currentLevel.levelNumber]: { bestMoves },
            },
          };
        });
      } else {
        updateProgress((prev) => ({
          ...prev,
          coins: prev.coins + reward,
        }));
      }

      setScreen('VICTORY');
    },
    [currentLevel, updateProgress]
  );

  const handleNextAfterVictory = useCallback(() => {
    if (currentLevel.difficulty === 'practice') {
      startCampaignLevel(1);
    } else if (currentLevel.levelNumber > 0 && currentLevel.levelNumber < MAX_CAMPAIGN_LEVEL) {
      startCampaignLevel(currentLevel.levelNumber + 1);
    } else if (currentLevel.levelNumber >= MAX_CAMPAIGN_LEVEL) {
      setShowLevelSelect(true);
    } else {
      startCustomDifficulty(currentLevel.difficulty);
    }
  }, [currentLevel, startCampaignLevel, startCustomDifficulty]);

  const handleReplay = useCallback(() => {
    setCurrentLevel((prev) => ({
      ...prev,
      initialBottles: prev.initialBottles.map((row) => [...row]),
    }));
    setScreen('PLAYING');
  }, []);

  // Keyboard Enter/Space on Title or Victory screen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showLevelSelect) {
        if (e.key === 'Escape') setShowLevelSelect(false);
        return;
      }
      if (screen === 'TITLE' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (!progress.practiceCompleted) {
          startPractice();
        } else {
          startCampaignLevel(progress.highestUnlockedLevel);
        }
      } else if (screen === 'VICTORY' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleNextAfterVictory();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    handleNextAfterVictory,
    progress.highestUnlockedLevel,
    progress.practiceCompleted,
    screen,
    showLevelSelect,
    startCampaignLevel,
    startPractice,
  ]);

  const bestForCurrent =
    currentLevel.levelNumber > 0
      ? progress.completedLevels[currentLevel.levelNumber]?.bestMoves
      : undefined;

  const nextCampaignDifficulty =
    currentLevel.levelNumber > 0 && currentLevel.levelNumber < MAX_CAMPAIGN_LEVEL
      ? getDifficultyForCampaignLevel(currentLevel.levelNumber + 1)
      : undefined;

  return (
    <>
      {screen === 'TITLE' ? (
        <TitleScreen
          progress={progress}
          onStartPractice={startPractice}
          onStartCampaign={() => startCampaignLevel(progress.highestUnlockedLevel)}
          onOpenLevelSelect={() => setShowLevelSelect(true)}
          onToggleMute={handleToggleMute}
          onToggleMusic={handleToggleMusic}
        />
      ) : (
        <GameBoard
          level={currentLevel}
          coins={progress.coins}
          muted={progress.muted}
          musicEnabled={progress.musicEnabled}
          showSymbols={progress.showSymbols}
          onSpendCoins={handleSpendCoins}
          onToggleMute={handleToggleMute}
          onToggleMusic={handleToggleMusic}
          onToggleSymbols={handleToggleSymbols}
          onPause={() => setScreen((s) => (s === 'PAUSED' ? 'PLAYING' : 'PAUSED'))}
          onLevelComplete={handleLevelComplete}
        />
      )}

      {screen === 'PAUSED' && (
        <PauseModal
          level={currentLevel}
          onResume={() => setScreen('PLAYING')}
          onRestart={handleReplay}
          onPractice={startPractice}
          onOpenLevels={() => setShowLevelSelect(true)}
          onQuitToTitle={() => setScreen('TITLE')}
        />
      )}

      {screen === 'VICTORY' && (
        <VictoryModal
          level={currentLevel}
          movesCount={lastMovesCount}
          bestMoves={bestForCurrent}
          earnedCoins={lastEarnedCoins}
          totalCoins={progress.coins}
          nextDifficulty={nextCampaignDifficulty}
          onNext={handleNextAfterVictory}
          onReplay={handleReplay}
          onOpenLevels={() => setShowLevelSelect(true)}
        />
      )}

      {showLevelSelect && (
        <LevelSelectModal
          progress={progress}
          onSelectPractice={startPractice}
          onSelectCampaignLevel={startCampaignLevel}
          onSelectCustomDifficulty={startCustomDifficulty}
          onClose={() => setShowLevelSelect(false)}
        />
      )}
    </>
  );
}
