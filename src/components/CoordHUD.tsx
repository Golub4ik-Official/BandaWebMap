import React, { useState } from 'react';
import { Crosshair, ArrowRight, Target, Copy, Check } from 'lucide-react';
import { RoundOffset } from '../types';

interface CoordHUDProps {
  coords: { x: number; y: number; z: number } | null;
  roundOffset: RoundOffset | null;
  onResetView: () => void;
  onGoToCoords: (x: number, y: number) => void;
  onOpenCalibration: () => void;
  onCopyNotice?: (msg: string) => void;
}

export const CoordHUD: React.FC<CoordHUDProps> = ({
  coords,
  roundOffset,
  onResetView,
  onGoToCoords,
  onOpenCalibration,
  onCopyNotice,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [targetX, setTargetX] = useState('');
  const [targetY, setTargetY] = useState('');
  const [inputIsOb, setInputIsOb] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const obX = coords && roundOffset ? coords.x + roundOffset.x : null;
  const obY = coords && roundOffset ? coords.y + roundOffset.y : null;

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    let x = parseInt(targetX, 10);
    let y = parseInt(targetY, 10);
    if (!isNaN(x) && !isNaN(y)) {
      if (inputIsOb && roundOffset) {
        // De-obfuscate to get true map coordinates
        x = x - roundOffset.x;
        y = y - roundOffset.y;
      }
      onGoToCoords(x, y);
      setShowInput(false);
    }
  };

  const handleCopyOb = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (obX !== null && obY !== null) {
      const text = `X:${obX} Y:${obY}`;
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onCopyNotice?.(`Координаты ОБ скопированы: ${text}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex items-center gap-2 select-none font-mono">
      {/* Quick Jump Input Popover */}
      {showInput && (
        <form 
          onSubmit={handleGo}
          className="flex flex-col gap-1.5 p-2 rounded-sm bg-[#011406]/95 border-2 border-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.4)] animate-in fade-in duration-100"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#00ff41] font-bold">X:</span>
            <input
              type="number"
              placeholder="000"
              value={targetX}
              onChange={e => setTargetX(e.target.value)}
              className="w-14 bg-black text-[#00ff41] font-mono text-xs px-2 py-1 rounded-sm border border-[#00ff41]/60 text-center outline-none focus:border-[#00ff41] focus:shadow-[0_0_8px_#00ff41]"
              autoFocus
            />
            <span className="text-[10px] text-[#00ff41] font-bold">Y:</span>
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
          </div>

          {roundOffset && (
            <label className="flex items-center gap-1.5 text-[10px] text-[#00bb2f] cursor-pointer pt-0.5 border-t border-[#00ff41]/30">
              <input
                type="checkbox"
                checked={inputIsOb}
                onChange={e => setInputIsOb(e.target.checked)}
                className="accent-[#00ff41]"
              />
              <span>Ввод координат ОБ (из бинокля/радио)</span>
            </label>
          )}
        </form>
      )}

      {/* Calibration Button / Active Indicator */}
      <button
        onClick={onOpenCalibration}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border-2 text-xs font-bold transition-all ${
          roundOffset
            ? 'bg-[#011d08] hover:bg-[#022c0c] border-[#00ff41] text-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.4)]'
            : 'bg-[#011205]/95 hover:bg-[#021f09] border-[#00ff41]/50 text-[#00aa2b] hover:text-[#00ff41]'
        }`}
        title="Калибровка смещения координат раунда для орбитального удара и миномёта (C)"
      >
        <Target className={`w-3.5 h-3.5 ${roundOffset ? 'text-[#00ff41] animate-pulse' : 'text-[#00aa2b]'}`} />
        <span>
          {roundOffset 
            ? `ОБ Δ: ${roundOffset.x >= 0 ? `+${roundOffset.x}` : roundOffset.x}, ${roundOffset.y >= 0 ? `+${roundOffset.y}` : roundOffset.y}`
            : 'КАЛИБРОВКА ОБ'
          }
        </span>
      </button>

      {/* Main coordinates tactical badge (Real Grid Coords) */}
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

      {/* In-Game OB Coordinates badge (Only if round calibrated) */}
      {roundOffset && obX !== null && obY !== null && (
        <div
          onClick={handleCopyOb}
          className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#00e639] hover:bg-[#05ff46] text-black border border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.6)] text-xs font-mono font-bold cursor-pointer transition-all"
          title="Нажмите, чтобы скопировать координаты для ОБ в буфер"
        >
          <span className="text-[10px] uppercase tracking-wider">ОБ:</span>
          <span>{obX}, {obY}</span>
          {isCopied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
        </div>
      )}

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
