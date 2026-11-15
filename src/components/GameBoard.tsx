import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Coins, Eye, EyeOff, Lightbulb, Menu, Music, Plus, RotateCcw, Undo2, Volume2, VolumeX } from 'lucide-react';
import { soundEngine } from '../engine/audio';
import { getColorMeta } from '../engine/colors';
import {
  ACTION_COSTS,
  applyMove,
  BOTTLE_CAPACITY,
  canPour,
  computePour,
  hasAnyValidMoves,
  isBottleComplete,
  isLevelSolved,
  solveBoard,
} from '../engine/puzzle';
import type { Bottle, ColorId, Difficulty, LevelConfig, Move } from '../engine/types';
import { BottleView } from './BottleView';

interface GameBoardProps {
  level: LevelConfig;
  coins: number;
  muted: boolean;
  musicEnabled: boolean;
  showSymbols: boolean;
  onSpendCoins: (amount: number) => boolean;
  onToggleMute: () => void;
  onToggleMusic: () => void;
  onToggleSymbols: () => void;
  onPause: () => void;
  onLevelComplete: (movesCount: number) => void;
}

interface PourAnimation {
  fromId: number;
  toId: number;
  color: ColorId;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface DragState {
  sourceId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
  hoverTargetId: number | null;
  color: ColorId;
}

const DIFFICULTY_TEXT: Record<Difficulty, string> = {
  practice: 'Practice',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  extreme: 'Extreme',
};

export const GameBoard: React.FC<GameBoardProps> = ({
  level,
  coins,
  muted,
  musicEnabled,
  showSymbols,
  onSpendCoins,
  onToggleMute,
  onToggleMusic,
  onToggleSymbols,
  onPause,
  onLevelComplete,
}) => {
  const makeInitialBottles = useCallback(
    (cfg: LevelConfig): Bottle[] =>
      cfg.initialBottles.map((layers, idx) => ({
        id: idx,
        layers: [...layers],
        capacity: cfg.capacity,
      })),
    []
  );

  const [bottles, setBottles] = useState<Bottle[]>(() => makeInitialBottles(level));
  const [history, setHistory] = useState<Bottle[][]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [hintMove, setHintMove] = useState<Move | null>(null);
  const [hintStatus, setHintStatus] = useState<string | null>(null);
  const [extraTubeUsed, setExtraTubeUsed] = useState(false);
  const [pourAnim, setPourAnim] = useState<PourAnimation | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [viewport, setViewport] = useState({ w: 1024, h: 768 });

  const arenaRef = useRef<HTMLDivElement | null>(null);
  const bottleRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const wonRef = useRef(false);
  const pourTimerRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const bottlesRef = useRef(bottles);
  bottlesRef.current = bottles;

  // Reset board whenever level object changes
  useEffect(() => {
    setBottles(makeInitialBottles(level));
    setHistory([]);
    setSelectedId(null);
    setHintMove(null);
    setHintStatus(null);
    setExtraTubeUsed(false);
    setPourAnim(null);
    dragRef.current = null;
    setDragState(null);
    wonRef.current = false;
  }, [level, makeInitialBottles]);

  // Track viewport size for responsive bottle dimensions
  useEffect(() => {
    const updateSize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const registerRef = useCallback((bottleId: number, el: HTMLDivElement | null) => {
    if (el) {
      bottleRefs.current.set(bottleId, el);
    } else {
      bottleRefs.current.delete(bottleId);
    }
  }, []);

  const getBottleMouthPos = useCallback((bottleId: number): { x: number; y: number } | null => {
    const arena = arenaRef.current;
    const el = bottleRefs.current.get(bottleId);
    if (!arena || !el) return null;
    const aRect = arena.getBoundingClientRect();
    const bRect = el.getBoundingClientRect();
    return {
      x: bRect.left - aRect.left + bRect.width / 2,
      y: bRect.top - aRect.top + bRect.height * 0.14,
    };
  }, []);

  const executePour = useCallback(
    (fromId: number, toId: number) => {
      if (wonRef.current) return false;
      const currentBottles = bottlesRef.current;
      const from = currentBottles.find((b) => b.id === fromId);
      const to = currentBottles.find((b) => b.id === toId);
      if (!from || !to) return false;

      const move = computePour(from, to);
      if (!move) {
        soundEngine.playInvalid();
        return false;
      }

      const nextBottles = applyMove(currentBottles, move);
      const targetBottleAfter = nextBottles.find((b) => b.id === toId);

      // Compute SVG stream coordinates
      const p1 = getBottleMouthPos(fromId);
      const p2 = getBottleMouthPos(toId);
      if (p1 && p2) {
        if (pourTimerRef.current) window.clearTimeout(pourTimerRef.current);
        setPourAnim({
          fromId,
          toId,
          color: move.color,
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
        });
        pourTimerRef.current = window.setTimeout(() => {
          setPourAnim(null);
        }, 240);
      }

      const nextMoveCount = history.length + 1;
      setHistory((prev) => [...prev, currentBottles]);
      setBottles(nextBottles);
      setSelectedId(null);
      setHintMove(null);
      setHintStatus(null);

      // Tactile audio feedback
      soundEngine.playPour(to.layers.length, move.count);
      if (targetBottleAfter && isBottleComplete(targetBottleAfter)) {
        window.setTimeout(() => soundEngine.playBottleComplete(), 110);
      }

      if (isLevelSolved(nextBottles)) {
        wonRef.current = true;
        window.setTimeout(() => {
          soundEngine.playVictory();
          onLevelComplete(nextMoveCount);
        }, 340);
      }

      return true;
    },
    [getBottleMouthPos, history.length, onLevelComplete]
  );

  const isPractice = level.difficulty === 'practice';
  const undoCost = isPractice ? 0 : ACTION_COSTS.undo;
  const hintCost = isPractice ? 0 : ACTION_COSTS.hint;
  const tubeCost = ACTION_COSTS.addTube;

  const handleUndo = useCallback(() => {
    if (history.length === 0 || wonRef.current) return;
    if (undoCost > 0 && !onSpendCoins(undoCost)) {
      setHintStatus(`Need ${undoCost} coins to Undo — win levels to earn more.`);
      soundEngine.playInvalid();
      return;
    }
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setBottles(prev);
    setSelectedId(null);
    setHintMove(null);
    setHintStatus(null);
    soundEngine.playUndo();
  }, [history, onSpendCoins, undoCost]);

  const handleRestart = useCallback(() => {
    if (wonRef.current) return;
    setBottles(makeInitialBottles(level));
    setHistory([]);
    setSelectedId(null);
    setHintMove(null);
    setHintStatus(null);
    setExtraTubeUsed(false);
    setPourAnim(null);
    soundEngine.playUndo();
  }, [level, makeInitialBottles]);

  const handleHint = useCallback(() => {
    if (wonRef.current) return;
    if (hintCost > 0 && coins < hintCost) {
      setHintStatus(`Need ${hintCost} coins for Hint — win levels to earn more.`);
      soundEngine.playInvalid();
      return;
    }
    const solution = solveBoard(bottles, 9000);
    if (solution && solution.length > 0) {
      if (hintCost > 0 && !onSpendCoins(hintCost)) {
        setHintStatus(`Need ${hintCost} coins for Hint.`);
        soundEngine.playInvalid();
        return;
      }
      setHintMove(solution[0]);
      setHintStatus(null);
      setSelectedId(solution[0].from);
      soundEngine.playSelect();
    } else {
      setHintMove(null);
      setHintStatus('Dead end reached — try Undo or + Tube.');
      soundEngine.playInvalid();
    }
  }, [bottles, coins, hintCost, onSpendCoins]);

  const handleAddExtraTube = useCallback(() => {
    if (extraTubeUsed || isPractice || wonRef.current) return;
    if (!onSpendCoins(tubeCost)) {
      setHintStatus(`Need ${tubeCost} coins for + Tube — win levels to earn more.`);
      soundEngine.playInvalid();
      return;
    }
    setExtraTubeUsed(true);
    setBottles((prev) => [
      ...prev,
      {
        id: prev.length,
        layers: [],
        capacity: BOTTLE_CAPACITY,
      },
    ]);
    setHintStatus(null);
    soundEngine.playSelect();
  }, [extraTubeUsed, isPractice, onSpendCoins, tubeCost]);

  const handleTapBottle = useCallback(
    (bottleId: number) => {
      if (wonRef.current) return;
      const currentBottles = bottlesRef.current;
      const tapped = currentBottles.find((b) => b.id === bottleId);
      if (!tapped) return;

      if (selectedId === null) {
        if (tapped.layers.length === 0 || isBottleComplete(tapped)) {
          soundEngine.playInvalid();
          return;
        }
        setSelectedId(bottleId);
        soundEngine.playSelect();
        return;
      }

      if (selectedId === bottleId) {
        setSelectedId(null);
        soundEngine.playDeselect();
        return;
      }

      const selected = currentBottles.find((b) => b.id === selectedId);
      if (selected && canPour(selected, tapped)) {
        executePour(selectedId, bottleId);
      } else if (tapped.layers.length > 0 && !isBottleComplete(tapped)) {
        // Intuitive switch selection when tapping a different source bottle
        setSelectedId(bottleId);
        soundEngine.playSelect();
      } else {
        setSelectedId(null);
        soundEngine.playInvalid();
      }
    },
    [executePour, selectedId]
  );

  const handleTapRef = useRef(handleTapBottle);
  handleTapRef.current = handleTapBottle;
  const executePourRef = useRef(executePour);
  executePourRef.current = executePour;

  const isPointerActive = dragState !== null;

  // Dual Touch + Pointer Drag-to-Pour handlers
  const handleBottlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, bottleId: number) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (wonRef.current) return;

      const bottle = bottlesRef.current.find((b) => b.id === bottleId);
      if (!bottle) return;

      const canStartDrag = bottle.layers.length > 0 && !isBottleComplete(bottle);
      const topColor = canStartDrag ? bottle.layers[bottle.layers.length - 1] : 0;

      const initial: DragState = {
        sourceId: bottleId,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        isDragging: false,
        hoverTargetId: null,
        color: topColor,
      };
      dragRef.current = initial;
      setDragState(initial);
    },
    []
  );

