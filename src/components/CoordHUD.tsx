import React, { useState } from 'react';
import { Crosshair, ArrowRight } from 'lucide-react';

interface CoordHUDProps {
  coords: { x: number; y: number; z: number } | null;
  onResetView: () => void;
  onGoToCoords: (x: number, y: number) => void;
}

export const CoordHUD: React.FC<CoordHUDProps> = ({
  coords,
  onResetView,
  onGoToCoords,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [targetX, setTargetX] = useState('');
  const [targetY, setTargetY] = useState('');

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    const x = parseInt(targetX, 10);
    const y = parseInt(targetY, 10);
    if (!isNaN(x) && !isNaN(y)) {
      onGoToCoords(x, y);
      setShowInput(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex items-center gap-2">
      {/* Quick Jump Input Popover */}
      {showInput && (
        <form 
          onSubmit={handleGo}
          className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-950/90 backdrop-blur-xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <input
            type="number"
            placeholder="X"
            value={targetX}
            onChange={e => setTargetX(e.target.value)}
            className="w-12 bg-black/50 text-white font-mono text-xs px-2 py-1 rounded border border-white/10 text-center outline-none focus:border-sky-400"
            autoFocus
          />
          <input
            type="number"
            placeholder="Y"
            value={targetY}
            onChange={e => setTargetY(e.target.value)}
            className="w-12 bg-black/50 text-white font-mono text-xs px-2 py-1 rounded border border-white/10 text-center outline-none focus:border-sky-400"
          />
          <button
            type="submit"
            className="p-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      {/* Main minimal coordinates badge */}
      <div 
        onClick={() => setShowInput(!showInput)}
        className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-xl border border-white/10 shadow-2xl text-xs font-mono select-none cursor-pointer hover:border-white/20 transition-all group"
        title="Нажмите, чтобы ввести координаты"
      >
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>X:</span>
          <span className="text-white font-bold min-w-[20px] text-left">
            {coords ? coords.x : '--'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>Y:</span>
          <span className="text-white font-bold min-w-[20px] text-left">
            {coords ? coords.y : '--'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 pl-1 border-l border-white/10">
          <span>Z:</span>
          <span className="text-sky-400 font-bold">
            {coords ? coords.z : 1}
          </span>
        </div>
      </div>

      {/* Center map view button */}
      <button
        onClick={onResetView}
        className="p-2 rounded-xl bg-slate-950/80 backdrop-blur-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 shadow-2xl transition-all"
        title="Центрировать карту"
      >
        <Crosshair className="w-4 h-4" />
      </button>
    </div>
  );
};
