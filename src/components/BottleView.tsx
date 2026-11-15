import React from 'react';
import { getColorMeta } from '../engine/colors';
import { isBottleComplete } from '../engine/puzzle';
import type { Bottle } from '../engine/types';
import { LayerSymbol } from './LayerSymbol';

interface BottleViewProps {
  bottle: Bottle;
  isSelected: boolean;
  isValidTarget: boolean;
  isDimmed: boolean;
  isDragHoverTarget: boolean;
  isHintSource: boolean;
  isHintTarget: boolean;
  isPouringSource: boolean;
  isPouringTarget: boolean;
  showSymbols: boolean;
  widthPx: number;
  heightPx: number;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>, bottleId: number) => void;
  onKeySelect?: (bottleId: number) => void;
  registerRef: (bottleId: number, el: HTMLDivElement | null) => void;
}

export const BottleView: React.FC<BottleViewProps> = ({
  bottle,
  isSelected,
  isValidTarget,
  isDimmed,
  isDragHoverTarget,
  isHintSource,
  isHintTarget,
  isPouringSource,
  isPouringTarget,
  showSymbols,
  widthPx,
  heightPx,
  onPointerDown,
  onKeySelect,
  registerRef,
}) => {
  const complete = isBottleComplete(bottle);
  const clipId = `bottle-clip-${bottle.id}`;

  // SVG coordinate space: 80 x 196
  // Inner liquid chamber: x=14..66 (w=52), y=52..180 (h=128) => 4 slots of 32px each
  const slotHeight = 32;
  const chamberBottom = 180;

  let transformStyle = 'translateY(0px) scale(1)';
  if (isSelected) {
    transformStyle = 'translateY(-14px) scale(1.03)';
  } else if (isDragHoverTarget) {
    transformStyle = 'translateY(-8px) scale(1.04)';
  } else if (isPouringSource) {
    transformStyle = 'translateY(-12px) rotate(-6deg)';
  } else if (isPouringTarget) {
    transformStyle = 'scale(1.02)';
  }

  return (
    <div
      ref={(el) => registerRef(bottle.id, el)}
      data-bottle-id={bottle.id}
      role="button"
      tabIndex={0}
      aria-label={`Bottle ${bottle.id + 1}, ${
        bottle.layers.length === 0
          ? 'empty'
          : complete
            ? `completed ${getColorMeta(bottle.layers[0]).name}`
            : `${bottle.layers.length} of ${bottle.capacity} filled`
      }`}
      onPointerDown={(e) => onPointerDown(e, bottle.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onKeySelect?.(bottle.id);
        }
      }}
      style={{
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        transform: transformStyle,
      }}
      className={`relative flex items-center justify-center cursor-pointer select-none touch-none outline-none rounded-2xl transition-transform duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[#1A1917] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F5F4F0] ${
        isDimmed ? 'opacity-45' : 'opacity-100'
      }`}
    >
      {/* Hint indicator arrow above bottle */}
      {(isHintSource || isHintTarget) && (
        <div
          className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center animate-hint-arrow"
          aria-hidden="true"
        >
          <span className="text-[11px] font-semibold tracking-tight text-[#1A1917] bg-[#FFFFFF] border border-[#D8D5CC] px-1.5 py-0.5 rounded">
            {isHintSource ? 'Pour' : 'Here'}
          </span>
        </div>
      )}

      <svg
        viewBox="0 0 80 196"
        className="w-full h-full overflow-visible pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId}>
            <path d="M 14 54 L 24 38 H 56 L 66 54 V 162 A 18 18 0 0 1 48 180 H 32 A 18 18 0 0 1 14 162 Z" />
          </clipPath>
        </defs>

        {/* Ground shadow */}
        <ellipse
          cx="40"
          cy="190"
          rx={isSelected ? 18 : 22}
          ry="4"
          fill="#1A1917"
          opacity={isSelected ? 0.08 : 0.12}
        />

        {/* Target rim glow when valid pour target */}
        {(isValidTarget || isDragHoverTarget) && (
          <ellipse
            cx="40"
            cy="22"
            rx="17"
            ry="5"
            fill="none"
            stroke={isDragHoverTarget ? '#1A1917' : '#57534E'}
            strokeWidth={isDragHoverTarget ? '2.5' : '1.75'}
            strokeDasharray={isDragHoverTarget ? undefined : '4 3'}
            opacity={isDragHoverTarget ? 0.9 : 0.65}
          />
        )}

        {/* Glass interior background */}
        <path
          d="M 22 22 H 58 A 3 3 0 0 1 58 28 H 54 V 38 L 66 54 V 162 A 18 18 0 0 1 48 180 H 32 A 18 18 0 0 1 14 162 V 54 L 26 38 V 28 H 22 A 3 3 0 0 1 22 22 Z"
          fill="#FFFFFF"
          fillOpacity={0.78}
        />

        {/* Liquid layers clipped inside bottle chamber */}
        <g clipPath={`url(#${clipId})`}>
          {bottle.layers.map((colorId, idx) => {
            const meta = getColorMeta(colorId);
            const yTop = chamberBottom - (idx + 1) * slotHeight;
            const isTopLayer = idx === bottle.layers.length - 1;
            const cy = yTop + slotHeight / 2;

            return (
              <g key={`${idx}-${colorId}`}>
                {/* Main pigment body (+1px overlap downward to prevent hairline gaps) */}
                <rect
                  x="12"
                  y={yTop}
                  width="56"
                  height={slotHeight + 1}
                  fill={meta.hex}
                />
                {/* Crisp top meniscus edge on exposed surface */}
                {isTopLayer && (
                  <rect
                    x="12"
                    y={yTop}
                    width="56"
                    height="3.5"
                    fill={meta.highlight}
                    opacity={0.85}
                  />
                )}
                {/* Subtle layer divider between different colors */}
                {idx > 0 && bottle.layers[idx - 1] !== colorId && (
                  <line
                    x1="14"
                    y1={yTop + slotHeight}
                    x2="66"
                    y2={yTop + slotHeight}
                    stroke="#1A1917"
                    strokeOpacity={0.1}
                    strokeWidth="1"
                  />
                )}
                {/* Accessibility symbol when enabled */}
                {showSymbols && (
                  <LayerSymbol
                    symbol={meta.symbol}
                    cx={40}
                    cy={cy}
                    color={meta.inkOnColor}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Left glass specular highlight */}
        <path
          d="M 20 60 V 158"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Outer crisp glass outline */}
        <path
          d="M 22 22 H 58 A 3 3 0 0 1 58 28 H 54 V 38 L 66 54 V 162 A 18 18 0 0 1 48 180 H 32 A 18 18 0 0 1 14 162 V 54 L 26 38 V 28 H 22 A 3 3 0 0 1 22 22 Z"
          fill="none"
          stroke={isSelected || isDragHoverTarget ? '#1A1917' : '#2C2A26'}
          strokeWidth={isSelected || isDragHoverTarget ? '2.2' : '1.6'}
          strokeLinejoin="round"
        />

        {/* Minimalist cork/glass stopper when bottle is completed (4 matching units) */}
        {complete && (
          <g className="animate-stopper">
            <path
              d="M 28 12 H 52 L 50 24 H 30 Z"
              fill="#D6CFC2"
              stroke="#1A1917"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <line x1="34" y1="16" x2="46" y2="16" stroke="#1A1917" strokeOpacity="0.25" strokeWidth="1.2" />
          </g>
        )}
      </svg>
    </div>
  );
};
