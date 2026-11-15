import React from 'react';
import type { ColorPaletteItem } from '../engine/types';

interface LayerSymbolProps {
  symbol: ColorPaletteItem['symbol'];
  cx: number;
  cy: number;
  color: string;
}

export const LayerSymbol: React.FC<LayerSymbolProps> = ({ symbol, cx, cy, color }) => {
  const common = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
    opacity: 0.9,
  };

  switch (symbol) {
    case 'circle':
      return <circle cx={cx} cy={cy} r={5.5} {...common} />;
    case 'triangle':
      return <polygon points={`${cx},${cy - 6} ${cx + 6},${cy + 5} ${cx - 6},${cy + 5}`} {...common} />;
    case 'square':
      return <rect x={cx - 5} y={cy - 5} width={10} height={10} rx={1.5} {...common} />;
    case 'diamond':
      return <polygon points={`${cx},${cy - 6.5} ${cx + 6.5},${cy} ${cx},${cy + 6.5} ${cx - 6.5},${cy}`} {...common} />;
    case 'cross':
      return (
        <g {...common}>
          <line x1={cx - 5} y1={cy - 5} x2={cx + 5} y2={cy + 5} />
          <line x1={cx + 5} y1={cy - 5} x2={cx - 5} y2={cy + 5} />
        </g>
      );
    case 'ring':
      return (
        <g {...common}>
          <circle cx={cx} cy={cy} r={6} />
          <circle cx={cx} cy={cy} r={2} fill={color} stroke="none" />
        </g>
      );
    case 'wave':
      return (
        <path
          d={`M ${cx - 7} ${cy} Q ${cx - 3.5} ${cy - 5}, ${cx} ${cy} T ${cx + 7} ${cy}`}
          {...common}
        />
      );
    case 'star':
      return (
        <g {...common}>
          <line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} />
          <line x1={cx - 5.5} y1={cy - 3} x2={cx + 5.5} y2={cy + 3} />
          <line x1={cx + 5.5} y1={cy - 3} x2={cx - 5.5} y2={cy + 3} />
        </g>
      );
    case 'hex':
      return (
        <polygon
          points={`${cx},${cy - 6} ${cx + 5.5},${cy - 3} ${cx + 5.5},${cy + 3} ${cx},${cy + 6} ${cx - 5.5},${cy + 3} ${cx - 5.5},${cy - 3}`}
          {...common}
        />
      );
    case 'bars':
      return (
        <g {...common}>
          <line x1={cx - 6} y1={cy - 3} x2={cx + 6} y2={cy - 3} />
          <line x1={cx - 6} y1={cy + 3} x2={cx + 6} y2={cy + 3} />
        </g>
      );
    case 'dot':
      return <circle cx={cx} cy={cy} r={3.5} fill={color} opacity={0.9} />;
    case 'chevron':
      return <polyline points={`${cx - 6},${cy + 3} ${cx},${cy - 4} ${cx + 6},${cy + 3}`} {...common} />;
  }
};
