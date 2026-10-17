export const DEFAULT_RECITATIONS = [
  {
    id: 'durood-shareef',
    title: 'Durood Ibrahim',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
    translation: 'O Allah, bestow Your favor upon Muhammad and the family of Muhammad, as You bestowed favor upon Ibrahim and the family of Ibrahim. You are Praiseworthy, Most Glorious.',
    target: 20,
    frequency: 'daily', // 'daily', 'weekly', 'specific_date'
    weeklyDays: [5], // 5 = Friday
    specificDate: '',
    reminderTime: '09:00',
    history: {}
  },
  {
    id: 'subhanallah-wa-bihamdihi',
    title: 'Subhan-Allahi wa bihamdihi',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    translation: 'Glory be to Allah and Praise Him. (Recite 100 times for forgiveness of sins)',
    target: 100,
    frequency: 'daily',
    weeklyDays: [],
    specificDate: '',
    reminderTime: '18:00',
    history: {}
  }
];

const STORAGE_KEY = 'islamic_prayer_app_data_v2';
const THEME_KEY = 'islamic_app_theme';

export const loadRecitations = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : DEFAULT_RECITATIONS;
  } catch {
    return DEFAULT_RECITATIONS;
  }
};

export const saveRecitations = (recitations) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recitations));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
};

export const loadSavedTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) || 'emerald';
  } catch {
    return 'emerald';
  }
};

export const saveTheme = (theme) => {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.error('Failed to save theme', e);
  }
};

export const getTodayKey = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const triggerHaptic = (pattern = 35) => {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
};

export const playClickSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.035);
  } catch {}
};