import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";

/* ======================================================
   Helpers
====================================================== */
const pad2 = (n) => String(n).padStart(2, "0");

const toLocalInputValue = (date) => {
  // device-local datetime-local
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

/**
 * Parse date safely from:
 * - ISO (2026-01-03T10:00:00.000Z)
 * - SQL-ish (2026-01-03 10:00:00) -> normalized to ISO-like
 * Returns Date or null.
 */
const parseDateSafe = (s) => {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;

  const normalized = str.includes("T") ? str : str.replace(" ", "T");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * ✅ FIXED WIB INPUT VALUE
 * Menghasilkan string "YYYY-MM-DDTHH:mm" yang merepresentasikan waktu WIB (Asia/Jakarta),
 * meskipun device admin bukan WIB.
 *
 * Input: Date object (biasanya hasil parse ISO Z / SQL)
 * Output: string untuk <input type="datetime-local" />
 */
const toWibInputValueFromDate = (d) => {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return toLocalInputValue(new Date());

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  const y = get("year");
  const m = get("month");
  const day = get("day");
  const hh = get("hour");
  const mm = get("minute");
  return `${y}-${m}-${day}T${hh}:${mm}`;
};

/**
 * ✅ WIB INPUT -> ISO UTC
 * Input datetime-local dianggap sebagai WIB, lalu dikonversi ke ISO UTC untuk dikirim ke backend.
 *
 * Contoh:
 *   "2026-01-04T02:10" (WIB) -> "2026-01-03T19:10:00.000Z"
 */
const wibInputToIsoUtc = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;

  // expected "YYYY-MM-DDTHH:mm"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const hh = Number(m[4]);
  const mm = Number(m[5]);

  // Convert WIB(+07) to UTC by subtracting 7 hours
  const utcMs = Date.UTC(y, mo - 1, d, hh - 7, mm, 0, 0);
  const dt = new Date(utcMs);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
};

const safeStr = (v, fb = "-") => {
  const s = v == null ? "" : String(v);
  return s.trim() || fb;
};

const safeInt = (v, fb = 0) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fb;
};

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (res?.data?.data && Array.isArray(res.data.data)) return res.data.data;
  return [];
};

/**
 * ✅ Format tampil WIB untuk user (id-ID)
 */
const formatWib = (v) => {
  const d = parseDateSafe(v);
  return d
    ? d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
    : "-";
};

/* ======================================================
   Data access (safe damageReport / damage_report)
====================================================== */
const getDamageReport = (b) => b?.damageReport ?? b?.damage_report ?? null;

const getPlate = (b) =>
  safeStr(getDamageReport(b)?.vehicle?.plate_number);

const getDriver = (b) =>
  safeStr(getDamageReport(b)?.driver?.username);

const getReportId = (b) =>
  safeInt(getDamageReport(b)?.id);

/* ======================================================
   UI Components (simple)
====================================================== */
const Button = ({ variant = "primary", ...p }) => {
  const styles =
    variant === "primary"
      ? { background: "#2563eb", color: "#fff" }
      : variant === "danger"
      ? { background: "#dc2626", color: "#fff" }
      : { background: "#fff", color: "#0f172a", border: "1px solid #e5e7eb" };

  return (
    <button
      {...p}
      style={{
        padding: "8px 14px",
        borderRadius: 10,
        fontWeight: 800,
        cursor: "pointer",
        ...styles,
      }}
    />
  );
};

