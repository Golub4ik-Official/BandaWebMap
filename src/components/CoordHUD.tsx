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
    <div className="fixed bottom-4 right-4 z-[1000] flex items-center gap-2 select-none font-mono">
      {/* Quick Jump Input Popover */}
      {showInput && (
        <form 
          onSubmit={handleGo}
          className="flex items-center gap-1.5 p-2 rounded-sm bg-[#011406]/95 border-2 border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.4)] animate-in fade-in duration-100"
        >
          <span className="text-[11px] text-[#00ff41] font-bold">X:</span>
          <input
            type="number"
            placeholder="000"
            value={targetX}
            onChange={e => setTargetX(e.target.value)}
            className="w-14 bg-black text-[#00ff41] font-mono text-xs px-2 py-1 rounded-sm border border-[#00ff41]/60 text-center outline-none focus:border-[#00ff41] focus:shadow-[0_0_8px_#00ff41]"
            autoFocus
          />
          <span className="text-[11px] text-[#00ff41] font-bold">Y:</span>
          <input
            type="number"
            placeholder="000"
            value={targetY}
            onChange={e => setTargetY(e.target.value)}
            className="w-14 bg-black text-[#00ff41] font-mono text-xs px-2 py-1 rounded-sm border border-[#00ff41]/60 text-center outline-none focus:border-[#00ff41] focus:shadow-[0_0_8px_#00ff41]"
          />
          <button
            type="submit"
            className="px-2 py-1 rounded-sm bg-[#00e639] hover:bg-[#05ff46] text-black font-bold text-xs transition-colors flex items-center gap-1 shadow-[0_0_10px_#00ff41]"
          >
            <span>GOTO</span>
            <ArrowRight className="w-3 h-3 stroke-[3]" />
          </button>
        </form>
      )}

      {/* Main minimal coordinates tactical badge */}
      <div 
        onClick={() => setShowInput(!showInput)}
        className="flex items-center gap-3 px-3 py-1.5 rounded-sm bg-[#011205]/95 border-2 border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.35)] text-xs font-mono select-none cursor-pointer hover:bg-[#021f09] hover:shadow-[0_0_22px_rgba(0,255,65,0.6)] transition-all group"
        title="Нажмите для ввода координат тактического прыжка"
      >
        <div className="flex items-center gap-1.5 text-[#00aa2b]">
          <span className="text-[10px] uppercase tracking-wider">X:</span>
          <span className="text-[#00ff41] font-bold min-w-[24px] text-left cm-text-glow">
            {coords ? coords.x : '---'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[#00aa2b]">
          <span className="text-[10px] uppercase tracking-wider">Y:</span>
          <span className="text-[#00ff41] font-bold min-w-[24px] text-left cm-text-glow">
            {coords ? coords.y : '---'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[#00aa2b] pl-2 border-l border-[#00ff41]/40">
          <span className="text-[10px] uppercase tracking-wider">Z:</span>
          <span className="text-black font-bold bg-[#00ff41] px-1.5 py-0.2 rounded-sm text-[11px] shadow-[0_0_6px_#00ff41]">
            {coords ? coords.z : 1}
          </span>
        </div>
      </div>

      {/* Center map view button */}
      <button
        onClick={onResetView}
        className="p-2 rounded-sm bg-[#011205]/95 border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black shadow-[0_0_15px_rgba(0,255,65,0.35)] transition-all"
        title="Центрировать тактический вид"
      >
        <Crosshair className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};
