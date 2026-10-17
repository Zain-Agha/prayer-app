import React, { useState, useEffect, useMemo } from 'react';
import { 
  loadRecitations, 
  saveRecitations, 
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
  TrendingUp,
  Calendar
} from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function App() {
  const [recitations, setRecitations] = useState(loadRecitations);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeRecitationId, setActiveRecitationId] = useState(null);
  
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit'
  const [editingItem, setEditingItem] = useState(null);

  const [freeCount, setFreeCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationStatus, setNotificationStatus] = useState('default');
  const [insightFilter, setInsightFilter] = useState('all');

  const todayStr = getTodayKey();

  const activeRecitation = useMemo(() => {
    return recitations.find(r => r.id === activeRecitationId) || null;
  }, [recitations, activeRecitationId]);

  useEffect(() => {
    saveRecitations(recitations);
  }, [recitations]);

  // Notifications Engine
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
          body: "You will receive reminders when it's time to recite."
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
          text: 'Track your daily Durood and custom Duas.',
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
    if (confirm("Delete this recitation and its history?")) {
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
    <div className="w-full min-h-[100dvh] bg-[#09090b] text-neutral-100 flex flex-col font-sans select-none antialiased">
      
      {/* Top Header - Safe Area Aware */}
      <header className="sticky top-0 z-30 w-full bg-[#09090b]/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 safe-pt flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-lg">✦</span>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white leading-none">Dhikr & Durood</h1>
            <p className="text-[10px] text-neutral-400 font-medium mt-0.5">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {notificationStatus !== 'granted' && (
            <button 
              onClick={requestNotificationAccess}
              className="p-2 text-amber-400 active:bg-neutral-800 rounded-full"
              title="Enable Reminders"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="p-2 text-neutral-400 active:bg-neutral-800 rounded-full"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-neutral-600" />}
          </button>

          <button 
            onClick={handleShare} 
            className="p-2 text-neutral-400 active:bg-neutral-800 rounded-full"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area - Full width with natural padding */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-4 pb-28">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            
            {/* Spiritual Banner with Uncropped Calligraphy */}
            <div className="w-full bg-linear-to-r from-neutral-900 to-neutral-800 border border-amber-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between relative overflow-hidden">
              <div className="space-y-1 max-w-[70%] z-10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Daily Target
                </div>
                <h3 className="text-base font-extrabold text-white leading-tight">Blessings Upon the Prophet</h3>
                <p className="text-[11px] text-neutral-300 leading-snug">
                  "Whoever sends blessings upon me once, Allah will send blessings upon him tenfold."
                </p>
              </div>

              <div className="text-amber-400/25 font-serif text-5xl select-none pr-1">
                ﷺ
              </div>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between pt-1">
              <h2 className="font-bold text-xs uppercase tracking-wider text-neutral-400">
                Today's Recitations ({activeTodayRecitations.length})
              </h2>
              <button 
                onClick={() => {
                  setEditingItem(null);
                  setModalMode('add');
                }}
                className="text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1.5 rounded-xl flex items-center gap-1 active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5" /> Add Dua
              </button>
            </div>

            {/* Recitation Cards */}
            <div className="space-y-3">
              {activeTodayRecitations.map((rec) => {
                const count = rec.history[todayStr] || 0;
                const isCompleted = count >= rec.target;
                const percentage = Math.min(100, Math.round((count / rec.target) * 100));

                return (
                  <div 
                    key={rec.id}
                    onClick={() => setActiveRecitationId(rec.id)}
                    className={`w-full p-4 rounded-2xl bg-neutral-900/90 border transition-all active:scale-[0.98] cursor-pointer shadow-md ${
                      isCompleted ? 'border-amber-500/60 ring-1 ring-amber-500/40' : 'border-neutral-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-base text-white truncate">{rec.title}</h4>
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                              <CheckCircle2 className="w-3 h-3 text-amber-400" /> Done
                            </span>
                          )}
                        </div>

                        {rec.arabic && (
                          <p className="text-xs text-neutral-400 line-clamp-1 mt-1 font-arabic text-right dir-rtl">
                            {rec.arabic}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500 font-medium">
                          {rec.reminderTime && (
                            <span className="flex items-center gap-1 text-neutral-400">
                              <Clock className="w-3 h-3 text-amber-400" /> {rec.reminderTime}
                            </span>
                          )}
                          {rec.frequency === 'weekly' && (
                            <span className="flex items-center gap-1 text-neutral-400">
                              <Calendar className="w-3 h-3 text-amber-400" /> Weekly
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Number Count Display */}
                      <div className="text-right shrink-0">
                        <span className={`text-2xl font-black ${isCompleted ? 'text-amber-400' : 'text-white'}`}>
                          {count}
                        </span>
                        <span className="text-xs text-neutral-500 font-bold">/{rec.target}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-3.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 rounded-full ${isCompleted ? 'bg-amber-400' : 'bg-neutral-500'}`} 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {activeTodayRecitations.length === 0 && (
                <div className="p-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 text-center">
                  <p className="text-sm text-neutral-400">No recitations scheduled for today.</p>
                  <button 
                    onClick={() => { setEditingItem(null); setModalMode('add'); }}
                    className="mt-3 text-xs font-bold text-amber-400 underline"
                  >
                    Add one now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INSIGHTS & STATS */}
        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-extrabold text-xl text-white">Recitation Insights</h2>
              <p className="text-xs text-neutral-400">Track your progress and consistency</p>
            </div>

            {/* Filter Dropdown */}
            <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                Filter By Recitation
              </label>
              <select 
                value={insightFilter} 
                onChange={(e) => setInsightFilter(e.target.value)}
                className="w-full text-xs font-bold bg-neutral-800 border border-neutral-700 text-white rounded-xl p-2.5 focus:outline-hidden"
              >
                <option value="all">All Combined Recitations</option>
                {recitations.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Today</p>
                <p className="text-2xl font-black mt-1 text-amber-400">{analytics.totalToday}</p>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Month</p>
                <p className="text-2xl font-black mt-1 text-white">{analytics.totalThisMonth}</p>
              </div>
              <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                <p className="text-[10px] font-bold text-neutral-400 uppercase">All Time</p>
                <p className="text-2xl font-black mt-1 text-amber-300">{analytics.totalAllTime}</p>
              </div>
            </div>

            {/* Trend Chart Card */}
            <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Past 7 Days Trend
                </div>
                <span className="text-[10px] text-neutral-400 font-semibold">Daily Recitations</span>
              </div>

              <div className="pt-2">
                <LineChartComponent data={analytics.last7Days} />
              </div>
            </div>

            {/* Consistency Box */}
            <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex items-center gap-3">
              <div className="p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-xl shrink-0">
                <Flame className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Spiritual Consistency</h4>
                <p className="text-xs text-neutral-400">All data is preserved safely in your phone cache.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FREE COUNTER */}
        {activeTab === 'free-counter' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Free Mode (No Target)
              </span>
              <h2 className="text-2xl font-black text-white mt-2">Tasbih Counter</h2>
              <p className="text-xs text-neutral-400">Tap anywhere on the circle</p>
            </div>

            {/* Giant Circular Button */}
            <button 
              onClick={() => {
                triggerHaptic(40);
                if (soundEnabled) playClickSound();
                setFreeCount(c => c + 1);
              }}
              className="w-60 h-60 rounded-full bg-linear-to-b from-amber-500 to-amber-700 text-neutral-950 shadow-2xl shadow-amber-500/20 flex flex-col items-center justify-center active:scale-95 transition-transform duration-75 border-4 border-amber-300/40"
            >
              <span className="text-6xl font-black tracking-tight">{freeCount}</span>
              <span className="text-xs uppercase font-extrabold mt-2 tracking-widest text-neutral-900">TAP</span>
            </button>

            <button 
              onClick={() => {
                if (freeCount > 0 && confirm("Reset count to 0?")) {
                  triggerHaptic(40);
                  setFreeCount(0);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-bold py-2.5 px-5 rounded-xl border border-neutral-800 text-neutral-400 active:bg-neutral-800"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Count
            </button>
          </div>
        )}

      </main>

      {/* FULL-SCREEN RECITATION COUNTER VIEW */}
      {activeRecitation && (
        <div className="fixed inset-0 z-50 bg-[#09090b] flex flex-col justify-between safe-pt safe-pb">
          
          {/* Top Bar inside counter view */}
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <button 
              onClick={() => setActiveRecitationId(null)}
              className="flex items-center gap-1 text-sm font-bold text-neutral-300 active:text-white"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setEditingItem(activeRecitation);
                  setModalMode('edit');
                }}
                className="p-2 text-neutral-400 active:bg-neutral-800 rounded-lg"
                title="Edit Target"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              <button 
                onClick={() => handleDelete(activeRecitation.id)}
                className="p-2 text-red-400 active:bg-red-950/40 rounded-lg"
                title="Delete Recitation"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button 
                onClick={() => resetTodayCount(activeRecitation.id)}
                className="p-2 text-neutral-400 active:bg-neutral-800 rounded-lg"
                title="Reset Count"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Scrollable Content: Title, Target & Dua text */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-white">{activeRecitation.title}</h2>
              {activeRecitation.reminderTime && (
                <p className="text-[11px] text-neutral-400 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> Reminder: {activeRecitation.reminderTime}
                </p>
              )}
            </div>

            {((activeRecitation.history[todayStr] || 0) >= activeRecitation.target) && (
              <div className="bg-amber-400/20 border border-amber-400/50 rounded-2xl p-3 flex items-center justify-center gap-2 text-amber-300 text-xs font-bold">
                <Award className="w-4 h-4 text-amber-400" /> Target of {activeRecitation.target} Achieved! Alhamdullilah!
              </div>
            )}

            {/* Arabic Box */}
            {activeRecitation.arabic && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 text-right font-arabic text-xl leading-loose dir-rtl text-neutral-100 shadow-inner">
                {activeRecitation.arabic}
              </div>
            )}

            {/* Translation Box */}
            {activeRecitation.translation && (
              <p className="text-xs text-neutral-400 leading-relaxed italic bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-800">
                "{activeRecitation.translation}"
              </p>
            )}
          </div>

          {/* Bottom Area: Big Ergonomic Thumb Circular Tap Pad */}
          <div className="p-6 border-t border-neutral-800/80 bg-neutral-950 flex flex-col items-center justify-center space-y-3">
            <button 
              onClick={() => handleIncrement(activeRecitation.id)}
              className="w-48 h-48 rounded-full bg-linear-to-b from-amber-500 to-amber-700 text-neutral-950 shadow-2xl shadow-amber-500/20 flex flex-col items-center justify-center active:scale-90 transition-transform duration-75 border-4 border-amber-300/40 relative"
            >
              <span className="text-5xl font-black tracking-tight">
                {activeRecitation.history[todayStr] || 0}
              </span>
              <span className="text-[11px] font-black uppercase tracking-widest mt-1 text-neutral-900/80">
                Target: {activeRecitation.target}
              </span>
              <span className="absolute bottom-3 text-[10px] font-black tracking-widest text-neutral-900/60">
                TAP TO COUNT
              </span>
            </button>

            <button 
              onClick={() => handleDecrement(activeRecitation.id)}
              className="text-xs font-bold text-neutral-400 active:text-white py-1.5 px-4 rounded-full border border-neutral-800"
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

      {/* Bottom Sticky Navigation Bar - Safe for iOS home indicator */}
      <nav className="fixed bottom-0 left-0 right-0 w-full bg-[#09090b]/95 border-t border-neutral-800 px-6 py-2 safe-pb flex items-center justify-around z-20 backdrop-blur-md">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 transition ${activeTab === 'dashboard' ? 'text-amber-400 font-bold' : 'text-neutral-500'}`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px]">Tracker</span>
        </button>

        <button 
          onClick={() => setActiveTab('free-counter')}
          className={`flex flex-col items-center gap-1 py-1 transition ${activeTab === 'free-counter' ? 'text-amber-400 font-bold' : 'text-neutral-500'}`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px]">Free Counter</span>
        </button>

        <button 
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center gap-1 py-1 transition ${activeTab === 'insights' ? 'text-amber-400 font-bold' : 'text-neutral-500'}`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px]">Insights</span>
        </button>
      </nav>

    </div>
  );
}

// 7-DAY LINE CHART
function LineChartComponent({ data }) {
  const width = 320;
  const height = 100;
  const padding = 18;

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
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24 overflow-visible">
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
          stroke="#262626" 
          strokeWidth="1" 
        />

        <path d={areaD} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#f59e0b" stroke="#09090b" strokeWidth="1.5" />
            <text 
              x={p.x} 
              y={height - 2} 
              fontSize="8.5" 
              textAnchor="middle" 
              fill="#737373" 
              fontWeight="bold"
            >
              {p.label}
            </text>
            {p.count > 0 && (
              <text 
                x={p.x} 
                y={p.y - 6} 
                fontSize="8.5" 
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

// RECITATION FORM MODAL
function RecitationFormModal({ initialData, onClose, onSave, onDelete }) {
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#121215] border border-neutral-800 rounded-t-3xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl safe-pb">
        
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="font-extrabold text-base text-white">
            {initialData ? 'Edit Recitation' : 'Add New Recitation / Dua'}
          </h3>
          <button onClick={onClose} className="text-neutral-400 active:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          <div>
            <label className="font-bold block mb-1 text-neutral-300">Name / Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Durood Ibrahim, Surah Al-Kahf"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:border-amber-400 text-sm font-semibold"
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
              className="w-full p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:border-amber-400 text-sm font-arabic"
            />
          </div>

          <div>
            <label className="font-bold block mb-1 text-neutral-300">English Meaning (Optional)</label>
            <input 
              type="text" 
              placeholder="Brief translation..."
              value={translation}
              onChange={e => setTranslation(e.target.value)}
              className="w-full p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:border-amber-400 text-sm"
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
                className="w-full p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:border-amber-400 text-sm font-bold"
                required
              />
            </div>

            <div>
              <label className="font-bold block mb-1 text-neutral-300">Reminder Time</label>
              <input 
                type="time" 
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                className="w-full p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:border-amber-400 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-bold block mb-1 text-neutral-300">Frequency</label>
            <select 
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
              className="w-full p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:border-amber-400 text-sm font-bold"
            >
              <option value="daily">Daily (Every Day)</option>
              <option value="weekly">Weekly (Select Specific Days)</option>
              <option value="specific_date">Specific Date Only</option>
            </select>
          </div>

          {frequency === 'weekly' && (
            <div>
              <label className="font-bold block mb-1.5 text-neutral-300">Select Days:</label>
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
                          ? 'bg-amber-400 text-neutral-950 border-amber-400 font-extrabold' 
                          : 'border-neutral-800 text-neutral-400'
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
                className="w-full p-3 bg-neutral-900 border border-neutral-800 text-white rounded-xl focus:border-amber-400 text-sm"
                required
              />
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button 
              type="submit"
              className="w-full py-3.5 font-black text-neutral-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-lg transition active:scale-95 text-sm"
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