/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function BookingsApproval() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("requested");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  // UI field: jadwal final admin (scheduled_at) — ✅ fixed WIB
  const [scheduledAt, setScheduledAt] = useState(
    toWibInputValueFromDate(new Date())
  );

  // UI field: estimated_finish_at — ✅ fixed WIB
  const [estFinish, setEstFinish] = useState(
    toWibInputValueFromDate(new Date(Date.now() + 3600000))
  );

  // optional UI (kalau backend belum support queue_number, jangan kirim)
  const [queueNo, setQueueNo] = useState("");

  const [noteAdmin, setNoteAdmin] = useState("");

  /* ======================================================
     Derived (for debug display submit ISO)
  ====================================================== */
  const scheduledSubmitIso = useMemo(
    () => wibInputToIsoUtc(scheduledAt),
    [scheduledAt]
  );
  const finishSubmitIso = useMemo(
    () => wibInputToIsoUtc(estFinish),
    [estFinish]
  );

  /* ======================================================
     LOAD DATA
  ====================================================== */
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/admin/bookings", { params: { status } });
      setItems(unwrapList(res.data));
    } catch (e) {
      setErr(e?.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  /* ======================================================
     ACTIONS
  ====================================================== */
  const openApprove = (b) => {
    setActive(b);

    // scheduled_at (safe parse) -> ✅ fixed WIB input
    const existingScheduled = parseDateSafe(b?.scheduled_at) || new Date();
    setScheduledAt(toWibInputValueFromDate(existingScheduled));

    // estimated_finish_at (safe parse) -> ✅ fixed WIB input
    const existingFinish =
      parseDateSafe(b?.estimated_finish_at) || new Date(Date.now() + 3600000);
    setEstFinish(toWibInputValueFromDate(existingFinish));

    // hanya display (jangan kirim kalau DB belum ada kolomnya)
    setQueueNo(b?.queue_number ? String(b.queue_number) : "");

    setNoteAdmin(b?.note_admin || "");
    setOpen(true);
  };

  const approve = async () => {
    if (!active) return;

    // ✅ submit tetap ISO UTC (backend)
    const scheduledIso = wibInputToIsoUtc(scheduledAt);
    const finishIso = wibInputToIsoUtc(estFinish);

    if (!scheduledIso) return alert("Jadwal final tidak valid");
    if (!finishIso) return alert("Estimasi selesai tidak valid");

    try {
      await api.post(`/admin/bookings/${active.id}/approve`, {
        scheduled_at: scheduledIso,
        estimated_finish_at: finishIso,
        ...(noteAdmin && { note_admin: noteAdmin }),
        // ⚠️ queue_number jangan kirim kalau kolomnya belum ada di DB
        // ...(queueNo && { queue_number: safeInt(queueNo) }),
      });

      setOpen(false);
      setActive(null);
      load();
    } catch (e) {
      alert(e?.message || "Gagal approve booking");
    }
  };

  const cancel = async (b) => {
    if (!confirm("Yakin cancel booking ini?")) return;

    try {
      await api.post(`/admin/bookings/${b.id}/cancel`);
      load();
    } catch (e) {
      alert(e?.message || "Gagal cancel booking");
    }
  };

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div style={{ padding: 20 }}>
      <h2>Approval Booking Servis</h2>

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        style={{ marginBottom: 12 }}
      >
        <option value="requested">Requested</option>
        <option value="approved">Approved</option>
        <option value="rescheduled">Rescheduled</option>
        <option value="canceled">Canceled</option>
        <option value="all">All</option>
      </select>

      {err && <div style={{ color: "red" }}>{err}</div>}
      {loading && <div>Loading...</div>}

      {!loading &&
        items.map((b) => (
          <div
            key={b.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div>
              <b>{getPlate(b)}</b> • Report #{getReportId(b)}
            </div>
            <div>Driver: {getDriver(b)}</div>
            <div>Status: {safeStr(b.status)}</div>

            {/* ✅ tampil WIB agar “sinkron” dengan mobile */}
            <div>preferred_at (WIB): {formatWib(b.preferred_at)}</div>
            <div>requested_at (WIB): {formatWib(b.requested_at)}</div>
            <div>scheduled_at (WIB): {formatWib(b.scheduled_at)}</div>
            <div>
              estimated_finish_at (WIB): {formatWib(b.estimated_finish_at)}
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <Button onClick={() => openApprove(b)}>Approve / Set Jadwal</Button>
              <Button variant="danger" onClick={() => cancel(b)}>
                Cancel
              </Button>
            </div>
          </div>
        ))}

      {/* ================= MODAL ================= */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 14,
              width: 440,
            }}
          >
            <h3>Approve Booking #{active?.id}</h3>

            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
              Field yang benar (sesuai DB): <b>scheduled_at</b> dan{" "}
              <b>estimated_finish_at</b>
            </div>

            {/* info preferensi driver (read-only) */}
            <div style={{ fontSize: 13, marginBottom: 10 }}>
              Preferensi driver (WIB): <b>{formatWib(active?.preferred_at)}</b>
            </div>

            <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
              Jadwal final (scheduled_at) — input WIB
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />

            <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
              Estimasi selesai (estimated_finish_at) — input WIB
            </label>
            <input
              type="datetime-local"
              value={estFinish}
              onChange={(e) => setEstFinish(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />

            {/* tampilkan saja kalau mau, tapi jangan kirim kalau DB belum ada */}
            <input
              placeholder="Queue number (opsional - butuh kolom DB)"
              value={queueNo}
              onChange={(e) => setQueueNo(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />

            <input
              placeholder="Catatan admin"
              value={noteAdmin}
              onChange={(e) => setNoteAdmin(e.target.value)}
              style={{ width: "100%", marginBottom: 10 }}
            />

            <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button onClick={approve}>Simpan</Button>
            </div>

            {/* debug kecil biar kamu gampang cek sinkron */}
            <div style={{ marginTop: 12, fontSize: 12, opacity: 0.75 }}>
              <div>Submit scheduled_at (UTC): {safeStr(scheduledSubmitIso)}</div>
              <div>Submit estimated_finish_at (UTC): {safeStr(finishSubmitIso)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
