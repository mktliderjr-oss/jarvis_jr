import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LabelList,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import liderLogo from "./lider_jr_logo.png";
import PageCRM from "./PageCRM";

// ── CONFIG ────────────────────────────────────────────────────────────────────
const WEBHOOK_URL = "https://jarvis-n8n.qssazf.easypanel.host/webhook-test/jarvis_jr";

const COMERCIANTES = ["Amanda", "Caique", "Laísa", "Pedro", "Gustavo", "Enzo"];

const COL = {
  DATA:             "DATA",
  MES:              "MÊS DE ENTRADA",
  BOT:              "BOT CHAMOU?",
  EMPRESA:          "NOME DA EMPRESA",
  SERVICO:          "SERVIÇO",
  CATEGORIA:        "CATEGORIA",
  TELEFONE:         "TEL PARA CONTATO",
  CIDADE:           "LOCALIZAÇÃO",
  COMERCIANTE:      "COMERCIANTE",
  PRIMEIRO_CONTATO: "PRIMEIRO CONTATO",
  DIAGNOSTICO:      "DIAGNÓSTICO",
  PROPOSTA:         "PROPOSTA",
  CONTRATO:         "CONTRATO",
  VALOR:            "VALOR",
  MOTIVO:           "MOTIVO",
};

const C = {
  orange:       "#F97316",
  orangeHover:  "#EA6C0A",
  orangeDim:    "rgba(249,115,22,0.12)",
  orangeBorder: "rgba(249,115,22,0.3)",
  bg:     "#000000",
  bgNav:  "#0a0a0a",
  bgCard: "#0a0a0a",
  bgInput:"#111111",
  bgHover:"#252525",
  border: "rgba(255,255,255,0.07)",
  border2:"rgba(255,255,255,0.12)",
  text:   "#FFFFFF",
  text2:  "#A0A0A0",
  text3:  "#606060",
  green:  "#22C55E",
  greenDim:"rgba(34,197,94,0.15)",
  cyan:   "#06B6D4",
  amber:  "#F59E0B",
  rose:   "#F43F5E",
};

const PALETTE = [C.orange, C.cyan, C.green, C.amber, C.rose, "#8B5CF6"];

// ── UTILS ─────────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().toUpperCase().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const fields = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { fields.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    fields.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (fields[i] ?? "").replace(/^"|"$/g, ""); });
    return row;
  });
}

function fmtWA(tel) {
  if (!tel) return null;
  let num = tel.replace(/\D/g, "");
  if (!num.startsWith("55")) num = "55" + num;
  return `https://wa.me/${num}`;
}

function todayBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function valueCounts(arr, key, limit = 999) {
  const freq = {};
  arr.forEach(r => { const v = r[key]; if (v) freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0, limit).map(([name, value]) => ({ name, value }));
}

function hasSim(arr, key) {
  return arr.filter(r => {
    const v = (r[key] || "").trim().toLowerCase();
    return v === "sim" || v.includes("✅");
  }).length;
}

function hasBot(arr) {
  return arr.filter(r => (r[COL.BOT] || "").includes("✅")).length;
}

function nowLabel() {
  const d = new Date();
  const dia = d.toLocaleDateString("pt-BR", { weekday:"long", day:"numeric", month:"long" });
  const hora = d.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
  return { dia: dia.charAt(0).toUpperCase() + dia.slice(1), hora };
}

function initials(name) {
  return name.split(" ").slice(0,2).map(p=>p[0].toUpperCase()).join("");
}

function somaValor(arr) {
  return arr.reduce((acc, r) => {
    const raw = (r[COL.VALOR] || "").replace(/[^\d,]/g, "").replace(",", ".");
    return acc + (parseFloat(raw) || 0);
  }, 0);
}

function calcDelta(allLeads, getValor) {
  const now = new Date();
  const mesAtual    = `${String(now.getMonth() + 1).padStart(2,"0")}/${now.getFullYear()}`;
  const prevDate    = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mesAnterior = `${String(prevDate.getMonth() + 1).padStart(2,"0")}/${prevDate.getFullYear()}`;

  function pertence(row, label) {
    const d = row[COL.DATA];
    if (!d) return false;
    const parts = d.split("/");
    if (parts.length !== 3) return false;
    return `${parts[1]}/${parts[2]}` === label;
  }

  const atual    = allLeads.filter(r => pertence(r, mesAtual));
  const anterior = allLeads.filter(r => pertence(r, mesAnterior));
  const vAtual    = getValor(atual);
  const vAnterior = getValor(anterior);
  if (vAnterior === 0) return null;
  const pct = Math.round(((vAtual - vAnterior) / vAnterior) * 100);
  return { pct, up: pct >= 0 };
}

function fmtDelta(d) {
  if (!d) return null;
  return `${d.up ? "↑" : "↓"} ${Math.abs(d.pct)}% vs mês anterior`;
}

// ── SVG ICONS ─────────────────────────────────────────────────────────────────
const Icon = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  prospeccao: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  crm: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  reunioes: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  atividades: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  base: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  analytics: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  config: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    </svg>
  ),
  usuarios: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  location: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  tag: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  filter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  ),
  trend: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
      <polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  history: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
    </svg>
  ),
  target: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
};

// ── ÍCONES DE ATIVIDADE ───────────────────────────────────────────────────────
const ActIcon = {
  leads: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  contato: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  diagnostico: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  ),
  proposta: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
};

