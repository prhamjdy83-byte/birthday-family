/* =========================================
   ۱. تنظیمات اولیه و متغیرها
   ========================================= */
const SUPABASE_URL = 'https://suzwoumzeusdrhfgyrui.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1endvdW16ZXVzZHJoZmd5cnVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NjQwNDQsImV4cCI6MjEwODM0MDA0NH0.P76tt0s-nnu4YCNDOqHaw6Y2RBFGhjJM1ID5YRTyE4Y';
const VAPID_PUBLIC_KEY = 'BGGAixHLPJfASX3WMZW014OpZ8AmHT6EKjJQi_Dnhny5d7UrKUkcbWbWJ0MVxil1tcPcrhuVzAWBgENwXpk-l6M';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let currentProfile = null;
let allBirthdays = [];
let authMode = 'login';
let confettiFired = false;
let countdownInterval = null;
let ageInterval = null; 
let currentHoroMode = 'month';
let currentThemePreference = localStorage.getItem('theme') || 'light';

// متغیرهای تقویم (باید حتماً گلوبال باشن)
let calCurrentYear = null, calCurrentMonth = null;
let chartZodiacInstance = null;
let chartMonthsInstance = null;

/* =========================================
   ۲. سیستم تم
   ========================================= */
function getEffectiveTheme(pref) {
  if (pref === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return pref;
}
function applyTheme(pref) {
  currentThemePreference = pref;
  const effective = getEffectiveTheme(pref);
  document.documentElement.setAttribute('data-theme', effective);
  localStorage.setItem('theme', pref);
  const headerBtn = document.getElementById('theme-toggle');
  if (headerBtn) headerBtn.textContent = effective === 'dark' ? '☀️' : '🌙';
  document.querySelectorAll('.theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeValue === pref);
  });
}
applyTheme(currentThemePreference);
document.getElementById('theme-toggle').addEventListener('click', () => {
  const effective = getEffectiveTheme(currentThemePreference);
  applyTheme(effective === 'dark' ? 'light' : 'dark');
});
document.querySelectorAll('.theme-option').forEach(btn => {
  btn.addEventListener('click', () => applyTheme(btn.dataset.themeValue));
});
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (currentThemePreference === 'system') applyTheme('system');
});

/* =========================================
   ۳. دیتابیس‌ها
   ========================================= */
const zodiacTraits = ["پرشور، پرانرژی و ماجراجو.", "صبور، پایدار و اهل لذت‌های زندگی.", "باهوش، کنجکاو و خوش‌صحبت.", "احساساتی، دلسوز و خانواده‌دوست.", "بااعتماد به نفس، سخاوتمند و ذاتاً رهبر.", "دقیق، منظم و تحلیل‌گر.", "خوش‌برخورد، اهل تعادل و عاشق صلح.", "عمیق، رازدار و پرشور.", "خوش‌بین، آزادی‌خواه و ماجراجو.", "مسئولیت‌پذیر، کوشا و جدی.", "متفکر، مستقل و نوآور.", "خلاق، حساس و رویایی."];
const chineseTraits = ["موش: باهوش و سازگار.", "گاو: سخت‌کوش و قابل اعتماد.", "ببر: شجاع و پرشور.", "خرگوش: مهربان و آرام.", "اژدها: بااعتماد به نفس و پرانرژی.", "مار: مرموز و خردمند.", "اسب: پرانرژی و آزاد.", "بز: مهربان و خلاق.", "میمون: باهوش و چابک.", "خروس: منظم و پرکار.", "سگ: وفادار و صادق.", "خوک: سخاوتمند و صادق."];
const hafezFals = [
  { poem: "دوش دیدم که ملائک در میخانه زدند\nگل آدم بسرشتند و به پیمانه زدند", meaning: "فالت بسیار عالی است. نشان‌دهنده تغییرات مثبت و برآورده شدن آرزوهاست." },
  { poem: "الا یا ایها الساقی ادر کاسا و ناولها\nکه عشق آسان نمود اول ولی افتاد مشکل‌ها", meaning: "راهی که شروع کرده‌ای چالش‌هایی دارد. با توکل بر مشکلات غلبه می‌کنی." },
  { poem: "اگر آن ترک شیرازی به دست آرد دل ما را\nبه خال هندویش بخشم سمرقند و بخارا را", meaning: "دلت به دست کسی گیر است. این فال خبر از عشقی عمیق می‌دهد." },
  { poem: "صلاح کار کجا و من خراب کجا\nببین تفاوت ره از کجاست تا به کجا", meaning: "به خودت بیا و مسیر زندگی‌ات را مرور کن. وقت تصمیمات جدی است." },
  { poem: "یوسف گم‌گشته بازآید به کنعان غم مخور\nکلبه احزان شود روزی گلستان غم مخور", meaning: "نماد امید و بازگشت شادی است. نگران نباش." },
  { poem: "ما در پیاله عکس رخ یار دیده‌ایم\nای بی‌خبر ز لذت شرب مدام ما", meaning: "به دنبال لذت‌های معنوی و آرامش درونی باش." }
];
const monthlyHoroscopes = { "فروردین": "ماه شروع‌های تازه و پرانرژی است.", "اردیبهشت": "ماه آرامش و ثبات.", "خرداد": "ماه پویایی و ارتباطات.", "تیر": "ماه گرما و احساسات عمیق.", "مرداد": "ماه درخشش و اعتماد به نفس.", "شهریور": "ماه نظم و کار.", "مهر": "ماه تعادل و زیبایی.", "آبان": "ماه عمق و رازها.", "آذر": "ماه هیجان و ماجراجویی.", "دی": "ماه جدیت و مسئولیت.", "بهمن": "ماه نوآوری و تفکر خارج از چارچوب.", "اسفند": "ماه رویاها و احساسات لطیف." };
const yearlyHoroscopes = { "اژدها": "سالی پر از قدرت و شانس‌های بزرگ!", "مار": "سالی برای تفکر عمیق و رشد معنوی.", "اسب": "سالی پر از انرژی، سفر و آزادی!", "بز": "سالی برای خلاقیت و آرامش.", "میمون": "سالی برای هوش و حل مسائل پیچیده.", "خروس": "سالی برای نظم و کار سخت.", "سگ": "سالی برای وفاداری و روابط پایدار.", "خوک": "سالی برای خوش‌گذرانی و آرامش.", "موش": "سالی برای زیرکی و سازگاری.", "گاو": "سالی برای پشتکار و ساختن پایه‌های محکم.", "ببر": "سالی برای شجاعت و ریسک‌پذیری.", "خرگوش": "سالی برای آرامش و مهربانی." };

