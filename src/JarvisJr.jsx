import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, LabelList,
} from "recharts";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import liderLogo from "./lider_jr_logo.png";
import PageCRM from "./PageCRM";
import { C, useTheme } from './theme';
import AppShell from './AppShell';
import PageSettings from './PageSettings';
import { SquaresFour, MagnifyingGlass, Kanban, CalendarBlank, Pulse, Database, ChartBar, SlidersHorizontal, User, MapPin, Tag, Users, Funnel, ArrowRight, TrendUp, ClockCounterClockwise, Target, Phone, FileText, Handshake, CaretDown, DownloadSimple, WarningCircle } from '@phosphor-icons/react';
import './app-ui.css';

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

// One icon family across navigation, forms and data.
const Icon = {
 dashboard: <SquaresFour size={20}/>, prospeccao: <MagnifyingGlass size={20}/>, crm: <Kanban size={20}/>,
 reunioes: <CalendarBlank size={20}/>, atividades: <Pulse size={20}/>, base: <Database size={20}/>, analytics: <ChartBar size={20}/>,
 config: <SlidersHorizontal size={20}/>, usuarios: <User size={20}/>, location: <MapPin size={18}/>, tag: <Tag size={18}/>,
 users: <Users size={20}/>, filter: <Funnel size={18}/>, search: <MagnifyingGlass size={18}/>, arrow: <ArrowRight size={17}/>,
 trend: <TrendUp size={18}/>, history: <ClockCounterClockwise size={18}/>, target: <Target size={20}/>,
};
const ActIcon = { leads: <Users size={18}/>, contato: <Phone size={18}/>, diagnostico: <Pulse size={18}/>, proposta: <FileText size={18}/> };

const LiderLogo = () => (
  <img src={liderLogo} alt="Líder Jr." style={{ width: 140, height: "auto", display: "block" }} />
);