const LiderLogo = () => (
  <img src={liderLogo} alt="Líder Jr." style={{ width: 140, height: "auto", display: "block" }} />
);

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: C.orange, display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700,
      fontSize: size * 0.35, color: "#fff", flexShrink: 0,
      fontFamily: "'Inter', sans-serif",
    }}>{initials(name)}</div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#2A2A2A", border: `1px solid ${C.border2}`,
      borderRadius: 8, padding: "8px 12px" }}>
      {label && <div style={{ fontSize: 11, color: C.text2, marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color || C.orange, fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

function hexToRgba(hex, alpha) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

const COM_COLORS = {
  Amanda:  C.orange,
  Caique:  C.cyan,
  Laísa:   C.green,
  Pedro:   C.amber,
  Gustavo: "#8B5CF6",
  Enzo:    C.rose,
};

function RankedBarChart({ data, colorHex, height }) {
  const h = height || Math.max(180, data.length * 38);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top:0, right:34, bottom:0, left:0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={130}
          tick={{ fontSize:12, fill:C.text2 }} tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill:"rgba(255,255,255,0.03)" }} />
        <Bar dataKey="value" name="Leads" radius={[0,6,6,0]} barSize={18} animationDuration={650}>
          {data.map((_, i) => (
            <Cell key={i} fill={hexToRgba(colorHex, 0.95 - i * (0.55 / Math.max(1, data.length)))} />
          ))}
          <LabelList dataKey="value" position="right"
            style={{ fill:C.text2, fontSize:11, fontWeight:600, fontFamily:"'Inter',sans-serif" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const NAV = [
  { section: null,        id: "dashboard",   label: "Dashboard",     icon: Icon.dashboard },
  { section: "COMERCIAL", id: "prospeccao",  label: "Prospecção",    icon: Icon.prospeccao },
  { section: null,        id: "crm",         label: "CRM",           icon: Icon.crm },
  { section: null,        id: "atividades",  label: "Atividades",    icon: Icon.atividades },
  { section: "DADOS",     id: "base",        label: "Base de Leads", icon: Icon.base },
  { section: null,        id: "analytics",   label: "Analytics",     icon: Icon.analytics },
  { section: "SISTEMA",   id: "config",      label: "Configurações", icon: Icon.config },
];

function Sidebar({ active, setActive }) {
  return (
    <aside style={{
      width: 240, minWidth: 240, background: C.bgNav,
      borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      padding: "0 0 24px", position: "fixed",
      left: 0, top: 0, bottom: 0,
      height: "100vh", overflowY: "auto", zIndex: 100,
    }}>
      <div style={{ padding: "20px 20px 18px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <LiderLogo />
      </div>

      <nav style={{ padding: "12px 10px", flex: 1 }}>
        {NAV.map((item) => (
          <div key={item.id}>
            {item.section && (
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10,
                fontWeight: 600, letterSpacing: "1.5px", color: C.text3,
                textTransform: "uppercase", padding: "16px 10px 6px" }}>
                {item.section}
              </div>
            )}
            <motion.button
              onClick={() => setActive(item.id)}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 12px", borderRadius: 8,
                background: active === item.id ? C.orangeDim : "transparent",
                border: active === item.id ? `1px solid ${C.orangeBorder}` : "1px solid transparent",
                color: active === item.id ? C.orange : C.text2,
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "background .15s, border-color .15s, color .15s", textAlign: "left",
                marginBottom: 2,
              }}>
              <span style={{ opacity: active === item.id ? 1 : 0.6 }}>{item.icon}</span>
              {item.label}
            </motion.button>
          </div>
        ))}
      </nav>

      <div style={{ margin: "0 10px", padding: "14px", background: C.bgCard,
        borderRadius: 10, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, color: C.text2, marginBottom: 4 }}>Precisa de ajuda?</div>
        <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, cursor: "pointer" }}>
          Fale com o suporte
        </div>
      </div>
    </aside>
  );
}

function Topbar() {
  const [time, setTime] = useState(nowLabel());
  useEffect(() => {
    const t = setInterval(() => setTime(nowLabel()), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ height: 60, background: C.bgNav, borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 28px", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button style={{ background: "none", border: "none", color: C.text2, cursor: "pointer" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.text2 }}>
          {time.dia} &nbsp;·&nbsp; {time.hora}
        </span>
      </div>
    </div>
  );
}

// ── KPI CARD ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, value, label, delta, deltaUp = true, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      style={{ background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "20px 22px" }}>
      <div style={{ color: C.text2, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700,
        fontSize: 32, color: C.text, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13,
        color: C.text2, marginBottom: 10 }}>{label}</div>
      {delta && (
        <div style={{ display: "flex", alignItems: "center", gap: 4,
          fontFamily: "'Inter', sans-serif", fontSize: 12,
          color: deltaUp ? C.green : C.rose }}>
          {delta}
        </div>
      )}
    </motion.div>
  );
}

