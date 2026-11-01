import { useState, useEffect, useRef } from "react";
import { KEY, DAY, ROOMS, rnd, shape, key, fmtD, makeSim, persist } from "./data";
import { Spark, Bars, Live } from "./charts";
import "./styles.css";

function App() {
  const S = useRef(null);
  if (!S.current) S.current = makeSim();
  const [, force] = useState(0);
  const [live, setLive] = useState(true);
  const [tab, setTab] = useState("live");
  const [per, setPer] = useState("weekly");
  const [range, setRange] = useState(30);
  const [copied, setCopied] = useState("");
  const s = S.current, st = s.store;
  const rf = () => force(v => v + 1);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      const now = new Date(), tk = key(now), hr = now.getHours(), w = now.getDay() % 6 === 0;
      if (!st.days[tk]) st.days[tk] = Object.fromEntries(ROOMS.map(r => [r.id, 0]));
      s.rooms.forEach(r => {
        if (r.anom <= 0 && Math.random() < 0.0005) { r.anom = 25; r.mult = rnd(1.8, 2.6); }
        const exp = r.base * shape(r.type, hr, w);
        r.exp = exp;
        r.kw = +Math.max(0.02, r.kw * 0.5 + exp * rnd(0.9, 1.1) * (r.anom > 0 ? r.mult : 1) * 0.5).toFixed(3);
        r.anom--;
        r.trace = [...r.trace.slice(1), r.kw];
        st.days[tk][r.id] = (st.days[tk][r.id] || 0) + (r.kw * 2) / 3600;
        const lim = st.limits[r.id], over = r.kw >= lim, abn = r.kw > exp * 1.5 && r.kw > 0.3;
        if (over || abn) { r.streak++; r.calm = 0; } else { r.calm++; r.streak = 0; }
        if (!r.active && r.streak >= 2) {
          r.active = true; r.atype = over ? "over" : "abnormal";
          st.alerts.unshift({ t: Date.now(), room: r.name, type: r.atype, kw: r.kw, exp, lim });
          st.alerts = st.alerts.slice(0, 50);
        }
        if (r.active && r.calm >= 3) r.active = false;
      });
      if (++s.n % 5 === 0) persist(st);
      rf();
    }, 2000);
    return () => clearInterval(t);
  }, [live]);

  const base = new Date(); base.setHours(12, 0, 0, 0);
  const dayKey = i => key(base.getTime() - i * DAY);
  const sumRoom = (id, n, k) => { let t = 0; for (let i = 1; i <= n; i++) t += (st.days[dayKey(k * n + i)] || {})[id] || 0; return t; };
  const sumAll = (n, k) => ROOMS.reduce((a, r) => a + sumRoom(r.id, n, k), 0);
  const pc = (a, b) => (b ? ((a - b) / b) * 100 : 0);
  const money = v => st.cur + v.toFixed(2);
  const sign = v => (v > 0 ? "+" : "") + v.toFixed(0) + "%";
  const chg = v => <span className={v > 15 ? "bad" : v < -10 ? "ok" : ""}>{sign(v)}</span>;

  const total = s.rooms.reduce((a, r) => a + r.kw, 0);
  const today = ROOMS.reduce((a, r) => a + ((st.days[key(new Date())] || {})[r.id] || 0), 0);
  const yest = sumAll(1, 0);
  const avg30 = sumAll(30, 0) / 30;
  const active = s.rooms.filter(r => r.active);
  const liveTotal = Array.from({ length: 60 }, (_, i) => s.rooms.reduce((a, r) => a + r.trace[i], 0));
  const stat = r => r.active ? (r.atype === "over" ? ["Over limit", "bad"] : ["Unusual", "warn"]) : r.kw / st.limits[r.id] >= 0.8 ? ["Near limit", "warn"] : ["Normal", "ok"];

  const N = { daily: 1, weekly: 7, monthly: 30 }[per], B = { daily: 14, weekly: 8, monthly: 4 }[per];
  const vals = Array.from({ length: B }, (_, i) => sumAll(N, B - 1 - i));
  const labs = Array.from({ length: B }, (_, i) => fmtD(base.getTime() - ((B - 1 - i) * N + N) * DAY));
  const curP = vals[B - 1], prvP = vals[B - 2];
  const pname = { daily: ["Yesterday", "Day before"], weekly: ["Last 7 days", "Previous 7 days"], monthly: ["Last 30 days", "Previous 30 days"] }[per];

  const rep = ROOMS.map(r => ({ ...r, kwh: sumRoom(r.id, range, 0), prev: sumRoom(r.id, range, 1) })).sort((a, b) => b.kwh - a.kwh);
  const repTot = rep.reduce((a, r) => a + r.kwh, 0), repPrev = rep.reduce((a, r) => a + r.prev, 0);
  const rise = [...rep].sort((a, b) => (b.kwh - b.prev) - (a.kwh - a.prev))[0];
  const drop = [...rep].sort((a, b) => (a.kwh - a.prev) - (b.kwh - b.prev))[0];
  const summary = `Home energy report, last ${range} days: ${repTot.toFixed(0)} kWh, cost ${money(repTot * st.rate)}. ${chg2(pc(repTot, repPrev))} compared with the previous ${range} days. Top room: ${rep[0].name} (${((rep[0].kwh / repTot) * 100).toFixed(0)}% of use).`;
  function chg2(v) { return sign(v); }

  const testAlert = () => { const r = s.rooms[Math.floor(Math.random() * s.rooms.length)]; r.anom = 20; r.mult = 2.6; };
  const copy = () => { try { navigator.clipboard.writeText(summary).then(() => setCopied("Copied")); } catch (e) { setCopied("Copy not available here"); } };
  const setLimit = (id, v) => { st.limits[id] = Math.max(0.1, +v || 0.1); persist(st); rf(); };
  const reset = () => { try { localStorage.removeItem(KEY); } catch (e) {} S.current = makeSim(); rf(); };
  const T = (id, label) => <button className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}{id === "alerts" && active.length ? ` (${active.length})` : ""}</button>;

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>Home energy monitor</h1>
          <div className="sub"><span className={"dot" + (live ? "" : " off")}></span>{live ? "Live: meters read every 2 seconds" : "Paused"}</div>
        </div>
        <div className="row">
          <button onClick={testAlert}>Test an alert</button>
          <button onClick={() => setLive(!live)}>{live ? "Pause" : "Resume"}</button>
        </div>
      </header>
      <nav>{T("live", "Live")}{T("compare", "Compare")}{T("report", "Report")}{T("alerts", "Alerts and limits")}</nav>

      {active.length > 0 && tab !== "alerts" && (
        <div className="banner" role="alert">
          <span><b>{active.length === 1 ? active[0].name : active.length + " rooms"}</b>: {active.map(r => r.atype === "over" ? r.name + " is over its limit" : r.name + " is using more than usual").join("; ")}.</span>
          <button onClick={() => setTab("alerts")}>View alerts</button>
        </div>
      )}

      {tab === "live" && <>
        <section className="kpis">
          <div className="card kpi"><span>Using right now</span><b>{total.toFixed(2)} kW</b><span>{s.rooms.filter(r => r.kw > 0.3).length} rooms drawing power</span></div>
          <div className="card kpi"><span>Today so far</span><b>{today.toFixed(1)} kWh</b><span>Cost: {money(today * st.rate)}</span></div>
          <div className="card kpi"><span>Yesterday</span><b>{yest.toFixed(1)} kWh</b><span>Cost: {money(yest * st.rate)}</span></div>
          <div className="card kpi"><span>Estimated this month</span><b>{money(avg30 * 30 * st.rate)}</b><span>At the last 30 days' pace</span></div>
        </section>
        <div className="card"><h2>Whole home, last 2 minutes (kW)</h2><Live data={liveTotal} /></div>
        <section className="rooms">
          {s.rooms.slice().sort((a, b) => b.kw - a.kw).map(r => { const [lab, c] = stat(r); const lim = st.limits[r.id]; return (
            <div className="card" key={r.id}>
              <div className="rc"><b>{r.name}</b><span className={"tag " + c}>{lab}</span></div>
              <div className="rc"><span className="reading">{r.kw.toFixed(2)} <span className="unit">kW</span></span><span className="sub">limit {lim.toFixed(1)}</span></div>
              <div className="bar"><i style={{ width: Math.min(100, (r.kw / lim) * 100) + "%", background: `var(--${c})` }}></i></div>
              <Spark data={r.trace} color={`var(--${c === "ok" ? "blue" : c})`} />
              <div className="sub">Today: {(((st.days[key(new Date())] || {})[r.id]) || 0).toFixed(2)} kWh</div>
            </div>); })}
        </section>
      </>}

      {tab === "compare" && <>
        <div className="row toolbar">
          {["daily", "weekly", "monthly"].map(p => <button key={p} className={per === p ? "on" : ""} onClick={() => setPer(p)}>{p[0].toUpperCase() + p.slice(1)}</button>)}
        </div>
        <div className="card">
          <h2>{pname[0]}: {curP.toFixed(1)} kWh ({money(curP * st.rate)}), {chg(pc(curP, prvP))} vs. {pname[1].toLowerCase()} ({prvP.toFixed(1)} kWh)</h2>
          <Bars values={vals} labels={labs} unit="kWh" />
          <div className="sub">Each bar is {per === "daily" ? "one full day" : N + " full days"} in kWh, labelled with its first day. Today is not included until it ends.</div>
        </div>
        <div className="card tablewrap">
          <h2>By room</h2>
          <table><thead><tr><th>Room</th><th className="n">{pname[0]} (kWh)</th><th className="n">{pname[1]} (kWh)</th><th className="n">Change</th></tr></thead>
            <tbody>{ROOMS.map(r => ({ r, a: sumRoom(r.id, N, 0), b: sumRoom(r.id, N, 1) })).sort((x, y) => y.a - x.a).map(({ r, a, b }) => (
              <tr key={r.id}><td>{r.name}</td><td className="n">{a.toFixed(1)}</td><td className="n">{b.toFixed(1)}</td><td className="n">{chg(pc(a, b))}</td></tr>))}</tbody></table>
        </div>
      </>}

      {tab === "report" && <>
        <div className="row toolbar">
          {[7, 30, 90].map(n => <button key={n} className={range === n ? "on" : ""} onClick={() => setRange(n)}>Last {n} days</button>)}
          <button onClick={copy}>Copy summary</button><span className="sub">{copied}</span>
        </div>
        <section className="kpis">
          <div className="card kpi"><span>Total use</span><b>{repTot.toFixed(0)} kWh</b><span>{chg(pc(repTot, repPrev))} vs. previous {range} days</span></div>
          <div className="card kpi"><span>Total cost</span><b>{money(repTot * st.rate)}</b><span>At {st.cur}{st.rate.toFixed(2)} per kWh</span></div>
          <div className="card kpi"><span>Daily average</span><b>{(repTot / range).toFixed(1)} kWh</b><span>{money((repTot / range) * st.rate)} a day</span></div>
        </section>
        <div className="two">
          <div className="card">
            <h2>What stands out</h2>
            <ul>
              <li><b>{rep[0].name}</b> uses the most: {rep[0].kwh.toFixed(0)} kWh, {((rep[0].kwh / repTot) * 100).toFixed(0)}% of the home.</li>
              {rise.kwh > rise.prev && <li><b>{rise.name}</b> rose the most, up {(rise.kwh - rise.prev).toFixed(0)} kWh ({sign(pc(rise.kwh, rise.prev))}).</li>}
              {drop.kwh < drop.prev && <li><b>{drop.name}</b> fell the most, down {(drop.prev - drop.kwh).toFixed(0)} kWh ({sign(pc(drop.kwh, drop.prev))}).</li>}
              <li>{st.alerts.length} alert{st.alerts.length === 1 ? "" : "s"} recorded so far.</li>
            </ul>
          </div>
          <div className="card">
            <h2>Share of use by room</h2>
            {rep.map(r => <div key={r.id} className="item item--plain"><div className="rc"><span>{r.name}</span><span className="sub">{((r.kwh / repTot) * 100).toFixed(0)}%</span></div><div className="bar bar--tight"><i style={{ width: (r.kwh / rep[0].kwh) * 100 + "%", background: "var(--blue)" }}></i></div></div>)}
          </div>
        </div>
        <div className="card tablewrap">
          <h2>Room breakdown</h2>
          <table><thead><tr><th>Room</th><th className="n">kWh</th><th className="n">Cost</th><th className="n">Share</th><th className="n">Change</th></tr></thead>
            <tbody>{rep.map(r => <tr key={r.id}><td>{r.name}</td><td className="n">{r.kwh.toFixed(1)}</td><td className="n">{money(r.kwh * st.rate)}</td><td className="n">{((r.kwh / repTot) * 100).toFixed(0)}%</td><td className="n">{chg(pc(r.kwh, r.prev))}</td></tr>)}</tbody></table>
        </div>
      </>}

      {tab === "alerts" && <>
        <div className="two">
          <div className="card">
            <h2>Active now ({active.length})</h2>
            {active.length === 0 && <div className="sub">Nothing needs attention. Every room is within its limit and usual pattern.</div>}
            {active.map(r => <div key={r.id} className="item"><span className={"tag " + (r.atype === "over" ? "bad" : "warn")}>{r.atype === "over" ? "Over limit" : "Unusual"}</span> <b>{r.name}</b>
              <div className="sub">Using {r.kw.toFixed(2)} kW. Usually about {r.exp.toFixed(2)} kW at this hour. Limit {st.limits[r.id].toFixed(1)} kW. Check for an appliance left on.</div></div>)}
          </div>
          <div className="card">
            <h2>Alert history</h2>
            {st.alerts.length === 0 && <div className="sub">No alerts yet. Use "Test an alert" to see one.</div>}
            <div className="scroll">
              {st.alerts.map((a, i) => <div key={i} className="item"><span className={a.type === "over" ? "bad" : "warn"}>{a.type === "over" ? "Over limit" : "Unusual use"}</span>: {a.room}, {a.kw.toFixed(2)} kW
                <div className="sub">{new Date(a.t).toLocaleString("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div></div>)}
            </div>
          </div>
        </div>
        <div className="card tablewrap">
          <h2>Room limits</h2>
          <div className="sub note">You get an alert when a room reaches its limit, or uses over 1.5 times its usual load for the time of day.</div>
          <table><thead><tr><th>Room</th><th>Limit (kW)</th></tr></thead>
            <tbody>{ROOMS.map(r => <tr key={r.id}><td>{r.name}</td><td><input className="w-md" type="number" step="0.1" min="0.1" aria-label={r.name + " limit in kW"} value={st.limits[r.id]} onChange={e => setLimit(r.id, e.target.value)} /></td></tr>)}</tbody></table>
        </div>
        <div className="card">
          <h2>Cost settings</h2>
          <div className="row">
            <label className="sub">Currency <input value={st.cur} maxLength="6" className="w-sm" onChange={e => { st.cur = e.target.value; persist(st); rf(); }} /></label>
            <label className="sub">Price per kWh <input type="number" step="0.01" min="0" className="w-md" value={st.rate} onChange={e => { st.rate = +e.target.value || 0; persist(st); rf(); }} /></label>
            <button onClick={reset}>Reset demo data</button>
          </div>
        </div>
      </>}
      <p className="sub">Demo mode: readings are simulated. Daily history, limits and alerts are saved in this browser.</p>
    </div>
  );
}

export default App;
