// ===============================
// 28 DAYS HABIT TRACKER — ONLINE
// ===============================
// 1) Buat project Supabase.
// 2) Isi SUPABASE_URL dan SUPABASE_ANON_KEY di bawah.
// 3) Jalankan SQL dari schema.sql.
// 4) Aktifkan Email/Password Auth di Supabase.
//
// JANGAN masukkan service_role/secret key ke website.

const SUPABASE_URL = "https://kfdogadcbxemsmrguciz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_5j_hwZvyUaYNVLhQzoEz_g_qd5H8qFK";

const configured =
  !SUPABASE_URL.includes("PASTE_") &&
  !SUPABASE_ANON_KEY.includes("PASTE_");

const db = configured
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const HABITS = [
  { id: "sugar", name: "Gula", desc: "Tidak konsumsi gula tambahan / mengurangi / kembali seperti biasa." },
  { id: "oily_food", name: "Makanan berminyak", desc: "Menilai kontrol konsumsi makanan sangat berminyak." },
  { id: "sleep", name: "Tidur", desc: "Menilai apakah pola tidur hari ini lebih teratur." },
  { id: "skincare", name: "Rutinitas skincare", desc: "Menjalankan rutinitas perawatan yang sudah Anda pilih." },
  { id: "water", name: "Minum air", desc: "Menjaga asupan cairan sepanjang hari." },
  { id: "exercise", name: "Aktivitas fisik", desc: "Bergerak atau berolahraga sesuai kemampuan." }
];

// Untuk setiap habit:
// 2 = berhasil penuh, 1 = mengurangi/membaik, 0 = tidak mengurangi.
// Ini adalah skor tracker, bukan penilaian medis.

const OPTIONS = [
  { value: 2, label: "🟢 Penuh" },
  { value: 1, label: "🟡 Mengurangi" },
  { value: 0, label: "🔴 Tidak mengurangi" }
];

