import React, { useState, useEffect, useMemo } from 'react';
import { 
  loadRecitations, 
  saveRecitations, 
  loadSavedTheme,
  saveTheme,
  getTodayKey, 
  triggerHaptic, 
  playClickSound 
} from './Utils/storage';
import { 
  CheckCircle2, 
  Plus, 
  Sparkles, 
  Share2, 
  Bell, 
  BarChart3, 
  Flame, 
  RotateCcw, 
  X, 
  Clock, 
  ArrowLeft,
  Volume2,
  VolumeX,
  BookOpen,
  Award,
  Edit3,
  Trash2,
  Palette,
  TrendingUp,
  Calendar
} from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// The two clean dark themes with high contrast
const THEMES = {
  midnight: {
    name: 'Midnight Kaaba',
    bg: 'bg-neutral-950 text-neutral-100',
    card: 'bg-neutral-900 border-neutral-800 text-neutral-100 shadow-md',
    header: 'bg-neutral-900/95 border-neutral-800 text-white',
    primary: 'bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold',
    accentText: 'text-amber-400',
    badge: 'bg-amber-400/20 text-amber-300 border border-amber-400/30',
    hero: 'from-neutral-900 to-neutral-800 text-amber-200 border border-amber-500/30',
    counterBtn: 'from-amber-500 to-amber-700 text-neutral-950 shadow-amber-500/20'
  },
  indigo: {
    name: 'Celestial Indigo',
    bg: 'bg-slate-950 text-slate-100',
    card: 'bg-slate-900 border-slate-800 text-slate-100 shadow-md',
    header: 'bg-slate-900/95 border-slate-800 text-white',
    primary: 'bg-indigo-500 hover:bg-indigo-600 text-white font-bold',
    accentText: 'text-indigo-400',
    badge: 'bg-indigo-400/20 text-indigo-300 border border-indigo-400/30',
    hero: 'from-indigo-950 to-slate-900 text-indigo-200 border border-indigo-500/30',
    counterBtn: 'from-indigo-500 to-indigo-700 text-white shadow-indigo-600/30'
  }
};

