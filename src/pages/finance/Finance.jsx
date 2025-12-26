import { useEffect, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  sumByType,
  updateTransaction,
} from "../../services/financeService";

export default function Finance() {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(nowMonth);
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTx = async () => {
    setLoading(true);
    try {
      const rows = await listTransactions({ month, type: typeFilter, source: sourceFilter });
      setTx(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setMsg(`❌ ${e.message || "Gagal load transaksi."}`);
      setTx([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTx();
    
  }, [month, typeFilter, sourceFilter]);

  const income = sumByType(tx, "income");
  const expense = sumByType(tx, "expense");

  const resetForm = () => {
    setCategory("");
    setAmount(0);
    setDate(new Date().toISOString().slice(0, 10));
    setNote("");
    setEditingId(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      if (editingId) {
        await updateTransaction(editingId, { category, amount, date, note });
        setMsg("✅ Income berhasil diupdate.");
      } else {
        await createTransaction({
          type: "income",
          category,
          amount,
          date,
          note,
          source: "manual",
        });
        setMsg("✅ Income berhasil ditambahkan.");
      }
      resetForm();
      await loadTx();
    } catch (err) {
      setMsg(`❌ ${err.message}`);
    }
  };

  const onEdit = (t) => {
    if (t.type !== "income") return;
    setEditingId(t.id);
    setCategory(t.category || "");
    setAmount(Number(t.amount || 0));
    setDate(String(t.date).slice(0, 10));
    setNote(t.note || "");
  };

  const onDelete = async (t) => {
    if (t.type !== "income") return;
    if (!confirm("Hapus income ini?")) return;

    setMsg("");
    try {
      await deleteTransaction(t.id);
      setMsg("✅ Income dihapus.");
      await loadTx();
    } catch (e) {
      setMsg(`❌ ${e.message || "Gagal hapus."}`);
    }
  };

  return (
    <div>
      <h2>Keuangan & Akuntansi</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 16 }}>
        {/* FORM INCOME */}
        <div style={card()}>
          <h3>{editingId ? "Edit Income" : "Input Income"}</h3>

          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Dana Operasional / Reimburse"
              style={inp()}
              required
            />

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Nominal"
              style={inp()}
              required
            />

            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp()} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan" style={inp()} />

            <button style={btnPrimary()}>
              {editingId ? "Update Income" : "Simpan Income"}
            </button>
          </form>

          {msg && <div style={{ marginTop: 10 }}>{msg}</div>}
        </div>

        {/* LAPORAN */}
        <div style={card()}>
          <div style={{ display: "flex", gap: 10 }}>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inp()} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inp()}>
              <option value="">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={inp()}>
              <option value="">All Source</option>
              <option value="repair">Repair</option>
              <option value="inventory">Inventory</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {loading && <div style={{ marginTop: 10 }}>Loading...</div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 10 }}>
            <Mini title="Income" value={income} />
            <Mini title="Expense" value={expense} />
            <Mini title="Net" value={income - expense} />
          </div>

          <table width="100%" cellPadding="10" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Type</th>
                <th>Kategori</th>
                <th>Nominal</th>
                <th>Note</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tx.map((t) => (
                <tr key={t.id}>
                  <td>{String(t.date).slice(0, 10)}</td>
                  <td>{t.type}{t.type === "expense" && " (AUTO)"}</td>
                  <td>{t.category}</td>
                  <td>{Number(t.amount || 0).toLocaleString("id-ID")}</td>
                  <td>{t.note}</td>
                  <td>
                    {t.type === "income" && (
                      <>
                        <button onClick={() => onEdit(t)}>Edit</button>{" "}
                        <button onClick={() => onDelete(t)}>Hapus</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!tx.length && !loading && <tr><td colSpan="6">Tidak ada data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Mini({ title, value }) {
  return (
    <div style={{ padding: 12, background: "#f6f7fb" }}>
      <div>{title}</div>
      <b>{Number(value || 0).toLocaleString("id-ID")}</b>
    </div>
  );
}


const theme = {
  primary: "#3B82F6",
  primarySoft: "#DBEAFE",
  primaryBorder: "#BFDBFE",
  primaryDark: "#1D4ED8",

  text: "#0F172A",
  muted: "#64748B",

  danger: "#DC2626",
  white: "#FFFFFF",
};

const card = () => ({
  background: theme.white,
  padding: 14,
  borderRadius: 14,
  border: `1px solid ${theme.primaryBorder}`,
  boxShadow: "0 4px 14px rgba(59,130,246,0.12)",
});

const inp = () => ({
  padding: 10,
  borderRadius: 10,
  border: `1px solid ${theme.primaryBorder}`,
  outline: "none",
  background: theme.white,
  color: theme.text,
});

const btnPrimary = () => ({
  padding: 10,
  borderRadius: 10,
  border: "none",
  background: theme.primary,
  color: "#fff",
  cursor: "pointer",
  fontWeight: 600,
});

const btnLink = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: `1px solid ${theme.primaryBorder}`,
  background: theme.primarySoft,
  color: theme.primaryDark,
  cursor: "pointer",
  fontWeight: 600,
});

const btnDanger = () => ({
  padding: "6px 10px",
  borderRadius: 10,
  border: `1px solid #FECACA`,
  background: "#FEF2F2",
  color: theme.danger,
  cursor: "pointer",
  fontWeight: 600,
});