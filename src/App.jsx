import React, { useState, useEffect } from "react";
import axios from "axios";
import { Routes, Route, useLocation } from "react-router-dom";
import { usernames, userNamesMap, students } from "./data/sampleData";
import UserList from "./component/UserList";
import Sidebar from "./component/Sidebar";
import DashboardStats from "./component/DashboardStats";
import UserProfile from "./component/UserProfile";
import SkillRackStats from "./component/SkillRackStats";
import AITutor from "./component/AITutor";
import Tournaments from "./component/Tournaments";
import LeagueHeads from "./component/LeagueHeads";
import NotFound from "./component/NotFound";
import "./App.css";

const App = () => {
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [skillrackSyncStatus, setSkillrackSyncStatus] = useState({ isSyncing: false, current: 0, total: 0, message: '' });
  const location = useLocation();

  useEffect(() => {
    const fetchUserData = async () => {
      setError("");
      try {
        const API_BASE_URL = "https://leetcode-api-ecru.vercel.app"; 

        // 1. Fetch static CDN dataset if available
        let jsonStudentsMap = {};
        try {
          const cdnRes = await axios.get('/skillrack-data.json', { timeout: 3000 });
          if (Array.isArray(cdnRes.data)) {
            cdnRes.data.forEach(s => {
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

        const skillrackMap = students.reduce((acc, s) => {
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
              url: cached?.skillrackUrl || cdn?.skillrackUrl || s.skillrackUrl || ""
            };
          }
          return acc;
        }, {});

        const promises = usernames.map((username) =>
          axios
            .get(`${API_BASE_URL}/userProfile/${username}`)
            .then((res) => {
              const data = res.data;
              return {
                username: username,
                name: userNamesMap[username] || username,
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
            })
            .catch((error) => {
              return {
                username: username,
                name: userNamesMap[username] || username,
                rank: "Error",
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
            })
        );

        const results = await Promise.all(promises);
        setUsersData(results);
        setLoading(false);

        // AUTOMATICALLY GET LIVE SKILLRACK STATS ON OPEN / REFRESH
        autoSyncSkillRack(results, jsonStudentsMap);
      } catch (err) {
        setError(err.message || "An error occurred while fetching data.");
        setLoading(false);
      }
    };

    const autoSyncSkillRack = async (currentUsers, jsonStudentsMap = {}) => {
      const eligibleStudents = currentUsers.filter(u => 
        u.skillrackUrl && (u.skillrackUrl.includes('profile') || u.skillrackUrl.includes('resume'))
      );
      if (eligibleStudents.length === 0) return;

      setSkillrackSyncStatus({ 
        isSyncing: true, 
        current: 0, 
        total: eligibleStudents.length, 
        message: 'Auto-syncing live SkillRack data...' 
      });

      const updatedUsers = [...currentUsers];

      for (let i = 0; i < eligibleStudents.length; i++) {
        const student = eligibleStudents[i];
        setSkillrackSyncStatus({ 
          isSyncing: true, 
          current: i + 1, 
          total: eligibleStudents.length, 
          message: `Auto-syncing ${student.name}...` 
        });

        try {
          const encoded = encodeURIComponent(student.skillrackUrl);
          let liveData = null;

          const isValidData = (d) => d && typeof d === 'object' && !d.error && typeof d.skillrackPoints === 'number' && d.skillrackPoints >= 0;

          // 1. Try /api/skillrack/scrape (handled by Vite middleware or Netlify rewrite)
          try {
            const res1 = await axios.get(`/api/skillrack/scrape?url=${encoded}`, { timeout: 8000 });
            if (isValidData(res1.data)) liveData = res1.data;
          } catch (e1) {}

          // 2. Try Netlify Functions endpoint (on Netlify deployments)
          if (!liveData) {
            try {
              const res0 = await axios.get(`/.netlify/functions/scrape?url=${encoded}`, { timeout: 8000 });
              if (isValidData(res0.data)) liveData = res0.data;
            } catch (e0) {}
          }

          // 3. Fallback to local proxy on port 5001
          if (!liveData) {
            try {
              const res3 = await axios.get(`http://localhost:5001/scrape?url=${encoded}`, { timeout: 6000 });
              if (isValidData(res3.data)) liveData = res3.data;
            } catch (e3) {}
          }

          // 4. Reliable dataset fallback (if cloud functions get blocked by Cloudflare 403 on Netlify)
          if (!liveData) {
            const fallbackStudent = students.find(s => s.username === student.username) || jsonStudentsMap[student.username];
            if (fallbackStudent && fallbackStudent.skillrackPoints !== undefined) {
              liveData = {
                codeTutor: fallbackStudent.codeTutor || 0,
                codeTracks: fallbackStudent.codeTracks || 0,
                dailyChallenge: fallbackStudent.dailyChallenge || 0,
                dailyTest: fallbackStudent.dailyTest || 0,
                codeTests: fallbackStudent.codeTests || 0,
                skillrackPoints: fallbackStudent.skillrackPoints || 0
              };
            }
          }

          if (liveData) {
            const userIdx = updatedUsers.findIndex(u => u.username === student.username);
            if (userIdx !== -1) {
              const points = liveData.skillrackPoints !== undefined ? liveData.skillrackPoints :
                             (((liveData.codeTracks || 0) * 2) + ((liveData.dailyChallenge || 0) * 2) + ((liveData.dailyTest || 0) * 20) + ((liveData.codeTests || 0) * 30));
              updatedUsers[userIdx] = { 
                ...updatedUsers[userIdx], 
                ...liveData,
                skillrackPoints: points
              };
              setUsersData([...updatedUsers]);
              try {
                localStorage.setItem('skillrack_cached_students', JSON.stringify(updatedUsers));
              } catch (e) {}
            }
          }
        } catch (err) {
          console.warn(`Live sync error for ${student.name}:`, err.message);
        }

        await new Promise(r => setTimeout(r, 60));
      }

      setSkillrackSyncStatus({ 
        isSyncing: false, 
        current: eligibleStudents.length, 
        total: eligibleStudents.length, 
        message: 'Live Synced' 
      });

      // Cache to localStorage
      try {
        localStorage.setItem('skillrack_cached_students', JSON.stringify(updatedUsers));
        localStorage.setItem('skillrack_last_synced', new Date().toISOString());
      } catch (e) {}

      // Auto-save to sampleData.js if server is reachable
      try {
        await axios.post('/api/skillrack/update-students', { students: updatedUsers });
      } catch (e) {
        try {
          await axios.post('http://localhost:5001/update-students', { students: updatedUsers });
        } catch (e2) {}
      }
    };

    fetchUserData(); 
  }, []);

  const LoadingScreen = () => (
    <div className="flex flex-col justify-center items-center h-full">
      <div className="animate-spin rounded-full border-t-4 border-b-4 border-blue-500 w-16 h-16 mb-4"></div>
      <p className="text-gray-400 animate-pulse">Fetching latest rankings...</p>
    </div>
  );

  const ErrorScreen = ({ message }) => (
    <div className="flex justify-center items-center h-full">
       <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center max-w-lg mx-auto backdrop-blur-sm">
        <p className="text-xl text-red-400 font-semibold mb-2">Oops!</p>
        <p className="text-gray-300">{message}</p>
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

      {/* Only show Sidebar if NOT on a user profile page (optional, user preference, but usually sidebar is good everywhere. 
          However, for Full Page Profile, maybe we want it hidden? 
          The design in UserProfile had a back button. Let's keep sidebar for main views.
          Refined: Keep sidebar always. Profile page will overlay or be in main area. 
      */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className={`flex-1 relative z-10 h-screen overflow-y-auto custom-scrollbar transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Mobile Header */}
        <div className="md:hidden p-4 flex items-center justify-between border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
           <span className="font-bold text-lg">LeetRank</span>
           <button 
             className="text-gray-400 hover:text-white transition-colors" 
             onClick={() => setIsSidebarOpen(true)}
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
             </svg>
           </button>
        </div>

        {loading ? (
           <LoadingScreen /> 
        ) : error ? (
           <ErrorScreen message={error} />
        ) : (
          <Routes>
            <Route path="/" element={<DashboardStats users={usersData} />} />
            <Route path="/skillrack" element={
              <SkillRackStats 
                users={usersData} 
                syncStatus={skillrackSyncStatus}
                isSyncing={skillrackSyncStatus.isSyncing}
                onUsersUpdated={(updated) => setUsersData(prev => prev.map(u => {
                  const m = updated.find(s => s.username === u.username);
                  return m ? { ...u, ...m } : u;
                }))}
              />
            } />
            <Route path="/leaderboard" element={
              <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden m-6">
                 <UserList users={usersData} />
              </div>
            } />
            <Route path="/user/:username" element={<UserProfile />} />
            <Route path="/dsa-tutor" element={<AITutor />} />
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