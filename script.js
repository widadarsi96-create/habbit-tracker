/* =====================================================
   HABIT. — Prototype Script (v2)
   ===================================================== */

/* ================= SUPABASE ================= */

const SUPABASE_URL = "https://kfdogadcbxemsmrguciz.supabase.co";
const SUPABASE_KEY = "sb_publishable_5j_hwZvyUaYNVLhQzoEz_g_qd5H8qFK";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ================= GLOBAL ================= */

let user = null;
let selectedDate = new Date().toISOString().slice(0, 10);
let habitData = {};
let bonusData = {};
let sleepTarget = localStorage.getItem("sleepTarget") || "00:00";
let historyScores = []; // untuk grafik 28 hari

/* ================= HABITS ================= */

/*
  status: 0 = bagus, 1 = sebagian, 2 = gagal
  score : 5 / 3 / 2.5 / 0
*/

const habits = [
  {
    id: "study",
    name: "Belajar",
    description: "Senin–Jumat",
    type: "number",
    options: [
      ["60 menit", 60],
      ["45 menit", 45],
      ["35 menit", 35],
      ["< 20 menit", 10]
    ],
    days: [1, 2, 3, 4, 5], // Senin–Jumat
    score(value) {
      const v = Number(value) || 0;
      if (v >= 45) return 5;
      if (v >= 20) return 3;
      return 0;
    }
  },
  {
    id: "sleep",
    name: "Tidur",
    description: "Target sebelum batas waktu",
    type: "sleep",
    options: ["22:00", "23:00", "00:00", "01:00", "02:00"],
    days: [0, 1, 2, 3, 4, 5, 6],
    score(value) {
      return sleepScore(value);
    }
  },
  {
    id: "scroll",
    name: "Scroll",
    description: "Maksimal 1 jam 30 menit",
    type: "number",
    options: [
      ["≤ 1 jam", 60],
      ["1 jam 30 menit", 90],
      ["2 jam", 120],
      ["> 2 jam", 121]
    ],
    days: [0, 1, 2, 3, 4, 5, 6],
    score(value) {
      const v = Number(value) || 0;
      if (v <= 90) return 5;
      if (v <= 120) return 3;
      return 0;
    }
  },
  {
    id: "water",
    name: "Air",
    description: "Target tetap 2.000 ml",
    type: "number",
    options: [
      ["500 ml", 500],
      ["1.000 ml", 1000],
      ["1.500 ml", 1500],
      ["2.000 ml", 2000],
      ["2.500 ml", 2500]
    ],
    days: [0, 1, 2, 3, 4, 5, 6],
    score(value) {
      const v = Number(value) || 0;
      if (v >= 2000) return 5;
      if (v >= 1500) return 3;
      return 0;
    }
  },
  {
    id: "sugar",
    name: "Gula",
    description: "Kendali konsumsi",
    type: "choice",
    options: [
      ["Terkendali", 5],
      ["Sedang", 2.5],
      ["Tidak", 0]
    ],
    days: [0, 1, 2, 3, 4, 5, 6],
    score(value) {
      return Number(value) || 0;
    }
  },
  {
    id: "oily",
    name: "Makanan berminyak",
    description: "Kendali konsumsi",
    type: "choice",
    options: [
      ["Terkendali", 5],
      ["Sedang", 2.5],
      ["Berlebihan", 0]
    ],
    days: [0, 1, 2, 3, 4, 5, 6],
    score(value) {
      return Number(value) || 0;
    }
  },
  {
    id: "skin",
    name: "Skincare",
    description: "Rutinitas hari ini",
    type: "choice",
    options: [
      ["Terkendali", 5],
      ["Sebagian", 2.5],
      ["Tidak", 0]
    ],
    days: [0, 1, 2, 3, 4, 5, 6],
    score(value) {
      return Number(value) || 0;
    }
  },
  {
    id: "exercise",
    name: "Olahraga",
    description: "Selasa • Rabu • Jumat + Sabtu/Minggu (Senin & Kamis REST)",
    type: "number",
    options: [
      ["60 menit", 60],
      ["45 menit", 45],
      ["30 menit", 30],
      ["< 20 menit", 10]
    ],
    // 0=Minggu, 2=Selasa, 3=Rabu, 5=Jumat, 6=Sabtu
    // Senin(1) & Kamis(4) = OFF
    days: [0, 2, 3, 5, 6],
    score(value) {
      const v = Number(value) || 0;
      if (v >= 30) return 5;
      if (v > 0) return 3;
      return 0;
    }
  },
  {
    id: "selfcontrol",
    name: "Self-control",
    description: "Kendali diri secara umum",
    type: "choice",
    options: [
      ["Terkendali", 5],
      ["Sebagian", 2.5],
      ["Tidak", 0]
    ],
    days: [0, 1, 2, 3, 4, 5, 6],
    score(value) {
      return Number(value) || 0;
    }
  }
];

