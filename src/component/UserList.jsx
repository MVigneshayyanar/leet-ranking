import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BatchSelector from "./BatchSelector";

const getRankBadge = (rank) => {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="font-mono font-bold text-gray-400">#{rank}</span>;
};

const getBatchPill = (batch = '') => {
  if (batch.includes('2028')) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Batch 2028</span>;
  }
  if (batch.includes('2029')) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Batch 2029</span>;
  }
  if (batch.includes('2027')) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Batch 2027</span>;
  }
  const digits = batch.match(/\d+/);
  const label = digits ? `Batch ${digits[0]}` : (batch || 'General');
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">{label}</span>;
};

const UserList = ({
  users = [],
  selectedBatch = 'batch-2028',
  onSelectBatch,
  batches = [],
  counts = {},
  onOpenManageModal
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.collegeId && user.collegeId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedUsers = filteredUsers.sort((a, b) => {
    // Handle N/A or Error ranks by pushing them to the bottom
    const rankA = typeof a.rank === 'number' ? a.rank : Infinity;
    const rankB = typeof b.rank === 'number' ? b.rank : Infinity;
    return rankA - rankB;
  });

  const handleUserClick = (username) => {
    navigate(`/user/${username}`);
  };

  const currentBatchObj = selectedBatch === 'all'
    ? { name: 'All Batches' }
    : batches.find(b => b.id === selectedBatch) || {
        name: selectedBatch.includes('2028') ? 'Batch 2028' : (selectedBatch.match(/\d+/) ? `Batch ${selectedBatch.match(/\d+/)[0]}` : selectedBatch)
      };

  return (
    <div className="w-full pb-16">
      {/* Search and Top Stats Header */}
      <div className="p-3 sm:p-5 md:p-6 bg-slate-800/80 border-b border-slate-700/50 space-y-3 pt-14 md:pt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              LeetCode Ranking
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
              Showing <span className="text-white font-semibold">{sortedUsers.length}</span> students in <span className="text-blue-400 font-semibold">{currentBatchObj.name}</span>
            </p>
          </div>

          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by name, handle, or college ID..."
              className="block w-full pl-9 pr-3 py-1.5 sm:py-2 border border-slate-600 rounded-xl leading-5 bg-slate-700/50 text-gray-200 placeholder-gray-500 focus:outline-none focus:bg-slate-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm transition duration-150 ease-in-out"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Quick Filter Pills - Only Batch Selection kept here */}
        {batches.length > 0 && onSelectBatch && (
          <div className="pt-0.5 overflow-x-auto no-scrollbar">
            <BatchSelector
              variant="pills"
              selectedBatch={selectedBatch}
              onSelectBatch={onSelectBatch}
              batches={batches}
              counts={counts}
            />
          </div>
        )}
      </div>

      <div className="p-3 sm:p-5 md:p-6">
        {sortedUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-base">No students found matching your criteria.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-700/50 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              <table className="min-w-full divide-y divide-slate-700/50">
                <thead className="bg-slate-800 sticky top-0 z-10 shadow-md">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider bg-slate-800">Rank</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider bg-slate-800">Student</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider bg-slate-800">Batch</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider bg-slate-800">Global Rank</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider bg-slate-800">Total Solved</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-green-400 uppercase tracking-wider bg-slate-800">Easy</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-yellow-400 uppercase tracking-wider bg-slate-800">Medium</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-red-400 uppercase tracking-wider bg-slate-800">Hard</th>
                    <th scope="col" className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider bg-slate-800">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800/30 divide-y divide-slate-700/50">
                  {sortedUsers.map((user, index) => (
                    <tr 
                      key={user.username} 
                      className="hover:bg-slate-700/30 transition-colors duration-150 group cursor-pointer"
                      onClick={() => handleUserClick(user.username)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getRankBadge(index + 1)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {user.name.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">{user.name}</div>
                            <div className="text-xs text-gray-400 flex items-center gap-1.5">
                              <span>@{user.username}</span>
                              {user.collegeId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-500">{user.collegeId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getBatchPill(user.batch)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-300 font-mono">
                        {(typeof user.rank === 'number') ? user.rank.toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900/50 text-blue-200 border border-blue-700/50">
                          {user.solved}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-300">
                        {user.easy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-300">
                        {user.medium}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-300">
                        {user.hard}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserClick(user.username);
                          }}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-full hover:bg-white/5 opacity-80 hover:opacity-100"
                          title="View Profile"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Compact Mobile Card View */}
            <div className="md:hidden space-y-2.5">
              {sortedUsers.map((user, index) => (
                <div 
                  key={user.username} 
                  className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 shadow-sm hover:border-slate-500/50 transition-all active:scale-[0.99] cursor-pointer"
                  onClick={() => handleUserClick(user.username)}
                >
                  {/* Top Row: Rank + Avatar + Name & Batch + Solved Badge */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="shrink-0 flex items-center justify-center w-7 text-center">
                        {index < 3 ? (
                          <span className="text-xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                        ) : (
                          <span className="text-xs font-mono font-bold text-slate-400">#{index + 1}</span>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-white font-semibold text-xs truncate max-w-[150px]">{user.name}</h4>
                          {getBatchPill(user.batch)}
                        </div>
                        <p className="text-slate-400 text-[10px] truncate">@{user.username}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2.5 py-1 inline-flex text-xs font-bold rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30">
                        {user.solved} <span className="text-[10px] text-blue-400 font-normal ml-1">pts</span>
                      </span>
                    </div>
                  </div>

                  {/* Compact Stats Row: Global Rank & Difficulty breakdown */}
                  <div className="mt-2.5 pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                    <div className="text-slate-400 font-mono text-[10px]">
                      Rank: <span className="text-slate-300 font-medium">{(typeof user.rank === 'number') ? user.rank.toLocaleString() : 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-green-400 font-semibold">{user.easy}<span className="text-[9px] text-slate-500 font-sans ml-0.5">E</span></span>
                      <span className="text-slate-600">•</span>
                      <span className="text-yellow-400 font-semibold">{user.medium}<span className="text-[9px] text-slate-500 font-sans ml-0.5">M</span></span>
                      <span className="text-slate-600">•</span>
                      <span className="text-red-400 font-semibold">{user.hard}<span className="text-[9px] text-slate-500 font-sans ml-0.5">H</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserList;