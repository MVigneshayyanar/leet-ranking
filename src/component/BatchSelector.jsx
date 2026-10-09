import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, GraduationCap, Users, Sparkles, Filter } from 'lucide-react';

const getBadgeColor = (badge = '') => {
  const b = badge.toLowerCase();
  if (b.includes('current')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
  if (b.includes('junior')) return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  if (b.includes('senior')) return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (b.includes('all')) return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
};

const getBatchDotColor = (batchId = '') => {
  if (batchId === 'all') return 'bg-blue-400';
  if (batchId.includes('2028')) return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
  if (batchId.includes('2029')) return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
  if (batchId.includes('2027')) return 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]';
  if (batchId.includes('2030')) return 'bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.6)]';
  return 'bg-cyan-400';
};

const BatchSelector = ({
  selectedBatch = 'batch-2028',
  onSelectBatch,
  batches = [],
  counts = {},
  onOpenManageModal,
  variant = 'default', // 'default' | 'header' | 'sidebar' | 'pills' | 'compact' | 'highlighted'
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const allOption = {
    id: 'all',
    name: 'All Batches',
    shortName: 'All Batches',
    badge: ''
  };

  const getCleanBatchName = (id = '') => {
    if (id === 'all') return 'All Batches';
    const match = id.match(/\d+/);
    return match ? `Batch ${match[0]}` : id;
  };

  const currentBatchObj = selectedBatch === 'all'
    ? allOption
    : batches.find(b => b.id === selectedBatch) || {
        id: selectedBatch,
        name: getCleanBatchName(selectedBatch),
        shortName: getCleanBatchName(selectedBatch),
        badge: ''
      };

  const sortedBatches = [...batches].sort((a, b) => {
    const numA = parseInt((String(a.id || a.name).match(/\d+/) || [0])[0], 10);
    const numB = parseInt((String(b.id || b.name).match(/\d+/) || [0])[0], 10);
    return numB - numA;
  });

  const allItems = [...sortedBatches, allOption];

  // Highlighted variant (used in Dashboard header next to Export button)
  if (variant === 'highlighted') {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:via-indigo-500 hover:to-blue-500 text-white text-xs font-semibold border border-blue-400/40 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 flex items-center gap-2 cursor-pointer ring-1 ring-white/10 active:scale-[0.98]"
          aria-label="Change Batch"
          aria-expanded={isOpen}
          title="Click to change batch"
        >
          <div className="flex items-center gap-1.5">
            <Filter size={12} className="text-blue-200" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Batch:</span>
            <span className="text-white font-bold tracking-wide">
              {currentBatchObj.shortName || currentBatchObj.name}
            </span>
          </div>
          {counts[selectedBatch] !== undefined && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono font-bold">
              {counts[selectedBatch]}
            </span>
          )}
          <ChevronDown
            size={13}
            className={`text-blue-200 group-hover:text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[270px] max-w-[calc(100vw-2rem)] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <GraduationCap size={14} className="text-blue-400" />
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Change Batch</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {counts.all ?? 0} total students
              </span>
            </div>

            <div className="py-1.5 space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {allItems.map((b) => {
                const isSelected = selectedBatch === b.id;
                const count = counts[b.id] ?? 0;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBatch && onSelectBatch(b.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-blue-600/20 border border-blue-500/50 text-white font-semibold'
                        : 'hover:bg-slate-800/80 text-slate-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getBatchDotColor(b.id)}`} />
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-semibold text-xs text-white truncate">{b.shortName || b.name}</span>
                        {b.badge && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full border ${getBadgeColor(b.badge)}`}>
                            {b.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-800">
                        {count}
                      </span>
                      {isSelected && <Check size={14} className="text-blue-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Quick horizontal pills variant (useful for tables or quick filtering)
  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 p-1 bg-slate-900/60 border border-slate-800 rounded-xl ${className}`}>
        <div className="flex items-center gap-1 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Filter size={13} className="text-slate-500" />
          <span>Batch:</span>
        </div>
        {allItems.map((b) => {
          const isSelected = selectedBatch === b.id;
          const count = counts[b.id] ?? 0;
          return (
            <button
              key={b.id}
              onClick={() => onSelectBatch && onSelectBatch(b.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : getBatchDotColor(b.id)}`} />
              <span>{b.shortName || b.name}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-800 text-slate-400'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Sidebar variant (sleek trigger button that opens dropdown)
  if (variant === 'sidebar') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full text-left group px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all duration-200 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={`w-2 h-2 rounded-full shrink-0 ${getBatchDotColor(selectedBatch)}`} />
            <div className="truncate">
              <p className="text-[11px] font-bold text-white tracking-wide truncate">
                {currentBatchObj.shortName || currentBatchObj.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {counts[selectedBatch] ? `${counts[selectedBatch]} students` : 'Batch Switcher'}
              </p>
            </div>
          </div>
          <ChevronDown
            size={14}
            className={`text-slate-400 group-hover:text-white transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900/95 backdrop-blur-xl border border-slate-700/70 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Switch Batch</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {batches.length} Batches
              </span>
            </div>
            <div className="py-1 space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
              {allItems.map((b) => {
                const isSelected = selectedBatch === b.id;
                const count = counts[b.id] ?? 0;
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      onSelectBatch && onSelectBatch(b.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/20 text-white font-semibold border border-blue-500/40'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${getBatchDotColor(b.id)}`} />
                      <p className="truncate font-medium">{b.name}</p>
                    </div>
                    {isSelected && <Check size={14} className="text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default / Header Variant
  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-blue-500/40 backdrop-blur-md transition-all duration-200 flex items-center gap-2.5 shadow-sm hover:shadow-md cursor-pointer"
        aria-label="Select Batch"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${getBatchDotColor(selectedBatch)}`} />
          <span className="text-xs font-semibold text-white tracking-wide">
            {currentBatchObj.shortName || currentBatchObj.name}
          </span>
          {currentBatchObj.badge && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getBadgeColor(currentBatchObj.badge)}`}>
              {currentBatchObj.badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-slate-400 group-hover:text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 md:left-0 top-full mt-2 w-72 md:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={15} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Select Batch</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {counts.all ?? 0} total students
            </span>
          </div>

          <div className="py-2 space-y-1.5 max-h-72 overflow-y-auto custom-scrollbar">
            {allItems.map((b) => {
              const isSelected = selectedBatch === b.id;
              const count = counts[b.id] ?? 0;
              return (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelectBatch && onSelectBatch(b.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'bg-blue-600/15 border border-blue-500/40 text-white'
                      : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getBatchDotColor(b.id)}`} />
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-semibold text-xs text-white truncate">{b.name}</span>
                      {b.badge && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${getBadgeColor(b.badge)}`}>
                          {b.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
                      {count}
                    </span>
                    {isSelected && <Check size={14} className="text-blue-400" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchSelector;