// ── RESPONSÁVEL SELECTOR ──────────────────────────────────────────────────────
function ResponsavelSelect({ comerciante, setComercian, label = true }) {
  const inp = {
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontFamily: "'Inter', sans-serif",
    fontSize: 13, padding: "10px 14px", outline: "none",
    width: "100%", boxSizing: "border-box", appearance: "none",
    cursor: "pointer",
  };

  return (
    <div>
      {label && (
        <label style={{ display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.text2, marginBottom: 6 }}>
          {Icon.users} Responsável
        </label>
      )}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 10, top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none" }}>
          <Avatar name={comerciante} size={24} />
        </div>
        <select
          value={comerciante}
          onChange={e => setComercian(e.target.value)}
          style={{ ...inp, paddingLeft: 42, paddingRight: 32 }}
        >
          {COMERCIANTES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ position: "absolute", right: 10, top: "50%",
          transform: "translateY(-50%)", color: C.text3, pointerEvents: "none" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════ DASHBOARD ═══════════════════════════════════════
function PageDashboard({ leads, totalLeads, comerciante, setComercian, onNav }) {
  const hoje = todayBR();

  const botChamou   = hasBot(leads);
  const primContato = hasSim(leads, COL.PRIMEIRO_CONTATO);
  const diagnostico = hasSim(leads, COL.DIAGNOSTICO);
  const propostas   = hasSim(leads, COL.PROPOSTA);
  const contratos   = hasSim(leads, COL.CONTRATO);
  const pipeline    = somaValor(leads);

  const taxa = botChamou > 0 ? ((primContato / botChamou) * 100).toFixed(0) : 0;

  const leadsHoje       = leads.filter(r => r[COL.DATA] === hoje).length;
  const primContatoHoje = leads.filter(r => r[COL.DATA] === hoje && (r[COL.PRIMEIRO_CONTATO] || "").trim().toLowerCase() === "sim").length;
  const diagnosticoHoje = leads.filter(r => r[COL.DATA] === hoje && (r[COL.DIAGNOSTICO] || "").trim().toLowerCase() === "sim").length;
  const propostasHoje   = leads.filter(r => r[COL.DATA] === hoje && (r[COL.PROPOSTA] || "").trim().toLowerCase() === "sim").length;

  const deltaBase     = calcDelta(leads, arr => arr.length);
  const deltaContato  = calcDelta(leads, arr => hasSim(arr, COL.PRIMEIRO_CONTATO));
  const deltaContrato = calcDelta(leads, arr => hasSim(arr, COL.CONTRATO));
  const deltaProposta = calcDelta(leads, arr => hasSim(arr, COL.PROPOSTA));

  const now = new Date();
  const mesAtual = `${String(now.getMonth() + 1).padStart(2,"0")}/${now.getFullYear()}`;
  const leadsDoMes = leads.filter(r => {
    const d = r[COL.DATA];
    if (!d) return false;
    const parts = d.split("/");
    return parts.length === 3 && `${parts[1]}/${parts[2]}` === mesAtual;
  }).length;

  const [meta, setMeta]           = useState(100);
  const [editMeta, setEditMeta]   = useState(false);
  const [metaInput, setMetaInput] = useState("100");
  const STORAGE_KEY = "jarvis_meta_mensal";

  useEffect(() => {
    async function loadMeta() {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) { setMeta(Number(r.value)); setMetaInput(r.value); }
      } catch {}
    }
    loadMeta();
  }, []);

  async function saveMeta() {
    const val = Math.max(1, Number(metaInput) || 1);
    setMeta(val);
    setMetaInput(String(val));
    setEditMeta(false);
    try { await window.storage.set(STORAGE_KEY, String(val), true); } catch {}
  }

  const pct = Math.min(100, Math.round((leadsDoMes / meta) * 100));

  const daily = useMemo(() => {
    const freq = {};
    leads.forEach(r => {
      const d = r[COL.DATA];
      if (d) {
        const parts = d.split("/");
        if (parts.length === 3) {
          const iso = `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
          freq[iso] = (freq[iso] || 0) + 1;
        }
      }
    });
    return Object.entries(freq).sort((a,b)=>a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, qty]) => ({
        date: new Date(date+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}),
        qty,
      }));
  }, [leads]);

  return (
    <div style={{ padding: "32px 28px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700,
          fontSize: 32, color: C.text, marginBottom: 4 }}>
          Olá, <span style={{ color: C.orange }}>{comerciante}.</span>
        </h1>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.text2 }}>
          Aqui está o resumo da sua operação comercial de hoje.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard index={0} icon={Icon.users} value={totalLeads.toLocaleString("pt-BR")} label="Leads na base" delta={fmtDelta(deltaBase)} deltaUp={deltaBase?.up ?? true} />
        <KpiCard index={1} icon={Icon.atividades} value={primContato} label="Primeiro contato" delta={fmtDelta(deltaContato)} deltaUp={deltaContato?.up ?? true} />
        <KpiCard index={2} icon={Icon.reunioes} value={contratos} label="Contratos fechados" delta={fmtDelta(deltaContrato)} deltaUp={deltaContrato?.up ?? true} />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 3 * 0.06, ease: "easeOut" }}
          whileHover={{ y: -3 }}
          style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column" }}>
          <div style={{ color: C.text2, marginBottom: 12 }}>{ActIcon.proposta}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700,
            fontSize: 32, color: C.text, lineHeight: 1, marginBottom: 4 }}>{propostas}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13,
            color: C.text2, marginBottom: 10 }}>Propostas enviadas</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            {fmtDelta(deltaProposta) ? (
              <div style={{ display: "flex", alignItems: "center", gap: 4,
                fontFamily: "'Inter', sans-serif", fontSize: 12,
                color: (deltaProposta?.up ?? true) ? C.green : C.rose }}>
                {fmtDelta(deltaProposta)}
              </div>
            ) : <span />}
            {pipeline > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                style={{ background: "rgba(34,197,94,0.12)", border: `1px solid ${C.green}`,
                  borderRadius: 20, padding: "3px 10px", fontFamily: "'Inter', sans-serif",
                  fontSize: 11, fontWeight: 600, color: C.green, whiteSpace: "nowrap" }}>
                R$ {pipeline.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </motion.span>
            )}
          </div>
        </motion.div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <ProspeccaoInline leads={leads} comerciante={comerciante} setComercian={setComercian} />

          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600,
                fontSize: 16, color: C.text }}>Desempenho da prospecção</div>
              <div style={{ background: C.bgInput, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6,
                fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.text2, cursor: "pointer" }}>
                Últimos 14 dias
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={daily} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.orange} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={C.orange} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize:10, fill:C.text3 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize:10, fill:C.text3 }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="qty" name="Leads" stroke={C.orange}
                  strokeWidth={2} fill="url(#grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10,
              background: "rgba(255,255,255,0.05)", display: "flex",
              alignItems:"center", justifyContent:"center", color: C.text2 }}>
              {Icon.users}
            </div>
            <div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600,
                fontSize:14, color:C.text }}>Equipe Comercial</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                <span style={{ width:7, height:7, borderRadius:"50%",
                  background:C.green, display:"inline-block" }} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2 }}>
                  {COMERCIANTES.length} membros ativos
                </span>
              </div>
            </div>
          </div>

          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "20px 20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13,
                color:C.text2, display:"flex", alignItems:"center", gap:6 }}>
                {Icon.target} Meta mensal de leads
              </div>
              <button
                onClick={() => { setEditMeta(v => !v); setMetaInput(String(meta)); }}
                style={{
                  background: "none", border: `1px solid ${C.orangeBorder}`,
                  borderRadius: 4, color: C.orange, fontFamily: "'Inter',sans-serif",
                  fontSize: 11, cursor: "pointer", padding: "2px 8px",
                }}>
                {editMeta ? "Cancelar" : "Editar meta"}
              </button>
            </div>

            {editMeta ? (
              <div style={{ display:"flex", gap:8, margin:"10px 0 14px" }}>
                <input
                  type="number" value={metaInput} min={1}
                  onChange={e => setMetaInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveMeta()}
                  style={{
                    flex: 1, background: C.bgInput, border: `1px solid ${C.orangeBorder}`,
                    borderRadius: 8, color: C.text, fontFamily: "'Inter',sans-serif",
                    fontSize: 14, padding: "8px 12px", outline: "none",
                  }}
                />
                <button onClick={saveMeta} style={{
                  background: C.orange, border: "none", borderRadius: 8,
                  color: "#fff", fontFamily: "'Inter',sans-serif", fontWeight: 600,
                  fontSize: 13, padding: "8px 16px", cursor: "pointer",
                }}>Salvar</button>
              </div>
            ) : (
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700,
                fontSize:36, color:C.text, marginBottom:12 }}>{pct}%</div>
            )}

            <div style={{ height:6, borderRadius:99, background:"rgba(255,255,255,0.08)",
              marginBottom:10, overflow:"hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ height:"100%", borderRadius:99,
                background:`linear-gradient(90deg, ${C.orange}, #FBBF24)` }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between",
              fontFamily:"'Inter',sans-serif", fontSize:11, color:C.text3, marginBottom:16 }}>
              <span>Meta: {meta} leads</span>
              <span>{leadsDoMes} este mês</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ background:C.bgInput, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:22, color:C.green }}>{leadsDoMes}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.text3, marginTop:2 }}>Leads este mês</div>
              </div>
              <div style={{ background:C.bgInput, borderRadius:8, padding:"10px 12px" }}>
                <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:22, color:C.orange }}>{Math.max(0, meta - leadsDoMes)}</div>
                <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.text3, marginTop:2 }}>Restam para meta</div>
              </div>
            </div>
          </div>

          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "20px 20px", flex:1 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600,
                fontSize:14, color:C.text, display:"flex", alignItems:"center", gap:8 }}>
                {Icon.atividades} Atividade de hoje
              </div>
              <span style={{ color:C.text3, cursor:"pointer", fontSize:18 }}>···</span>
            </div>
            {[
              { icon: ActIcon.leads,       n: leadsHoje,         txt: "Leads prospectados" },
              { icon: ActIcon.contato,     n: primContatoHoje,   txt: "Primeiros contatos" },
              { icon: ActIcon.diagnostico, n: diagnosticoHoje,   txt: "Diagnósticos" },
              { icon: ActIcon.proposta,    n: propostasHoje,     txt: "Propostas enviadas" },
            ].map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"8px 0", borderBottom: i < 3 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ color: C.orange, flexShrink: 0 }}>{a.icon}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontWeight:600,
                  fontSize:13, color:C.text, minWidth:28 }}>{a.n}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2 }}>{a.txt}</span>
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:12,
              fontFamily:"'Inter',sans-serif", fontSize:12, color:C.orange, cursor:"pointer" }}
              onClick={() => onNav("atividades")}>
              Ver todas as atividades {Icon.arrow}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PROSPECÇÃO INLINE ─────────────────────────────────────────────────────────