  useEffect(() => {
    if (!isPointerActive) return;

    const handleMove = (e: PointerEvent) => {
      const prev = dragRef.current;
      if (!prev) return;

      const dx = e.clientX - prev.startX;
      const dy = e.clientY - prev.startY;
      const dist = Math.hypot(dx, dy);

      const currentBottles = bottlesRef.current;
      const sourceBottle = currentBottles.find((b) => b.id === prev.sourceId);
      const canDragSource = Boolean(
        sourceBottle && sourceBottle.layers.length > 0 && !isBottleComplete(sourceBottle)
      );

      if (!prev.isDragging && dist > 12 && canDragSource) {
        setSelectedId(prev.sourceId);
        soundEngine.playSelect();
      }

      const nextDragging = prev.isDragging || (dist > 12 && canDragSource);

      let hoverTargetId: number | null = null;
      if (nextDragging && sourceBottle) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const bottleEl = el?.closest('[data-bottle-id]') as HTMLElement | null;
        if (bottleEl) {
          const candidateId = Number(bottleEl.dataset.bottleId);
          if (!Number.isNaN(candidateId) && candidateId !== prev.sourceId) {
            const targetBottle = currentBottles.find((b) => b.id === candidateId);
            if (targetBottle && canPour(sourceBottle, targetBottle)) {
              hoverTargetId = candidateId;
            }
          }
        }
      }

      const next: DragState = {
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
        isDragging: nextDragging,
        hoverTargetId,
      };
      dragRef.current = next;
      setDragState(next);
    };

    const handleUp = () => {
      const current = dragRef.current;
      dragRef.current = null;
      setDragState(null);

      if (!current) return;
      if (current.isDragging) {
        if (current.hoverTargetId !== null) {
          executePourRef.current(current.sourceId, current.hoverTargetId);
        } else {
          setSelectedId(null);
        }
      } else {
        handleTapRef.current(current.sourceId);
      }
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [isPointerActive]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onPause();
      } else if (e.key === 'z' || e.key === 'Z' || e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRestart();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handleHint();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onToggleMute();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleHint, handleRestart, handleUndo, onPause, onToggleMute]);

