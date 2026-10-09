import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, AreaChart, Area } from 'recharts';
import { Users, CheckCircle, Target, Trophy, Flame, Zap, Code, Calendar, Award, ArrowUpRight, Download } from 'lucide-react';
import { exportToExcel } from '../utils/excelGenerator';
import BatchSelector from './BatchSelector';

const DashboardStats = ({
  users = [],
  allUsers = [],
  selectedBatch = 'batch-2028',
  onSelectBatch,
  batches = [],
  counts = {},
  onOpenManageModal
}) => {
  const navigate = useNavigate();

  const currentBatchMeta = selectedBatch === 'all'
    ? { name: 'All Batches', shortName: 'All Batches' }
    : batches.find(b => b.id === selectedBatch) || {
        name: selectedBatch.includes('2028') ? 'Batch 2028' : (selectedBatch.match(/\d+/) ? `Batch ${selectedBatch.match(/\d+/)[0]}` : selectedBatch),
        shortName: selectedBatch.includes('2028') ? 'Batch 2028' : (selectedBatch.match(/\d+/) ? `Batch ${selectedBatch.match(/\d+/)[0]}` : selectedBatch)
      };


  // --- Calculate Stats ---
  const {
    totalStudents,
    totalSolved,
    avgSolved,
    totalEasy,
    totalMedium,
    totalHard,
    sortedBySolved,
    top10Users,
    topHardSolvers,
    recentActivity,
    languageStats,
    weeklyToppers
  } = useMemo(() => {
    const totalStudents = users.length;
    const totalSolved = users.reduce((acc, user) => acc + (user.solved || 0), 0);
    const avgSolved = totalStudents > 0 ? (totalSolved / totalStudents).toFixed(0) : 0;

    const totalEasy = users.reduce((acc, user) => acc + (user.easy || 0), 0);
    const totalMedium = users.reduce((acc, user) => acc + (user.medium || 0), 0);
    const totalHard = users.reduce((acc, user) => acc + (user.hard || 0), 0);

    // Top 10% Logic
    const sortedBySolved = [...users].sort((a, b) => b.solved - a.solved);
    const top10Count = Math.ceil(totalStudents * 0.1);
    const top10Users = sortedBySolved.slice(0, top10Count);

    // Hard Solvers Logic
    const topHardSolvers = [...users]
      .sort((a, b) => b.hard - a.hard)
      .slice(0, 5)
      .filter(u => u.hard > 0);

    // Activity Feed Logic
    const allSubmissions = users.flatMap(user =>
      (user.recentSubmissions || []).map(sub => ({
        ...sub,
        username: user.username,
        name: user.name,
        avatar: sub.title.charAt(0) // Fallback if no user avatar
      }))
    );
    const recentActivity = allSubmissions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15); // Show top 15

    // Language Stats Logic
    const langCounts = {};
    allSubmissions.forEach(sub => {
      const lang = sub.lang;
      if (lang) {
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      }
    });
    const languageStats = Object.keys(langCounts)
      .map(lang => ({ name: lang, value: langCounts[lang] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 languages

    // Weekly Toppers Logic
    const oneWeekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
    const weeklyToppers = users
      .map(user => {
        const weeklySolved = new Set(
          (user.recentSubmissions || [])
            .filter(sub => parseInt(sub.timestamp) >= oneWeekAgo)
            .map(sub => sub.title)
        ).size;
        return { ...user, weeklySolved };
      })
      .filter(user => user.weeklySolved > 0)
      .sort((a, b) => b.weeklySolved - a.weeklySolved)
      .slice(0, 5);

    return {
      totalStudents,
      totalSolved,
      avgSolved,
      totalEasy,
      totalMedium,
      totalHard,
      sortedBySolved,
      top10Users,
      topHardSolvers,
      recentActivity,
      languageStats,
      weeklyToppers
    };
  }, [users]);

  const top10Avg = top10Users.length > 0
    ? (top10Users.reduce((acc, user) => acc + user.solved, 0) / top10Users.length).toFixed(0)
    : 0;

  // Chart Data
  const difficultyData = [
    { name: 'Easy', value: totalEasy },
    { name: 'Medium', value: totalMedium },
    { name: 'Hard', value: totalHard },
  ];
  const COLORS = ['#4ade80', '#fbbf24', '#f87171']; // Green, Yellow, Red
  const LANG_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

  const comparisonData = [
    { name: 'Class Avg', solved: avgSolved },
    { name: 'Top 10% Avg', solved: top10Avg },
  ];

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
    <div className="relative overflow-hidden bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl flex items-start justify-between group hover:border-slate-500/50 hover:bg-slate-800/60 transition-all duration-300 shadow-md">
      {/* Background gradient blob */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 sm:w-32 sm:h-32 ${color.replace('text-', 'bg-')} bg-opacity-5 rounded-full blur-2xl sm:blur-3xl group-hover:bg-opacity-10 transition-all`}></div>

      <div className="relative z-10 w-full min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
          <div className={`p-1.5 sm:p-2 rounded-lg ${color} bg-opacity-10 shrink-0`}>
            <Icon className={color.replace('bg-', 'text-')} size={15} />
          </div>
          <p className="text-slate-400 text-[11px] sm:text-xs md:text-sm font-semibold tracking-wide uppercase truncate">{title}</p>
        </div>

        <div className="flex items-baseline gap-1.5 flex-wrap">
          <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">{value}</h3>
          {trend && <span className="text-[10px] sm:text-xs font-medium text-emerald-400 flex items-center">{trend} <ArrowUpRight size={11} /></span>}
        </div>
        {subtitle && <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate hidden sm:block">{subtitle}</p>}
      </div>
    </div>
  );

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(parseInt(timestamp) * 1000);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8 w-full max-w-[1600px] mx-auto pb-24 pt-14 md:pt-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight">Performance Overview</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Real-time collaboration and competitive analysis for <span className="text-blue-400 font-semibold">{currentBatchMeta.name}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {batches.length > 0 && onSelectBatch && (
            <BatchSelector
              variant="highlighted"
              selectedBatch={selectedBatch}
              onSelectBatch={onSelectBatch}
              batches={batches}
              counts={counts}
            />
          )}
          <button
            onClick={() => exportToExcel(users)}
            className="px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] sm:text-xs font-medium border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live
          </span>
        </div>
      </div>

      {/* KPI Section - 2 columns on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
        <StatCard
          title="Students"
          value={totalStudents}
          icon={Users}
          color="text-blue-400"
          trend="+100%"
        />
        <StatCard
          title="Solved"
          value={totalSolved.toLocaleString()}
          subtitle="Collective batch effort"
          icon={CheckCircle}
          color="text-green-400"
          trend="Increasing"
        />
        <StatCard
          title="Avg / Student"
          value={avgSolved}
          icon={Target}
          color="text-purple-400"
        />
        <StatCard
          title="Top 10% Cutoff"
          value={top10Users.length > 0 ? top10Users[top10Users.length - 1].solved : 0}
          subtitle="Top 10% entry requirement"
          icon={Trophy}
          color="text-yellow-400"
        />
      </div>



      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">

        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6 md:space-y-8">

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            {/* Comparison Chart */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 sm:p-6">
              <div className="mb-3 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-white">Performance Gap</h3>
                <p className="text-xs sm:text-sm text-slate-400">Average vs Top 10%</p>
              </div>
              <div className="h-52 sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData}>
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#334155', opacity: 0.2 }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                    />
                    <Bar dataKey="solved" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={36}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#64748b' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Difficulty Chart */}
            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 sm:p-6">
              <div className="mb-3 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-white">Difficulty Split</h3>
                <p className="text-xs sm:text-sm text-slate-400">Problem distribution</p>
              </div>
              <div className="h-52 sm:h-64 w-full relative">
                {/* Center Text overlay for Donut */}
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-xl sm:text-3xl font-bold text-white">{totalSolved.toLocaleString()}</span>
                  <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Total</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={difficultyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {difficultyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend */}
              <div className="flex justify-center gap-3 sm:gap-4 mt-2">
                {difficultyData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }}></div>
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Elite Club */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                  <Award className="text-yellow-400" size={20} />
                  Elite Club
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">Top 10% performers leading the batch.</p>
              </div>
              <button
                onClick={() => navigate('/leaderboard')}
                className="text-xs sm:text-sm text-blue-400 font-medium hover:text-blue-300 transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
              {top10Users.map((user, idx) => (
                <div key={user.username} className="group flex items-center gap-3 bg-slate-800/80 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-700/50 hover:border-yellow-500/30 hover:bg-slate-800 transition-all cursor-default">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white shadow-md shadow-yellow-500/20' :
                    idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md' :
                      idx === 2 ? 'bg-gradient-to-br from-orange-400 to-red-600 text-white shadow-md' :
                        'bg-slate-700 text-slate-300'
                    }`}>
                    {idx + 1}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <h4 className="text-white text-xs sm:text-sm font-semibold truncate group-hover:text-blue-400 transition-colors">{user.name}</h4>
                    <p className="text-[11px] sm:text-xs text-slate-400 font-mono">{user.solved} solved</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Toppers Section */}
          {weeklyToppers.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-900/10 to-blue-900/10 border border-emerald-500/20 rounded-2xl md:rounded-3xl p-4 sm:p-6 md:p-8 backdrop-blur-sm">
              <div className="mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Calendar className="text-emerald-400" size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-white">Dominated This Week</h3>
                  <p className="text-xs sm:text-sm text-slate-400">Most active solvers in the last 7 days.</p>
                </div>
              </div>

              <div className="overflow-x-auto pb-2 custom-scrollbar">
                <div className="flex gap-2.5 sm:gap-4 min-w-max">
                  {weeklyToppers.map((user, idx) => (
                    <div key={user.username} className="flex flex-col items-center justify-center bg-slate-800/80 border border-slate-700 p-3 sm:p-4 rounded-xl sm:rounded-2xl min-w-[120px] sm:min-w-[140px] hover:-translate-y-1 transition-transform duration-300">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-700 flex items-center justify-center text-base sm:text-lg font-bold text-emerald-400 mb-2 sm:mb-3 border-2 border-slate-600">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-white font-medium text-xs sm:text-sm text-center mb-0.5 truncate w-full px-1">{user.name}</span>
                      <span className="text-emerald-400 text-[11px] sm:text-xs font-bold">+{user.weeklySolved}</span>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Problems</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6 md:space-y-8">

          {/* Live Activity Feed */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 sm:p-6 flex flex-col h-[420px] sm:h-[500px]">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Zap className="text-yellow-400" fill="currentColor" size={18} />
                Live Feed
              </h3>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>

            <div className="space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-1 sm:pr-2">
              {recentActivity.length > 0 ? recentActivity.map((activity, idx) => {
                const slug = activity.titleSlug || activity.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const problemUrl = `https://leetcode.com/problems/${slug}/`;
                const problemId = activity.question_id || (Array.from(activity.title).reduce((acc, char) => acc + char.charCodeAt(0), 0) % 3000 + 1);

                return (
                  <div key={idx} className="relative pl-5 sm:pl-6 border-l border-slate-700/50 pb-0 last:pb-0">
                    <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${activity.statusDisplay === 'Accepted' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>

                    <div className="flex flex-col gap-1 relative -top-0.5 mb-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white text-xs sm:text-sm uppercase tracking-wide truncate max-w-[150px]">{activity.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap pt-0.5">{formatDate(activity.timestamp)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] sm:text-[11px] uppercase tracking-wider ${activity.statusDisplay === 'Accepted' ? 'text-green-400' : 'text-red-400'
                          }`}>
                          {activity.statusDisplay}
                        </span>
                        {activity.statusDisplay === 'Accepted' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] sm:text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            Easy
                          </span>
                        )}
                      </div>

                      <a
                        href={problemUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-normal text-blue-400 hover:text-blue-300 transition-colors block truncate w-full"
                      >
                        #{problemId} {activity.title}
                      </a>
                    </div>
                  </div>
                )
              }) : (
                <div className="text-center text-slate-500 py-10 text-xs sm:text-sm">No recent activity</div>
              )}
            </div>
          </div>

          {/* Masters of Hard */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Flame className="text-orange-500" fill="currentColor" size={18} />
              Masters of Hard
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {topHardSolvers.map((user, idx) => (
                <div key={user.username} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className={`text-xs sm:text-sm font-mono font-bold w-5 sm:w-6 ${idx < 3 ? 'text-orange-400' : 'text-slate-600'}`}>0{idx + 1}</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-orange-400 transition-colors truncate">{user.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="text-xs sm:text-sm font-mono font-bold text-white">{user.hard}</span>
                    <span className="text-[10px] sm:text-xs text-slate-500">solved</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Languages */}
          <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl md:rounded-3xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
              <Code className="text-pink-400" size={18} />
              Trending Tech
            </h3>
            <div className="space-y-3">
              {languageStats.map((stat, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{stat.name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{stat.value} subs</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(stat.value / (languageStats[0]?.value || 1)) * 100}%`,
                        backgroundColor: LANG_COLORS[idx % LANG_COLORS.length]
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