/* =========================================
   ۴. توابع تاریخ و کمکی
   ========================================= */
function div(a, b) { return ~~(a / b); }
function mod(a, b) { return a - ~~(a / b) * b; }
function jalCal(jy) {
  var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  var bl = breaks.length, gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump, leap, n, i;
  for (i = 1; i < bl; i++) {
    jm = breaks[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  var leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  var march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap: leap, gy: gy, march: march };
}
function g2d(gy, gm, gd) {
  var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}
function d2g(jdn) {
  var j, i, gd, gm, gy;
  j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  i = div(mod(j, 1461), 4) * 5 + 308;
  gd = div(mod(i, 153), 5) + 1;
  gm = mod(div(i, 153), 12) + 1;
  gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy: gy, gm: gm, gd: gd };
}
function j2d(jy, jm, jd) { return g2d(jalCal(jy).gy, 3, jalCal(jy).march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1; }
function d2j(jdn) {
  var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy), jdn1f = g2d(gy, 3, r.march), jd, jm, k = jdn - jdn1f;
  if (k >= 0) { if (k <= 185) { jm = 1 + div(k, 31); jd = mod(k, 31) + 1; return { jy, jm, jd }; } else k -= 186; }
  else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
  jm = 7 + div(k, 30); jd = mod(k, 30) + 1; return { jy, jm, jd };
}
function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }
function toJalaali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
function todayAtMidnight() { const t = new Date(); t.setHours(0,0,0,0); return t; }
function daysUntil(s) {
  const t = todayAtMidnight(), b = new Date(s + 'T00:00:00');
  let n = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (n < t) n = new Date(t.getFullYear()+1, b.getMonth(), b.getDate());
  return Math.round((n - t) / 86400000);
}
function ageTurning(s) {
  const t = todayAtMidnight(), b = new Date(s + 'T00:00:00');
  let n = new Date(t.getFullYear(), b.getMonth(), b.getDate());
  if (n < t) n = new Date(t.getFullYear()+1, b.getMonth(), b.getDate());
  return n.getFullYear() - b.getFullYear();
}
function toFa(n) { return String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function parsePersianDate(str) {
  if (!str) return null;
  const n = str.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[\/\.\-]/g, '/').trim();
  const p = n.split('/').map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  const [jy, jm, jd] = p;
  if (jy < 1200 || jy > 1500 || jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  try {
    const g = toGregorian(jy, jm, jd);
    const j = toJalaali(g.gy, g.gm, g.gd);
    if (j.jy !== jy || j.jm !== jm || j.jd !== jd) return null;
    return g;
  } catch { return null; }
}
function gregorianToPersianString(s) {
  const [gy, gm, gd] = s.split('-').map(Number);
  const j = toJalaali(gy, gm, gd);
  return toFa(`${j.jy}/${String(j.jm).padStart(2,'0')}/${String(j.jd).padStart(2,'0')}`);
}
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) { height = Math.round((maxWidth / width) * height); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob(blob => {
          if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          else reject(new Error('خطا در فشرده‌سازی'));
        }, 'image/jpeg', quality);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/* =========================================
   ۵. لاگین و شروع
   ========================================= */
async function init() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { currentUser = session.user; await loadProfile(); showApp(); } else { showAuth(); }
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) { currentUser = session.user; await loadProfile(); showApp(); }
      else if (event === 'SIGNED_OUT') { currentUser = null; currentProfile = null; showAuth(); }
    });
  } catch (err) { document.getElementById('loading-screen').innerHTML = `<p style="color:red;">${err.message}</p>`; }
}
async function loadProfile() {
  const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data || { role: 'user', full_name: currentUser.email };
}
function showAuth() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('auth-view').classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
}
async function showApp() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  
  document.getElementById('user-name').textContent = currentProfile?.full_name || currentUser.email;
  const isAdmin = currentProfile?.role === 'admin';
  
  document.getElementById('add-bday-btn').classList.toggle('hidden', !isAdmin);
  document.getElementById('add-bday-btn-table').classList.toggle('hidden', !isAdmin);
  document.getElementById('menu-admin-item').classList.toggle('hidden', !isAdmin);
  
  document.getElementById('profile-avatar-char').textContent = (currentProfile?.full_name || currentUser.email).charAt(0).toUpperCase();
  document.getElementById('profile-display-name').textContent = currentProfile?.full_name || 'کاربر';
  document.getElementById('profile-display-email').textContent = currentUser?.email || '';
  document.getElementById('profile-role-badge').textContent = currentProfile?.role === 'admin' ? '👑 مدیر سیستم' : '👤 کاربر عادی';
  document.getElementById('new-name-input').value = currentProfile?.full_name || '';

  document.getElementById('notif-days-select').value = currentProfile?.notif_days_before ?? 1;
  document.getElementById('notif-hour-select').value = currentProfile?.notif_hour ?? 20;

  await loadBirthdays();
  checkNotifStatus();
  initHoroscope();
  initAgeCalculator(); 
  initCalendar(); 
  initCompare(); 
  
  if (isAdmin) loadAdminData();
}

/* =========================================
   ۶. فرم‌ها
   ========================================= */