  // Practice guided coaching step
  const practiceCoach = useMemo(() => {
    if (level.difficulty !== 'practice') return null;
    if (isLevelSolved(bottles)) return null;
    const solution = solveBoard(bottles, 500);
    const nextMove = solution?.[0] ?? null;

    let message = 'Tap or drag matching top layers into a bottle with space.';
    if (history.length === 0) {
      message = 'Tap or drag the first bottle into the empty bottle to pour Coral.';
    } else if (history.length === 1) {
      message = 'Now pour the matching Cobalt blue liquid into the first bottle.';
    } else if (history.length >= 2) {
      message = 'Finish sorting the remaining Coral liquid to complete practice.';
    }

    return { message, nextMove };
  }, [bottles, history.length, level.difficulty]);

  const noMovesLeft = useMemo(() => {
    if (isLevelSolved(bottles)) return false;
    return !hasAnyValidMoves(bottles);
  }, [bottles]);

  // Balanced 1-row or 2-row bottle layout + responsive bottle size
  const { rows, bottleW, bottleH } = useMemo(() => {
    const count = bottles.length;
    const useTwoRows = count > 6 || (viewport.w < 540 && count > 4);
    const firstRowCount = useTwoRows ? Math.ceil(count / 2) : count;
    const row1 = bottles.slice(0, firstRowCount);
    const row2 = useTwoRows ? bottles.slice(firstRowCount) : [];

    const maxCols = Math.max(row1.length, row2.length);
    const availW = Math.min(viewport.w - 32, 960);
    const availH = viewport.h - 210; // reserve top HUD + bottom actions

    const gap = viewport.w < 640 ? 12 : 20;
    const wByWidth = Math.floor((availW - gap * (maxCols - 1)) / maxCols);
    const rowCount = useTwoRows ? 2 : 1;
    const hByHeight = Math.floor((availH - (rowCount === 2 ? 28 : 0)) / rowCount);
    const wByHeight = Math.floor(hByHeight / 2.45);

    const finalW = Math.max(46, Math.min(82, wByWidth, wByHeight));
    const finalH = Math.round(finalW * 2.45);

    return {
      rows: row2.length > 0 ? [row1, row2] : [row1],
      bottleW: finalW,
      bottleH: finalH,
    };
  }, [bottles, viewport.h, viewport.w]);