const $ = (id) => document.getElementById(id);
let today = dateKey(new Date());
let currentUser = null;
let rows = [];

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function prettyDate(key) {
  return new Date(`${key}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function showMessage(text, target = $("globalMessage")) {
  target.textContent = text || "";
}

function dayNumberFromFirstRow() {
  const dates = rows.map(r => r.date).sort();
  if (!dates.length) return 1;
  const start = new Date(`${dates[0]}T00:00:00`);
  const now = new Date(`${today}T00:00:00`);
  return Math.max(1, Math.floor((now - start) / 86400000) + 1);
}

function renderHabits() {
  const todayRows = rows.filter(r => r.date === today);
  const map = Object.fromEntries(todayRows.map(r => [r.habit_id, r.status]));

  $("habitList").innerHTML = HABITS.map(h => {
    const selected = map[h.id];
    return `
      <article class="habit">
        <div class="habit-top">
          <div>
            <div class="habit-name">${h.name}</div>
            <div class="habit-desc">${h.desc}</div>
          </div>
        </div>
        <div class="options">
          ${OPTIONS.map(o => `
            <button class="option ${selected === o.value ? "selected" : ""}"
              data-habit="${h.id}" data-value="${o.value}">
              ${o.label}
            </button>
          `).join("")}
        </div>
      </article>`;
  }).join("");

  document.querySelectorAll(".option").forEach(btn => {
    btn.addEventListener("click", () =>
      setHabit(btn.dataset.habit, Number(btn.dataset.value))
    );
  });
}

function renderToday() {
  const todayRows = rows.filter(r => r.date === today);
  const points = todayRows.reduce((sum, r) => sum + (r.status ?? 0), 0);
  const max = HABITS.length * 2;
  const pct = Math.round((points / max) * 100);

  $("todayLabel").textContent = prettyDate(today);
  $("dayPill").textContent = `DAY ${Math.min(dayNumberFromFirstRow(), 28)}`;
  $("score").textContent = `${points} / ${max}`;
  $("progressFill").style.width = `${pct}%`;

  $("scoreText").textContent =
    points === 0 ? "Belum dinilai" :
    points === max ? "Semua habit dinilai penuh." :
    "Hari ini belum sempurna — tetap lanjut.";

  const noteRow = todayRows.find(r => r.note != null);
  $("note").value = noteRow?.note || "";
}

function renderSummary() {
  const byDate = {};
  rows.forEach(r => {
    if (!byDate[r.date]) byDate[r.date] = [];
    byDate[r.date].push(r.status ?? 0);
  });

  const dates = Object.keys(byDate);
  const totalPoints = dates.reduce((sum, d) =>
    sum + byDate[d].reduce((a, b) => a + b, 0), 0);

  const perfectDays = dates.filter(d =>
    byDate[d].length === HABITS.length &&
    byDate[d].every(v => v === 2)
  ).length;

  $("totalPoints").textContent = totalPoints;
  $("perfectDays").textContent = perfectDays;
  $("activeDays").textContent = dates.length;

  const start = dates.length
    ? new Date(`${dates.sort()[0]}T00:00:00`)
    : new Date(`${today}T00:00:00`);

  $("calendar").innerHTML = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    const vals = byDate[key] || [];
    const full = vals.length === HABITS.length && vals.every(v => v === 2);
    const partial = vals.length > 0 && !full;
    return `<div class="cal-day ${full ? "full" : partial ? "partial" : ""}" title="${key}">
      ${i + 1}
    </div>`;
  }).join("");
}

async function loadRows() {
  if (!db || !currentUser) return;
  const { data, error } = await db
    .from("habit_days")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("date", { ascending: true });

  if (error) throw error;
  rows = data || [];
  renderHabits();
  renderToday();
  renderSummary();
}

async function setHabit(habitId, status) {
  if (!db || !currentUser) return;

  const payload = {
    user_id: currentUser.id,
    date: today,
    habit_id: habitId,
    status
  };

  const { data, error } = await db
    .from("habit_days")
    .upsert(payload, { onConflict: "user_id,date,habit_id" })
    .select()
    .single();

  if (error) {
    showMessage(`Gagal menyimpan: ${error.message}`);
    return;
  }

  rows = rows.filter(r => !(r.date === today && r.habit_id === habitId));
  rows.push(data);
  renderHabits();
  renderToday();
  renderSummary();
}

async function saveNote() {
  if (!db || !currentUser) return;

  const note = $("note").value.trim();

  // Attach the note to the first habit row for the day.
  // If none exists, create a neutral row with status 0.
  const existing = rows.find(r => r.date === today);

  if (existing) {
    const { data, error } = await db
      .from("habit_days")
      .update({ note })
      .eq("user_id", currentUser.id)
      .eq("date", today);

    if (error) {
      showMessage(`Gagal menyimpan catatan: ${error.message}`, $("noteMessage"));
      return;
    }
  } else {
    const { data, error } = await db
      .from("habit_days")
      .insert({
        user_id: currentUser.id,
        date: today,
        habit_id: HABITS[0].id,
        status: 0,
        note
      })
      .select()
      .single();

    if (error) {
      showMessage(`Gagal menyimpan catatan: ${error.message}`, $("noteMessage"));
      return;
    }
    rows.push(data);
  }

  await loadRows();
  showMessage("Catatan tersimpan ✓", $("noteMessage"));
}

async function login(email, password) {
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) throw error;
  currentUser = data.user;
}

async function signup(email, password) {
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) throw error;
  if (!data.session) {
    showMessage("Akun dibuat. Cek email untuk konfirmasi, lalu masuk.");
  }
}

async function start() {
  $("todayLabel").textContent = prettyDate(today);

  if (!configured) {
    $("authMessage").textContent =
      "Project belum terhubung. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di script.js.";
    return;
  }

  const { data } = await db.auth.getSession();
  if (data.session?.user) {
    currentUser = data.session.user;
    showApp();
    await loadRows();
  }

  db.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      currentUser = session.user;
      showApp();
      try { await loadRows(); }
      catch (e) { showMessage(`Database error: ${e.message}`); }
    } else {
      currentUser = null;
      showAuth();
    }
  });
}

function showApp() {
  $("authCard").classList.add("hidden");
  $("appContent").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
}

function showAuth() {
  $("authCard").classList.remove("hidden");
  $("appContent").classList.add("hidden");
  $("logoutBtn").classList.add("hidden");
}

$("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!db) return;
  const email = $("email").value.trim();
  const password = $("password").value;

  try {
    await login(email, password);
    showMessage("Berhasil masuk.");
  } catch (error) {
    showMessage(error.message, $("authMessage"));
  }
});

$("signupBtn").addEventListener("click", async () => {
  if (!db) return;
  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || password.length < 6) {
    showMessage("Isi email dan password minimal 6 karakter.", $("authMessage"));
    return;
  }

  try {
    await signup(email, password);
  } catch (error) {
    showMessage(error.message, $("authMessage"));
  }
});

$("logoutBtn").addEventListener("click", async () => {
  if (db) await db.auth.signOut();
});

$("saveNoteBtn").addEventListener("click", saveNote);

start();