function Avatar({ name, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--button)", display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700,
      fontSize: size * 0.35, color: "var(--button-ink)", flexShrink: 0,
      fontFamily: "'Manrope', sans-serif",
    }}>{name ? initials(name) : "?"}</div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="panel" style={{ background: C.bgCard, border: `1px solid ${C.border2}`,
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

function hexToRgba(color, alpha) {
  return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`;
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
        <Tooltip content={<ChartTooltip />} cursor={{ fill:C.bgHover }} />
        <Bar dataKey="value" name="Leads" radius={[0,6,6,0]} barSize={18} animationDuration={650}>
          {data.map((_, i) => (
            <Cell key={i} fill={hexToRgba(colorHex, 0.95 - i * (0.55 / Math.max(1, data.length)))} />
          ))}
          <LabelList dataKey="value" position="right"
            style={{ fill:C.text2, fontSize:11, fontWeight:600, fontFamily:"'Manrope',sans-serif" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProfileGate({ onSelect }) {
  const perfis = ["Diretor", ...COMERCIANTES];

  return (
    <>
      
      <main className="profile-gate">
      <section className="profile-panel" aria-labelledby="profile-title">
        <div className="profile-brand"><LiderLogo /></div>
        <div className="profile-kicker">Jarvis Jr.</div>
        <h1 id="profile-title">Quem está entrando?</h1>
        <p>Escolha seu perfil para abrir o painel com o responsável certo.</p>

        <div className="profile-grid">
          {perfis.map((nome, index) => {
            const diretor = nome === "Diretor";
            return (
              <motion.button
                key={nome}
                type="button"
                className={`profile-option${diretor ? " profile-option-director" : ""}`}
                onClick={() => onSelect(nome)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.035 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}>
                <Avatar name={nome} size={38} />
                <span>
                  <strong>{nome}</strong>
                  <small>{diretor ? "Visão geral da operação" : "Área comercial"}</small>
                </span>
                <ArrowRight className="profile-arrow" size={20}/>
              </motion.button>
            );
          })}
        </div>
        <small className="profile-note">Você pode trocar o perfil depois pelo topo do painel.</small>
      </section>
      </main>
    </>
  );
}

// ── KPI CARD ──────────────────────────────────────────────────────────────────
function KpiCard({ icon, value, label, delta, deltaUp = true }) {
  return <div className="summary-metric"><div className="metric-label">{icon}<span>{label}</span></div><strong className="metric-value">{value}</strong>{delta && <span className={deltaUp ? 'metric-delta positive' : 'metric-delta negative'}>{delta}</span>}</div>;
}

// ── RESPONSÁVEL SELECTOR ──────────────────────────────────────────────────────
function ResponsavelSelect({ comerciante, setComercian, label = true }) {
  const inp = {
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontFamily: "'Manrope', sans-serif",
    fontSize: 13, padding: "10px 14px", outline: "none",
    width: "100%", boxSizing: "border-box", appearance: "none",
    cursor: "pointer",
  };

  return (
    <div>
      {label && (
        <label style={{ display: "flex", alignItems: "center", gap: 6,
          fontFamily: "'Manrope', sans-serif", fontSize: 12, color: C.text2, marginBottom: 6 }}>
          {Icon.users} Responsável
        </label>
      )}
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 10, top: "50%",
          transform: "translateY(-50%)", pointerEvents: "none" }}>
          <Avatar name={comerciante} size={24} />
        </div>
        <select
          aria-label="Responsável"
          value={comerciante}
          onChange={e => setComercian(e.target.value)}
          style={{ ...inp, paddingLeft: 42, paddingRight: 32 }}
        >
          <option value="" disabled>Selecione o responsável</option>
          {COMERCIANTES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ position: "absolute", right: 10, top: "50%",
          transform: "translateY(-50%)", color: C.text3, pointerEvents: "none" }}>
          <CaretDown size={14}/>
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════ DASHBOARD ═══════════════════════════════════════
function PageDashboard({ leads, totalLeads, comerciante, setComercian, onNav }) {
  const hoje = todayBR();

  const primContato = hasSim(leads, COL.PRIMEIRO_CONTATO);
  const propostas   = hasSim(leads, COL.PROPOSTA);
  const contratos   = hasSim(leads, COL.CONTRATO);
  const pipeline    = somaValor(leads);


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

  const [meta, setMeta] = useState(() => { try { return Math.max(1, Number(localStorage.getItem('jarvis_meta_mensal')) || 100); } catch { return 100; } });
  const [editMeta, setEditMeta] = useState(false);
  const [metaInput, setMetaInput] = useState(String(meta));
  function saveMeta() {
    const val = Math.max(1, Number(metaInput) || 1);
    setMeta(val); setMetaInput(String(val)); setEditMeta(false);
    try { localStorage.setItem('jarvis_meta_mensal', String(val)); } catch { /* Kept in this session. */ }
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
    <div className="page-shell dashboard-page">
      <div className="page-heading heading-with-action"><div><h1>Dashboard</h1><p>Resumo da operação comercial.</p></div><button className="button-primary" onClick={() => onNav('prospeccao')}><MagnifyingGlass size={19}/> Nova prospecção</button></div>
      <section className="commercial-summary" aria-label="Resumo comercial">
        <KpiCard icon={<Database size={22}/>} value={totalLeads.toLocaleString('pt-BR')} label="Leads na base" delta={fmtDelta(deltaBase)} deltaUp={deltaBase?.up ?? true}/>
        <KpiCard icon={<Phone size={22}/>} value={primContato} label="Primeiro contato" delta={fmtDelta(deltaContato)} deltaUp={deltaContato?.up ?? true}/>
        <KpiCard icon={<FileText size={22}/>} value={propostas} label="Propostas enviadas" delta={fmtDelta(deltaProposta)} deltaUp={deltaProposta?.up ?? true}/>
        <KpiCard icon={<Handshake size={22}/>} value={contratos} label="Contratos fechados" delta={fmtDelta(deltaContrato)} deltaUp={deltaContrato?.up ?? true}/>
        {pipeline > 0 && <div className="summary-pipeline">Valor em propostas <strong>{pipeline.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</strong></div>}
      </section>
      <div className="dashboard-layout">
        <div className="dashboard-primary">
          <ProspeccaoInline comerciante={comerciante} setComercian={setComercian} onNav={onNav}/>
          <section className="panel performance-panel">
            <div className="panel-heading"><ChartBar size={22}/><h2>Desempenho da prospecção</h2><span className="period-label">Últimos 14 dias com registros</span></div>
            {daily.length ? <ResponsiveContainer width="100%" height={224}>
              <AreaChart data={daily} margin={{top:16, right:8, bottom:0, left:-22}}>
                <defs><linearGradient id="activity-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.orange} stopOpacity={0.18}/><stop offset="100%" stopColor={C.orange} stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid stroke={C.border} vertical={false}/>
                <XAxis dataKey="date" tick={{fontSize:11, fill:C.text3}} tickLine={false} axisLine={false}/>
                <YAxis tick={{fontSize:11, fill:C.text3}} tickLine={false} axisLine={false} allowDecimals={false}/>
                <Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="qty" name="Leads" stroke={C.orange} strokeWidth={2.5} fill="url(#activity-fill)" isAnimationActive={false}/>
              </AreaChart>
            </ResponsiveContainer> : <div className="empty-state"><ChartBar size={32}/><strong>Nenhum registro no período</strong><p>O gráfico será atualizado quando houver dados na base.</p></div>}
          </section>
        </div>
        <div className="dashboard-secondary">
          <section className="panel today-panel"><div className="panel-heading"><ClockCounterClockwise size={22}/><h2>Atividades de hoje</h2></div>
            <div className="activity-summary">{[
              {icon:ActIcon.leads, n:leadsHoje, txt:'Leads prospectados'},
              {icon:ActIcon.contato, n:primContatoHoje, txt:'Primeiros contatos'},
              {icon:ActIcon.diagnostico, n:diagnosticoHoje, txt:'Diagnósticos'},
              {icon:ActIcon.proposta, n:propostasHoje, txt:'Propostas enviadas'},
            ].map(item => <div className="activity-summary-row" key={item.txt}><span className="activity-icon">{item.icon}</span><span>{item.txt}</span><strong>{item.n}</strong></div>)}</div>
            <button className="text-button" onClick={() => onNav('atividades')}>Ver todas as atividades <ArrowRight size={17}/></button>
          </section>
          <section className="panel goal-panel"><div className="panel-heading"><Target size={22}/><h2>Meta mensal</h2><button className="text-button" onClick={() => {setEditMeta(!editMeta);setMetaInput(String(meta));}}>{editMeta ? 'Cancelar' : 'Editar'}</button></div>
            {editMeta ? <form className="goal-form" onSubmit={e => {e.preventDefault();saveMeta();}}><label htmlFor="monthly-goal">Leads por mês</label><div><input id="monthly-goal" type="number" min="1" value={metaInput} onChange={e => setMetaInput(e.target.value)}/><button className="button-primary">Salvar</button></div></form> : <div className="goal-value"><strong>{pct}%</strong><span>{leadsDoMes} de {meta} leads</span></div>}
            <div className="goal-track" role="progressbar" aria-label="Meta mensal de leads" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}><span style={{width:`${pct}%`}}/></div>
            <p className="goal-caption">{pct >= 100 ? 'Meta do mês atingida.' : `Faltam ${Math.max(0, meta-leadsDoMes)} leads para a meta.`}</p>
          </section>
          <section className="panel team-panel"><div className="panel-heading"><Users size={22}/><h2>Equipe comercial</h2><span>{COMERCIANTES.length} pessoas</span></div><div className="team-avatars">{COMERCIANTES.map(nome => <span key={nome} title={nome}><Avatar name={nome} size={36}/><small>{nome}</small></span>)}</div></section>
        </div>
      </div>
    </div>
  );
}

// ── PROSPECÇÃO INLINE ─────────────────────────────────────────────────────────
function ProspeccaoInline({ comerciante, setComercian, onNav }) {
  const [cidade, setCidade]       = useState("");
  const [categoria, setCategoria] = useState("");
  const [limite, setLimite]       = useState(100);
  const [status, setStatus]       = useState(null);
  const [statusMsg, setStatusMsg] = useState("");

  async function handleDisparo() {
    if (!cidade.trim()) { setStatus("err"); setStatusMsg("Preencha a localização."); return; }
    if (!comerciante) { setStatus("err"); setStatusMsg("Selecione o responsável pela prospecção."); return; }
    setStatus("loading");
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidade, categoria, limite, comerciante }),
      });
      if (!response.ok) throw new Error("Falha na solicitação");
      setStatus("ok"); setStatusMsg("Prospecção iniciada com sucesso!");
    } catch {
      setStatus("err"); setStatusMsg("Não foi possível confirmar a prospecção. Tente novamente.");
    }
  }

  const inp = {
    background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.text, fontFamily: "'Manrope', sans-serif", fontSize: 13,
    padding: "10px 14px", outline: "none", width: "100%", boxSizing: "border-box",
    appearance: "none",
  };

  return (
    <div className="panel" style={{ background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 24, padding: "22px 24px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:20, color:C.text }}>
          Prospecção
        </h2>
        <button onClick={() => onNav("base")} style={{ display:"flex", alignItems:"center", gap:6, background:C.bgInput,
          border:`1px solid ${C.border}`, borderRadius:8, color:C.text2,
          fontFamily:"'Manrope',sans-serif", fontSize:12, padding:"7px 12px", cursor:"pointer" }}>
          {Icon.history} Ver base
        </button>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
        <div style={{ width:3, height:18, background:C.orange, borderRadius:99 }} />
        <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text3 }}>
          Defina a cidade, o segmento e o responsável pela busca.
        </span>
      </div>

      <div className="two-column" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        <div>
          <label style={{ display:"flex", alignItems:"center", gap:6,
            fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
            {Icon.location} Localização
          </label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
              color:C.text3, pointerEvents:"none" }}>{Icon.location}</span>
            <input aria-label="Localização" value={cidade} onChange={e=>setCidade(e.target.value)}
              placeholder="Ex: Campinas, SP"
              style={{ ...inp, paddingLeft:32 }} />
          </div>
        </div>
        <ResponsavelSelect comerciante={comerciante} setComercian={setComercian} />
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ display:"flex", alignItems:"center", gap:6,
          fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
          {Icon.tag} Segmento de mercado
        </label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
            color:C.text3, pointerEvents:"none" }}>{Icon.tag}</span>
          <input aria-label="Segmento de mercado" value={categoria} onChange={e=>setCategoria(e.target.value)}
            placeholder="Ex: Academias, Clínicas, Restaurantes…"
            style={{ ...inp, paddingLeft:32 }} />
        </div>
      </div>

      <div style={{ marginBottom:18 }}>
        <label style={{ display:"flex", alignItems:"center", gap:6,
          fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
          {Icon.users} Quantidade de leads
        </label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
            color:C.text3, pointerEvents:"none" }}>{Icon.users}</span>
          <input aria-label="Quantidade de leads" type="number" value={limite} min={1} max={5000}
            onChange={e=>setLimite(Number(e.target.value))}
            placeholder="Quantidade de leads"
            style={{ ...inp, paddingLeft:32 }} />
        </div>
      </div>

      <motion.button
        onClick={handleDisparo}
        disabled={status === "loading"}
        className="button-primary prospect-submit"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        style={{
        width:"100%", background:C.orange, color:"#fff", border:"none",
        borderRadius:10, fontFamily:"'Manrope',sans-serif", fontWeight:700,
        fontSize:15, padding:"13px", cursor:"pointer",
        display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        boxShadow:`0 4px 20px rgba(249,115,22,0.35)`,
        opacity: status==="loading" ? 0.7 : 1,
      }}>
        {Icon.search}
        {status==="loading" ? "Iniciando…" : "Iniciar prospecção"}
      </motion.button>
      <p style={{ textAlign:"center", fontFamily:"'Manrope',sans-serif", fontSize:11,
        color:C.text3, marginTop:8 }}>
        A prospecção será executada com base nos filtros selecionados.
      </p>

      <AnimatePresence>
        {status && status !== "loading" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role={status === "err" ? "alert" : "status"}
            style={{ marginTop:10, background: status==="err" ? "rgba(244,63,94,0.1)" : "rgba(34,197,94,0.1)",
            border:`1px solid ${status==="err" ? C.rose : C.green}`,
            borderRadius:8, padding:"10px 14px",
            fontFamily:"'Manrope',sans-serif", fontSize:12,
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
    if (!comerciante) { setStatus("err"); setStatusMsg("Selecione o responsável pela prospecção."); return; }
    setStatus("loading");
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cidade, categoria, limite, comerciante }),
      });
      if (!response.ok) throw new Error("Falha na solicitação");
      setStatus("ok"); setStatusMsg("Prospecção iniciada com sucesso!");
    } catch {
      setStatus("err"); setStatusMsg("Não foi possível confirmar a prospecção. Tente novamente.");
    }
  }

  const inp = {
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontFamily: "'Manrope', sans-serif",
    fontSize: 14, padding: "11px 14px", width: "100%",
    outline: "none", boxSizing: "border-box", appearance: "none",
  };

  return (
    <div className="page-shell" style={{ padding: "32px 28px" }}>
      <h1 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:28,
        color:C.text, marginBottom:4 }}>
        Prospecção
      </h1>
      <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:13, color:C.text2, marginBottom:24 }}>
        Defina a cidade, o segmento e o responsável pela busca.
      </p>

      <div className="content-with-sidebar" style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
        <div className="panel" style={{ background: C.bgCard, border:`1px solid ${C.border}`,
          borderRadius: 24, padding:"24px 26px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
            <div style={{ width:3, height:20, background:C.orange, borderRadius:99 }} />
            <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:13, color:C.text3 }}>
              Defina a cidade, o segmento e o responsável pela busca.
            </span>
          </div>

          <div className="two-column" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div>
              <label style={{ display:"flex", alignItems:"center", gap:6,
                fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
                {Icon.location} Localização
              </label>
              <select aria-label="Selecionar cidade" value={cidade} onChange={e=>setCidade(e.target.value)} style={inp}>
                <option value="">Selecione a cidade…</option>
                {[...new Set(leads.map(r=>r[COL.CIDADE]).filter(Boolean))].sort()
                  .map(c=><option key={c}>{c}</option>)}
              </select>
              <input aria-label="Localização" value={cidade} onChange={e=>setCidade(e.target.value)}
                placeholder="Ou digite: Ex. Campinas, SP"
                style={{ ...inp, marginTop:6, fontSize:13 }} />
            </div>
            <ResponsavelSelect comerciante={comerciante} setComercian={setComercian} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"flex", alignItems:"center", gap:6,
              fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
              {Icon.tag} Segmento de mercado
            </label>
            <input aria-label="Segmento de mercado" value={categoria} onChange={e=>setCategoria(e.target.value)}
              placeholder="Ex: Academias, Clínicas, Restaurantes…" style={inp} />
          </div>


          <div style={{ marginBottom:20 }}>
            <label style={{ display:"flex", alignItems:"center", gap:6,
              fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2, marginBottom:6 }}>
              {Icon.users} Quantidade de leads
            </label>
            <input aria-label="Quantidade de leads" type="number" value={limite} min={1} max={5000}
              onChange={e=>setLimite(Number(e.target.value))} style={inp} />
          </div>

          <motion.button
            onClick={handleDisparo}
        disabled={status === "loading"}
        className="button-primary prospect-submit"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            style={{
            width:"100%", background:C.orange, color:"#fff", border:"none",
            borderRadius:10, fontFamily:"'Manrope',sans-serif", fontWeight:700,
            fontSize:15, padding:"14px", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            boxShadow:`0 4px 20px rgba(249,115,22,0.35)`,
            opacity: status==="loading" ? 0.7 : 1,
          }}>
            {Icon.search}
            {status==="loading" ? "Iniciando…" : "Iniciar prospecção"}
          </motion.button>
          <p style={{ textAlign:"center", fontFamily:"'Manrope',sans-serif", fontSize:11,
            color:C.text3, marginTop:8 }}>
            A prospecção será executada com base nos filtros selecionados.
          </p>

          <AnimatePresence>
            {status && status !== "loading" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                role={status === "err" ? "alert" : "status"}
                style={{ marginTop:12, background: status==="err" ? "rgba(244,63,94,0.1)" : "rgba(34,197,94,0.1)",
                border:`1px solid ${status==="err" ? C.rose : C.green}`,
                borderRadius:8, padding:"10px 14px",
                fontFamily:"'Manrope',sans-serif", fontSize:12,
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
              borderRadius: 24, padding:"16px 20px", borderLeft:`3px solid ${k.color}` }}>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2, marginBottom:4 }}>{k.label}</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:28, color:C.text }}>
                {k.value.toLocaleString("pt-BR")}
              </div>
            </motion.div>
          ))}
          <div className="panel" style={{ background: C.bgCard, border:`1px solid ${C.border}`,
            borderRadius: 24, padding:"16px 20px" }}>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2, marginBottom:8 }}>Top segmentos</div>
            {valueCounts(leads, COL.CATEGORIA, 3).map((c,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"5px 0",
                borderBottom: i<2 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2 }}>{c.name}</span>
                <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, fontWeight:600, color:C.orange }}>{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════ BASE DE LEADS ═══════════════════════════════════
function PageBase({ leads, initialSearch = "" }) {
  const [busca, setBusca] = useState(initialSearch);

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
    a.download = "leads.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  return (
    <div className="page-shell" style={{ padding:"32px 28px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:28, color:C.text, marginBottom:4 }}>
            Base de <span style={{color:C.orange}}>Leads</span>
          </h1>
          <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:13, color:C.text2 }}>
            {leads.length.toLocaleString("pt-BR")} registros na base
          </p>
        </div>
        <button onClick={downloadCSV} style={{
          background:"transparent", border:`1px solid ${C.border}`, borderRadius:8,
          color:C.text2, fontFamily:"'Manrope',sans-serif", fontSize:13,
          padding:"9px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:6,
        }}><DownloadSimple size={18}/> Exportar CSV</button>
      </div>

      <div style={{ position:"relative", marginBottom:16 }}>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.text3 }}>
          {Icon.search}
        </span>
        <input aria-label="Pesquisar leads" value={busca} onChange={e=>setBusca(e.target.value)}
          placeholder="Pesquisar empresa, telefone, cidade…"
          style={{ background:C.bgInput, border:`1px solid ${C.border}`, borderRadius:8,
            color:C.text, fontFamily:"'Manrope',sans-serif", fontSize:14,
            padding:"10px 14px 10px 38px", outline:"none", width:"100%", boxSizing:"border-box" }} />
      </div>

      <div className="lead-table-wrapper" style={{ overflowX:"auto", border:`1px solid ${C.border}`, borderRadius: 24, maxHeight:520 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth:900 }}>
          <thead>
            <tr style={{ background:C.bgCard }}>
              {cols.map(c=>(
                <th key={c} style={{ padding:"12px 16px", textAlign:"left",
                  fontFamily:"'Manrope',sans-serif", fontSize:11, fontWeight:600,
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
                    fontFamily:"'Manrope',sans-serif", fontSize:12,
                    color: cellColor(c, r[c]),
                    maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r[c] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-count" role="status">{filtered.length.toLocaleString('pt-BR')} {filtered.length === 1 ? 'registro encontrado' : 'registros encontrados'}</p>
      {!filtered.length && <div className="empty-state"><MagnifyingGlass size={28}/><strong>{busca ? 'Nenhum lead encontrado' : 'Sua base está vazia'}</strong><p>{busca ? 'Tente buscar por outro nome, cidade ou telefone.' : 'Os leads aparecerão aqui após a sincronização.'}</p></div>}
    </div>
  );
}

// ═══════════════════════════ ANALYTICS ═══════════════════════════════════════
function PageAnalytics({ leads }) {
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
  const motivos     = valueCounts(leads, COL.MOTIVO, 5).filter(m => m.name && m.name !== "-");

  function botColor(name) {
    const n = (name || "").toLowerCase();
    if (n.includes("✅") || n.includes("sim")) return C.green;
    if (n.includes("❌") || n.includes("não") || n.includes("nao")) return C.rose;
    return C.text3;
  }

  return (
    <div className="page-shell" style={{ padding:"32px 28px" }}>
      <h1 style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:28,
        color:C.text, marginBottom:4 }}>
        <span style={{ color:C.orange }}>Analytics</span>
      </h1>
      <p style={{ fontFamily:"'Manrope',sans-serif", fontSize:13, color:C.text2, marginBottom:24 }}>
        Visão consolidada da operação comercial.
      </p>

      {/* KPIs */}
      <div className="metric-strip" style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:20 }}>
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
            borderRadius: 24, padding:"18px 20px", borderTop:`3px solid ${k.color}` }}>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:11, color:C.text3,
              textTransform:"uppercase", letterSpacing:".6px", marginBottom:8 }}>{k.label}</div>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:30,
              color:C.text, lineHeight:1 }}>{k.value}</div>
            {k.sub && <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:11,
              color:C.green, marginTop:6 }}>{k.sub}</div>}
          </motion.div>
        ))}
      </div>

      {/* FUNIL - hero */}
      <div className="funnel-panel" style={{ background:C.bgCard, border:`1px solid ${C.border}`, borderRadius: 24,
        padding:"22px 24px", marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
          marginBottom:6, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:600, fontSize:15, color:C.text }}>
              Funil de Conversão
            </div>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text3, marginTop:2 }}>
              Taxa global (bot → contrato): <span style={{ color:C.green, fontWeight:600 }}>{taxaGlobal}%</span>
            </div>
          </div>
          {pipeline > 0 && (
            <div style={{ background:"rgba(34,197,94,0.1)", border:`1px solid ${C.green}`,
              borderRadius:8, padding:"8px 14px", textAlign:"right" }}>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontSize:10, color:C.text2 }}>Pipeline total</div>
              <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:700, fontSize:16, color:C.green }}>
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
            <Tooltip content={<ChartTooltip />} cursor={{ fill:C.bgHover }} />
            <Bar dataKey="value" name="Leads" radius={[0,8,8,0]} barSize={28} animationDuration={750}>
              {funnelData.map((d,i) => <Cell key={i} fill={d.fill} />)}
              <LabelList dataKey="label" position="right"
                style={{ fill:C.text, fontSize:12, fontWeight:600, fontFamily:"'Manrope',sans-serif" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GEO + CATEGORIA */}
      <div className="two-column" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div className="panel" style={{ background: C.bgCard, border:`1px solid ${C.border}`, borderRadius: 24, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:600, fontSize:14,
            color:C.text, marginBottom:16 }}>Top Localidades</div>
          <RankedBarChart data={topCidades} colorHex={C.orange} height={280} />
        </div>
        <div className="panel" style={{ background: C.bgCard, border:`1px solid ${C.border}`, borderRadius: 24, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:600, fontSize:14,
            color:C.text, marginBottom:16 }}>Top Categorias</div>
          <RankedBarChart data={topNichos} colorHex={C.cyan} height={280} />
        </div>
      </div>

      {/* BOT + EQUIPE */}
      <div className="two-column" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div className="panel" style={{ background: C.bgCard, border:`1px solid ${C.border}`, borderRadius: 24, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:600, fontSize:14,
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
                <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:11, color:C.text2 }}>
                  {s.name} ({s.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ background: C.bgCard, border:`1px solid ${C.border}`, borderRadius: 24, padding:"20px 22px" }}>
          <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:600, fontSize:14,
            color:C.text, marginBottom:16 }}>Performance por Comerciante</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCom} margin={{ top:16, right:0, bottom:0, left:0 }}>
              <XAxis dataKey="name" tick={{ fontSize:11, fill:C.text2 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} cursor={{ fill:C.bgHover }} />
              <Bar dataKey="value" name="Leads" radius={[6,6,0,0]} barSize={36} animationDuration={700}>
                {topCom.map((d,i)=><Cell key={i} fill={COM_COLORS[d.name] || C.text3} />)}
                <LabelList dataKey="value" position="top"
                  style={{ fill:C.text2, fontSize:11, fontFamily:"'Manrope',sans-serif" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SERVIÇOS + MOTIVOS */}
      <div className="two-column" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {topServicos.length > 0 && (
          <div className="panel" style={{ background: C.bgCard, border:`1px solid ${C.border}`, borderRadius: 24, padding:"20px 22px" }}>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:600, fontSize:14,
              color:C.text, marginBottom:16 }}>Serviços ofertados</div>
            {topServicos.map((s,i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2 }}>{s.name}</span>
                  <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, fontWeight:600, color:C.orange }}>{s.value}</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:C.bgHover }}>
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
          <div className="panel" style={{ background: C.bgCard, border:`1px solid ${C.border}`, borderRadius: 24, padding:"20px 22px" }}>
            <div style={{ fontFamily:"'Manrope',sans-serif", fontWeight:600, fontSize:14,
              color:C.text, marginBottom:16 }}>Principais motivos de perda</div>
            {motivos.map((m,i)=>(
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, color:C.text2 }}>{m.name}</span>
                  <span style={{ fontFamily:"'Manrope',sans-serif", fontSize:12, fontWeight:600, color:C.rose }}>{m.value}×</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:C.bgHover }}>
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
function PageAtividades({ leads }) {
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
    <div className="page-shell" style={{ padding: "32px 28px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 28, color: C.text, marginBottom: 4 }}>
            Atividades de <span style={{ color: C.orange }}>hoje</span>
          </h1>
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.text2 }}>
            {hoje_fmt} · {totalHoje} registro{totalHoje !== 1 ? "s" : ""} no dia
          </p>
        </div>
        <div style={{ background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "8px 14px", fontSize: 12, color: C.text2, fontFamily: "'Manrope',sans-serif",
          display: "flex", alignItems: "center", gap: 6 }}>
          {Icon.reunioes} Hoje
        </div>
      </div>

      {/* KPIs */}
      <div className="metric-strip" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Leads hoje",    value: totalHoje,     color: C.orange,  sub: deltaHoje !== 0 ? `${deltaHoje > 0 ? "↑" : "↓"} ${Math.abs(deltaHoje)} vs ontem` : "= igual ontem", subColor: deltaHoje >= 0 ? C.green : C.rose },
          { label: "1º Contato",   value: contatosHoje,  color: C.cyan,    sub: totalHoje > 0 ? `${Math.round((contatosHoje / totalHoje) * 100)}% dos leads` : "-", subColor: C.text3 },
          { label: "Diagnósticos", value: diagHoje,      color: C.amber,   sub: contatosHoje > 0 ? `${Math.round((diagHoje / contatosHoje) * 100)}% dos contatos` : "-", subColor: C.text3 },
          { label: "Propostas",    value: propostasHoje, color: "#8B5CF6", sub: "enviadas hoje", subColor: C.text3 },
          { label: "Contratos",    value: contratosHoje, color: C.green,   sub: contratosHoje > 0 ? "Fechado!" : "-", subColor: C.green },
        ].map((k, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            style={{ background: C.bgCard, border: `1px solid ${C.border}`,
            borderRadius: 24, padding: "18px 20px", borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: C.text3,
              textTransform: "uppercase", letterSpacing: ".8px", marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 32,
              color: C.text, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11, color: k.subColor, marginTop: 6 }}>{k.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="content-with-sidebar" style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap: 20 }}>

        {/* TIMELINE */}
        <div className="panel" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24, padding: "22px 24px" }}>
          <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 15,
            color: C.text, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            {Icon.atividades}
            <span style={{ color: C.orange }}>Linha do tempo</span>
            <span style={{ color: C.text2 }}>- leads de hoje</span>
          </div>

          {leadsHoje.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.text3,
              fontFamily: "'Manrope',sans-serif", fontSize: 13 }}>
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
                          <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                            fontSize: 13, color: C.text }}>
                            {r[COL.EMPRESA] || "-"}
                          </span>
                          <span style={{ background: badge.bg, color: badge.color,
                            border: `1px solid ${badge.border}`, fontSize: 10, fontWeight: 600,
                            padding: "2px 8px", borderRadius: 20, fontFamily: "'Manrope',sans-serif" }}>
                            {badge.label}
                          </span>
                        </div>
                        <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11,
                          color: C.text3, flexShrink: 0, marginLeft: 8 }}>
                          {r[COL.DATA] || "-"}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap",
                        fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.text2 }}>
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
                          padding: "4px 10px", fontFamily: "'Manrope',sans-serif",
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
                    whileHover={{ backgroundColor: C.bgHover }}
                    style={{
                    flex: 1, background: C.bgHover,
                    border: `1px dashed ${C.border}`, borderRadius: 8,
                    padding: "8px 12px", color: C.text3, cursor: "pointer",
                    fontFamily: "'Manrope',sans-serif", fontSize: 12, textAlign: "left",
                  }}>
                    + {extras} outro{extras !== 1 ? "s" : ""} lead{extras !== 1 ? "s" : ""} - clique para ver todos
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>

        {/* PAINEL DIREITO */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Equipe hoje */}
          <div className="panel" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24, padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13,
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
                      <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12,
                        color: C.text, fontWeight: 500, marginBottom: 3 }}>{p.name}</div>
                      <div style={{ height: 4, borderRadius: 99, background: C.bgHover }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                          style={{ height: "100%", borderRadius: 99, background: cor }} />
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12,
                      fontWeight: 600, color: cor, minWidth: 18, textAlign: "right" }}>
                      {p.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Funil do dia */}
          <div className="panel" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24, padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13,
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
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11,
                    color: C.text2, width: 90, flexShrink: 0 }}>{f.label}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 99, background: C.bgHover }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: totalHoje > 0 ? `${Math.round((f.value / totalHoje) * 100)}%` : "0%" }}
                      transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                      style={{ height: "100%", borderRadius: 99, background: f.color }} />
                  </div>
                  <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 11,
                    fontWeight: 600, color: f.color, minWidth: 20, textAlign: "right" }}>
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top categorias */}
          {topCatHoje.length > 0 && (
            <div className="panel" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24, padding: "18px 20px" }}>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13,
                color: C.text, marginBottom: 12 }}>Top categorias hoje</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {topCatHoje.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: i < topCatHoje.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.text2 }}>{c.name}</span>
                    <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12,
                      fontWeight: 600, color: C.orange }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {leadsHoje.length === 0 && (
            <div className="panel" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24,
              padding: "24px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: C.text3, marginBottom: 8 }}>
                Nenhuma atividade hoje ainda
              </div>
              <div style={{ fontFamily: "'Manrope',sans-serif", fontSize: 12, color: C.text3 }}>
                Inicie uma prospecção para começar o dia!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════ APP ROOT ════════════════════════════════════════
export default function App() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [globalSearch, setGlobalSearch] = useState("");
  const [allLeads, setAllLeads]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [lastSync, setLastSync]     = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [active, setActive]         = useState("dashboard");
  const [comerciante, setComercian] = useState(() => { const name = sessionStorage.getItem("jarvis_usuario"); return COMERCIANTES.includes(name) ? name : ""; });
  const [usuario, setUsuario] = useState(() => sessionStorage.getItem("jarvis_usuario") || "");

  function selectUser(nome) {
    setUsuario(nome);
    sessionStorage.setItem("jarvis_usuario", nome);
    setComercian(nome !== "Diretor" ? nome : "");
    setActive("dashboard");
  }

  function changeUser() {
    sessionStorage.removeItem("jarvis_usuario");
    setUsuario("");
  }

  const fetchLeads = useCallback(async () => {
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

  // Initial synchronization with the external sheet; subsequent refreshes are user actions.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const leads      = allLeads;
  const totalLeads = leads.length;

  function renderPage() {
    switch(active) {
      case "dashboard":  return <PageDashboard leads={leads} totalLeads={totalLeads} comerciante={comerciante} setComercian={setComercian} onNav={setActive} usuario={usuario} />;
      case "prospeccao": return <PageProspeccao leads={leads} totalLeads={totalLeads} comerciante={comerciante} setComercian={setComercian} />;
      case "base":       return <PageBase key={globalSearch} leads={leads} initialSearch={globalSearch} />;
      case "settings": return <PageSettings theme={theme} setTheme={setTheme} resolvedTheme={resolvedTheme} usuario={usuario} onChangeUser={changeUser}/>;
      case "analytics":  return <PageAnalytics leads={leads} totalLeads={totalLeads} />;
      case "crm":        return <PageCRM leads={leads} />;
      case "atividades": return <PageAtividades leads={leads} comerciante={comerciante} />;
      default:           return <PageDashboard leads={leads} totalLeads={totalLeads} comerciante={comerciante} setComercian={setComercian} onNav={setActive} usuario={usuario} />;
    }
  }

  if (!usuario) return <MotionConfig reducedMotion="user"><ProfileGate onSelect={selectUser}/></MotionConfig>;
  return <MotionConfig reducedMotion="user">
    <AppShell active={active} onNav={setActive} usuario={usuario} onChangeUser={changeUser} onSearch={query => {setGlobalSearch(query);setActive('base');}} loading={loading} lastSync={lastSync} onRefresh={() => { setLoading(true); fetchLeads(); }}>
      {syncError && <div className="sync-alert" role="alert"><WarningCircle size={22}/><div><strong>Não foi possível sincronizar os dados</strong><p>{syncError}</p></div><button className="button-secondary" onClick={() => { setLoading(true); fetchLeads(); }} disabled={loading}>{loading ? 'Sincronizando…' : 'Tentar novamente'}</button></div>}
      <AnimatePresence mode="wait"><motion.div key={active} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.12}}>{renderPage()}</motion.div></AnimatePresence>
    </AppShell>
  </MotionConfig>;
}