  const activeSelectedBottle =
    selectedId !== null ? bottles.find((b) => b.id === selectedId) ?? null : null;

  // Drag line coordinates relative to arena
  const dragOverlay = useMemo(() => {
    if (!dragState || !dragState.isDragging || !arenaRef.current) return null;
    const aRect = arenaRef.current.getBoundingClientRect();
    const startPos = getBottleMouthPos(dragState.sourceId);
    if (!startPos) return null;

    let endX = dragState.currentX - aRect.left;
    let endY = dragState.currentY - aRect.top;

    if (dragState.hoverTargetId !== null) {
      const targetPos = getBottleMouthPos(dragState.hoverTargetId);
      if (targetPos) {
        endX = targetPos.x;
        endY = targetPos.y;
      }
    }

    return {
      x1: startPos.x,
      y1: startPos.y,
      x2: endX,
      y2: endY,
      color: getColorMeta(dragState.color).hex,
      snapped: dragState.hoverTargetId !== null,
    };
  }, [dragState, getBottleMouthPos]);

  return (
    <div className="relative h-dvh w-full flex flex-col justify-between bg-[#F5F4F0] text-[#1A1917] overflow-hidden">
      {/* Top Minimal HUD */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onPause}
            aria-label="Pause and menu"
            className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] hover:bg-[#ECEAE3] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
          >
            <Menu className="w-4 h-4" aria-hidden="true" />
          </button>

          <div className="flex items-baseline gap-2 truncate">
            <span className="text-base font-semibold tracking-tight text-[#1A1917] whitespace-nowrap">
              {level.difficulty === 'practice'
                ? 'Practice'
                : level.levelNumber > 0
                  ? `Level ${String(level.levelNumber).padStart(2, '0')}`
                  : 'Quick Play'}
            </span>
            {level.difficulty !== 'practice' && (
              <>
                <span className="text-[#9A958B]" aria-hidden="true">·</span>
                <span className="text-xs font-medium text-[#5E5A52] whitespace-nowrap">
                  {DIFFICULTY_TEXT[level.difficulty]}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="px-2.5 h-11 inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1917] tabular-nums"
            aria-label={`Coins: ${coins}`}
          >
            <Coins className="w-4 h-4 text-[#C98A14]" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold">{coins}</span>
          </div>

          <div className="hidden sm:inline-flex px-2.5 h-11 items-center gap-1.5 text-xs font-medium text-[#5E5A52] tabular-nums">
            <span>Moves</span>
            <span className="font-mono text-sm font-semibold text-[#1A1917]">{history.length}</span>
          </div>

          <button
            type="button"
            onClick={onToggleSymbols}
            aria-label={showSymbols ? 'Hide colorblind symbols' : 'Show colorblind symbols'}
            title={showSymbols ? 'Hide symbols' : 'Show accessibility symbols'}
            className={`h-11 w-11 inline-flex items-center justify-center rounded-xl border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917] ${
              showSymbols
                ? 'border-[#1A1917] bg-[#1A1917] text-[#F5F4F0]'
                : 'border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] hover:bg-[#ECEAE3]'
            }`}
          >
            {showSymbols ? <Eye className="w-4 h-4" aria-hidden="true" /> : <EyeOff className="w-4 h-4" aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={onToggleMusic}
            aria-label={musicEnabled ? 'Turn music off' : 'Turn music on'}
            title={musicEnabled ? 'Music On' : 'Music Off'}
            className={`h-11 w-11 inline-flex items-center justify-center rounded-xl border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917] ${
              musicEnabled && !muted
                ? 'border-[#1A1917] bg-[#1A1917] text-[#F5F4F0]'
                : 'border-[#D4D0C5] bg-[#FFFFFF] text-[#6B675E] hover:bg-[#ECEAE3]'
            }`}
          >
            <Music className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] hover:bg-[#ECEAE3] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1917]"
          >
            {muted ? <VolumeX className="w-4 h-4 text-[#6B675E]" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </header>

      {/* Practice Coach Line or Solver Notice (single calm line, zero occlusion) */}
      <div className="h-7 flex items-center justify-center px-4 shrink-0">
        {practiceCoach ? (
          <p className="text-xs sm:text-sm font-medium text-[#4A4740] text-center truncate">
            {practiceCoach.message}
          </p>
        ) : noMovesLeft ? (
          <p className="text-xs sm:text-sm font-medium text-[#B84232] text-center truncate">
            No valid moves left — Undo, Restart, or add + Tube.
          </p>
        ) : hintStatus ? (
          <p className="text-xs sm:text-sm font-medium text-[#B84232] text-center truncate">
            {hintStatus}
          </p>
        ) : null}
      </div>

      {/* Main Unobstructed Playfield */}
      <main
        ref={arenaRef}
        className="relative flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center gap-6 sm:gap-9 px-4 touch-none"
      >
        {rows.map((rowBottles, rIdx) => (
          <div key={rIdx} className="flex items-end justify-center gap-3 sm:gap-5">
            {rowBottles.map((bottle) => {
              const isSelected = selectedId === bottle.id;
              const isValidTarget =
                activeSelectedBottle !== null &&
                activeSelectedBottle.id !== bottle.id &&
                canPour(activeSelectedBottle, bottle);
              const isDimmed =
                activeSelectedBottle !== null &&
                activeSelectedBottle.id !== bottle.id &&
                !isValidTarget &&
                !dragState?.isDragging;

              const isDragHoverTarget = dragState?.hoverTargetId === bottle.id;

              const activeHint = hintMove ?? (practiceCoach?.nextMove && selectedId === null ? practiceCoach.nextMove : null);
              const isHintSource = activeHint?.from === bottle.id;
              const isHintTarget =
                (hintMove?.to === bottle.id) ||
                (practiceCoach?.nextMove?.to === bottle.id && selectedId === practiceCoach.nextMove.from);

              return (
                <BottleView
                  key={bottle.id}
                  bottle={bottle}
                  isSelected={isSelected}
                  isValidTarget={isValidTarget}
                  isDimmed={isDimmed}
                  isDragHoverTarget={isDragHoverTarget}
                  isHintSource={isHintSource}
                  isHintTarget={isHintTarget}
                  isPouringSource={pourAnim?.fromId === bottle.id}
                  isPouringTarget={pourAnim?.toId === bottle.id}
                  showSymbols={showSymbols}
                  widthPx={bottleW}
                  heightPx={bottleH}
                  onPointerDown={handleBottlePointerDown}
                  onKeySelect={handleTapBottle}
                  registerRef={registerRef}
                />
              );
            })}
          </div>
        ))}

        {/* Pouring Stream SVG Overlay */}
        {pourAnim && (
          <svg
            className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <path
              d={`M ${pourAnim.x1} ${pourAnim.y1} Q ${(pourAnim.x1 + pourAnim.x2) / 2} ${
                Math.min(pourAnim.y1, pourAnim.y2) - 42
              } ${pourAnim.x2} ${pourAnim.y2}`}
              fill="none"
              stroke={getColorMeta(pourAnim.color).hex}
              strokeWidth="7"
              strokeLinecap="round"
              className="animate-pour-stream"
            />
          </svg>
        )}

        {/* Interactive Drag-to-Pour Guide SVG Overlay */}
        {dragOverlay && (
          <svg
            className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <path
              d={`M ${dragOverlay.x1} ${dragOverlay.y1} Q ${(dragOverlay.x1 + dragOverlay.x2) / 2} ${
                Math.min(dragOverlay.y1, dragOverlay.y2) - 36
              } ${dragOverlay.x2} ${dragOverlay.y2}`}
              fill="none"
              stroke={dragOverlay.color}
              strokeWidth={dragOverlay.snapped ? '5' : '3'}
              strokeDasharray={dragOverlay.snapped ? undefined : '6 6'}
              strokeLinecap="round"
              opacity={dragOverlay.snapped ? 0.9 : 0.65}
            />
            <circle
              cx={dragOverlay.x2}
              cy={dragOverlay.y2}
              r={dragOverlay.snapped ? 8 : 6}
              fill={dragOverlay.color}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          </svg>
        )}
      </main>

      {/* Bottom Minimal Action Bar (>= 44px touch targets with coin costs) */}
      <footer className="w-full max-w-md mx-auto px-4 pb-5 pt-2 shrink-0">
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className={`flex-1 h-14 px-2.5 flex flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
              history.length === 0
                ? 'border-[#E2DFD7] bg-[#ECEAE3]/60 text-[#A8A297] cursor-not-allowed'
                : undoCost > 0 && coins < undoCost
                  ? 'border-[#E2DFD7] bg-[#FFFFFF]/80 text-[#8A857C] cursor-pointer hover:bg-[#ECEAE3]'
                  : 'border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] hover:bg-[#ECEAE3] cursor-pointer active:scale-[0.98]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Undo</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-[#6B675E]">
              {undoCost === 0 ? (
                'Free'
              ) : (
                <>
                  <Coins className="w-3 h-3 text-[#C98A14]" aria-hidden="true" />
                  <span>{undoCost}</span>
                </>
              )}
            </span>
          </button>

          <button
            type="button"
            onClick={handleHint}
            className={`flex-1 h-14 px-2.5 flex flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] ${
              hintCost > 0 && coins < hintCost
                ? 'border-[#E2DFD7] bg-[#FFFFFF]/80 text-[#8A857C] hover:bg-[#ECEAE3]'
                : 'border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] hover:bg-[#ECEAE3]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hint</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-[#6B675E]">
              {hintCost === 0 ? (
                'Free'
              ) : (
                <>
                  <Coins className="w-3 h-3 text-[#C98A14]" aria-hidden="true" />
                  <span>{hintCost}</span>
                </>
              )}
            </span>
          </button>

          {!isPractice && (
            <button
              type="button"
              onClick={handleAddExtraTube}
              disabled={extraTubeUsed}
              className={`flex-1 h-14 px-2.5 flex flex-col items-center justify-center gap-0.5 rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                extraTubeUsed
                  ? 'border-[#E2DFD7] bg-[#ECEAE3]/60 text-[#A8A297] cursor-not-allowed'
                  : coins < tubeCost
                    ? 'border-[#E2DFD7] bg-[#FFFFFF]/80 text-[#8A857C] cursor-pointer hover:bg-[#ECEAE3]'
                    : 'border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] hover:bg-[#ECEAE3] cursor-pointer active:scale-[0.98]'
              }`}
            >
              <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium">
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tube</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono tabular-nums text-[#6B675E]">
                {extraTubeUsed ? (
                  'Used'
                ) : (
                  <>
                    <Coins className="w-3 h-3 text-[#C98A14]" aria-hidden="true" />
                    <span>{tubeCost}</span>
                  </>
                )}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRestart}
            className="flex-1 h-14 px-2.5 flex flex-col items-center justify-center gap-0.5 rounded-xl border border-[#D4D0C5] bg-[#FFFFFF] text-[#1A1917] hover:bg-[#ECEAE3] transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
          >
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Restart</span>
            </span>
            <span className="text-[11px] font-mono text-[#6B675E]">Free</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