document.getElementById('tab-login').addEventListener('click', () => setAuthMode('login'));
document.getElementById('tab-signup').addEventListener('click', () => setAuthMode('signup'));
function setAuthMode(mode) {
  authMode = mode;
  document.getElementById('tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('tab-signup').classList.toggle('active', mode === 'signup');
  document.getElementById('name-field').classList.toggle('hidden', mode === 'login');
  document.getElementById('auth-submit').textContent = mode === 'login' ? 'ورود' : 'ثبت‌نام';
  document.getElementById('auth-msg').textContent = '';
}
document.getElementById('auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  const msg = document.getElementById('auth-msg');
  const btn = document.getElementById('auth-submit');
  btn.disabled = true; msg.textContent = ''; msg.className = 'msg';
  try {
    if (authMode === 'signup') {
      if (!name) throw new Error('نام را وارد کن');
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) throw error;
      msg.textContent = '✅ ثبت‌نام موفق! حالا وارد شو.'; msg.className = 'msg success'; setAuthMode('login');
      document.getElementById('auth-email').value = email; document.getElementById('auth-password').value = '';
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) { msg.textContent = '❌ ' + (err.message || 'خطا'); msg.className = 'msg error'; }
  finally { btn.disabled = false; }
});
document.getElementById('logout-btn').addEventListener('click', async () => {
  if (!confirm('خارج بشی؟')) return;
  try { await supabase.auth.signOut({ scope: 'local' }); } catch (err) { console.error(err); }
  finally { currentUser = null; currentProfile = null; showAuth(); }
});

