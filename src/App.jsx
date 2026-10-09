import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Routes, Route } from "react-router-dom";
import {
  batches as defaultBatches,
  usernames as defaultUsernames,
  userNamesMap as defaultUserNamesMap,
  students as defaultStudents
} from "./data/sampleData";
import UserList from "./component/UserList";
import Sidebar from "./component/Sidebar";
import DashboardStats from "./component/DashboardStats";
import UserProfile from "./component/UserProfile";
import SkillRackStats from "./component/SkillRackStats";
import AITutor from "./component/AITutor";
import Tournaments from "./component/Tournaments";
import LeagueHeads from "./component/LeagueHeads";
import NotFound from "./component/NotFound";
import { RefreshCw, Menu } from "lucide-react";
import "./App.css";

const CACHE_PREFIX = "lc_profile_v2_";
const CACHE_DURATION = 15 * 60 * 1000; // 15 mins cache

const getCachedProfile = (username) => {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${username}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }
  } catch (e) {}
  return null;
};

const setCachedProfile = (username, data) => {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${username}`,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch (e) {}
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const App = () => {
  const [usersMap, setUsersMap] = useState({});
  const [loadedBatches, setLoadedBatches] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Selected batch state - defaults to the very first batch in the list (e.g. batch-2030)
  const defaultInitialBatch = defaultBatches[0]?.id || "batch-2030";

  const normalizeBatch = (b) => {
    if (!b) return defaultInitialBatch;
    if (b === "2023-2028") return "batch-2028";
    if (b === "2024-2029") return "batch-2029";
    if (b === "2022-2027") return "batch-2027";
    return b;
  };

  const [selectedBatch, setSelectedBatch] = useState(() => {
    const saved = localStorage.getItem("selected_batch");
    if (!saved || saved === "batch-2029" || saved === "2024-2029") return defaultInitialBatch;
    if (saved === "2023-2028") return "batch-2028";
    if (saved === "2022-2027") return "batch-2027";
    return saved;
  });

  const allBatches = defaultBatches;
  const allStudents = defaultStudents;
  const allUsernames = defaultUsernames;
  const allUserNamesMap = defaultUserNamesMap;

  const studentBatchMap = useMemo(() => {
    const map = {};
    allStudents.forEach(s => {
      if (s.username) map[s.username] = normalizeBatch(s.batch);
    });
    return map;
  }, [allStudents]);

  // Convert usersMap to array for backwards compatibility
  const usersData = useMemo(() => Object.values(usersMap), [usersMap]);

  // Compute student count per batch directly from static list
  const batchCounts = useMemo(() => {
    const counts = { all: allStudents.length };
    allStudents.forEach(s => {
      const b = normalizeBatch(s.batch);
      counts[b] = (counts[b] || 0) + 1;
    });
    return counts;
  }, [allStudents]);

  // Fetch LeetCode and SkillRack user data for a specific batch or 'all'
  const fetchBatchData = useCallback(async (batchToFetch, forceRefresh = false) => {
    // Determine which usernames need to be fetched
    let targetStudents = [];
    if (batchToFetch === 'all') {
      targetStudents = allStudents;
    } else {
      targetStudents = allStudents.filter(s => normalizeBatch(s.batch) === batchToFetch);
    }

    if (targetStudents.length === 0) {
      setLoading(false);
      return;
    }

    setError("");
    if (Object.keys(usersMap).length === 0) {
      setLoading(true);
    } else {
      setLoadingBatch(true);
    }
    if (forceRefresh) setIsRefreshing(true);

    try {
      const API_BASE_URL = "https://leetcode-api-ecru.vercel.app";

      // 1. Fetch static CDN dataset if available
      let jsonStudentsMap = {};
      try {
        const cdnRes = await axios.get('/skillrack-data.json', { timeout: 3000 });
        const payload = cdnRes?.data;
        const cdnStudents = Array.isArray(payload) ? payload : payload?.students;
        const cdnLastUpdated = payload?.lastUpdated || localStorage.getItem('skillrack_last_synced') || '';

        if (cdnLastUpdated) {
          setLastUpdated(cdnLastUpdated);
          localStorage.setItem('skillrack_last_synced', cdnLastUpdated);
        }

        if (Array.isArray(cdnStudents)) {
          cdnStudents.forEach(s => {
            if (s.username) jsonStudentsMap[s.username] = s;
          });
        }
      } catch (e) {}

      // 2. Read cached SkillRack data from localStorage if available
      let cachedStudentsMap = {};
      try {
        const cached = localStorage.getItem('skillrack_cached_students');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            parsed.forEach(s => {
              if (s.username) cachedStudentsMap[s.username] = s;
            });
          }
        }
      } catch (e) {}

      const skillrackMap = targetStudents.reduce((acc, s) => {
        if (s.username) {
          const cached = cachedStudentsMap[s.username];
          const cdn = jsonStudentsMap[s.username];
          acc[s.username] = {
            points: cached?.skillrackPoints ?? cdn?.skillrackPoints ?? s.skillrackPoints ?? 0,
            collegeId: cached?.collegeId || cdn?.collegeId || s.collegeId || "",
            codeTutor: cached?.codeTutor ?? cdn?.codeTutor ?? s.codeTutor ?? 0,
            codeTracks: cached?.codeTracks ?? cdn?.codeTracks ?? s.codeTracks ?? 0,
            dailyChallenge: cached?.dailyChallenge ?? cdn?.dailyChallenge ?? s.dailyChallenge ?? 0,
            dailyTest: cached?.dailyTest ?? cdn?.dailyTest ?? s.dailyTest ?? 0,
            codeTests: cached?.codeTests ?? cdn?.codeTests ?? s.codeTests ?? 0,
            url: cached?.skillrackUrl || cdn?.skillrackUrl || s.skillrackUrl || "",
            batch: normalizeBatch(s.batch)
          };
        }
        return acc;
      }, {});

      // 3. Process LeetCode profiles with chunking and caching
      const fetchStudentProfile = async (s) => {
        const username = s.username;
        const studentBatch = normalizeBatch(s.batch || studentBatchMap[username]);
        const studentName = allUserNamesMap[username] || s.name || username;

        if (!forceRefresh) {
          const cachedData = getCachedProfile(username);
          if (cachedData) {
            return {
              username: username,
              name: studentName,
              batch: studentBatch,
              rank: cachedData.ranking || "N/A",
              easy: cachedData.easySolved || 0,
              medium: cachedData.mediumSolved || 0,
              hard: cachedData.hardSolved || 0,
              solved: cachedData.totalSolved || 0,
              skillrackPoints: skillrackMap[username]?.points || 0,
              collegeId: skillrackMap[username]?.collegeId || "",
              codeTutor: skillrackMap[username]?.codeTutor || 0,
              codeTracks: skillrackMap[username]?.codeTracks || 0,
              dailyChallenge: skillrackMap[username]?.dailyChallenge || 0,
              dailyTest: skillrackMap[username]?.dailyTest || 0,
              codeTests: skillrackMap[username]?.codeTests || 0,
              skillrackUrl: skillrackMap[username]?.url || "",
              recentSubmissions: cachedData.recentSubmissions || [],
            };
          }
        }

        try {
          const res = await axios.get(`${API_BASE_URL}/userProfile/${username}`, { timeout: 8000 });
          const data = res.data;
          setCachedProfile(username, data);

          return {
            username: username,
            name: studentName,
            batch: studentBatch,
            rank: data.ranking || "N/A",
            easy: data.easySolved || 0,
            medium: data.mediumSolved || 0,
            hard: data.hardSolved || 0,
            solved: data.totalSolved || 0,
            skillrackPoints: skillrackMap[username]?.points || 0,
            collegeId: skillrackMap[username]?.collegeId || "",
            codeTutor: skillrackMap[username]?.codeTutor || 0,
            codeTracks: skillrackMap[username]?.codeTracks || 0,
            dailyChallenge: skillrackMap[username]?.dailyChallenge || 0,
            dailyTest: skillrackMap[username]?.dailyTest || 0,
            codeTests: skillrackMap[username]?.codeTests || 0,
            skillrackUrl: skillrackMap[username]?.url || "",
            recentSubmissions: data.recentSubmissions || [],
          };
        } catch (err) {
          // Fallback to stale cache if present
          try {
            const raw = localStorage.getItem(`${CACHE_PREFIX}${username}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.data) {
                const stale = parsed.data;
                return {
                  username: username,
                  name: studentName,
                  batch: studentBatch,
                  rank: stale.ranking || "N/A",
                  easy: stale.easySolved || 0,
                  medium: stale.mediumSolved || 0,
                  hard: stale.hardSolved || 0,
                  solved: stale.totalSolved || 0,
                  skillrackPoints: skillrackMap[username]?.points || 0,
                  collegeId: skillrackMap[username]?.collegeId || "",
                  codeTutor: skillrackMap[username]?.codeTutor || 0,
                  codeTracks: skillrackMap[username]?.codeTracks || 0,
                  dailyChallenge: skillrackMap[username]?.dailyChallenge || 0,
                  dailyTest: skillrackMap[username]?.dailyTest || 0,
                  codeTests: skillrackMap[username]?.codeTests || 0,
                  skillrackUrl: skillrackMap[username]?.url || "",
                  recentSubmissions: stale.recentSubmissions || [],
                };
              }
            }
          } catch (e) {}

          return {
            username: username,
            name: studentName,
            batch: studentBatch,
            rank: "N/A",
            easy: 0,
            medium: 0,
            hard: 0,
            solved: 0,
            skillrackPoints: skillrackMap[username]?.points || 0,
            collegeId: skillrackMap[username]?.collegeId || "",
            codeTutor: skillrackMap[username]?.codeTutor || 0,
            codeTracks: skillrackMap[username]?.codeTracks || 0,
            dailyChallenge: skillrackMap[username]?.dailyChallenge || 0,
            dailyTest: skillrackMap[username]?.dailyTest || 0,
            codeTests: skillrackMap[username]?.codeTests || 0,
            skillrackUrl: skillrackMap[username]?.url || "",
            recentSubmissions: [],
          };
        }
      };

      // Filter out users that are already fetched unless forceRefresh
      const toFetchList = forceRefresh
        ? targetStudents
        : targetStudents.filter(s => !usersMap[s.username]);

      let newResults = [];
      if (toFetchList.length > 0) {
        // Fetch in batches of 12 for optimal concurrency and no rate-limits
        const chunks = chunkArray(toFetchList, 12);
        for (const chunk of chunks) {
          const chunkResults = await Promise.all(chunk.map(s => fetchStudentProfile(s)));
          newResults.push(...chunkResults);
        }
      }

      setUsersMap(prev => {
        const next = { ...prev };
        newResults.forEach(u => {
          next[u.username] = u;
        });
        return next;
      });

      setLoadedBatches(prev => new Set([...prev, batchToFetch]));
      setLoading(false);
      setLoadingBatch(false);
      setIsRefreshing(false);
    } catch (err) {
      setError(err.message || "An error occurred while fetching data.");
      setLoading(false);
      setLoadingBatch(false);
      setIsRefreshing(false);
    }
  }, [allStudents, allUserNamesMap, studentBatchMap, usersMap]);

  // Load the selected batch immediately when it changes or on mount
  useEffect(() => {
    fetchBatchData(selectedBatch);
  }, [selectedBatch]);

  const handleSelectBatch = useCallback((batchId) => {
    setSelectedBatch(batchId);
    localStorage.setItem("selected_batch", batchId);
  }, []);

  // Compute filtered users based on selected batch
  const activeUsers = useMemo(() => {
    if (selectedBatch === "all") return usersData;
    return usersData.filter(u => normalizeBatch(u.batch) === selectedBatch);
  }, [usersData, selectedBatch]);

  const LoadingScreen = () => (
    <div className="flex flex-col justify-center items-center h-full min-h-[60vh]">
      <div className="animate-spin rounded-full border-t-4 border-b-4 border-blue-500 w-16 h-16 mb-4"></div>
      <p className="text-gray-400 animate-pulse font-medium">Fetching multi-batch rankings...</p>
    </div>
  );

  const ErrorScreen = ({ message }) => (
    <div className="flex justify-center items-center h-full min-h-[60vh] p-6">
      <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 text-center max-w-lg mx-auto backdrop-blur-sm">
        <p className="text-xl text-red-400 font-semibold mb-2">Oops!</p>
        <p className="text-gray-300 mb-4">{message}</p>
        <button
          onClick={() => fetchBatchData(selectedBatch, true)}
          className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex bg-[#0f172a] min-h-screen text-white font-sans overflow-hidden">
      {/* Background decorative elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar with Batch Support */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className={`flex-1 relative z-10 h-screen overflow-y-auto custom-scrollbar transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Mobile floating open sidebar button */}
        <div className="md:hidden fixed top-3 left-3 z-30">
          <button
            className="text-slate-300 hover:text-white p-2 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-lg backdrop-blur-md transition-colors cursor-pointer"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {loading ? (
           <LoadingScreen /> 
        ) : error ? (
           <ErrorScreen message={error} />
        ) : (
          <Routes>
            <Route 
              path="/" 
              element={
                <DashboardStats 
                  users={activeUsers} 
                  allUsers={usersData}
                  selectedBatch={selectedBatch}
                  onSelectBatch={handleSelectBatch}
                  batches={allBatches}
                  counts={batchCounts}
                  isLoadingBatch={loadingBatch}
                />
              } 
            />
            <Route 
              path="/skillrack" 
              element={
                <SkillRackStats 
                  users={activeUsers} 
                  lastUpdated={lastUpdated}
                />
              } 
            />
            <Route 
              path="/leaderboard" 
              element={
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden m-4 md:m-6">
                  <UserList 
                    users={activeUsers} 
                    allUsers={usersData}
                    selectedBatch={selectedBatch}
                    onSelectBatch={handleSelectBatch}
                    batches={allBatches}
                    counts={batchCounts}
                    isLoadingBatch={loadingBatch}
                  />
                </div>
              } 
            />
            <Route path="/user/:username" element={<UserProfile />} />
            <Route 
              path="/dsa-tutor" 
              element={
                <AITutor 
                  users={activeUsers}
                  allUsers={usersData}
                  selectedBatch={selectedBatch}
                  batches={allBatches}
                />
              } 
            />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/league-heads" element={<LeagueHeads />} />
            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        )}
      </main>
    </div>
  );
};

export default App;