import { useState } from "react";
import { ROOM_TYPES } from "./data";

const MAX_ROOMS = 20;
const typeOf = id => ROOM_TYPES.find(t => t.id === id) || ROOM_TYPES[ROOM_TYPES.length - 1];

export default function RoomManager({ rooms, limits, today, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bedroom");
  const [base, setBase] = useState(typeOf("bedroom").base);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const pickType = id => { setType(id); setBase(typeOf(id).base); };

  const submit = e => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setError("Enter a room name.");
    if (rooms.some(r => r.name.toLowerCase() === n.toLowerCase())) return setError("A room with that name already exists.");
    if (!(+base > 0)) return setError("Enter a typical load above 0 kW.");
    if (rooms.length >= MAX_ROOMS) return setError("You can monitor up to " + MAX_ROOMS + " rooms.");
    onAdd({ name: n, type, base: +base });
    setName("");
    setError("");
  };

  return (
    <div className="two">
      <form className="card" onSubmit={submit}>
        <h2>Add a room</h2>
        <div className="field">
          <label htmlFor="room-name">Room name</label>
          <input id="room-name" className="w-full" value={name} maxLength="30" placeholder="For example, Study" onChange={e => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="room-type">Room type</label>
          <select id="room-type" className="w-full" value={type} onChange={e => pickType(e.target.value)}>
            {ROOM_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="room-base">Typical load (kW)</label>
          <input id="room-base" className="w-full" type="number" step="0.1" min="0.1" value={base} onChange={e => setBase(e.target.value)} />
          <span className="sub">Its usual power use at the busiest time. The room's limit starts at 1.3 times this, and you can change it on the Alerts and limits tab.</span>
        </div>
        {error && <div className="err" role="alert">{error}</div>}
        <button type="submit" className="on">Add room</button>
      </form>

      <div className="card">
        <h2>Your rooms ({rooms.length})</h2>
        {rooms.map(r => (
          <div className="item" key={r.id}>
            <div className="rc">
              <span><b>{r.name}</b><div className="sub">{typeOf(r.type).label}. Limit {(limits[r.id] || 0).toFixed(1)} kW. Today {(today[r.id] || 0).toFixed(2)} kWh</div></span>
              {confirmId === r.id ? (
                <span className="row">
                  <button type="button" className="danger" onClick={() => { onRemove(r.id); setConfirmId(null); }}>Confirm</button>
                  <button type="button" onClick={() => setConfirmId(null)}>Cancel</button>
                </span>
              ) : (
                <button type="button" disabled={rooms.length <= 1} title={rooms.length <= 1 ? "Keep at least one room" : ""} onClick={() => setConfirmId(r.id)}>Remove</button>
              )}
            </div>
            {confirmId === r.id && <div className="sub note">This also deletes the room's saved usage history.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
