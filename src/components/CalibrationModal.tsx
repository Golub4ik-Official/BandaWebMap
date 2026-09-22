import React, { useState, useEffect } from 'react';
import { X, Target, HelpCircle, Check, RotateCcw } from 'lucide-react';
import { GameMap, MapLocation, RoundOffset } from '../types';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMap: GameMap | null;
  locations: MapLocation[];
  currentOffset: RoundOffset | null;
  onSaveOffset: (offset: RoundOffset | null) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  currentMap,
  locations,
  currentOffset,
  onSaveOffset,
}) => {
  // Method 1: Benchmark landmark / point
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [realX, setRealX] = useState<string>('75');
  const [realY, setRealY] = useState<string>('20');
  const [gameX, setGameX] = useState<string>('');
  const [gameY, setGameY] = useState<string>('');

  // Method 2: Direct delta input
  const [manualDeltaX, setManualDeltaX] = useState<string>(currentOffset ? currentOffset.x.toString() : '0');
  const [manualDeltaY, setManualDeltaY] = useState<string>(currentOffset ? currentOffset.y.toString() : '0');
  const [activeTab, setActiveTab] = useState<'landmark' | 'manual'>('landmark');

  // Filter significant locations on the map for quick selection
  const prominentLocations = locations.filter(
    l => l.category === 'landmark' || (l.category === 'major' && l.tileCount >= 80)
  );

  useEffect(() => {
    if (isOpen) {
      if (currentOffset) {
        setManualDeltaX(currentOffset.x.toString());
        setManualDeltaY(currentOffset.y.toString());
      }
      if (prominentLocations.length > 0 && !selectedLocationId) {
        const defaultLoc = prominentLocations[0];
        setSelectedLocationId(defaultLoc.id);
        setRealX(defaultLoc.x.toString());
        setRealY(defaultLoc.y.toString());
      }
    }
  }, [isOpen, currentOffset, prominentLocations, selectedLocationId]);

  // Handle landmark selection change
  const handleSelectLandmark = (locId: string) => {
    setSelectedLocationId(locId);
    const found = locations.find(l => l.id === locId);
    if (found) {
      setRealX(found.x.toString());
      setRealY(found.y.toString());
    }
  };

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculated deltas from landmark method
  const numRealX = parseInt(realX, 10);
  const numRealY = parseInt(realY, 10);
  const numGameX = parseInt(gameX, 10);
  const numGameY = parseInt(gameY, 10);

  const isLandmarkValid = !isNaN(numRealX) && !isNaN(numRealY) && !isNaN(numGameX) && !isNaN(numGameY);
  const calculatedDeltaX = isLandmarkValid ? numGameX - numRealX : 0;
  const calculatedDeltaY = isLandmarkValid ? numGameY - numRealY : 0;

  // Handle Apply
  const handleApplyLandmark = () => {
    if (!isLandmarkValid) return;
    onSaveOffset({ x: calculatedDeltaX, y: calculatedDeltaY });
    onClose();
  };

  const handleApplyManual = () => {
    const dx = parseInt(manualDeltaX, 10);
    const dy = parseInt(manualDeltaY, 10);
    if (!isNaN(dx) && !isNaN(dy)) {
      onSaveOffset({ x: dx, y: dy });
      onClose();
    }
  };

  const handleReset = () => {
    onSaveOffset(null);
    setGameX('');
    setGameY('');
    setManualDeltaX('0');
    setManualDeltaY('0');
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 select-none font-mono">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#010e04]/96 border-2 border-[#00ff41] rounded-sm shadow-[0_0_35px_rgba(0,255,65,0.45)] overflow-hidden flex flex-col text-[#00ff41]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#021808] border-b-2 border-[#00ff41]">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00ff41] animate-pulse" />
            <span className="font-bold text-sm tracking-wider cm-text-glow">
              USCM // ТАКТИЧЕСКАЯ КАЛИБРОВКА АРТИЛЛЕРИИ (OB & MORTAR)
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-[#00ff41] hover:bg-[#00ff41] hover:text-black transition-colors rounded-sm font-bold"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-4 py-2 bg-[#011406] border-b border-[#00ff41]/40 text-xs text-[#00bb2f] leading-relaxed flex items-start gap-2">
          <HelpCircle className="w-4 h-4 text-[#00ff41] shrink-0 mt-0.5" />
          <span>
            Каждый раунд игра добавляет случайное смещение к координатам (<code className="text-[#00ff41]">rand(-500, 500)</code>). 
            Замерьте биноклем / лазерным целеуказателем любой ориентир, введите числа сюда, и веб-карта начнёт выдавать точные координаты для выстрела орбитальной пушки и миномёта.
          </span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#00ff41]/40 bg-[#021406]">
          <button
            onClick={() => setActiveTab('landmark')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'landmark'
                ? 'bg-[#00e639] text-black shadow-[0_0_8px_#00ff41]'
                : 'text-[#00aa2b] hover:text-[#00ff41] hover:bg-[#00ff41]/10'
            }`}
          >
            [1. По ориентиру / дальномеру]
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'manual'
                ? 'bg-[#00e639] text-black shadow-[0_0_8px_#00ff41]'
                : 'text-[#00aa2b] hover:text-[#00ff41] hover:bg-[#00ff41]/10'
            }`}
          >
            [2. Прямой ввод ΔX / ΔY]
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-4 text-xs">
          {activeTab === 'landmark' ? (
            <div className="space-y-3.5">
              {/* Step 1: Real point */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-[#00aa2b] mb-1">
                  1. Выберите замерянный ориентир на карте {currentMap?.name || ''}:
                </label>
                {prominentLocations.length > 0 && (
                  <select
                    value={selectedLocationId}
                    onChange={e => handleSelectLandmark(e.target.value)}
                    className="w-full bg-[#021a08] border border-[#00ff41]/60 text-[#00ff41] px-2.5 py-1.5 rounded-sm outline-none mb-2 focus:border-[#00ff41]"
                  >
                    {prominentLocations.map(loc => (
                      <option key={loc.id} value={loc.id} className="bg-black text-[#00ff41]">
                        {loc.name} (X:{loc.x}, Y:{loc.y})
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1.5 bg-black/60 p-1.5 rounded-sm border border-[#00ff41]/40">
                    <span className="text-[10px] text-[#00aa2b]">РЕАЛЬНЫЙ X:</span>
                    <input
                      type="number"
                      value={realX}
                      onChange={e => setRealX(e.target.value)}
                      className="w-full bg-transparent text-[#00ff41] font-bold text-center outline-none"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 bg-black/60 p-1.5 rounded-sm border border-[#00ff41]/40">
                    <span className="text-[10px] text-[#00aa2b]">РЕАЛЬНЫЙ Y:</span>
                    <input
                      type="number"
                      value={realY}
                      onChange={e => setRealY(e.target.value)}
                      className="w-full bg-transparent text-[#00ff41] font-bold text-center outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: In-Game Binocular coords */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-[#00aa2b] mb-1">
                  2. Введите показания из бинокля в игре («Долгота / Широта»):
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-1.5 bg-black/60 p-1.5 rounded-sm border border-[#00ff41]/60 focus-within:border-[#00ff41]">
                    <span className="text-[10px] text-[#00ff41] font-bold">ДОЛГОТА (X):</span>
                    <input
                      type="number"
                      placeholder="напр. 325"
                      value={gameX}
                      onChange={e => setGameX(e.target.value)}
                      className="w-full bg-transparent text-[#00ff41] font-bold text-center outline-none"
                      autoFocus
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-1.5 bg-black/60 p-1.5 rounded-sm border border-[#00ff41]/60 focus-within:border-[#00ff41]">
                    <span className="text-[10px] text-[#00ff41] font-bold">ШИРОТА (Y):</span>
                    <input
                      type="number"
                      placeholder="напр. -110"
                      value={gameY}
                      onChange={e => setGameY(e.target.value)}
                      className="w-full bg-transparent text-[#00ff41] font-bold text-center outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3: Result preview */}
              <div className="p-2.5 rounded-sm bg-[#021808] border border-[#00ff41]/50 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#00aa2b] uppercase">ВЫЧИСЛЕННОЕ СМЕЩЕНИЕ РАУНДА:</div>
                  <div className="text-sm font-bold text-[#00ff41] cm-text-glow">
                    ΔX: {isLandmarkValid ? (calculatedDeltaX >= 0 ? `+${calculatedDeltaX}` : calculatedDeltaX) : '--'} | ΔY: {isLandmarkValid ? (calculatedDeltaY >= 0 ? `+${calculatedDeltaY}` : calculatedDeltaY) : '--'}
                  </div>
                </div>
                <button
                  onClick={handleApplyLandmark}
                  disabled={!isLandmarkValid}
                  className={`px-3 py-1.5 rounded-sm font-bold text-xs uppercase flex items-center gap-1.5 transition-all ${
                    isLandmarkValid
                      ? 'bg-[#00e639] hover:bg-[#05ff46] text-black shadow-[0_0_12px_#00ff41] cursor-pointer'
                      : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ПРИМЕНИТЬ</span>
                </button>
              </div>
            </div>
          ) : (
            /* Manual Delta Mode */
            <div className="space-y-3.5">
              <label className="block text-[11px] uppercase font-bold text-[#00aa2b]">
                Если вам уже известна дельта раунда, введите её напрямую:
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5 bg-black/60 p-2 rounded-sm border border-[#00ff41]/60">
                  <span className="text-[10px] text-[#00ff41] font-bold">СМЕЩЕНИЕ ΔX:</span>
                  <input
                    type="number"
                    value={manualDeltaX}
                    onChange={e => setManualDeltaX(e.target.value)}
                    className="w-full bg-transparent text-[#00ff41] font-bold text-center outline-none"
                  />
                </div>
                <div className="flex-1 flex items-center gap-1.5 bg-black/60 p-2 rounded-sm border border-[#00ff41]/60">
                  <span className="text-[10px] text-[#00ff41] font-bold">СМЕЩЕНИЕ ΔY:</span>
                  <input
                    type="number"
                    value={manualDeltaY}
                    onChange={e => setManualDeltaY(e.target.value)}
                    className="w-full bg-transparent text-[#00ff41] font-bold text-center outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleApplyManual}
                className="w-full py-2 bg-[#00e639] hover:bg-[#05ff46] text-black font-bold text-xs uppercase rounded-sm shadow-[0_0_12px_#00ff41] transition-all"
              >
                СОХРАНИТЬ СМЕЩЕНИЕ
              </button>
            </div>
          )}
        </div>

        {/* Footer with status and reset */}
        <div className="px-4 py-2.5 bg-[#021808] border-t-2 border-[#00ff41] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#00aa2b] uppercase">ТЕКУЩИЙ СТАТУС:</span>
            {currentOffset ? (
              <span className="bg-[#00ff41] text-black font-bold px-2 py-0.5 rounded-sm text-[10px] shadow-[0_0_8px_#00ff41]">
                АКТИВНО (ΔX: {currentOffset.x >= 0 ? `+${currentOffset.x}` : currentOffset.x}, ΔY: {currentOffset.y >= 0 ? `+${currentOffset.y}` : currentOffset.y})
              </span>
            ) : (
              <span className="text-[#00731d] font-bold text-[10px]">
                НЕ СКАЛИБРОВАНО (ВЫКЛ)
              </span>
            )}
          </div>

          {currentOffset && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded-sm bg-[#160606] hover:bg-rose-900 border border-rose-500/60 text-rose-300 font-bold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>СБРОСИТЬ</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
