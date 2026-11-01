// Rooms, usage patterns, demo history and browser storage. Replace the simulated
// readings in App.jsx with your meter feed to go live.
const KEY = "home-energy-v4", DAY = 864e5;

const ROOMS = [
  { id: "kitchen", name: "Kitchen", type: "kitchen", base: 2.6 },
  { id: "living", name: "Living room", type: "living", base: 1.4 },
  { id: "laundry", name: "Laundry room", type: "laundry", base: 2.4 },
  { id: "master", name: "Master bedroom", type: "bedroom", base: 1.1 },
  { id: "bed2", name: "Bedroom 2", type: "bedroom", base: 0.8 },
  { id: "bed3", name: "Bedroom 3", type: "bedroom", base: 0.7 },
];
const rnd = (a, b) => a + Math.random() * (b - a);
const inr = (h, a, b) => h >= a && h < b;
function shape(t, h, wknd) {
  switch (t) {
    case "living": return inr(h, 17, 23) ? 1 : inr(h, 7, 17) ? (wknd ? 0.7 : 0.3) : 0.1;
    case "kitchen": return 0.2 + (inr(h, 6, 8) ? 0.6 : 0) + (inr(h, 12, 14) ? 0.6 : 0) + (inr(h, 18, 20) ? 0.9 : 0);
    case "bedroom": return inr(h, 5, 7) || inr(h, 20, 23) ? 0.8 : inr(h, 7, 20) ? 0.1 : 0.15;
    case "bath": return inr(h, 6, 8) || inr(h, 20, 22) ? 0.9 : 0.08;
    case "office": return !wknd && inr(h, 9, 17) ? 1 : 0.08;
    case "laundry": return inr(h, 9, 12) ? (wknd ? 0.9 : 0.3) : 0.04;
    case "outdoor": return inr(h, 18, 23) ? 0.8 : 0.05;
    default: return 0.2;
  }
}
const key = d => { const x = new Date(d); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
const fmtD = d => new Date(d).toLocaleDateString("en", { day: "numeric", month: "short" });

function seed() {
  const days = {}, now = new Date();
  for (let i = 1; i <= 120; i++) {
    const d = new Date(now.getTime() - i * DAY), o = {};
    ROOMS.forEach(r => {
      let s = 0;
      for (let h = 0; h < 24; h++) s += r.base * shape(r.type, h, d.getDay() % 6 === 0) * rnd(0.85, 1.15);
      o[r.id] = s * (i <= 7 ? (r.id === "laundry" ? 1.4 : rnd(0.97, 1.1)) : 1);
    });
    days[key(d)] = o;
  }
  const t = {}, h = now.getHours();
  ROOMS.forEach(r => { let s = 0; for (let x = 0; x < h; x++) s += r.base * shape(r.type, x, now.getDay() % 6 === 0) * rnd(0.85, 1.15); t[r.id] = s; });
  days[key(now)] = t;
  return { days, limits: Object.fromEntries(ROOMS.map(r => [r.id, +(r.base * 1.3).toFixed(1)])), rate: 25, cur: "KSh ", alerts: [] };
}
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.days && s.limits) return s; } catch (e) {}
  return seed();
}
function persist(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

function makeSim() {
  const now = new Date(), h = now.getHours(), w = now.getDay() % 6 === 0;
  return { store: load(), n: 0, rooms: ROOMS.map(r => { const e = r.base * shape(r.type, h, w); return { ...r, kw: e, exp: e, trace: Array(60).fill(e), streak: 0, calm: 0, active: false, atype: null, anom: 0, mult: 1 }; }) };
}

export { KEY, DAY, ROOMS, rnd, shape, key, fmtD, makeSim, persist };