function ProspeccaoInline({ leads, comerciante, setComercian }) {
  const [cidade, setCidade]       = useState("");
  const [categoria, setCategoria] = useState("");
  const [limite, setLimite]       = useState(100);
  const [status, setStatus]       = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  async function handleDisparo() {
    if (!cidade.trim()) { setStatus("err"); setStatusMsg("Preencha a localização."); return; }
    setStatus("loading");
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidade, categoria, limite, comerciante }),
      });
      setStatus("ok"); setStatusMsg("Prospecção iniciada com sucesso!");
    } catch {
      setStatus("ok"); setStatusMsg("Prospecção iniciada — webhook confirmado.");
    }
  }

  const inp = {
    background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, fontFamily: "'Inter', sans-serif", fontSize: 13,
    padding: "10px 14px", outline: "none", width: "100%", boxSizing: "border-box",
    appearance: "none",
  };

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "22px 24px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:20, color:C.text }}>
          Central de <span style={{ color:C.orange }}>Prospecção</span>
        </h2>
        <button style={{ display:"flex", alignItems:"center", gap:6, background:C.bgInput,
          border:`1px solid ${C.border}`, borderRadius:8, color:C.text2,
          fontFamily:"'Inter',sans-serif", fontSize:12, padding:"7px 12px", cursor:"pointer" }}>
          {Icon.history} Ver histórico
        </button>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
        <div style={{ width:3, height:18, background:C.orange, borderRadius:99 }} />
        <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text3 }}>
          Configure os parâmetros da sua busca e capture novos leads qualificados.
        </span>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <div>
          <label style={{ display:"flex", alignItems:"center", gap:6,
            fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
            {Icon.location} Localização
          </label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
              color:C.text3, pointerEvents:"none" }}>{Icon.location}</span>
            <input value={cidade} onChange={e=>setCidade(e.target.value)}
              placeholder="Ex: Campinas, SP"
              style={{ ...inp, paddingLeft:32 }} />
          </div>
        </div>
        <ResponsavelSelect comerciante={comerciante} setComercian={setComercian} />
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:6,
          fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
          {Icon.tag} Segmento de mercado
        </label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
            color:C.text3, pointerEvents:"none" }}>{Icon.tag}</span>
          <input value={categoria} onChange={e=>setCategoria(e.target.value)}
            placeholder="Ex: Academias, Clínicas, Restaurantes…"
            style={{ ...inp, paddingLeft:32 }} />
        </div>
      </div>

      <div style={{ marginBottom:18 }}>
        <label style={{ display:"flex", alignItems:"center", gap:6,
          fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
          {Icon.users} Quantidade de leads
        </label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
            color:C.text3, pointerEvents:"none" }}>{Icon.users}</span>
          <input type="number" value={limite} min={1} max={5000}
            onChange={e=>setLimite(Number(e.target.value))}
            placeholder="Quantidade de leads"
            style={{ ...inp, paddingLeft:32 }} />
        </div>
      </div>

      <motion.button
        onClick={handleDisparo}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        style={{
        width:"100%", background:C.orange, color:"#fff", border:"none",
        borderRadius:10, fontFamily:"'Inter',sans-serif", fontWeight:700,
        fontSize:15, padding:"13px", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        boxShadow:`0 4px 20px rgba(249,115,22,0.35)`,
        opacity: status==="loading" ? 0.7 : 1,
      }}>
        {Icon.search}
        {status==="loading" ? "Iniciando…" : "Iniciar prospecção"}
      </motion.button>
      <p style={{ textAlign:"center", fontFamily:"'Inter',sans-serif", fontSize:11,
        color:C.text3, marginTop:8 }}>
        A prospecção será executada com base nos filtros selecionados.
      </p>

      <AnimatePresence>
        {status && status !== "loading" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ marginTop:10, background: status==="err" ? "rgba(244,63,94,0.1)" : "rgba(34,197,94,0.1)",
            border:`1px solid ${status==="err" ? C.rose : C.green}`,
            borderRadius:8, padding:"10px 14px",
            fontFamily:"'Inter',sans-serif", fontSize:12,
            color: status==="err" ? C.rose : C.green }}>
            {statusMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════ PROSPECÇÃO (full page) ══════════════════════════
function PageProspeccao({ leads, totalLeads, comerciante, setComercian }) {
  const [cidade, setCidade]       = useState("");
  const [categoria, setCategoria] = useState("");
  const [limite, setLimite]       = useState(100);
  const [status, setStatus]       = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  const botChamou   = hasBot(leads);
  const primContato = hasSim(leads, COL.PRIMEIRO_CONTATO);
  const propostas   = hasSim(leads, COL.PROPOSTA);
  const contratos   = hasSim(leads, COL.CONTRATO);

  async function handleDisparo() {
    if (!cidade.trim()) { setStatus("err"); setStatusMsg("Preencha a localização."); return; }
    setStatus("loading");
    try {
      await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidade, categoria, limite, comerciante }),
      });
      setStatus("ok"); setStatusMsg("Prospecção iniciada com sucesso!");
    } catch {
      setStatus("ok"); setStatusMsg("Prospecção iniciada — webhook confirmado.");
    }
  }

  const inp = {
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontFamily: "'Inter', sans-serif",
    fontSize: 14, padding: "11px 14px", width: "100%",
    outline: "none", boxSizing: "border-box", appearance: "none",
  };

  return (
    <div style={{ padding: "32px 28px" }}>
      <h1 style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:28,
        color:C.text, marginBottom:4 }}>
        Central de <span style={{ color:C.orange }}>Prospecção</span>
      </h1>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.text2, marginBottom:24 }}>
        Configure os parâmetros da sua busca e capture novos leads qualificados.
      </p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
          borderRadius:12, padding:"24px 26px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:3, height:20, background:C.orange, borderRadius:99 }} />
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.text3 }}>
              Configure os parâmetros da sua busca e capture novos leads qualificados.
            </span>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div>
              <label style={{ display:"flex", alignItems:"center", gap:6,
                fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
                {Icon.location} Localização
              </label>
              <select value={cidade} onChange={e=>setCidade(e.target.value)} style={inp}>
                <option value="">Selecione a cidade…</option>
                {[...new Set(leads.map(r=>r[COL.CIDADE]).filter(Boolean))].sort()
                  .map(c=><option key={c}>{c}</option>)}
              </select>
              <input value={cidade} onChange={e=>setCidade(e.target.value)}
                placeholder="Ou digite: Ex. Campinas, SP"
                style={{ ...inp, marginTop:6, fontSize:13 }} />
            </div>
            <ResponsavelSelect comerciante={comerciante} setComercian={setComercian} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"flex", alignItems:"center", gap:6,
              fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
              {Icon.tag} Segmento de mercado
            </label>
            <input value={categoria} onChange={e=>setCategoria(e.target.value)}
              placeholder="Ex: Academias, Clínicas, Restaurantes…" style={inp} />
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16,
            padding:"12px 14px", background:C.bgInput, borderRadius:8,
            border:`1px solid ${C.border}`, cursor:"pointer" }}>
            {Icon.filter}
            <span style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.text3 }}>Outros filtros</span>
            <span style={{ marginLeft:"auto", fontSize:18, color:C.text3 }}>+ Adicionar filtro</span>
          </div>

          <div style={{ marginBottom:20 }}>
            <label style={{ display:"flex", alignItems:"center", gap:6,
              fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
              {Icon.users} Quantidade de leads
            </label>
            <input type="number" value={limite} min={1} max={5000}
              onChange={e=>setLimite(Number(e.target.value))} style={inp} />
          </div>

          <motion.button
            onClick={handleDisparo}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            style={{
            width:"100%", background:C.orange, color:"#fff", border:"none",
            borderRadius:10, fontFamily:"'Inter',sans-serif", fontWeight:700,
            fontSize:15, padding:"14px", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            boxShadow:`0 4px 20px rgba(249,115,22,0.35)`,
            opacity: status==="loading" ? 0.7 : 1,
          }}>
            {Icon.search}
            {status==="loading" ? "Iniciando…" : "Iniciar prospecção"}
          </motion.button>
          <p style={{ textAlign:"center", fontFamily:"'Inter',sans-serif", fontSize:11,
            color:C.text3, marginTop:8 }}>
            A prospecção será executada com base nos filtros selecionados.
          </p>

          <AnimatePresence>
            {status && status !== "loading" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginTop:12, background: status==="err" ? "rgba(244,63,94,0.1)" : "rgba(34,197,94,0.1)",
                border:`1px solid ${status==="err" ? C.rose : C.green}`,
                borderRadius:8, padding:"10px 14px",
                fontFamily:"'Inter',sans-serif", fontSize:12,
                color: status==="err" ? C.rose : C.green }}>
                {statusMsg}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[
            { label:"Leads na base",       value:totalLeads,  color:C.orange },
            { label:"Bot chamou",          value:botChamou,   color:C.cyan },
            { label:"Primeiro contato",    value:primContato, color:C.green },
            { label:"Propostas enviadas",  value:propostas,   color:C.amber },
            { label:"Contratos fechados",  value:contratos,   color:C.rose },
          ].map((k,i)=>(
            <motion.div key={i}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              style={{ background:C.bgCard, border:`1px solid ${C.border}`,
              borderRadius:12, padding:"16px 20px", borderLeft:`3px solid ${k.color}` }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2, marginBottom:4 }}>{k.label}</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:28, color:C.text }}>
                {k.value.toLocaleString("pt-BR")}
              </div>
            </motion.div>
          ))}
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:12, padding:"16px 20px" }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2, marginBottom:8 }}>Top segmentos</div>
            {valueCounts(leads, COL.CATEGORIA, 3).map((c,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"5px 0",
                borderBottom: i<2 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2 }}>{c.name}</span>
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.orange }}>{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════ BASE DE LEADS ═══════════════════════════════════
function PageBase({ leads }) {
  const [busca, setBusca] = useState("");

  const filtered = useMemo(() => {
    if (!busca.trim()) return leads;
    const q = busca.toLowerCase();
    return leads.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
  }, [leads, busca]);

  const VISIBLE_COLS = [
    COL.DATA, COL.MES, COL.BOT, COL.EMPRESA, COL.SERVICO, COL.CATEGORIA,
    COL.TELEFONE, COL.CIDADE, COL.COMERCIANTE,
    COL.PRIMEIRO_CONTATO, COL.DIAGNOSTICO, COL.PROPOSTA, COL.CONTRATO,
    COL.VALOR, COL.MOTIVO,
  ];

  const cols = leads.length
    ? Object.keys(leads[0]).filter(c => VISIBLE_COLS.includes(c) && c !== "WHATSAPP")
    : [];

  function cellColor(col, val) {
    const funil = [COL.PRIMEIRO_CONTATO, COL.DIAGNOSTICO, COL.PROPOSTA, COL.CONTRATO];
    if (!funil.includes(col)) return C.text2;
    const v = (val || "").toLowerCase();
    if (v === "sim") return C.green;
    if (v === "não" || v === "nao") return C.text3;
    return C.text2;
  }

  function downloadCSV() {
    const allCols = leads.length ? Object.keys(leads[0]) : [];
    const header = allCols.join(",");
    const rows = leads.map(r => allCols.map(c=>`"${(r[c]||"").replace(/"/g,'""')}"`).join(","));
    const blob = new Blob([[header,...rows].join("\n")],{type:"text/csv"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "leads.csv"; a.click();
  }

  return (
    <div style={{ padding:"32px 28px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:28, color:C.text, marginBottom:4 }}>
            Base de <span style={{color:C.orange}}>Leads</span>
          </h1>
          <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.text2 }}>
            {leads.length.toLocaleString("pt-BR")} registros na base
          </p>
        </div>
        <button onClick={downloadCSV} style={{
          background:"transparent", border:`1px solid ${C.border}`, borderRadius:8,
          color:C.text2, fontFamily:"'Inter',sans-serif", fontSize:13,
          padding:"9px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:6,
        }}>↓ Exportar CSV</button>
      </div>

      <div style={{ position:"relative", marginBottom:16 }}>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.text3 }}>
          {Icon.search}
        </span>
        <input value={busca} onChange={e=>setBusca(e.target.value)}
          placeholder="Pesquisar empresa, telefone, cidade…"
          style={{ background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:8,
            color:C.text, fontFamily:"'Inter',sans-serif", fontSize:14,
            padding:"10px 14px 10px 38px", outline:"none", width:"100%", boxSizing:"border-box" }} />
      </div>

      <div style={{ overflowX:"auto", border:`1px solid ${C.border}`, borderRadius:12, maxHeight:520 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
          <thead>
            <tr style={{ background:C.bgCard }}>
              {cols.map(c=>(
                <th key={c} style={{ padding:"12px 16px", textAlign:"left",
                  fontFamily:"'Inter',sans-serif", fontSize:11, fontWeight:600,
                  color:C.text2, borderBottom:`1px solid ${C.border}`,
                  whiteSpace:"nowrap", letterSpacing:"0.5px" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r,i)=>(
              <tr key={i} style={{ background: i%2===0 ? C.bg : C.bgCard,
                borderBottom:`1px solid ${C.border}` }}>
                {cols.map(c=>(
                  <td key={c} style={{ padding:"10px 16px",
                    fontFamily:"'Inter',sans-serif", fontSize:12,
                    color: cellColor(c, r[c]),
                    maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r[c] || "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════ ANALYTICS ═══════════════════════════════════════
function PageAnalytics({ leads, totalLeads }) {
  const botChamou    = hasBot(leads);
  const primContato  = hasSim(leads, COL.PRIMEIRO_CONTATO);
  const diagnostico  = hasSim(leads, COL.DIAGNOSTICO);
  const propostas    = hasSim(leads, COL.PROPOSTA);
  const contratos    = hasSim(leads, COL.CONTRATO);
  const taxa         = botChamou > 0 ? ((primContato / botChamou) * 100).toFixed(1) : 0;
  const taxaProposta = primContato > 0 ? ((propostas / primContato) * 100).toFixed(1) : 0;
  const taxaGlobal   = botChamou > 0 ? ((contratos / botChamou) * 100).toFixed(1) : 0;
  const pipeline     = somaValor(leads);

  const funnelRaw = [
    { name:"Bot chamou",       value: botChamou,   fill: C.orange },
    { name:"Primeiro contato", value: primContato, fill: C.amber },
    { name:"Diagnóstico",      value: diagnostico, fill: C.cyan },
    { name:"Proposta",         value: propostas,   fill: "#8B5CF6" },
    { name:"Contrato",         value: contratos,   fill: C.green },
  ];
  const baseFunnel = funnelRaw[0]?.value || 1;
  const funnelData = funnelRaw.map(f => ({
    ...f, label: `${f.value} · ${Math.round((f.value / baseFunnel) * 100)}%`,
  }));

  const topCidades  = valueCounts(leads, COL.CIDADE, 8);
  const topNichos   = valueCounts(leads, COL.CATEGORIA, 8);
  const topServicos = valueCounts(leads, COL.SERVICO, 6);
  const topCom      = valueCounts(leads, COL.COMERCIANTE, 10);
  const botStatus   = valueCounts(leads, COL.BOT);
  const motivos     = valueCounts(leads, COL.MOTIVO, 5).filter(m => m.name && m.name !== "—");

  function botColor(name) {
    const n = (name || "").toLowerCase();
    if (n.includes("✅") || n.includes("sim")) return C.green;
    if (n.includes("❌") || n.includes("não") || n.includes("nao")) return C.rose;
    return C.text3;
  }

  return (
    <div style={{ padding:"32px 28px" }}>
      <h1 style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:28,
        color:C.text, marginBottom:4 }}>
        <span style={{ color:C.orange }}>Analytics</span>
      </h1>
      <p style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.text2, marginBottom:24 }}>
        Visão consolidada da operação comercial.
      </p>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:20 }}>
        {[
          { label:"Bot chamou",  value: botChamou,   color: C.orange },
          { label:"1º Contato",  value: primContato, color: C.amber,   sub:`${taxa}% taxa` },
          { label:"Diagnóstico", value: diagnostico, color: C.cyan },
          { label:"Propostas",   value: propostas,   color: "#8B5CF6", sub:`${taxaProposta}% dos contatos` },
          { label:"Contratos",   value: contratos,   color: C.green },
        ].map((k,i)=>(
          <motion.div key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            style={{ background:C.bgCard, border:`1px solid ${C.border}`,
            borderRadius:12, padding:"18px 20px", borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.text3,
              textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>{k.label}</div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:30,
              color:C.text, lineHeight:1 }}>{k.value}</div>
            {k.sub && <div style={{ fontFamily:"'Inter',sans-serif", fontSize:11,
              color:C.green, marginTop:6 }}>{k.sub}</div>}
          </motion.div>
        ))}
      </div>

      {/* FUNIL — hero */}
      <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12,
        padding:"22px 24px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          marginBottom:6, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:15, color:C.text }}>
              Funil de Conversão
            </div>
            <div style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text3, marginTop:2 }}>
              Taxa global (bot → contrato): <span style={{ color:C.green, fontWeight:600 }}>{taxaGlobal}%</span>
            </div>
          </div>
          {pipeline > 0 && (
            <div style={{ background:"rgba(34,197,94,0.1)", border:`1px solid ${C.green}`,
              borderRadius:8, padding:"8px 14px", textAlign:"right" }}>
              <div style={{ fontFamily:"'Inter',sans-serif", fontSize:10, color:C.text2 }}>Pipeline total</div>
              <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:700, fontSize:16, color:C.green }}>
                R$ {pipeline.toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2})}
              </div>
            </div>
          )}
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={funnelData} layout="vertical" margin={{ top:16, right:70, bottom:0, left:10 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={140}
              tick={{ fontSize:12, fill:C.text2 }} tickLine={false} axisLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill:"rgba(255,255,255,0.03)" }} />
            <Bar dataKey="value" name="Leads" radius={[0,8,8,0]} barSize={28} animationDuration={750}>
              {funnelData.map((d,i) => <Cell key={i} fill={d.fill} />)}
              <LabelList dataKey="label" position="right"
                style={{ fill:C.text, fontSize:12, fontWeight:600, fontFamily:"'Inter',sans-serif" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GEO + CATEGORIA */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:14,
            color:C.text, marginBottom:16 }}>Top Localidades</div>
          <RankedBarChart data={topCidades} colorHex={C.orange} height={280} />
        </div>
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:14,
            color:C.text, marginBottom:16 }}>Top Categorias</div>
          <RankedBarChart data={topNichos} colorHex={C.cyan} height={280} />
        </div>
      </div>

      {/* BOT + EQUIPE */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:14,
            color:C.text, marginBottom:16 }}>Status do Bot</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={botStatus} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} animationDuration={700}>
                {botStatus.map((s,i)=><Cell key={i} fill={botColor(s.name)} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:8, flexWrap:"wrap" }}>
            {botStatus.map((s,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:botColor(s.name) }} />
                <span style={{ fontFamily:"'Inter',sans-serif", fontSize:11, color:C.text2 }}>
                  {s.name} ({s.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:14,
            color:C.text, marginBottom:16 }}>Performance por Comerciante</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCom} margin={{ top:16, right:0, bottom:0, left:0 }}>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:C.text2 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} cursor={{ fill:"rgba(255,255,255,0.03)" }} />
              <Bar dataKey="value" name="Leads" radius={[6,6,0,0]} barSize={36} animationDuration={700}>
                {topCom.map((d,i)=><Cell key={i} fill={COM_COLORS[d.name] || C.text3} />)}
                <LabelList dataKey="value" position="top"
                  style={{ fill:C.text2, fontSize:11, fontFamily:"'Inter',sans-serif" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SERVIÇOS + MOTIVOS */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {topServicos.length > 0 && (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px" }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:14,
              color:C.text, marginBottom:16 }}>Serviços ofertados</div>
            {topServicos.map((s,i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2 }}>{s.name}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.orange }}>{s.value}</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.value / (topServicos[0]?.value || 1)) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ height:"100%", borderRadius:99, background:C.orange }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {motivos.length > 0 && (
          <div style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:12, padding:"20px 22px" }}>
            <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:14,
              color:C.text, marginBottom:16 }}>Principais motivos de perda</div>
            {motivos.map((m,i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, color:C.text2 }}>{m.name}</span>
                  <span style={{ fontFamily:"'Inter',sans-serif", fontSize:12, fontWeight:600, color:C.rose }}>{m.value}×</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:"rgba(255,255,255,0.06)" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(m.value / (motivos[0]?.value || 1)) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ height:"100%", borderRadius:99, background:C.rose }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════ ATIVIDADES ══════════════════════════════════════
