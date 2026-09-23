import React, { useMemo, useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Trophy, Star, TrendingUp, Users, Medal, Zap, BookOpen, Target, Award, Info, ChevronDown, ChevronUp, RefreshCw, Search, Download } from 'lucide-react';
import axios from 'axios';

// Helper icons
const Crown = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
  </svg>
);

const ExternalLink = ({ size = 14, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const SkillRackStats = ({ users: initialUsers = [], onUsersUpdated, syncStatus: propSyncStatus, isSyncing: propIsSyncing }) => {
  // Load initial cached data from localStorage if available
  const [localUsers, setLocalUsers] = useState(() => {
    try {
      const cached = localStorage.getItem('skillrack_cached_students');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with initialUsers to preserve any LeetCode data
          return initialUsers.map(u => {
            const match = parsed.find(p => p.username === u.username);
            return match ? { ...u, ...match } : u;
          });
        }
      }
    } catch (e) {
      console.warn('Could not read cached students:', e);
    }
    return initialUsers;
  });

  const [expandedUser, setExpandedUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ current: 0, total: 0, message: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const hasAutoSynced = useRef(false);

  const activeIsSyncing = propIsSyncing !== undefined ? propIsSyncing : isSyncing;
  const activeSyncStatus = propSyncStatus !== undefined ? propSyncStatus : syncStatus;

  // Sync users when initialUsers changes
  useEffect(() => {
    if (initialUsers && initialUsers.length > 0) {
      setLocalUsers(prev => {
        return initialUsers.map(u => {
          const existing = prev.find(p => p.username === u.username);
          return existing ? { ...u, ...existing } : u;
        });
      });
    }
  }, [initialUsers]);

  // AUTOMATIC LIVE SYNC ON PAGE LOAD
  useEffect(() => {
    if (!hasAutoSynced.current && localUsers && localUsers.length > 0) {
      const studentsWithUrl = localUsers.filter(u => u.skillrackUrl && (u.skillrackUrl.includes('profile') || u.skillrackUrl.includes('resume')));
      if (studentsWithUrl.length > 0) {
        hasAutoSynced.current = true;
        // Delay slightly for initial render to be fast
        const timer = setTimeout(() => {
          handleSyncAll({ auto: true });
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [localUsers]);

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

  // Helper to fetch live scrape data through Netlify functions, Vite dev server, or standalone proxy
  const scrapeStudentUrl = async (url) => {
    const encoded = encodeURIComponent(url);
    const isValidData = (d) => d && typeof d === 'object' && !d.error && typeof d.skillrackPoints === 'number';

    // 1. Try Netlify Functions endpoint (deployed on Netlify)
    try {
      const res0 = await axios.get(`/.netlify/functions/scrape?url=${encoded}`, { timeout: 12000 });
      if (isValidData(res0.data)) return res0.data;
    } catch (e0) {}

    // 2. Try /api/skillrack/scrape (handled by Vite middleware or Netlify rewrite)
    try {
      const res1 = await axios.get(`/api/skillrack/scrape?url=${encoded}`, { timeout: 12000 });
      if (isValidData(res1.data)) return res1.data;
    } catch (e1) {}

    // 3. Try /scrape
    try {
      const res2 = await axios.get(`/scrape?url=${encoded}`, { timeout: 12000 });
      if (isValidData(res2.data)) return res2.data;
    } catch (e2) {}

    // 4. Fallback to port 5001 proxy server
    try {
      const res3 = await axios.get(`http://localhost:5001/scrape?url=${encoded}`, { timeout: 12000 });
      if (isValidData(res3.data)) return res3.data;
    } catch (e3) {}

    return null;
  };

  const handleSyncAll = async ({ auto = false } = {}) => {
    if (isSyncing) return;
    setIsSyncing(true);

    const eligibleStudents = localUsers.filter(u => 
      u.skillrackUrl && (u.skillrackUrl.includes('profile') || u.skillrackUrl.includes('resume'))
    );

    setSyncStatus({ 
      current: 0, 
      total: eligibleStudents.length, 
      message: auto ? 'Auto-syncing live SkillRack data...' : 'Initializing live sync...' 
    });

    const updatedUsers = [...localUsers];

    for (let i = 0; i < eligibleStudents.length; i++) {
      const student = eligibleStudents[i];
      setSyncStatus({ 
        current: i + 1, 
        total: eligibleStudents.length, 
        message: `Syncing ${student.name}...` 
      });

      try {
        const liveData = await scrapeStudentUrl(student.skillrackUrl);
        if (liveData) {
          const userIndex = updatedUsers.findIndex(u => u.username === student.username);
          if (userIndex !== -1) {
            updatedUsers[userIndex] = {
              ...updatedUsers[userIndex],
              ...liveData
            };
            // Incrementally update UI
            setLocalUsers([...updatedUsers]);
          }
        }
      } catch (error) {
        console.warn(`Failed to sync ${student.name}:`, error.message);
      }

      await new Promise(resolve => setTimeout(resolve, 80));
    }

    setLocalUsers(updatedUsers);
    setIsSyncing(false);
    
    // Save to localStorage cache
    try {
      localStorage.setItem('skillrack_cached_students', JSON.stringify(updatedUsers));
      localStorage.setItem('skillrack_last_synced', new Date().toISOString());
    } catch (e) {
      console.warn(e);
    }

    if (onUsersUpdated) {
      onUsersUpdated(updatedUsers);
    }

    // Auto-save to sampleData.js if server allows
    try {
      await axios.post('/api/skillrack/update-students', { students: updatedUsers });
    } catch (e) {
      try {
        await axios.post('http://localhost:5001/update-students', { students: updatedUsers });
      } catch (e2) {
        // Silent fail for auto-save
      }
    }

    setSyncStatus({ current: 0, total: 0, message: 'Live sync complete!' });
    setTimeout(() => setSyncStatus(prev => ({ ...prev, message: '' })), 4000);
  };

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
    <div className="p-4 md:p-8 space-y-8 w-full max-w-[1600px] mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
             <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Medal className="text-blue-400" size={28} />
             </div>
             <div>
               <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                 SkillRack Tracker
                 <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">Live Sync</span>
               </h2>
               <p className="text-slate-400 text-xs md:text-sm">Real-time SkillRack points and test competency tracking.</p>
             </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            {activeIsSyncing ? (
                <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-xl border border-blue-500/20 animate-pulse text-xs font-bold">
                    <RefreshCw size={14} className="animate-spin text-blue-400" />
                    <span>{activeSyncStatus.message || 'Auto-syncing live data...'}</span>
                    {activeSyncStatus.total > 0 && <span className="text-blue-300 font-mono">({activeSyncStatus.current}/{activeSyncStatus.total})</span>}
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3.5 py-2 rounded-xl border border-emerald-500/20 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Live Auto-Sync Active</span>
                </div>
            )}
            <button 
                onClick={handleExportExcel}
                className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2.5 rounded-xl font-bold transition-all border border-emerald-700/50 active:scale-95 text-sm cursor-pointer"
            >
                <Download size={16} />
                <span>Excel</span>
            </button>
        </div>
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
        {/* Mini donut + legend */}
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
        {/* Formula */}
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
  );
};

export default SkillRackStats;