/* ================= BASIC ================= */

function $(id) {
  return document.getElementById(id);
}

function getDayNumber(date) {
  return new Date(date + "T12:00:00").getDay();
}

function getActiveHabits(dateStr = selectedDate) {
  const day = getDayNumber(dateStr);
  return habits.filter((h) => h.days.includes(day));
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

/* ================= SLEEP ================= */

function timeToMinutes(time) {
  const str = String(time || "00:00");
  const parts = str.split(":");
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  return hours * 60 + minutes;
}

/**
 * Skor tidur + penanganan lewat tengah malam
 * target 22:00 + actual 01:00 → terlambat 3 jam → 0
 * target 00:00 + actual 01:00 → terlambat 1 jam → 3
 */
function sleepScore(time) {
  let actual = timeToMinutes(time);
  let target = timeToMinutes(sleepTarget);

  if (actual < 12 * 60) actual += 24 * 60;
  if (target < 12 * 60) target += 24 * 60;

  if (actual <= target) return 5;
  if (actual <= target + 60) return 3;
  return 0;
}

/* ================= AUTH ================= */

async function checkLogin() {
  const { data } = await db.auth.getSession();
  if (data.session) {
    loginSuccess(data.session.user);
  } else {
    showLogin();
  }
}

function showLogin() {
  $("authScreen").classList.remove("hidden");
  $("app").classList.add("hidden");
}

function loginSuccess(currentUser) {
  user = currentUser;
  $("authScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("userEmail").textContent = user.email || "";
  loadEverything();
}

let signupMode = false;

$("authSwitch").onclick = function () {
  signupMode = !signupMode;
  if (signupMode) {
    $("authTitle").textContent = "Daftar";
    $("authDescription").textContent = "Buat akun untuk menyimpan progres.";
    $("authSubmit").textContent = "Daftar";
    $("authSwitch").textContent = "Sudah punya akun? Masuk";
  } else {
    $("authTitle").textContent = "Masuk";
    $("authDescription").textContent = "Lanjutkan progres habit Anda.";
    $("authSubmit").textContent = "Masuk";
    $("authSwitch").textContent = "Belum punya akun? Daftar";
  }
  $("authMessage").textContent = "";
};

$("authForm").onsubmit = async function (e) {
  e.preventDefault();
  const email = $("authEmail").value.trim();
  const password = $("authPassword").value;
  $("authMessage").textContent = "Memproses...";

  let result;
  if (signupMode) {
    result = await db.auth.signUp({ email, password });
  } else {
    result = await db.auth.signInWithPassword({ email, password });
  }

  if (result.error) {
    $("authMessage").textContent = result.error.message;
    return;
  }

  if (signupMode) {
    $("authMessage").textContent = "Akun berhasil dibuat. Cek email jika diminta.";
  } else {
    loginSuccess(result.data.user);
  }
};

$("logoutBtn").onclick = async function () {
  await db.auth.signOut();
  user = null;
  showLogin();
};

/* ================= LOAD ================= */

async function loadEverything() {
  await loadSleepTarget();
  await loadDay();
  await loadHistory(); // untuk grafik
  renderAll();
}

async function loadSleepTarget() {
  sleepTarget = localStorage.getItem("sleepTarget") || "00:00";
  $("sleepTarget").value = sleepTarget;
}

async function loadDay() {
  if (!user) return;

  const { data, error } = await db
    .from("habit_days")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", selectedDate);

  if (error) {
    console.error("loadDay error:", error);
    showToast("Gagal mengambil data: " + (error.message || "unknown"));
    return;
  }

  habitData = {};
  (data || []).forEach((row) => {
    habitData[row.habit_id] = row;
  });

  const bonus = await db
    .from("daily_bonuses")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", selectedDate);

  bonusData = {};
  if (!bonus.error && bonus.data) {
    bonus.data.forEach((row) => {
      bonusData[row.bonus_id] = Number(row.points);
    });
  }

  const note = await db
    .from("daily_notes")
    .select("note")
    .eq("user_id", user.id)
    .eq("date", selectedDate)
    .maybeSingle();

  $("dailyNote").value = note.data?.note || "";
}

/* ================= HISTORY untuk GRAFIK ================= */

async function loadHistory() {
  if (!user) return;

  const end = new Date(selectedDate + "T12:00:00");
  const start = new Date(end);
  start.setDate(start.getDate() - 27);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const { data, error } = await db
    .from("habit_days")
    .select("date, habit_id, value")
    .eq("user_id", user.id)
    .gte("date", startStr)
    .lte("date", endStr);

  if (error) {
    console.error("loadHistory error:", error);
    historyScores = [];
    return;
  }

  // group by date
  const byDate = {};
  (data || []).forEach((row) => {
    if (!byDate[row.date]) byDate[row.date] = {};
    byDate[row.date][row.habit_id] = row.value;
  });

  historyScores = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    const active = getActiveHabits(dateStr);
    let score = 0;
    let max = active.length * 5;

    active.forEach((habit) => {
      const val = byDate[dateStr]?.[habit.id];
      if (val !== undefined && val !== null) {
        score += habit.score(val);
      }
    });

    const pct = max > 0 ? Math.round((score / max) * 100) : 0;
    historyScores.push({
      date: dateStr,
      day: d.getDate(),
      score,
      max,
      pct
    });
  }
}

/* ================= SAVE HABIT ================= */

async function saveHabit(habit, value) {
  if (!user) {
    showToast("Belum login");
    return;
  }

  const points = habit.score(value);
  const status = points >= 5 ? 0 : points > 0 ? 1 : 2;

  // Pastikan value selalu string biar aman di kolom text
  const safeValue = String(value);

  const row = {
    user_id: user.id,
    date: selectedDate,
    habit_id: habit.id,
    value: safeValue,
    status: status,
    note: ""
  };

  const { error } = await db.from("habit_days").upsert(row, {
    onConflict: "user_id,date,habit_id"
  });

  if (error) {
    console.error("saveHabit error:", error);
    // Tampilkan pesan error yang lebih jelas
    let msg = "Gagal menyimpan";
    if (error.message) msg += ": " + error.message;
    if (error.code === "42P10" || (error.message && error.message.includes("no unique"))) {
      msg = "Constraint belum ada. Jalankan SQL di bawah.";
    }
    showToast(msg);
    return;
  }

  habitData[habit.id] = row;
  await loadHistory(); // update grafik
  renderAll();
  showToast("Tersimpan ✓");
}

/* ================= RENDER ================= */

function renderAll() {
  renderDate();
  renderHabits();
  renderScore();
  renderBonus();
  renderTargets();
  renderCalendar();
  renderChart();
}

function renderDate() {
  const date = new Date(selectedDate + "T12:00:00");
  $("currentDate").textContent = date.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  $("datePicker").value = selectedDate;
  $("dateBadge").textContent =
    selectedDate === new Date().toISOString().slice(0, 10) ? "TODAY" : "DAY";
}

function renderHabits() {
  const container = $("habitContainer");
  container.innerHTML = "";

  const active = getActiveHabits();

  if (active.length === 0) {
    container.innerHTML = `<p style="color:#6b7280;font-size:14px;">Tidak ada habit aktif hari ini.</p>`;
    return;
  }

  active.forEach((habit) => {
    const card = document.createElement("div");
    card.className = "habit-card";

    const row = habitData[habit.id];
    const currentValue = row ? String(row.value) : "";
    const currentScore = row ? habit.score(row.value) : null;

    card.innerHTML = `
      <div class="habit-top">
        <div>
          <div class="habit-name">${habit.name}</div>
          <div class="habit-desc">${habit.description}</div>
        </div>
        <div class="habit-points">${currentScore !== null ? "+" + currentScore : "—"}</div>
      </div>
    `;

    const buttons = document.createElement("div");

    if (habit.type === "choice") {
      buttons.className = "choice-row";
      habit.options.forEach((option) => {
        const btn = document.createElement("button");
        btn.textContent = option[0];
        if (currentValue === String(option[1])) btn.classList.add("selected");
        btn.onclick = () => saveHabit(habit, option[1]);
        buttons.appendChild(btn);
      });
    } else {
      buttons.className = "quick-buttons";
      habit.options.forEach((option) => {
        const btn = document.createElement("button");
        let value, label;
        if (habit.type === "sleep") {
          value = option;
          label = option;
        } else {
          label = option[0];
          value = option[1];
        }
        btn.textContent = label;
        if (currentValue === String(value)) btn.classList.add("selected");
        btn.onclick = () => saveHabit(habit, value);
        buttons.appendChild(btn);
      });
    }

    card.appendChild(buttons);
    container.appendChild(card);
  });
}

function renderScore() {
  const active = getActiveHabits();
  let score = 0;

  active.forEach((habit) => {
    const row = habitData[habit.id];
    if (row) score += habit.score(row.value);
  });

  const max = active.length * 5;
  const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
  const bonus = Object.values(bonusData).reduce((t, v) => t + Number(v), 0);

  $("totalScore").textContent = score;
  $("percentage").textContent = percentage + "%";
  $("bonusScore").textContent = "+" + bonus;
  $("activeCount").textContent = active.length;
  $("scoreDescription").textContent =
    score === 0
      ? "Belum ada data hari ini."
      : `${score} dari ${max} base points tercapai.`;

  document.querySelector(".progress-ring").style.background = `conic-gradient(
    #536edb ${percentage}%,
    #edf0f6 ${percentage}%
  )`;
}

function renderBonus() {
  document.querySelectorAll(".bonus-btn").forEach((button) => {
    const id = button.dataset.bonus;
    const active = Number(bonusData[id] || 0) > 0;
    button.classList.toggle("selected", active);

    button.onclick = async function () {
      if (!user) return;
      const points = active ? 0 : 2;
      const { error } = await db.from("daily_bonuses").upsert(
        {
          user_id: user.id,
          date: selectedDate,
          bonus_id: id,
          points: points
        },
        { onConflict: "user_id,date,bonus_id" }
      );

      if (error) {
        console.error(error);
        showToast("Bonus gagal: " + (error.message || "error"));
        return;
      }

      bonusData[id] = points;
      renderScore();
      renderBonus();
      showToast(points > 0 ? "Bonus +2 ✓" : "Bonus dibatalkan");
    };
  });
}

function renderTargets() {
  $("targetPreview").innerHTML = `
    <div class="target-item">
      <strong>Belajar</strong>
      <span>≥45 menit = +5<br>20–44 menit = +3<br>&lt;20 menit = 0</span>
    </div>
    <div class="target-item">
      <strong>Scroll</strong>
      <span>≤1j30 = +5<br>≤2j = +3<br>&gt;2j = 0</span>
    </div>
    <div class="target-item">
      <strong>Air</strong>
      <span>≥2.000 ml = +5<br>≥1.500 ml = +3<br>&lt;1.500 ml = 0</span>
    </div>
    <div class="target-item">
      <strong>Olahraga</strong>
      <span>≥30 menit = +5<br>&gt;0 = +3<br>0 = 0<br><em>Senin & Kamis REST</em></span>
    </div>
    <div class="target-item">
      <strong>Gula & Berminyak</strong>
      <span>Terkendali = +5<br>Sedang = +2,5<br>Tidak = 0</span>
    </div>
    <div class="target-item">
      <strong>Skincare & Self-control</strong>
      <span>Terkendali = +5<br>Sebagian = +2,5<br>Tidak = 0</span>
    </div>
  `;
}

/* ================= EVENTS ================= */

$("saveDay").onclick = async function () {
  if (!user) return;
  const note = $("dailyNote").value;
  const { error } = await db.from("daily_notes").upsert(
    {
      user_id: user.id,
      date: selectedDate,
      note: note,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,date" }
  );

  if (error) {
    console.error(error);
    showToast("Catatan gagal: " + (error.message || "error"));
    return;
  }
  showToast("Catatan tersimpan ✓");
};

$("datePicker").onchange = async function () {
  selectedDate = this.value;
  await loadDay();
  await loadHistory();
  renderAll();
};

$("sleepTarget").onchange = function () {
  sleepTarget = this.value;
  localStorage.setItem("sleepTarget", sleepTarget);
  renderAll();
  showToast("Target tidur diperbarui");
};

/* ================= CALENDAR ================= */

function renderCalendar() {
  const calendar = $("calendar");
  calendar.innerHTML = "";

  const base = new Date(selectedDate + "T12:00:00");
  base.setDate(base.getDate() - 13);

  for (let i = 0; i < 28; i++) {
    const date = new Date(base);
    date.setDate(base.getDate() + i);
    const value = date.toISOString().slice(0, 10);

    const button = document.createElement("button");
    button.className = "calendar-day";

    if (value === new Date().toISOString().slice(0, 10)) {
      button.classList.add("today");
    }
    if (value === selectedDate) {
      button.classList.add("good");
    }

    button.innerHTML = `
      <strong>${date.getDate()}</strong>
      <span>${date.toLocaleDateString("id-ID", { weekday: "short" })}</span>
    `;

    button.onclick = async function () {
      selectedDate = value;
      await loadDay();
      await loadHistory();
      renderAll();
    };

    calendar.appendChild(button);
  }
}

/* ================= CHART (real data) ================= */

function renderChart() {
  const canvas = $("progressChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 600;
  const height = 200;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (!historyScores || historyScores.length === 0) {
    ctx.fillStyle = "#7d8799";
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillText("Belum ada data untuk ditampilkan.", 24, height / 2);
    return;
  }

  const padding = { top: 36, right: 16, bottom: 36, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const barGap = 3;
  const barWidth = (chartW - barGap * (historyScores.length - 1)) / historyScores.length;

  // Title
  ctx.fillStyle = "#1a1d26";
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillText("Progress 28 Hari (%)", padding.left, 22);

  // Y axis labels
  ctx.fillStyle = "#9ca3af";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  [0, 50, 100].forEach((v) => {
    const y = padding.top + chartH - (v / 100) * chartH;
    ctx.fillText(v + "%", padding.left - 8, y + 4);
    // grid line
    ctx.strokeStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  });

  // Bars
  historyScores.forEach((item, i) => {
    const x = padding.left + i * (barWidth + barGap);
    const barH = (item.pct / 100) * chartH;
    const y = padding.top + chartH - barH;

    // color based on score
    let color = "#e5e7eb"; // no data
    if (item.max > 0) {
      if (item.pct >= 80) color = "#22c55e";
      else if (item.pct >= 50) color = "#536edb";
      else if (item.pct > 0) color = "#f59e0b";
      else color = "#ef4444";
    }

    // bar
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, Math.max(barH, 2), 3);
    ctx.fill();

    // day number under bar (only some)
    if (i % 4 === 0 || i === historyScores.length - 1) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(item.day), x + barWidth / 2, height - 12);
    }
  });

  // Average line
  const avg =
    historyScores.reduce((s, d) => s + d.pct, 0) / historyScores.length;
  if (avg > 0) {
    const avgY = padding.top + chartH - (avg / 100) * chartH;
    ctx.strokeStyle = "#536edb";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, avgY);
    ctx.lineTo(width - padding.right, avgY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#536edb";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("avg " + Math.round(avg) + "%", width - padding.right - 55, avgY - 6);
  }
}

/* ================= NAV ================= */

document.querySelectorAll(".nav-item").forEach((button) => {
  button.onclick = function () {
    document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    const target = document.getElementById(this.dataset.section);
    if (target) target.scrollIntoView({ behavior: "smooth" });
  };
});

/* ================= START ================= */

checkLogin();