export default function App() {
  const [recitations, setRecitations] = useState(loadRecitations);
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = loadSavedTheme();
    return THEMES[saved] ? saved : 'midnight';
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeRecitationId, setActiveRecitationId] = useState(null);
  
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'theme'
  const [editingItem, setEditingItem] = useState(null);

  const [freeCount, setFreeCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState('default');
  const [insightFilter, setInsightFilter] = useState('all');

  const todayStr = getTodayKey();
  const theme = THEMES[currentTheme] || THEMES.midnight;

  const activeRecitation = useMemo(() => {
    return recitations.find(r => r.id === activeRecitationId) || null;
  }, [recitations, activeRecitationId]);

  useEffect(() => {
    saveRecitations(recitations);
  }, [recitations]);

  useEffect(() => {
    saveTheme(currentTheme);
  }, [currentTheme]);

  // Notifications Check
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }

    const interval = setInterval(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        const now = new Date();
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;
        const dayOfWeek = now.getDay();

        recitations.forEach((rec) => {
          if (rec.reminderTime === currentTimeStr) {
            let isDueToday = false;
            if (rec.frequency === 'daily') isDueToday = true;
            else if (rec.frequency === 'weekly' && rec.weeklyDays?.includes(dayOfWeek)) isDueToday = true;
            else if (rec.frequency === 'specific_date' && rec.specificDate === todayStr) isDueToday = true;

            const currentCount = rec.history[todayStr] || 0;
            if (isDueToday && currentCount < rec.target) {
              new Notification(`Time for ${rec.title}`, {
                body: `Goal: ${rec.target} times. Tap to recite.`,
                icon: '/favicon.ico'
              });
            }
          }
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [recitations, todayStr]);

  const requestNotificationAccess = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationStatus(permission);
      if (permission === 'granted') {
        new Notification("Notifications Enabled", {
          body: "You will be alerted when it's time to recite."
        });
      }
    } else {
      alert("Notifications are not supported on this browser.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Daily Dhikr & Durood Tracker',
          text: 'Track your daily Durood and recitations.',
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('App link copied to clipboard!');
    }
  };

  const handleIncrement = (recitationId) => {
    triggerHaptic(40);
    if (soundEnabled) playClickSound();

    setRecitations(prev => prev.map(rec => {
      if (rec.id === recitationId) {
        const current = rec.history[todayStr] || 0;
        return {
          ...rec,
          history: {
            ...rec.history,
            [todayStr]: current + 1
          }
        };
      }
      return rec;
    }));
  };

  const handleDecrement = (recitationId) => {
    triggerHaptic(20);
    setRecitations(prev => prev.map(rec => {
      if (rec.id === recitationId) {
        const current = rec.history[todayStr] || 0;
        if (current <= 0) return rec;
        return {
          ...rec,
          history: {
            ...rec.history,
            [todayStr]: current - 1
          }
        };
      }
      return rec;
    }));
  };

  const resetTodayCount = (recitationId) => {
    if (confirm("Reset today's count to 0?")) {
      setRecitations(prev => prev.map(rec => {
        if (rec.id === recitationId) {
          const newHist = { ...rec.history };
          delete newHist[todayStr];
          return { ...rec, history: newHist };
        }
        return rec;
      }));
    }
  };

  const handleDelete = (recitationId) => {
    if (confirm("Are you sure you want to delete this recitation?")) {
      setRecitations(prev => prev.filter(r => r.id !== recitationId));
      if (activeRecitationId === recitationId) {
        setActiveRecitationId(null);
      }
      setModalMode(null);
      setEditingItem(null);
    }
  };

  const activeTodayRecitations = useMemo(() => {
    const todayIndex = new Date().getDay();
    return recitations.filter(r => {
      if (r.frequency === 'daily') return true;
      if (r.frequency === 'weekly' && r.weeklyDays?.includes(todayIndex)) return true;
      if (r.frequency === 'specific_date' && r.specificDate === todayStr) return true;
      return false;
    });
  }, [recitations, todayStr]);

  const analytics = useMemo(() => {
    let totalAllTime = 0;
    let totalThisMonth = 0;
    let totalToday = 0;
    const currentMonthPrefix = todayStr.substring(0, 7);

    const targetList = insightFilter === 'all' 
      ? recitations 
      : recitations.filter(r => r.id === insightFilter);

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayName = WEEKDAYS[d.getDay()];
      last7Days.push({ dateKey: key, label: dayName, count: 0 });
    }

    targetList.forEach(rec => {
      Object.entries(rec.history).forEach(([date, count]) => {
        totalAllTime += count;
        if (date.startsWith(currentMonthPrefix)) totalThisMonth += count;
        if (date === todayStr) totalToday += count;

        const dayMatch = last7Days.find(d => d.dateKey === date);
        if (dayMatch) {
          dayMatch.count += count;
        }
      });
    });

    return { totalToday, totalThisMonth, totalAllTime, last7Days };
  }, [recitations, insightFilter, todayStr]);

  return (
    <div className={`max-w-md mx-auto min-h-screen flex flex-col justify-between font-sans antialiased pb-24 select-none ${theme.bg}`}>
      
      {/* Top Header */}
      <header className={`px-5 py-4 sticky top-0 z-20 flex items-center justify-between backdrop-blur-md border-b ${theme.header}`}>
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`${theme.accentText} text-lg`}>✦</span>
            <h1 className="font-bold text-lg tracking-tight">Dhikr & Durood</h1>
          </div>
          <p className="text-[11px] text-neutral-400 font-medium">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {notificationStatus !== 'granted' && (
            <button 
              onClick={requestNotificationAccess}
              className="p-2 text-amber-400 hover:bg-white/10 rounded-full transition"
              title="Enable Reminders"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          <button 
            onClick={() => setModalMode('theme')} 
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition"
            title="Change Theme"
          >
            <Palette className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            {soundEnabled ? <Volume2 className={`w-4 h-4 ${theme.accentText}`} /> : <VolumeX className="w-4 h-4 text-neutral-600" />}
          </button>

          <button 
            onClick={handleShare} 
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 px-4 py-5">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            
            {/* Spiritual Banner with Uncropped Calligraphy */}
            <div className={`bg-linear-to-br ${theme.hero} rounded-2xl p-5 shadow-sm relative flex items-center justify-between`}>
              <div className="relative z-10 max-w-[70%]">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" /> Daily Target Progress
                </div>
                <h3 className="text-xl font-bold leading-tight text-white">Recite Durood on the Prophet</h3>
                <p className="text-xs text-neutral-300 mt-1">
                  "Whoever sends blessings upon me once, Allah will send blessings upon him tenfold."
                </p>
              </div>

              {/* Beautiful, fully visible Arabic symbol */}
              <div className="shrink-0 text-amber-300/30 font-serif text-6xl leading-none select-none pl-2">
                ﷺ
              </div>
            </div>

            {/* Recitations Section Header */}
            <div className="flex items-center justify-between pt-2">
              <h2 className="font-semibold text-xs tracking-wider uppercase text-neutral-400">
                Today's Recitations ({activeTodayRecitations.length})
              </h2>
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setModalMode('add');
                }}
                className={`text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg border border-current transition ${theme.accentText} bg-white/5`}
              >
                <Plus className="w-3.5 h-3.5" /> Add Dua
              </button>
            </div>

            {/* Recitations List */}
            <div className="space-y-3">
              {activeTodayRecitations.map((rec) => {
                const count = rec.history[todayStr] || 0;
                const isCompleted = count >= rec.target;
                const percentage = Math.min(100, Math.round((count / rec.target) * 100));

                return (
                  <div 
                    key={rec.id}
                    onClick={() => setActiveRecitationId(rec.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer active:scale-[0.99] relative overflow-hidden ${theme.card} ${
                      isCompleted ? 'ring-1 ring-amber-500/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-white">{rec.title}</h4>
                          {isCompleted && (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.badge}`}>
                              <CheckCircle2 className="w-3 h-3" /> Done
                            </span>
                          )}
                        </div>
                        {rec.arabic && (
                          <p className="text-xs text-neutral-400 line-clamp-1 mt-1 font-arabic text-right dir-rtl">
                            {rec.arabic}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-400">
                          {rec.reminderTime && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" /> {rec.reminderTime}
                            </span>
                          )}
                          {rec.frequency === 'weekly' && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-400" /> Weekly
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Count Display */}
                      <div className="text-right flex flex-col items-end">
                        <div>
                          <span className={`text-2xl font-black ${isCompleted ? theme.accentText : 'text-white'}`}>
                            {count}
                          </span>
                          <span className="text-xs text-neutral-500 font-medium">/{rec.target}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-3 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${isCompleted ? 'bg-amber-400' : 'bg-neutral-400'}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {activeTodayRecitations.length === 0 && (
                <div className={`p-8 rounded-xl border text-center ${theme.card}`}>
                  <p className="text-sm text-neutral-400">No recitations scheduled for today.</p>
                  <button 
                    onClick={() => { setEditingItem(null); setModalMode('add'); }}
                    className={`mt-3 text-xs font-bold underline ${theme.accentText}`}
                  >
                    Add one now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INSIGHTS & CHARTS */}
        {activeTab === 'insights' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-bold text-xl text-white">Recitation Insights</h2>
              <p className="text-xs text-neutral-400">Track your daily progress and consistency</p>
            </div>

            {/* Filter Dropdown */}
            <div className={`p-3 rounded-xl border ${theme.card}`}>
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Filter By Recitation
              </label>
              <select 
                value={insightFilter} 
                onChange={(e) => setInsightFilter(e.target.value)}
                className="w-full text-xs font-semibold bg-neutral-800 border border-neutral-700 text-white rounded-lg p-2 focus:outline-hidden"
              >
                <option value="all">All Recitations Combined</option>
                {recitations.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className={`p-3 rounded-xl border text-center ${theme.card}`}>
                <p className="text-[10px] font-semibold text-neutral-400 uppercase">Today</p>
                <p className={`text-2xl font-black mt-1 ${theme.accentText}`}>{analytics.totalToday}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center ${theme.card}`}>
                <p className="text-[10px] font-semibold text-neutral-400 uppercase">This Month</p>
                <p className="text-2xl font-black mt-1 text-white">{analytics.totalThisMonth}</p>
              </div>
              <div className={`p-3 rounded-xl border text-center ${theme.card}`}>
                <p className="text-[10px] font-semibold text-neutral-400 uppercase">All Time</p>
                <p className="text-2xl font-black mt-1 text-amber-400">{analytics.totalAllTime}</p>
              </div>
            </div>

            {/* Visual 7-Day Trend Line Chart */}
            <div className={`p-4 rounded-xl border ${theme.card} space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-200">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Past 7 Days Trend
                </div>
                <span className="text-[10px] text-neutral-400">Daily Recitations</span>
              </div>

              <div className="pt-2">
                <LineChartComponent data={analytics.last7Days} />
              </div>
            </div>

            {/* Spiritual Consistency Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${theme.hero}`}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-black/40 rounded-lg">
                  <Flame className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Spiritual Consistency</h4>
                  <p className="text-xs text-neutral-300">All recitation records are safely stored on your device.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FREE COUNTER */}
        {activeTab === 'free-counter' && (
          <div className="flex flex-col items-center justify-center min-h-[68vh] space-y-6">
            <div className="text-center">
              <span className={`text-[11px] uppercase font-bold px-3 py-1 rounded-full ${theme.badge}`}>
                Free Mode (No Target)
              </span>
              <h2 className="text-2xl font-bold mt-2 text-white">Tasbih Counter</h2>
              <p className="text-xs text-neutral-400">Tap anywhere on the circle</p>
            </div>

            {/* Giant Circular Button */}
            <button 
              onClick={() => {
                triggerHaptic(40);
                if (soundEnabled) playClickSound();
                setFreeCount(c => c + 1);
              }}
              className={`w-64 h-64 rounded-full bg-linear-to-b ${theme.counterBtn} shadow-2xl flex flex-col items-center justify-center active:scale-95 transition-transform duration-100 border-4 border-white/20`}
            >
              <span className="text-6xl font-black tracking-tight">{freeCount}</span>
              <span className="text-xs uppercase font-bold mt-2 tracking-widest opacity-80">TAP</span>
            </button>

            <button 
              onClick={() => {
                if (freeCount > 0 && confirm("Reset count to 0?")) {
                  triggerHaptic(40);
                  setFreeCount(0);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold py-2 px-4 rounded-lg border border-neutral-700 text-neutral-400 hover:text-white transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Count
            </button>
          </div>
        )}

      </main>

      {/* FULL SCREEN RECITATION MODAL */}
      {activeRecitation && (
        <div className={`fixed inset-0 z-50 flex flex-col justify-between max-w-md mx-auto ${theme.bg}`}>
          
          <div className={`p-4 border-b flex items-center justify-between ${theme.header}`}>
            <button 
              onClick={() => setActiveRecitationId(null)}
              className="flex items-center gap-1 text-sm font-semibold text-neutral-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setEditingItem(activeRecitation);
                  setModalMode('edit');
                }}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition"
                title="Edit Target / Details"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button 
                onClick={() => handleDelete(activeRecitation.id)}
                className="p-1.5 text-red-400 hover:bg-red-950/30 rounded-md transition"
                title="Delete Recitation"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button 
                onClick={() => resetTodayCount(activeRecitation.id)}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-md transition"
                title="Reset Today's Count"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dua Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold leading-tight text-white">{activeRecitation.title}</h2>
              {activeRecitation.reminderTime && (
                <p className="text-[11px] text-neutral-400 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> Reminder: {activeRecitation.reminderTime}
                </p>
              )}
            </div>

            {((activeRecitation.history[todayStr] || 0) >= activeRecitation.target) && (
              <div className="bg-amber-400/20 border border-amber-400/40 rounded-xl p-3 flex items-center justify-center gap-2 text-amber-300 text-xs font-bold animate-pulse">
                <Award className="w-4 h-4 text-amber-400" /> Target of {activeRecitation.target} Achieved! Alhamdullilah!
              </div>
            )}

            {activeRecitation.arabic && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-right font-arabic text-2xl leading-loose dir-rtl shadow-inner text-neutral-100">
                {activeRecitation.arabic}
              </div>
            )}

            {activeRecitation.translation && (
              <p className="text-xs text-neutral-300 leading-relaxed italic bg-white/5 p-3.5 rounded-xl border border-white/5">
                "{activeRecitation.translation}"
              </p>
            )}
          </div>

          {/* Large Circular Tap Button */}
          <div className={`p-6 border-t flex flex-col items-center justify-center space-y-3 ${theme.header}`}>
            <button 
              onClick={() => handleIncrement(activeRecitation.id)}
              className={`w-48 h-48 rounded-full bg-linear-to-b ${theme.counterBtn} shadow-2xl flex flex-col items-center justify-center active:scale-90 transition-transform duration-70 border-4 border-white/20 relative group`}
            >
              <span className="text-5xl font-black tracking-tight">
                {activeRecitation.history[todayStr] || 0}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-widest mt-1 opacity-80">
                Target: {activeRecitation.target}
              </span>
              <span className="absolute bottom-4 text-[10px] font-black tracking-widest opacity-60">
                TAP TO COUNT
              </span>
            </button>

            <button 
              onClick={() => handleDecrement(activeRecitation.id)}
              className="text-xs font-semibold text-neutral-400 hover:text-white py-1 px-4 rounded-full border border-neutral-700"
            >
              Minus 1
            </button>
          </div>

        </div>
      )}

      {/* FORM MODAL (ADD & EDIT) */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <RecitationFormModal 
          initialData={editingItem}
          theme={theme}
          onClose={() => { setModalMode(null); setEditingItem(null); }}
          onSave={(itemData) => {
            if (modalMode === 'edit') {
              setRecitations(prev => prev.map(r => r.id === itemData.id ? { ...r, ...itemData } : r));
            } else {
              setRecitations(prev => [itemData, ...prev]);
            }
            setModalMode(null);
            setEditingItem(null);
          }}
          onDelete={handleDelete}
        />
      )}

      {/* THEME SELECTION MODAL */}
      {modalMode === 'theme' && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className={`w-full max-w-xs rounded-2xl p-5 space-y-3 border shadow-xl ${theme.card}`}>
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="font-bold text-sm text-white">Select Dark Theme</h3>
              <button onClick={() => setModalMode(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 pt-1">
              {Object.entries(THEMES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => {
                    setCurrentTheme(key);
                    setModalMode(null);
                  }}
                  className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs font-bold transition ${
                    currentTheme === key ? 'ring-2 ring-amber-400 border-transparent bg-white/10' : 'border-neutral-800'
                  }`}
                >
                  <span className="text-white">{t.name}</span>
                  {currentTheme === key && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t px-6 py-2 flex items-center justify-around z-10 backdrop-blur-md shadow-lg ${theme.header}`}>
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 transition ${activeTab === 'dashboard' ? `${theme.accentText} font-bold` : 'text-neutral-500'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Tracker</span>
        </button>

        <button 
          onClick={() => setActiveTab('free-counter')}
          className={`flex flex-col items-center gap-1 py-1 transition ${activeTab === 'free-counter' ? `${theme.accentText} font-bold` : 'text-neutral-500'}`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">Free Counter</span>
        </button>

        <button 
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center gap-1 py-1 transition ${activeTab === 'insights' ? `${theme.accentText} font-bold` : 'text-neutral-500'}`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Insights</span>
        </button>
      </nav>

    </div>
  );
}

// 7-DAY LINE CHART COMPONENT
function LineChartComponent({ data }) {
  const width = 340;
  const height = 110;
  const padding = 20;

  const counts = data.map(d => d.count);
  const maxVal = Math.max(...counts, 10);

  const points = data.map((d, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.count / maxVal) * (height - 2 * padding);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28 overflow-visible">
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line 
          x1={padding} 
          y1={height - padding} 
          x2={width - padding} 
          y2={height - padding} 
          stroke="#404040" 
          strokeWidth="1" 
        />

        <path d={areaD} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#f59e0b" stroke="#171717" strokeWidth="1.5" />
            <text 
              x={p.x} 
              y={height - 5} 
              fontSize="9" 
              textAnchor="middle" 
              fill="#a3a3a3" 
              fontWeight="600"
            >
              {p.label}
            </text>
            {p.count > 0 && (
              <text 
                x={p.x} 
                y={p.y - 7} 
                fontSize="9" 
                textAnchor="middle" 
                fill="#f59e0b" 
                fontWeight="bold"
              >
                {p.count}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// FORM MODAL FOR ADDING AND EDITING RECITATIONS
function RecitationFormModal({ initialData, onClose, onSave, onDelete, theme }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [arabic, setArabic] = useState(initialData?.arabic || '');
  const [translation, setTranslation] = useState(initialData?.translation || '');
  const [target, setTarget] = useState(initialData?.target || 20);
  const [frequency, setFrequency] = useState(initialData?.frequency || 'daily');
  const [weeklyDays, setWeeklyDays] = useState(initialData?.weeklyDays || [5]);
  const [specificDate, setSpecificDate] = useState(initialData?.specificDate || '');
  const [reminderTime, setReminderTime] = useState(initialData?.reminderTime || '09:00');

  const toggleDay = (dayIndex) => {
    if (weeklyDays.includes(dayIndex)) {
      setWeeklyDays(weeklyDays.filter(d => d !== dayIndex));
    } else {
      setWeeklyDays([...weeklyDays, dayIndex]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Please enter a name for the recitation");

    const payload = {
      id: initialData?.id || Date.now().toString(),
      title,
      arabic,
      translation,
      target: Number(target) || 1,
      frequency,
      weeklyDays: frequency === 'weekly' ? weeklyDays : [],
      specificDate: frequency === 'specific_date' ? specificDate : '',
      reminderTime,
      history: initialData?.history || {}
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
      <div className={`w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl border ${theme.card}`}>
        
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="font-bold text-base text-white">
            {initialData ? 'Edit Recitation' : 'Add New Recitation / Dua'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          <div>
            <label className="font-bold block mb-1 text-neutral-300">Recitation Name *</label>
            <input 
              type="text" 
              placeholder="e.g. Durood Ibrahim, Surah Al-Kahf"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-2.5 bg-neutral-800 border border-neutral-700 text-white rounded-xl focus:outline-amber-400 text-sm font-semibold"
              required
            />
          </div>

          <div>
            <label className="font-bold block mb-1 text-neutral-300">Dua Text (Arabic / Transliteration)</label>
            <textarea 
              rows={3}
              placeholder="Paste full text here..."
              value={arabic}
              onChange={e => setArabic(e.target.value)}
              className="w-full p-2.5 bg-neutral-800 border border-neutral-700 text-white rounded-xl focus:outline-amber-400 text-sm font-arabic"
            />
          </div>

          <div>
            <label className="font-bold block mb-1 text-neutral-300">English Meaning (Optional)</label>
            <input 
              type="text" 
              placeholder="Brief translation..."
              value={translation}
              onChange={e => setTranslation(e.target.value)}
              className="w-full p-2.5 bg-neutral-800 border border-neutral-700 text-white rounded-xl focus:outline-amber-400 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold block mb-1 text-neutral-300">Target Count *</label>
              <input 
                type="number" 
                min="1"
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="w-full p-2.5 bg-neutral-800 border border-neutral-700 text-white rounded-xl focus:outline-amber-400 text-sm font-bold"
                required
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-neutral-300">Daily Reminder Time</label>
              <input 
                type="time" 
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                className="w-full p-2.5 bg-neutral-800 border border-neutral-700 text-white rounded-xl focus:outline-amber-400 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1 text-neutral-300">Frequency / Schedule</label>
            <select 
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
              className="w-full p-2.5 bg-neutral-800 border border-neutral-700 text-white rounded-xl focus:outline-amber-400 text-sm font-semibold"
            >
              <option value="daily">Every Single Day (Daily)</option>
              <option value="weekly">Specific Days of Week (e.g. Friday)</option>
              <option value="specific_date">One Specific Date Only</option>
            </select>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="font-bold block mb-1.5 text-neutral-300">Select Days to Recite:</label>
              <div className="flex items-center justify-between gap-1">
                {WEEKDAYS.map((dayName, idx) => {
                  const isSelected = weeklyDays.includes(idx);
                  return (
                    <button
                      type="button"
                      key={dayName}
                      onClick={() => toggleDay(idx)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                        isSelected 
                          ? `${theme.primary} border-transparent` 
                          : 'border-neutral-700 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {dayName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {frequency === 'specific_date' && (
            <div>
              <label className="font-bold block mb-1 text-neutral-300">Select Target Date</label>
              <input 
                type="date"
                value={specificDate}
                onChange={e => setSpecificDate(e.target.value)}
                className="w-full p-2.5 bg-neutral-800 border border-neutral-700 text-white rounded-xl focus:outline-amber-400 text-sm"
                required
              />
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button 
              type="submit"
              className={`w-full py-3.5 font-bold rounded-xl shadow-lg transition ${theme.primary}`}
            >
              {initialData ? 'Update Recitation' : 'Save Recitation'}
            </button>

            {initialData && (
              <button 
                type="button"
                onClick={() => onDelete(initialData.id)}
                className="w-full py-2.5 text-red-400 font-bold hover:bg-red-950/20 rounded-xl transition text-center"
              >
                Delete This Recitation
              </button>
            )}
          </div>

        </form>

      </div>
    </div>
  );
}