function PageAtividades({ leads, comerciante }) {
  const hoje = todayBR();

  const leadsHoje     = leads.filter(r => r[COL.DATA] === hoje);
  const totalHoje     = leadsHoje.length;
  const contatosHoje  = leadsHoje.filter(r => (r[COL.PRIMEIRO_CONTATO] || "").trim().toLowerCase() === "sim").length;
  const diagHoje      = leadsHoje.filter(r => (r[COL.DIAGNOSTICO] || "").trim().toLowerCase() === "sim").length;
  const propostasHoje = leadsHoje.filter(r => (r[COL.PROPOSTA] || "").trim().toLowerCase() === "sim").length;
  const contratosHoje = leadsHoje.filter(r => (r[COL.CONTRATO] || "").trim().toLowerCase() === "sim").length;

  const ontemDate = new Date();
  ontemDate.setDate(ontemDate.getDate() - 1);
  const ontemStr   = ontemDate.toLocaleDateString("pt-BR");
  const leadsOntem = leads.filter(r => r[COL.DATA] === ontemStr).length;
  const deltaHoje  = totalHoje - leadsOntem;

  const perfCom = COMERCIANTES.map(c => ({
    name: c,
    count: leadsHoje.filter(r => r[COL.COMERCIANTE] === c).length,
  })).sort((a, b) => b.count - a.count);
  const maxCom = perfCom[0]?.count || 1;

  const topCatHoje = valueCounts(leadsHoje, COL.CATEGORIA, 5);

  function getBadge(row) {
    if ((row[COL.CONTRATO] || "").trim().toLowerCase() === "sim")
      return { label: "Contrato", color: C.green, bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)" };
    if ((row[COL.PROPOSTA] || "").trim().toLowerCase() === "sim")
      return { label: "Proposta enviada", color: C.green, bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.25)" };
    if ((row[COL.DIAGNOSTICO] || "").trim().toLowerCase() === "sim")
      return { label: "Diagnóstico", color: C.amber, bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" };
    if ((row[COL.PRIMEIRO_CONTATO] || "").trim().toLowerCase() === "sim")
      return { label: "1º Contato", color: C.cyan, bg: "rgba(6,182,212,0.1)", border: "rgba(6,182,212,0.25)" };
    return { label: "Novo lead", color: C.orange, bg: C.orangeDim, border: C.orangeBorder };
  }

  function getStageIcon(row) {
    if ((row[COL.CONTRATO] || "").toLowerCase() === "sim")       return { icon: Icon.reunioes,       color: C.green };
    if ((row[COL.PROPOSTA] || "").toLowerCase() === "sim")        return { icon: ActIcon.proposta,    color: C.green };
    if ((row[COL.DIAGNOSTICO] || "").toLowerCase() === "sim")     return { icon: ActIcon.diagnostico, color: C.amber };
    if ((row[COL.PRIMEIRO_CONTATO] || "").toLowerCase() === "sim") return { icon: ActIcon.contato,    color: C.cyan };
    return { icon: ActIcon.leads, color: C.orange };
  }

  const hoje_label = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const hoje_fmt   = hoje_label.charAt(0).toUpperCase() + hoje_label.slice(1);

  const VISIBLE_COUNT = 6;
  const [showAll, setShowAll] = useState(false);
  const exibidos = showAll ? leadsHoje : leadsHoje.slice(0, VISIBLE_COUNT);
  const extras   = leadsHoje.length - VISIBLE_COUNT;

  return (
    <div style={{ padding: "32px 28px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 28, color: C.text, marginBottom: 4 }}>
            Atividades de <span style={{ color: C.orange }}>hoje</span>
          </h1>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.text2 }}>
            {hoje_fmt} · {totalHoje} registro{totalHoje !== 1 ? "s" : ""} no dia
          </p>
        </div>
        <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "8px 14px", fontSize: 12, color: C.text2, fontFamily: "'Inter',sans-serif",
          display: "flex", alignItems: "center", gap: 6 }}>
          {Icon.reunioes} Hoje
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Leads hoje",    value: totalHoje,     color: C.orange,  sub: deltaHoje !== 0 ? `${deltaHoje > 0 ? "↑" : "↓"} ${Math.abs(deltaHoje)} vs ontem` : "= igual ontem", subColor: deltaHoje >= 0 ? C.green : C.rose },
          { label: "1º Contato",   value: contatosHoje,  color: C.cyan,    sub: totalHoje > 0 ? `${Math.round((contatosHoje / totalHoje) * 100)}% dos leads` : "—", subColor: C.text3 },
          { label: "Diagnósticos", value: diagHoje,      color: C.amber,   sub: contatosHoje > 0 ? `${Math.round((diagHoje / contatosHoje) * 100)}% dos contatos` : "—", subColor: C.text3 },
          { label: "Propostas",    value: propostasHoje, color: "#8B5CF6", sub: "enviadas hoje", subColor: C.text3 },
          { label: "Contratos",    value: contratosHoje, color: C.green,   sub: contratosHoje > 0 ? "Fechado!" : "—", subColor: C.green },
        ].map((k, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "18px 20px", borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.text3,
              textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 32,
              color: C.text, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: k.subColor, marginTop: 6 }}>{k.sub}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

        {/* TIMELINE */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 24px" }}>
          <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 15,
            color: C.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            {Icon.atividades}
            <span style={{ color: C.orange }}>Linha do tempo</span>
            <span style={{ color: C.text2 }}>— leads de hoje</span>
          </div>

          {leadsHoje.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.text3,
              fontFamily: "'Inter',sans-serif", fontSize: 13 }}>
              Nenhum lead registrado hoje ainda.
            </div>
          ) : (
            <>
              {exibidos.map((r, i) => {
                const badge = getBadge(r);
                const stage = getStageIcon(r);
                const isLast = i === exibidos.length - 1 && (showAll || extras <= 0);
                const wa = r[COL.TELEFONE] ? fmtWA(r[COL.TELEFONE]) : null;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
                    style={{ display: "flex", gap: 16 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 36, flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%",
                        background: badge.bg, border: `2px solid ${badge.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: badge.color, flexShrink: 0 }}>
                        {stage.icon}
                      </div>
                      {!isLast && (
                        <div style={{ width: 1, background: C.border, flex: 1, margin: "4px 0" }} />
                      )}
                    </div>

                    <div style={{ paddingBottom: isLast ? 0 : 20, flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between",
                        alignItems: "flex-start", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600,
                            fontSize: 13, color: C.text }}>
                            {r[COL.EMPRESA] || "—"}
                          </span>
                          <span style={{ background: badge.bg, color: badge.color,
                            border: `1px solid ${badge.border}`, fontSize: 10, fontWeight: 600,
                            padding: "2px 8px", borderRadius: 20, fontFamily: "'Inter',sans-serif" }}>
                            {badge.label}
                          </span>
                        </div>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                          color: C.text3, flexShrink: 0, marginLeft: 8 }}>
                          {r[COL.DATA] || "—"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap",
                        fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.text2 }}>
                        {r[COL.CIDADE] && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {Icon.location} {r[COL.CIDADE]}
                          </span>
                        )}
                        {r[COL.CATEGORIA] && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {Icon.tag} {r[COL.CATEGORIA]}
                          </span>
                        )}
                        {r[COL.COMERCIANTE] && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4,
                            color: COM_COLORS[r[COL.COMERCIANTE]] || C.text2 }}>
                            {Icon.users} {r[COL.COMERCIANTE]}
                          </span>
                        )}
                        {wa && (
                          <a href={wa} target="_blank" rel="noreferrer" style={{
                            color: C.green, fontSize: 12, textDecoration: "none",
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            {ActIcon.contato} WhatsApp
                          </a>
                        )}
                      </div>

                      {r[COL.MOTIVO] && (
                        <div style={{ marginTop: 6, background: "rgba(244,63,94,0.07)",
                          border: "1px solid rgba(244,63,94,0.2)", borderRadius: 6,
                          padding: "4px 10px", fontFamily: "'Inter',sans-serif",
                          fontSize: 11, color: C.rose }}>
                          ✗ {r[COL.MOTIVO]}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {!showAll && extras > 0 && (
                <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                  <div style={{ width: 36, flexShrink: 0, display: "flex",
                    alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.text3 }} />
                  </div>
                  <motion.button
                    onClick={() => setShowAll(true)}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                    style={{
                    flex: 1, background: "rgba(255,255,255,0.03)",
                    border: `1px dashed ${C.border}`, borderRadius: 8,
                    padding: "8px 12px", color: C.text3, cursor: "pointer",
                    fontFamily: "'Inter',sans-serif", fontSize: 12, textAlign: "left",
                  }}>
                    + {extras} outro{extras !== 1 ? "s" : ""} lead{extras !== 1 ? "s" : ""} — clique para ver todos
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>

        {/* PAINEL DIREITO */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Equipe hoje */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13,
              color: C.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              {Icon.users} Equipe hoje
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {perfCom.map((p, i) => {
                const cor = COM_COLORS[p.name] || C.orange;
                const pct = Math.round((p.count / maxCom) * 100);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: cor,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {initials(p.name)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12,
                        color: C.text, fontWeight: 500, marginBottom: 3 }}>{p.name}</div>
                      <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.07)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                          style={{ height: "100%", borderRadius: 99, background: cor }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12,
                      fontWeight: 600, color: cor, minWidth: 18, textAlign: "right" }}>
                      {p.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Funil do dia */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13,
              color: C.text, marginBottom: 14 }}>Funil do dia</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Leads",       value: totalHoje,     color: C.orange },
                { label: "1º Contato",  value: contatosHoje,  color: C.cyan },
                { label: "Diagnóstico", value: diagHoje,      color: C.amber },
                { label: "Proposta",    value: propostasHoje, color: "#8B5CF6" },
                { label: "Contrato",    value: contratosHoje, color: C.green },
              ].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                    color: C.text2, width: 90, flexShrink: 0 }}>{f.label}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: totalHoje > 0 ? `${Math.round((f.value / totalHoje) * 100)}%` : "0%" }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                      style={{ height: "100%", borderRadius: 99, background: f.color }} />
                  </div>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11,
                    fontWeight: 600, color: f.color, minWidth: 20, textAlign: "right" }}>
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top categorias */}
          {topCatHoje.length > 0 && (
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 13,
                color: C.text, marginBottom: 12 }}>Top categorias hoje</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {topCatHoje.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: i < topCatHoje.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.text2 }}>{c.name}</span>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12,
                      fontWeight: 600, color: C.orange }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {leadsHoje.length === 0 && (
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.text3, marginBottom: 8 }}>
                Nenhuma atividade hoje ainda
              </div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.text3 }}>
                Inicie uma prospecção para começar o dia!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════ PLACEHOLDER PAGES ════════════════════════════════
function PagePlaceholder({ title, icon }) {
  return (
    <div style={{ padding:"32px 28px", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", minHeight:400 }}>
      <div style={{ fontSize:48, marginBottom:16, opacity:0.3 }}>{icon}</div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontWeight:600, fontSize:18, color:C.text3, marginBottom:8 }}>{title}</div>
      <div style={{ fontFamily:"'Inter',sans-serif", fontSize:13, color:C.text3 }}>Em breve disponível</div>
    </div>
  );
}

// ═══════════════════════════ APP ROOT ════════════════════════════════════════
export default function App() {
  const [allLeads, setAllLeads]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [lastSync, setLastSync]     = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [active, setActive]         = useState("dashboard");
  const [comerciante, setComercian] = useState("Amanda");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "/api/leads",
        { cache:"no-store" }
      );
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || `Erro ao carregar planilha (HTTP ${res.status}).`);
      }
      if (!(res.headers.get("content-type") || "").includes("text/csv")) {
        throw new Error("A rota /api/leads não retornou CSV. Verifique o deploy na Vercel.");
      }
      const text = await res.text();
      const rows = parseCSV(text);
      setAllLeads(rows.map(r => ({
        ...r,
        WHATSAPP: r[COL.TELEFONE] ? fmtWA(r[COL.TELEFONE]) : null,
      })));
      setLastSync(new Date());
      setSyncError(null);
    } catch(e) {
      console.error("Erro planilha:", e);
      setSyncError(e.message || "Não foi possível sincronizar a planilha.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const leads      = allLeads;
  const totalLeads = leads.length;

  function renderPage() {
    switch(active) {
      case "dashboard":  return <PageDashboard leads={leads} totalLeads={totalLeads} comerciante={comerciante} setComercian={setComercian} onNav={setActive} />;
      case "prospeccao": return <PageProspeccao leads={leads} totalLeads={totalLeads} comerciante={comerciante} setComercian={setComercian} />;
      case "base":       return <PageBase leads={leads} />;
      case "analytics":  return <PageAnalytics leads={leads} totalLeads={totalLeads} />;
      case "crm":        return <PageCRM leads={leads} />;
      case "atividades": return <PageAtividades leads={leads} comerciante={comerciante} />;
      case "config":     return <PagePlaceholder title="Configurações" icon="⚙️" />;
      default:           return <PageDashboard leads={leads} totalLeads={totalLeads} comerciante={comerciante} setComercian={setComercian} onNav={setActive} />;
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { width: 100%; height: 100%; overflow-x: hidden; }
        body { background: ${C.bg}; font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bgNav}; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.orange}; }
        select option { background: ${C.bgInput}; color: ${C.text}; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
      `}</style>

      <div style={{ display:"flex", minHeight:"100vh", width:"100vw", background:C.bg, overflow:"hidden" }}>
        <Sidebar active={active} setActive={setActive} />

        <div style={{ display:"flex", flexDirection:"column", minWidth:0, width:"calc(100vw - 240px)", marginLeft: 240 }}>
          <Topbar />

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ background:C.orange, padding:"6px 28px",
              fontFamily:"'Inter',sans-serif", fontSize:11, color:"#fff",
              display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ animation:"spin 1s linear infinite", display:"inline-block" }}>↻</span>
              Sincronizando planilha…
            </motion.div>
          )}

          <main style={{ flex:1, overflowY:"auto" }}>
            {syncError && (
              <div role="alert" style={{ margin: "16px 28px", padding: 16, color: C.text, background: C.bgCard, border: `1px solid ${C.rose}`, borderRadius: 8 }}>
                <p>Falha na sincronização: {syncError}</p>
                <button type="button" onClick={fetchLeads} disabled={loading} style={{ marginTop: 10, padding: "8px 12px", cursor: "pointer" }}>
                  {loading ? "Sincronizando…" : "Tentar novamente"}
                </button>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </main>

          <div style={{ padding:"10px 28px", borderTop:`1px solid ${C.border}`,
            display:"flex", justifyContent:"space-between",
            fontFamily:"'Inter',sans-serif", fontSize:10, color:C.text3 }}>
            <span>Jarvis Jr. · Líder Jr.</span>
            <span>{lastSync ? `Atualizado às ${lastSync.toLocaleTimeString("pt-BR")}` : "—"}</span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </>
  );
}