document.getElementById('change-name-form').addEventListener('submit', async e => {
  e.preventDefault();
  const newName = document.getElementById('new-name-input').value.trim();
  if (!newName) return alert('نام نمی‌تواند خالی باشد');
  const btn = document.getElementById('save-name-btn');
  btn.disabled = true; btn.textContent = 'در حال ذخیره...';
  try {
    const { error } = await supabase.from('profiles').update({ full_name: newName }).eq('id', currentUser.id);
    if (error) throw error;
    currentProfile.full_name = newName;
    document.getElementById('user-name').textContent = newName;
    document.getElementById('profile-display-name').textContent = newName;
    document.getElementById('profile-avatar-char').textContent = newName.charAt(0).toUpperCase();
    alert('✅ نام با موفقیت تغییر کرد!');
  } catch (err) { alert('خطا: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'ذخیره نام'; }
});

document.getElementById('change-password-form').addEventListener('submit', async e => {
  e.preventDefault();
  const newPass = document.getElementById('new-password-input').value;
  const btn = document.getElementById('save-pass-btn');
  btn.disabled = true; btn.textContent = 'در حال تغییر...';
  try {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
    alert('✅ رمز عبور با موفقیت تغییر کرد!');
    document.getElementById('new-password-input').value = '';
  } catch (err) { alert('خطا: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'تغییر رمز'; }
});

document.getElementById('notif-settings-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('save-notif-settings-btn');
  btn.disabled = true; btn.textContent = 'در حال ذخیره...';
  const days = parseInt(document.getElementById('notif-days-select').value);
  const hour = parseInt(document.getElementById('notif-hour-select').value);
  try {
    const { error } = await supabase.from('profiles').update({ notif_days_before: days, notif_hour: hour }).eq('id', currentUser.id);
    if (error) throw error;
    currentProfile.notif_days_before = days;
    currentProfile.notif_hour = hour;
    alert('✅ تنظیمات یادآوری با موفقیت ذخیره شد!');
  } catch (err) { alert('خطا: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'ذخیره تنظیمات'; }
});

/* =========================================
   ۷. تقویم ماهانه (اصلاح قطعی)
   ========================================= */
function initCalendar() {
  const now = new Date();
  const jNow = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  calCurrentYear = parseInt(jNow.jy);
  calCurrentMonth = parseInt(jNow.jm);
  
  if (isNaN(calCurrentYear) || isNaN(calCurrentMonth)) {
    // فال‌بک در صورت خطای محاسبه
    calCurrentYear = 1403;
    calCurrentMonth = 7;
  }
  
  renderCalendar();

  document.getElementById('prev-month-btn').addEventListener('click', () => {
    calCurrentMonth--;
    if (calCurrentMonth < 1) { calCurrentMonth = 12; calCurrentYear--; }
    renderCalendar();
  });
  document.getElementById('next-month-btn').addEventListener('click', () => {
    calCurrentMonth++;
    if (calCurrentMonth > 12) { calCurrentMonth = 1; calCurrentYear++; }
    renderCalendar();
  });
}

function renderCalendar() {
  const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  
  // چک کردن نهایی برای اینکه متغیرها خالی نباشن
  if (!calCurrentYear || !calCurrentMonth || isNaN(calCurrentYear) || isNaN(calCurrentMonth)) {
    const now = new Date();
    const jNow = toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    calCurrentYear = parseInt(jNow.jy);
    calCurrentMonth = parseInt(jNow.jm);
  }

  document.getElementById('calendar-month-title').textContent = `${monthNames[calCurrentMonth - 1]} ${toFa(calCurrentYear)}`;
  
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const dayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
  dayNames.forEach(name => {
    const div = document.createElement('div');
    div.className = 'cal-day-name';
    div.textContent = name;
    grid.appendChild(div);
  });

  const firstDayGregorian = toGregorian(calCurrentYear, calCurrentMonth, 1);
  const firstDayDate = new Date(firstDayGregorian.gy, firstDayGregorian.gm - 1, firstDayGregorian.gd);
  const startDayOfWeek = (firstDayDate.getDay() + 1) % 7;

  let daysInMonth = calCurrentMonth <= 6 ? 31 : 30;
  if (calCurrentMonth === 12 && jalCal(calCurrentYear).leap === 1) daysInMonth = 30;
  else if (calCurrentMonth === 12) daysInMonth = 29;

  for (let i = 0; i < startDayOfWeek; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'cal-day empty';
    emptyDiv.style.background = 'transparent';
    emptyDiv.style.boxShadow = 'none';
    grid.appendChild(emptyDiv);
  }

  const t = new Date();
  const jToday = toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());

  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'cal-day';
    
    if (calCurrentYear === jToday.jy && calCurrentMonth === jToday.jm && d === jToday.jd) {
      dayDiv.classList.add('today');
    }

    const hasBday = allBirthdays.some(b => {
      const [gy, gm, gd] = b.birthday.split('-').map(Number);
      const j = toJalaali(gy, gm, gd);
      return j.jm === calCurrentMonth && j.jd === d;
    });
    if (hasBday) dayDiv.classList.add('has-bday');

    dayDiv.innerHTML = `<span>${toFa(d)}</span>`;
    grid.appendChild(dayDiv);
  }
}

/* =========================================
   ۸. مقایسه دو نفر (اصلاح قطعی)
   ========================================= */
function initCompare() {
  const sel1 = document.getElementById('compare-person-1');
  const sel2 = document.getElementById('compare-person-2');
  
  if (!sel1 || !sel2) return;

  if (allBirthdays.length < 2) {
    sel1.innerHTML = '<option>حداقل دو نفر لازم است</option>';
    sel2.innerHTML = '<option>حداقل دو نفر لازم است</option>';
    document.getElementById('compare-btn').disabled = true;
    return;
  }

  document.getElementById('compare-btn').disabled = false;
  const opts = allBirthdays.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
  
  // حفظ انتخاب قبلی اگر وجود داشت
  const prevVal1 = sel1.value;
  const prevVal2 = sel2.value;
  
  sel1.innerHTML = opts;
  sel2.innerHTML = opts;
  
  if (prevVal1 && allBirthdays.find(b => b.id === prevVal1)) sel1.value = prevVal1;
  if (prevVal2 && allBirthdays.find(b => b.id === prevVal2)) sel2.value = prevVal2;
  else if (allBirthdays.length > 1) sel2.selectedIndex = 1;

  document.getElementById('compare-btn').onclick = () => {
    const p1 = allBirthdays.find(b => b.id === sel1.value);
    const p2 = allBirthdays.find(b => b.id === sel2.value);
    if (!p1 || !p2) return;
    if (p1.id === p2.id) return alert('دو نفر متفاوت انتخاب کن!');

    const date1 = new Date(p1.birthday + 'T00:00:00');
    const date2 = new Date(p2.birthday + 'T00:00:00');
    
    const diffTime = Math.abs(date1 - date2);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const older = date1 < date2 ? p1.name : p2.name;
    const younger = date1 > date2 ? p1.name : p2.name;

    const j1 = toJalaali(date1.getFullYear(), date1.getMonth()+1, date1.getDate());
    const j2 = toJalaali(date2.getFullYear(), date2.getMonth()+1, date2.getDate());
    
    let extraText = "";
    if (j1.jm === j2.jm && j1.jd === j2.jd) {
      extraText = "🎉 وای! این دو نفر دقیقاً همون روز از سال به دنیا اومدن! (فقط سالشون فرق داره)";
    } else if (j1.jm === j2.jm) {
      extraText = "📅 این دو نفر توی یک ماه به دنیا اومدن!";
    } else {
      extraText = "✨ این دو نفر توی دو ماه مختلف به دنیا اومدن.";
    }

    document.getElementById('compare-result').classList.remove('hidden');
    document.getElementById('compare-title').textContent = `${p1.name} 🆚 ${p2.name}`;
    document.getElementById('compare-text').innerHTML = `
      <b>${older}</b> بزرگتره.<br>
      اختلاف سنی: حدود <b>${toFa(diffDays)} روز</b> (یا ${toFa(Math.floor(diffDays/365))} سال)<br>
      <span style="color: var(--secondary); font-weight:900; display:block; margin-top:10px;">${extraText}</span>
    `;
  };
}

/* =========================================
   ۹. محاسبه سن دقیق
   ========================================= */
document.getElementById('age-input').addEventListener('input', e => {
  const p = parsePersianDate(e.target.value);
  const prev = document.getElementById('age-preview');
  if (p) { prev.textContent = `✅ معادل میلادی: ${p.gy}-${String(p.gm).padStart(2,'0')}-${String(p.gd).padStart(2,'0')}`; prev.className = 'hint success'; }
  else { prev.textContent = e.target.value ? '❌ فرمت: ۱۳۷۰/۰۵/۱۵' : ''; prev.className = 'hint error'; }
});

document.getElementById('calc-age-btn').addEventListener('click', () => {
  const input = document.getElementById('age-input').value;
  const parsed = parsePersianDate(input);
  if (!parsed) return alert('تاریخ نامعتبر است. فرمت صحیح: ۱۳۷۰/۰۵/۱۵');
  const birthDate = new Date(parsed.gy, parsed.gm - 1, parsed.gd);
  const resultBox = document.getElementById('age-result-box');
  resultBox.classList.remove('hidden');
  if (ageInterval) clearInterval(ageInterval);

  function updateAge() {
    const now = new Date();
    if (now < birthDate) {
      alert('تاریخ تولد نمی‌تواند در آینده باشد!');
      resultBox.classList.add('hidden');
      if(ageInterval) clearInterval(ageInterval);
      return;
    }
    let years = now.getFullYear() - birthDate.getFullYear();
    let months = now.getMonth() - birthDate.getMonth();
    let days = now.getDate() - birthDate.getDate();
    let hours = now.getHours() - birthDate.getHours();
    let minutes = now.getMinutes() - birthDate.getMinutes();
    let seconds = now.getSeconds() - birthDate.getSeconds();
    if (seconds < 0) { seconds += 60; minutes--; }
    if (minutes < 0) { minutes += 60; hours--; }
    if (hours < 0) { hours += 24; days--; }
    if (days < 0) {
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
      months--;
    }
    if (months < 0) { months += 12; years--; }
    document.getElementById('age-years').textContent = toFa(years);
    document.getElementById('age-months').textContent = toFa(months);
    document.getElementById('age-days').textContent = toFa(days);
    document.getElementById('age-hours').textContent = toFa(hours);
    document.getElementById('age-mins').textContent = toFa(minutes);
    document.getElementById('age-secs').textContent = toFa(seconds);
  }
  updateAge();
  ageInterval = setInterval(updateAge, 1000);
});
function stopAgeCalculator() { if (ageInterval) { clearInterval(ageInterval); ageInterval = null; } }

/* =========================================
   ۱۰. فال حافظ و طالع بینی
   ========================================= */
document.getElementById('get-hafez-btn').addEventListener('click', () => {
  const randomFal = hafezFals[Math.floor(Math.random() * hafezFals.length)];
  document.getElementById('hafez-poem').textContent = randomFal.poem;
  document.getElementById('hafez-meaning').textContent = randomFal.meaning;
  document.getElementById('hafez-result').classList.remove('hidden');
});

function initHoroscope() {
  const tabMonth = document.getElementById('tab-horo-month');
  const tabYear = document.getElementById('tab-horo-year');
  const selectBox = document.getElementById('horo-select-box');
  const selectLabel = document.getElementById('horo-select-label');
  const resultBox = document.getElementById('horo-result-box');
  const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const cZodiacNames = ['موش', 'گاو', 'ببر', 'خرگوش', 'اژدها', 'مار', 'اسب', 'بز', 'میمون', 'خروس', 'سگ', 'خوک'];

  function populateDropdown() {
    selectBox.innerHTML = '';
    if (currentHoroMode === 'month') {
      selectLabel.textContent = 'یک ماه را انتخاب کنید:';
      monthNames.forEach(m => { const opt = document.createElement('option'); opt.value = m; opt.textContent = m; selectBox.appendChild(opt); });
    } else {
      selectLabel.textContent = 'یک سال را انتخاب کنید:';
      cZodiacNames.forEach(z => { const opt = document.createElement('option'); opt.value = z; opt.textContent = `سال ${z}`; selectBox.appendChild(opt); });
    }
    showHoroscopeResult();
  }
  function showHoroscopeResult() {
    const val = selectBox.value;
    if (!val) return;
    resultBox.classList.remove('hidden');
    if (currentHoroMode === 'month') {
      document.getElementById('horo-result-title').textContent = `طالع بینی ماه ${val}`;
      document.getElementById('horo-result-text').textContent = monthlyHoroscopes[val];
      document.getElementById('horo-result-icon').textContent = '🌙';
    } else {
      document.getElementById('horo-result-title').textContent = `طالع بینی سال ${val}`;
      document.getElementById('horo-result-text').textContent = yearlyHoroscopes[val];
      document.getElementById('horo-result-icon').textContent = '☀️';
    }
  }
  tabMonth.addEventListener('click', () => { currentHoroMode = 'month'; tabMonth.classList.add('active'); tabYear.classList.remove('active'); populateDropdown(); });
  tabYear.addEventListener('click', () => { currentHoroMode = 'year'; tabYear.classList.add('active'); tabMonth.classList.remove('active'); populateDropdown(); });
  selectBox.addEventListener('change', showHoroscopeResult);
  populateDropdown();
}

/* =========================================
   ۱۱. پنل ادمین و نمودارها
   ========================================= */
async function loadAdminData() {
  if (currentProfile?.role !== 'admin') return;
  
  const { count: bdayCount } = await supabase.from('birthdays').select('*', { count: 'exact', head: true });
  const { data: users, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  
  if (error) return console.error(error);
  
  document.getElementById('stat-total-users').textContent = toFa(users?.length || 0);
  document.getElementById('stat-total-bdays').textContent = toFa(bdayCount || 0);
  document.getElementById('stat-total-admins').textContent = toFa(users?.filter(u => u.role === 'admin').length || 0);
  
  const tbody = document.getElementById('admin-users-tbody');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><b>${esc(u.full_name || 'بدون نام')}</b></td>
      <td><span class="role-badge ${u.role}">${u.role === 'admin' ? '👑 مدیر' : '👤 کاربر'}</span></td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="action-btn-small toggle" onclick="toggleAdminRole('${u.id}', '${u.role}')">${u.role === 'admin' ? 'حذف ادمینی' : 'ادمین کن'}</button>
          ${u.id !== currentUser.id ? `<button class="action-btn-small delete" onclick="removeUser('${u.id}')">حذف</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  drawCharts();
}

function drawCharts() {
  if (!document.getElementById('chart-months') || !document.getElementById('chart-zodiac')) return;
  
  const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const pZodiacNames = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];
  
  const monthCounts = new Array(12).fill(0);
  const zodiacCounts = new Array(12).fill(0);

  allBirthdays.forEach(b => {
    const [gy, gm, gd] = b.birthday.split('-').map(Number);
    const j = toJalaali(gy, gm, gd);
    monthCounts[j.jm - 1]++;
    zodiacCounts[j.jm - 1]++;
  });

  if (chartMonthsInstance) chartMonthsInstance.destroy();
  if (chartZodiacInstance) chartZodiacInstance.destroy();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#f8fafc' : '#0f172a';

  const ctxMonths = document.getElementById('chart-months').getContext('2d');
  chartMonthsInstance = new Chart(ctxMonths, {
    type: 'bar',
    data: {
      labels: monthNames,
      datasets: [{ label: 'تعداد تولد', data: monthCounts, backgroundColor: '#6366f1', borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: textColor, font: {family: 'Vazirmatn'} } }, y: { ticks: { color: textColor, stepSize: 1 } } } }
  });

  const ctxZodiac = document.getElementById('chart-zodiac').getContext('2d');
  chartZodiacInstance = new Chart(ctxZodiac, {
    type: 'doughnut',
    data: {
      labels: pZodiacNames,
      datasets: [{ data: zodiacCounts, backgroundColor: ['#ef4444','#f97316','#f59e0b','#84cc16','#10b981','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899'] }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: textColor, font: {family: 'Vazirmatn', size: 10} } } } }
  });
}

window.toggleAdminRole = async (userId, currentRole) => {
  if (!confirm(`آیا مطمئنی می‌خوای نقش این کاربر رو تغییر بدی؟`)) return;
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) alert('خطا: ' + error.message);
  else loadAdminData();
};
window.removeUser = async (userId) => {
  if (!confirm('آیا از حذف کامل این کاربر مطمئنی؟')) return;
  await supabase.from('birthdays').delete().eq('created_by', userId);
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) alert('خطا: ' + error.message);
  else loadAdminData();
};

document.getElementById('create-user-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('create-user-btn');
  btn.disabled = true; btn.textContent = 'در حال ساخت...';
  const email = document.getElementById('create-user-email').value.trim();
  const password = document.getElementById('create-user-password').value;
  const full_name = document.getElementById('create-user-name').value.trim();
  try {
    const { data, error } = await supabase.functions.invoke('create-user', { body: { email, password, full_name } });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    alert('✅ کاربر جدید با موفقیت ساخته شد!');
    e.target.reset(); loadAdminData();
  } catch (err) { alert('خطا: ' + (err.message || 'مشکلی پیش آمد.')); }
  finally { btn.disabled = false; btn.textContent = 'ساخت کاربر'; }
});

/* =========================================
   ۱۲. رندر کارت‌ها و شمارش معکوس
   ========================================= */
async function loadBirthdays() {
  const { data, error } = await supabase.from('birthdays').select('*').order('birthday');
  if (error) return console.error(error);
  allBirthdays = data; renderAll();
}
function renderAll() {
  const w = allBirthdays.map(b => ({ ...b, days: daysUntil(b.birthday) })).sort((a, b) => a.days - b.days);
  const todayBirthdays = w.filter(b => b.days === 0);
  renderList('today-list', todayBirthdays);
  renderList('week-list', w.filter(b => b.days > 0 && b.days <= 7));
  renderList('month-list', w.filter(b => b.days > 7 && b.days <= 30));
  renderList('all-list', w);
  renderTable(w);
  if (todayBirthdays.length > 0 && !confettiFired) {
    confettiFired = true;
    setTimeout(() => { confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#6366f1', '#ec4899', '#fbbf24', '#10b981'] }); }, 500);
  }
  startCountdown(w);
}
function renderTable(list) {
  const tbody = document.getElementById('birthdays-table-body');
  if (!tbody) return;
  if (list.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">موردی ثبت نشده است</td></tr>'; return; }
  const sortedList = [...list].sort((a, b) => a.birthday.localeCompare(b.birthday));
  const pZodiacNames = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];
  const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  tbody.innerHTML = sortedList.map(b => {
    const [gy, gm, gd] = b.birthday.split('-').map(Number);
    const jDate = toJalaali(gy, gm, gd);
    const fullDate = `${toFa(jDate.jd)} ${monthNames[jDate.jm - 1]} ${toFa(jDate.jy)}`;
    const age = toFa(ageTurning(b.birthday));
    let badgeClass = 'normal', daysText = `${toFa(b.days)} روز مانده`;
    if (b.days === 0) { badgeClass = 'today'; daysText = '🎉 امروز!'; }
    else if (b.days === 1) { badgeClass = 'soon'; daysText = 'فردا'; }
    else if (b.days <= 7) { badgeClass = 'soon'; }
    return `<tr><td><b>${esc(b.name)}</b></td><td>${fullDate}</td><td>${age} ساله</td><td><span class="bd-badge ${badgeClass}">${daysText}</span></td><td>${pZodiacNames[jDate.jm - 1]}</td></tr>`;
  }).join('');
}
function renderList(id, items) {
  const el = document.getElementById(id);
  el.innerHTML = items.length ? items.map(cardHtml).join('') : '<p class="empty">موردی نیست</p>';
}
function cardHtml(b) {
  const isAdmin = currentProfile?.role === 'admin';
  let badge = b.days === 0 ? '<span class="badge today">🎉 امروز!</span>' : b.days === 1 ? '<span class="badge soon">فردا</span>' : `<span class="badge">${toFa(b.days)} روز مانده</span>`;
  const [gy, gm, gd] = b.birthday.split('-').map(Number);
  const jDate = toJalaali(gy, gm, gd);
  const birthYearFa = toFa(jDate.jy);
  const pZodiacNames = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];
  const pZodiacIcons = ['🐏', '🐂', '👥', '🦀', '🦁', '🌾', '⚖️', '🦂', '🏹', '🐐', '🏺', '🐟'];
  const pZodiacIndex = jDate.jm - 1;
  const pZodiac = `${pZodiacIcons[pZodiacIndex]} ${pZodiacNames[pZodiacIndex]}`;
  const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const monthName = monthNames[pZodiacIndex];
  let season = 'بهار', seasonIcon = '🌸';
  if (jDate.jm >= 4 && jDate.jm <= 6) { season = 'تابستان'; seasonIcon = '☀️'; }
  else if (jDate.jm >= 7 && jDate.jm <= 9) { season = 'پاییز'; seasonIcon = '🍂'; }
  else if (jDate.jm >= 10 && jDate.jm <= 12) { season = 'زمستان'; seasonIcon = '❄️'; }
  let zodiacYear = gy;
  if (gm === 1 || (gm === 2 && gd <= 15)) { zodiacYear -= 1; }
  const cZodiacNames = ['موش', 'گاو', 'ببر', 'خرگوش', 'اژدها', 'مار', 'اسب', 'بز', 'میمون', 'خروس', 'سگ', 'خوک'];
  const cZodiacIcons = ['🐀', '🐂', '🐅', '🐇', '🐉', '🐍', '🐎', '🐐', '🐒', '🐓', '🐕', '🐖'];
  let cZodiacIndex = (zodiacYear - 4) % 12; if (cZodiacIndex < 0) cZodiacIndex += 12;
  const cZodiac = `${cZodiacIcons[cZodiacIndex]} ${cZodiacNames[cZodiacIndex]}`;
  const fullDateStr = `${toFa(jDate.jd)} ${monthName} ${birthYearFa}`;
  return `
    <div class="card">
      <div class="card-header">${b.photo_url ? `<img src="${b.photo_url}" class="card-photo">` : `<div class="card-photo avatar-placeholder">${esc(b.name.charAt(0))}</div>`}</div>
      <div class="card-body">
        <div class="name-row"><h3>${esc(b.name)}</h3>${badge}</div>
        <div class="details-grid">
          <div class="detail-item"><span>📅</span> متولد: ${fullDateStr}</div>
          <div class="detail-item"><span>🎂</span> سن: ${toFa(ageTurning(b.birthday))} ساله</div>
          <div class="detail-item"><span>🗓️</span> ماه: ${monthName} (${seasonIcon} ${season})</div>
          <div class="detail-item"><span>✨</span> برج: ${pZodiac}</div>
          <div class="detail-item" style="grid-column: span 2; justify-content: center; background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.15)); border: 1px dashed #f59e0b;"><span>🐾</span> حیوان سال: <b>${cZodiac}</b></div>
        </div>
        <button class="btn-horoscope" data-id="${b.id}" data-name="${esc(b.name)}" data-zodiac="${pZodiacIndex}" data-chinese="${cZodiacIndex}">🔮 مشاهده طالع بینی</button>
      </div>
      ${isAdmin ? `<div class="card-actions"><button class="edit-btn" data-id="${b.id}">✏️</button><button class="del-btn" data-id="${b.id}">🗑️</button></div>` : ''}
    </div>`;
}
function startCountdown(sortedList) {
  const banner = document.getElementById('countdown-banner');
  const timerContent = document.getElementById('countdown-timer-content');
  const nameEl = document.getElementById('cd-name');
  if (countdownInterval) clearInterval(countdownInterval);
  if (!sortedList || sortedList.length === 0) { banner.classList.add('hidden'); return; }
  const nearest = sortedList[0];
  banner.classList.remove('hidden');
  nameEl.textContent = nearest.name;
  if (nearest.days === 0) {
    banner.classList.add('today-mode');
    timerContent.innerHTML = '<div style="animation: pulse 1.5s infinite;">🎉 امروز تولدشه! تبریک بگید! 🎉</div>';
    return;
  } else {
    banner.classList.remove('today-mode');
    timerContent.innerHTML = `<div class="cd-box"><span id="cd-days">۰</span><small>روز</small></div><div class="cd-box"><span id="cd-hours">۰</span><small>ساعت</small></div><div class="cd-box"><span id="cd-mins">۰</span><small>دقیقه</small></div><div class="cd-box"><span id="cd-secs">۰</span><small>ثانیه</small></div>`;
  }
  const [by, bm, bd] = nearest.birthday.split('-').map(Number);
  const now = new Date();
  let targetDate = new Date(now.getFullYear(), bm - 1, bd, 0, 0, 0);
  if (targetDate.getTime() < now.getTime() && nearest.days !== 0) targetDate.setFullYear(now.getFullYear() + 1);
  countdownInterval = setInterval(() => {
    const diff = targetDate.getTime() - new Date().getTime();
    if (diff <= 0) { clearInterval(countdownInterval); startCountdown(sortedList); return; }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / 1000 / 60) % 60);
    const secs = Math.floor((diff / 1000) % 60);
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = toFa(String(val).padStart(2, '0')); };
    setVal('cd-days', days); setVal('cd-hours', hours); setVal('cd-mins', mins); setVal('cd-secs', secs);
  }, 1000);
}

/* =========================================
   ۱۳. رویدادها و منو
   ========================================= */
document.getElementById('search-input').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) return renderAll();
  const f = allBirthdays.filter(b => b.name.toLowerCase().includes(q)).map(b => ({ ...b, days: daysUntil(b.birthday) })).sort((a, b) => a.days - b.days);
  renderList('all-list', f);
  renderTable(f);
});
document.getElementById('add-bday-btn').addEventListener('click', () => openModal());
document.getElementById('add-bday-btn-table').addEventListener('click', () => openModal());
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('bday-modal').addEventListener('click', e => { if (e.target.id === 'bday-modal') closeModal(); });
function openModal(b = null) {
  document.getElementById('bday-photo').value = ''; 
  document.getElementById('modal-title').textContent = b ? 'ویرایش تولد' : 'افزودن تولد';
  document.getElementById('bday-id').value = b?.id || '';
  document.getElementById('bday-name').value = b?.name || '';
  document.getElementById('bday-persian').value = b ? gregorianToPersianString(b.birthday) : '';
  document.getElementById('bday-preview').textContent = '';
  document.getElementById('bday-modal').classList.remove('hidden');
}
function closeModal() { 
  document.getElementById('bday-modal').classList.add('hidden'); 
  const form = document.getElementById('bday-form'); form.reset();
  document.getElementById('bday-photo').value = ''; document.getElementById('bday-id').value = '';
  document.getElementById('bday-preview').textContent = '';
  const submitBtn = form.querySelector('button[type="submit"]'); submitBtn.disabled = false; submitBtn.textContent = 'ذخیره';
}
document.getElementById('bday-persian').addEventListener('input', e => {
  const p = parsePersianDate(e.target.value);
  const prev = document.getElementById('bday-preview');
  if (p) { prev.textContent = `✅ معادل میلادی: ${p.gy}-${String(p.gm).padStart(2,'0')}-${String(p.gd).padStart(2,'0')}`; prev.className = 'hint success'; }
  else { prev.textContent = e.target.value ? '❌ فرمت: ۱۳۷۰/۰۵/۱۵' : ''; prev.className = 'hint error'; }
});
document.getElementById('bday-form').addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true; submitBtn.textContent = 'در حال ذخیره...';
  try {
    const id = document.getElementById('bday-id').value;
    const name = document.getElementById('bday-name').value.trim();
    const dateStr = document.getElementById('bday-persian').value;
    const photoFile = document.getElementById('bday-photo').files[0];
    const p = parsePersianDate(dateStr);
    if (!name) throw new Error('نام را وارد کنید');
    if (!p) throw new Error('تاریخ نامعتبر است. فرمت صحیح: 1370/05/15');
    const birthday = `${p.gy}-${String(p.gm).padStart(2,'0')}-${String(p.gd).padStart(2,'0')}`;
    let photoUrl = null;
    if (photoFile) {
      submitBtn.textContent = 'در حال آپلود عکس...';
      const compressedPhoto = await compressImage(photoFile);
      const fileExt = compressedPhoto.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, compressedPhoto);
      if (uploadError) throw new Error('خطا در آپلود عکس: ' + uploadError.message);
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      photoUrl = urlData.publicUrl;
    }
    submitBtn.textContent = 'در حال ذخیره...';
    let op;
    if (id) { const updateData = { name, birthday }; if (photoUrl) updateData.photo_url = photoUrl; op = supabase.from('birthdays').update(updateData).eq('id', id); }
    else { op = supabase.from('birthdays').insert({ name, birthday, photo_url: photoUrl }); }
    const { error } = await op;
    if (error) throw new Error('خطای دیتابیس: ' + error.message);
    if (document.getElementById('bday-modal').classList.contains('hidden')) return;
    closeModal(); await loadBirthdays();
  } catch (err) { console.error(err); alert(err.message); }
  finally { submitBtn.disabled = false; submitBtn.textContent = 'ذخیره'; }
});
document.addEventListener('click', async e => {
  if (e.target.classList.contains('edit-btn')) {
    const b = allBirthdays.find(x => x.id === e.target.dataset.id);
    if (b) openModal(b);
  }
  if (e.target.classList.contains('del-btn')) {
    if (!confirm('حذف بشه؟')) return;
    const { error } = await supabase.from('birthdays').delete().eq('id', e.target.dataset.id);
    if (error) return alert('خطا: ' + error.message);
    await loadBirthdays();
  }
  if (e.target.classList.contains('btn-horoscope')) {
    const name = e.target.dataset.name;
    const zodiacIdx = parseInt(e.target.dataset.zodiac);
    const chineseIdx = parseInt(e.target.dataset.chinese);
    const pZodiacNames = ['حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله', 'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'];
    const cZodiacNames = ['موش', 'گاو', 'ببر', 'خرگوش', 'اژدها', 'مار', 'اسب', 'بز', 'میمون', 'خروس', 'سگ', 'خوک'];
    document.getElementById('horo-name').innerHTML = `🔮 طالع بینی <span style="color:var(--secondary)">${name}</span>`;
    document.getElementById('horo-content').innerHTML = `
      <div class="horo-section"><h3>✨ برج ${pZodiacNames[zodiacIdx]}</h3><p>${zodiacTraits[zodiacIdx]}</p></div>
      <div class="horo-section"><h3>🐾 متولد سال ${cZodiacNames[chineseIdx]}</h3><p>${chineseTraits[chineseIdx]}</p></div>
      <p style="text-align:center; font-size:12px; color:var(--text-muted); margin-top:10px;">(این متن‌ها جنبه سرگرمی دارند 😉)</p>
    `;
    document.getElementById('horoscope-modal').classList.remove('hidden');
  }
});
document.getElementById('horo-close').addEventListener('click', () => { document.getElementById('horoscope-modal').classList.add('hidden'); });
document.getElementById('horoscope-modal').addEventListener('click', e => { if (e.target.id === 'horoscope-modal') document.getElementById('horoscope-modal').classList.add('hidden'); });

const menuBtn = document.getElementById('menu-btn');
const closeMenuBtn = document.getElementById('close-menu-btn');
const sideMenu = document.getElementById('side-menu');
const menuOverlay = document.getElementById('menu-overlay');
const menuItems = document.querySelectorAll('.menu-item');
function openMenu() { sideMenu.classList.add('active'); menuOverlay.classList.remove('hidden'); setTimeout(() => menuOverlay.classList.add('active'), 10); }
function closeMenu() { sideMenu.classList.remove('active'); menuOverlay.classList.remove('active'); setTimeout(() => menuOverlay.classList.add('hidden'), 300); }
if(menuBtn) menuBtn.addEventListener('click', openMenu);
if(closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
if(menuOverlay) menuOverlay.addEventListener('click', closeMenu);
menuItems.forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    menuItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    const target = item.dataset.target;
    closeMenu();
    
    if (target !== 'page-age-calculator') stopAgeCalculator();

    document.querySelectorAll('.page-content').forEach(page => page.classList.add('hidden'));
    const targetPage = document.getElementById(target);
    if (targetPage) targetPage.classList.remove('hidden');
    
    const isAdmin = currentProfile?.role === 'admin';
    const addBtn = document.getElementById('add-bday-btn');
    const addBtnTable = document.getElementById('add-bday-btn-table');
    if(target === 'page-home') { addBtn.classList.toggle('hidden', !isAdmin); addBtnTable.classList.add('hidden'); }
    else if (target === 'page-birthdays') { addBtn.classList.add('hidden'); addBtnTable.classList.toggle('hidden', !isAdmin); }
    else { addBtn.classList.add('hidden'); addBtnTable.classList.add('hidden'); }
    
    if(target === 'page-admin') loadAdminData();
    if(target === 'page-compare') initCompare();
    if(target === 'page-calendar') renderCalendar();
  });
});

/* =========================================
   ۱۴. نوتیفیکیشن
   ========================================= */
async function checkNotifStatus() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    document.getElementById('notif-banner').classList.add('hidden'); return;
  }
  if (Notification.permission === 'granted') {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) { document.getElementById('notif-banner').classList.add('hidden'); document.getElementById('notif-enabled').classList.remove('hidden'); return; }
  }
  document.getElementById('notif-banner').classList.remove('hidden'); document.getElementById('notif-enabled').classList.add('hidden');
}
document.getElementById('enable-notif-btn').addEventListener('click', async () => {
  const btn = document.getElementById('enable-notif-btn');
  btn.disabled = true; btn.textContent = 'صبر کن...';
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { alert('برای یادآوری باید اجازه بدی'); btn.disabled = false; btn.textContent = 'فعال‌سازی'; return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
    const s = sub.toJSON();
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: currentUser.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth
    }, { onConflict: 'endpoint' });
    if (error) throw error;
    document.getElementById('notif-banner').classList.add('hidden'); document.getElementById('notif-enabled').classList.remove('hidden');
  } catch (err) { alert('خطا: ' + err.message); btn.disabled = false; btn.textContent = 'فعال‌سازی'; }
});
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64); const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
init();