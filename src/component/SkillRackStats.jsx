/* eslint-disable react/prop-types */
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, Medal, Zap, Award, Info, ChevronDown, ChevronUp, 
  Search, Download, Clock, ExternalLink, RefreshCw, Maximize2, 
  Minimize2, Globe, Database 
} from 'lucide-react';

// Helper icons
const Crown = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </svg>
);

const CANONICAL_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx__NYsQyNBtvUb7YPYkPUlNWHUoYw-5_rth4rLzMyViFvZWXXJdAD5IUZowQSA0tmx/exec";
const USER1_SCRIPT_URL = "https://script.google.com/macros/u/1/s/AKfycbx__NYsQyNBtvUb7YPYkPUlNWHUoYw-5_rth4rLzMyViFvZWXXJdAD5IUZowQSA0tmx/exec";

const SkillRackStats = ({ users: initialUsers = [], lastUpdated }) => {
  // Main view state: default to 'script' as requested by the user
  const [activeTab, setActiveTab] = useState('script');
  const [scriptUrl, setScriptUrl] = useState(CANONICAL_SCRIPT_URL);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeContainerRef = useRef(null);

  // Load initial cached data from localStorage if available
  const [localUsers, setLocalUsers] = useState(() => {
    try {
      const cached = localStorage.getItem('skillrack_cached_students');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (initialUsers && initialUsers.length > 0) {
            return initialUsers.map(u => {
              const match = parsed.find(p => p.username === u.username);
              return match ? { ...u, ...match } : u;
            });
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached students:', e);
    }
    return initialUsers;
  });

  const [expandedUser, setExpandedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync users immediately whenever parent data updates
  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setLocalUsers(initialUsers);
    }
  }, [initialUsers]);

  // Handle reload of iframe
  const handleReloadFrame = () => {
    setIframeLoading(true);
    setIframeKey(prev => prev + 1);
  };

  // Open script page in a new browser window/tab
  const handleOpenExternal = () => {
    window.open(scriptUrl, '_blank', 'noopener,noreferrer');
  };

  // Toggle fullscreen container
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const resolvedLastUpdated = lastUpdated || localStorage.getItem('skillrack_last_synced');

  const timeInfo = useMemo(() => {
    const intervalMs = 120 * 60 * 1000;
    if (!resolvedLastUpdated) {
      return { lastUpdatedStr: 'Just now', countdownStr: '02:00:00', nextUpdateMins: 120 };
    }

    const lastDate = new Date(resolvedLastUpdated);
    const lastMs = lastDate.getTime();
    if (Number.isNaN(lastMs)) {
      return { lastUpdatedStr: 'Just now', countdownStr: '02:00:00', nextUpdateMins: 120 };
    }

    const diffMs = Math.max(0, currentTime - lastMs);
    const diffMins = Math.floor(diffMs / (1000 * 60));

    let lastUpdatedStr = 'Just now';
    if (diffMins >= 60) {
      const hours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      lastUpdatedStr = `${hours}h ${remMins}m ago`;
    } else if (diffMins > 0) {
      lastUpdatedStr = `${diffMins}m ago`;
    }

    const elapsedInCycle = diffMs % intervalMs;
    const remainingMs = Math.max(0, intervalMs - elapsedInCycle);
    const totalRemainingSecs = Math.floor(remainingMs / 1000);

    const hours = Math.floor(totalRemainingSecs / 3600);
    const minutes = Math.floor((totalRemainingSecs % 3600) / 60);
    const seconds = totalRemainingSecs % 60;

    const pad = (n) => String(n).padStart(2, '0');
    const countdownStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

    return {
      lastUpdatedStr,
      countdownStr,
      nextUpdateMins: Math.ceil(totalRemainingSecs / 60)
    };
  }, [resolvedLastUpdated, currentTime]);

  const stats = useMemo(() => {
    const sortedUsers = [...localUsers].sort((a, b) => (b.skillrackPoints || 0) - (a.skillrackPoints || 0));
    
    const totalPoints = localUsers.reduce((acc, u) => acc + (u.skillrackPoints || 0), 0);
    const avgPoints = localUsers.length > 0 ? Math.round(totalPoints / localUsers.length) : 0;
    
    const totalDC = localUsers.reduce((acc, u) => acc + (u.dailyChallenge || 0), 0);
    const totalDT = localUsers.reduce((acc, u) => acc + (u.dailyTest || 0), 0);
    const totalTracks = localUsers.reduce((acc, u) => acc + (u.codeTracks || 0), 0);
    const totalTests = localUsers.reduce((acc, u) => acc + (u.codeTests || 0), 0);

    const distribution = [
      { name: 'DC Points', value: totalDC * 2, color: '#4ade80' },
      { name: 'DT Points', value: totalDT * 20, color: '#3b82f6' },
      { name: 'Tracks Points', value: totalTracks * 2, color: '#f97316' },
      { name: 'Test Points', value: totalTests * 30, color: '#f87171' },
    ];

    return {
      totalPoints,
      avgPoints,
      distribution,
      sortedUsers,
      classTotals: { totalDC, totalDT, totalTracks, totalTests }
    };
  }, [localUsers]);

  // Filter students by search
  const displayedUsers = useMemo(() => {
    if (!searchTerm) return stats.sortedUsers;
    const term = searchTerm.toLowerCase();
    return stats.sortedUsers.filter(u =>
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.collegeId && u.collegeId.toLowerCase().includes(term))
    );
  }, [stats.sortedUsers, searchTerm]);

  const handleExportExcel = () => {
    const headers = ['S.No', 'College ID', 'Name', 'Username', 'Code Tutor', 'Code Tracks', 'DC', 'DT', 'Code Tests', 'Total Solved', 'SkillRack Points'];
    const rows = stats.sortedUsers.map((user, idx) => [
      idx + 1,
      user.collegeId || '',
      user.name,
      user.username || '',
      user.codeTutor || 0,
      user.codeTracks || 0,
      user.dailyChallenge || 0,
      user.dailyTest || 0,
      user.codeTests || 0,
      (user.codeTracks || 0) + (user.dailyChallenge || 0) + (user.dailyTest || 0) + (user.codeTests || 0) + (user.codeTutor || 0),
      user.skillrackPoints || 0
    ]);

    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `skillrack_leaderboard_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const CalculationSummary = ({ user }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/80 p-4 md:p-5 rounded-2xl border border-blue-500/20 mt-3 shadow-inner">
      <div className="space-y-3">
        <h4 className="text-blue-400 font-bold text-sm flex items-center gap-2 mb-2">
          <Info size={15} /> Points Calculation Breakdown
        </h4>
        <div className="space-y-2 text-sm font-sans">
          <div className="flex justify-between items-center text-slate-400">
            <span>Code Tutor</span>
            <span className="font-mono">{user.codeTutor || 0} × 0 = <span className="text-white font-bold">0</span></span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Code Tracks</span>
            <span className="font-mono">{user.codeTracks || 0} × 2 = <span className="text-white font-bold">{(user.codeTracks || 0) * 2}</span></span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Daily Challenge (DC)</span>
            <span className="font-mono">{user.dailyChallenge || 0} × 2 = <span className="text-white font-bold">{(user.dailyChallenge || 0) * 2}</span></span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Daily Test (DT)</span>
            <span className="font-mono">{user.dailyTest || 0} × 20 = <span className="text-white font-bold">{(user.dailyTest || 0) * 20}</span></span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>Code Tests</span>
            <span className="font-mono">{user.codeTests || 0} × 30 = <span className="text-white font-bold">{(user.codeTests || 0) * 30}</span></span>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center items-center md:border-l border-slate-700/50 md:pl-4 pt-4 md:pt-0 border-t md:border-t-0">
        <div className="text-center">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Total Programs Solved</p>
          <p className="text-3xl font-black text-white">{(user.codeTracks || 0) + (user.dailyChallenge || 0) + (user.dailyTest || 0) + (user.codeTests || 0) + (user.codeTutor || 0)}</p>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700/50 w-full text-center">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Total Guru Points</p>
          <p className="text-4xl font-black text-blue-400">{(user.skillrackPoints || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`p-4 md:p-8 space-y-6 w-full max-w-[1600px] mx-auto pb-24 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#0f172a] p-4 max-w-none overflow-y-auto' : ''}`}>
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/60 p-4 md:p-5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5">
            <Medal size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                SkillRack Tracker
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Live
              </span>
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-0.5">
              Live Google Apps Script portal and candidate ranking tracker.
            </p>
          </div>
        </div>

        {/* View Switcher Tabs & External Action */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="bg-slate-950/70 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('script')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'script'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Globe size={15} />
              <span>Script Page</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>
            <button
              onClick={() => setActiveTab('legacy')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'legacy'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database size={15} />
              <span>Archived Data</span>
            </button>
          </div>

          {activeTab === 'script' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenExternal}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
                title="Open Google Apps Script in a new browser tab"
              >
                <ExternalLink size={15} />
                <span>Open in Tab</span>
              </button>
              <button
                onClick={handleReloadFrame}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
                title="Reload Script Frame"
              >
                <RefreshCw size={15} className={iframeLoading ? 'animate-spin text-blue-400' : ''} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 active:scale-95 transition-all cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          )}

          {activeTab === 'legacy' && (
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-xl font-bold transition-all border border-emerald-700/50 active:scale-95 text-xs md:text-sm cursor-pointer"
            >
              <Download size={15} />
              <span>Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'script' ? (
        /* EMBEDDED GOOGLE APPS SCRIPT WEB APP VIEW */
        <div className="space-y-3">
          {/* Controls Bar for Script View */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="font-semibold text-slate-300">Live URL:</span>
              <span className="font-mono text-[11px] text-blue-400 truncate max-w-xs md:max-w-md">
                {scriptUrl}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Mode:</span>
              <button
                onClick={() => {
                  setScriptUrl(CANONICAL_SCRIPT_URL);
                  setIframeLoading(true);
                  setIframeKey(k => k + 1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  scriptUrl === CANONICAL_SCRIPT_URL 
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
                }`}
                title="Universal Link avoids Google Drive multi-account 'unable to open file' errors"
              >
                Universal (Fixes Drive Error)
              </button>
              <button
                onClick={() => {
                  setScriptUrl(USER1_SCRIPT_URL);
                  setIframeLoading(true);
                  setIframeKey(k => k + 1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  scriptUrl === USER1_SCRIPT_URL 
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
                }`}
                title="Account #1 link (/u/1/)"
              >
                Account #1 (/u/1/)
              </button>
            </div>
          </div>

          {/* Iframe Viewport Container */}
          <div 
            ref={iframeContainerRef}
            className={`relative w-full rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl bg-slate-950 flex flex-col transition-all duration-200 ${
              isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[760px] md:h-[820px]'
            }`}
          >
            {/* Loading Overlay */}
            {iframeLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="text-blue-400 animate-pulse" size={20} />
                  </div>
                </div>
                <p className="text-sm font-bold text-white tracking-tight">Loading SkillRack Script Portal...</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm text-center px-4">
                  Connecting to live Google Apps Script web app in the tab.
                </p>
              </div>
            )}

            {/* Embedded Iframe */}
            <iframe
              key={iframeKey}
              src={scriptUrl}
              title="SkillRack Live Script"
              className="w-full flex-1 border-0 bg-white"
              onLoad={() => setIframeLoading(false)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
          </div>

          {/* Fallback & Helper Notice */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-blue-950/30 border border-blue-500/20 rounded-xl p-3.5 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <Info size={16} className="text-blue-400 shrink-0" />
              <span>
                If your browser or Google account sign-in restricts embedded display, you can launch the page directly:
              </span>
            </div>
            <button
              onClick={handleOpenExternal}
              className="inline-flex items-center gap-1.5 font-bold text-blue-400 hover:text-blue-300 hover:underline cursor-pointer shrink-0"
            >
              <span>Launch in New Tab</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* ARCHIVED / LOCAL LEADERBOARD DATA VIEW */
        <div className="space-y-8">
          {/* Subheader info */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <Clock size={13} className="text-blue-400 shrink-0" />
              <span className="text-slate-400">Last Synced:</span>
              <span className="text-white font-bold">{timeInfo.lastUpdatedStr}</span>
              <span className="text-slate-600 font-bold">•</span>
              <span className="text-slate-400">Next sync:</span>
              <span className="text-blue-400 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                {timeInfo.countdownStr}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Showing cached local student database calculations.
            </p>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className="text-blue-400" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Global Points</p>
              </div>
              <h3 className="text-3xl font-extrabold text-white">{stats.totalPoints.toLocaleString()}</h3>
              <p className="text-xs text-slate-500 mt-1">Total batch accumulation</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Award size={18} className="text-yellow-400" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Average Score</p>
              </div>
              <h3 className="text-3xl font-extrabold text-white">{stats.avgPoints.toLocaleString()}</h3>
              <p className="text-xs text-slate-500 mt-1">Mean proficiency level</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={18} className="text-purple-400" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Elite Class</p>
              </div>
              <h3 className="text-3xl font-extrabold text-white">{localUsers.filter(u => (u.skillrackPoints || 0) > 10000).length}</h3>
              <p className="text-xs text-slate-500 mt-1">Students above 10k</p>
            </div>
            <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={18} className="text-emerald-400" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Gold Rankers</p>
              </div>
              <h3 className="text-3xl font-extrabold text-white">{localUsers.filter(u => (u.dailyTest || 0) > 100).length}</h3>
              <p className="text-xs text-slate-500 mt-1">100+ DT completed</p>
            </div>
          </div>

          {/* Compact Formula Strip */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 backdrop-blur-sm">
            <div className="flex items-center gap-3 shrink-0">
              <div className="h-16 w-16 md:h-20 md:w-20 relative shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats.distribution} cx="50%" cy="50%" innerRadius={22} outerRadius={30} paddingAngle={4} dataKey="value" stroke="none">
                      {stats.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {stats.distribution.map(item => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: item.color}}></div>
                    <span className="text-[11px] text-slate-400 whitespace-nowrap">{item.name} <span className="font-bold text-slate-200">{((item.value / (stats.totalPoints || 1)) * 100).toFixed(0)}%</span></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="w-full md:flex-1 flex items-center justify-center">
              <p className="text-[11px] md:text-xs text-slate-400 font-mono bg-slate-900/60 px-4 py-2.5 rounded-xl border border-slate-700/40 text-center w-full md:w-auto">
                Points = (Tracks × <span className="text-orange-400 font-bold">2</span>) + (DC × <span className="text-green-400 font-bold">2</span>) + (DT × <span className="text-blue-400 font-bold">20</span>) + (Tests × <span className="text-red-400 font-bold">30</span>)
              </p>
            </div>
          </div>

          {/* Full Leaderboard */}
          <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 md:p-6 border-b border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                      <h3 className="text-lg md:text-xl font-black text-white">SkillRack Leaderboard</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">All {localUsers.length} students ranked by SkillRack points.</p>
                  </div>
                  <div className="relative w-full md:w-72">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={14} className="text-slate-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name, username or ID..."
                      className="block w-full pl-9 pr-3 py-2 border border-slate-700 rounded-xl text-sm bg-slate-900/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="bg-slate-900/40 text-[11px] uppercase tracking-[0.15em] text-slate-400 font-bold">
                              <th className="px-6 py-4 w-20">Rank</th>
                              <th className="px-6 py-4">Student</th>
                              <th className="px-6 py-4 text-center w-28">Tracks</th>
                              <th className="px-6 py-4 text-center w-20">DC</th>
                              <th className="px-6 py-4 text-center w-20">DT</th>
                              <th className="px-6 py-4 text-center w-24">Tests</th>
                              <th className="px-6 py-4 text-center w-32">Score</th>
                              <th className="px-6 py-4 text-right w-20"></th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/30">
                          {displayedUsers.map((user) => {
                              const originalRank = stats.sortedUsers.findIndex(u => u.username === user.username) + 1;
                              return (
                              <React.Fragment key={user.username}>
                                  <tr className={`group transition-all hover:bg-white/5 ${expandedUser === user.username ? 'bg-blue-600/5' : ''}`}>
                                      <td className="px-6 py-4">
                                          <span className={`text-sm font-black ${
                                              originalRank <= 3 ? 'text-yellow-400' : 'text-slate-500'
                                          }`}>
                                              {originalRank <= 3 ? ['🥇','🥈','🥉'][originalRank-1] : `#${originalRank}`}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-3">
                                              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-black text-white border border-slate-600">
                                                  {user.name.charAt(0)}
                                              </div>
                                              <div>
                                                  <p className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{user.name}</p>
                                                  <div className="flex items-center gap-2 mt-0.5">
                                                      <span className="text-[10px] text-slate-400 font-mono">@{user.username}</span>
                                                      {user.collegeId && (
                                                          <span className="text-[10px] text-slate-500 font-mono">({user.collegeId})</span>
                                                      )}
                                                      {user.skillrackUrl && (
                                                          <button 
                                                              onClick={(e) => { e.stopPropagation(); window.open(user.skillrackUrl, '_blank'); }}
                                                              className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors"
                                                              title="Open SkillRack Profile"
                                                          >
                                                              <ExternalLink size={11} />
                                                          </button>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-center text-sm text-orange-300 font-mono font-bold">{user.codeTracks || 0}</td>
                                      <td className="px-6 py-4 text-center text-sm text-green-300 font-mono font-bold">{user.dailyChallenge || 0}</td>
                                      <td className="px-6 py-4 text-center text-sm text-blue-300 font-mono font-bold">{user.dailyTest || 0}</td>
                                      <td className="px-6 py-4 text-center text-sm text-red-300 font-mono font-bold">{user.codeTests || 0}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className="text-lg font-black text-white tabular-nums">{(user.skillrackPoints || 0).toLocaleString()}</span>
                                      </td>
                                      <td className="px-6 py-4 text-right">
                                          <button 
                                              onClick={() => setExpandedUser(expandedUser === user.username ? null : user.username)}
                                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                                  expandedUser === user.username 
                                                      ? 'bg-blue-500 border-blue-400 text-white' 
                                                      : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                                              }`}
                                              title="View points calculation"
                                          >
                                              {expandedUser === user.username ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                          </button>
                                      </td>
                                  </tr>
                                  {expandedUser === user.username && (
                                      <tr>
                                          <td colSpan="8" className="px-6 pb-6 pt-0 bg-blue-600/5">
                                              <CalculationSummary user={user} />
                                          </td>
                                      </tr>
                                  )}
                              </React.Fragment>
                              );
                          })}
                      </tbody>
                  </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-700/30">
                  {displayedUsers.map((user) => {
                      const originalRank = stats.sortedUsers.findIndex(u => u.username === user.username) + 1;
                      return (
                      <div key={user.username} className="p-4">
                          <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                  <span className={`text-sm font-black ${originalRank <= 3 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                      {originalRank <= 3 ? ['🥇','🥈','🥉'][originalRank-1] : `#${originalRank}`}
                                  </span>
                                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-black text-white border border-slate-600">
                                      {user.name.charAt(0)}
                                  </div>
                                  <div>
                                      <p className="text-sm font-bold text-white">{user.name}</p>
                                      <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="text-lg font-black text-white tabular-nums">{(user.skillrackPoints || 0).toLocaleString()}</p>
                                  <p className="text-[9px] text-slate-500 uppercase font-bold">Points</p>
                              </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-3">
                              <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold">Tracks</p>
                                  <p className="text-sm text-orange-300 font-mono font-bold">{user.codeTracks || 0}</p>
                              </div>
                              <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold">DC</p>
                                  <p className="text-sm text-green-300 font-mono font-bold">{user.dailyChallenge || 0}</p>
                              </div>
                              <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold">DT</p>
                                  <p className="text-sm text-blue-300 font-mono font-bold">{user.dailyTest || 0}</p>
                              </div>
                              <div className="bg-slate-900/50 p-2 rounded-lg text-center">
                                  <p className="text-[9px] text-slate-400 uppercase font-bold">Tests</p>
                                  <p className="text-sm text-red-300 font-mono font-bold">{user.codeTests || 0}</p>
                              </div>
                          </div>

                          <button 
                              onClick={() => setExpandedUser(expandedUser === user.username ? null : user.username)}
                              className="w-full text-center text-[11px] text-slate-400 hover:text-blue-400 font-bold py-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                              {expandedUser === user.username ? <><ChevronUp size={12} /> Hide Details</> : <><ChevronDown size={12} /> View Breakdown</>}
                          </button>

                          {expandedUser === user.username && (
                              <div className="mt-3">
                                  <CalculationSummary user={user} />
                              </div>
                          )}
                      </div>
                      );
                  })}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillRackStats;
