// ═══════════════════════════════════════════════════════════════════════════
// PAGE CRM — Kanban com escrita direta na Google Sheets API v4
// ═══════════════════════════════════════════════════════════════════════════
//
// SETUP (fazer uma vez no Google Cloud):
// 1. Acesse console.cloud.google.com → crie um projeto
// 2. Ative "Google Sheets API"
// 3. Crie uma Service Account → gere uma chave JSON
// 4. Compartilhe a planilha com o e-mail da Service Account (editor)
// 5. Cole as credenciais em SHEETS_CONFIG abaixo
//
// A Service Account key JSON contém: client_email + private_key
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useMemo } from "react";
import { C } from './theme';
import { WhatsappLogo, MagnifyingGlass, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from "motion/react";

// ── CONFIGURAÇÃO ─────────────────────────────────────────────────────────────
const SHEETS_CONFIG = {
  spreadsheetId: "1wP2svngeeWtthMMoCJcE5Vv2i1lMGTp_5ONeWbVT-qA",
  sheetName: "Ativa [Bot]", // nome da aba na planilha
  clientEmail: "n8n-sheets@spheric-terrain-499613-c4.iam.gserviceaccount.com",
  privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQClw3hZhWdrSxD3\n8dk+Bne8ekwZdfFZLIc8mdEDGDizkvcVg6uXPeBAYOAib3slu1OML/3fJC3kVP/o\naS0NNmtUftZrTzHGl9lJ1S7EZFeepL+/nQvmUsiwsd8iz21wvr/f8Z5JetG7Nv8i\nOKPVUJHj9UVWQYk3yZDgPPB/Dbwhd5dRaikle1STABNzOExUu9CUPyKZHAx8uKAw\nxP42kd0J+oiGDFavuOV9sGQfzH+nngIzx3w7mrOHdHw9iiOBpqX+fGhii+PjJb2E\nVcVnA93ozr3DJtMXDiWbJs+MoBLseUcTuzSqWX1fOperfOooOQo+l/RLpAEnLn/V\nfgccAhsjAgMBAAECggEAJ5GNfPEXSslUd5tHnEK2+krHN5yry/mRHqoo9nAluNfw\nGzafEy82BKgbWJz77HnW67PZChb8zXBs1fGlS24eGMFeNadl3l4JBFLbIw5AzCHP\nk9HNMWG5flQ3S3vwR+WAr9hhTHEA94udQ3H5ycW9zYiS0JA8TRDUgHKLhgilS+d5\nz1GeH03/sy8/EZHsnHJtiAtfHLLOogIITiw6x+VWCF8LmpngSwalTRS+zjTkoELS\nliQbgz5azAnnuGxQbvo8RTN/9ZGBYa9jNbXrc4Orp0ppXlDNc+8o61IrAV57DR9j\nlBVOGZYQmLb9DlK/XGucYck5K3VcY8iu+MwScYMPoQKBgQDWNppMxVL01tLqPD3L\nMExS07UaQs9Ma3hd6nLIcyUZYiEanx2zCjnbpucYAppEKlul+vYYkItjaFqAfw83\na7ZS05Vf8hhrV7gKXB5MXLemgTTEVZtCYzd13HB2xOQ9R3mjlgXNqLN37iv6Nv2B\nXPTf9CMrRGu8XW94G8OFYc4h5QKBgQDGGWGb0gzEhMCILbuhcGFzgB2FB8lCYLRG\ndeYw+6ZmWjNNJZ19zEOIgGpz7b7JUH794izOC6SV7J+EtMrD13MefAG4XlxyiTC+\nylVuzjkd5MkoWScX7GIHez3ecyPFvr+cXWyUQUT6qUp6i5tlqmyJ5ljaO2mgFL3f\nUI5FSQEYZwKBgQCxDKpVn5YkJVZoIWhVg1Lh9ncuAGBD4mO3A+rhAEJ+i1ufHDo4\n28/cW0OP1b7ZbkUXl6hFv1plzD9ZCytxfAZSyOwiQ/+o4PSNI3wrU0q7RPlu+O59\nXXHeaVdO4wdeGrBP49RiGfhTvLf+c+rtO/5tB+T1gvSk2HkkRZZBrQfpfQKBgQCo\ncwy9I3AX64qMQdc7AATd4iM369cHypOBFuAW5uYoQqs8/q9dOURz3j6nNZL2PKy/\n1oOi8eOSWROMFPAWeC47zdbon9Sc0GvS0Nq0zkdjVBh5ZtYHUcpJ8lI5xk605+6n\nWAnsR1QQkcPzUKNjX/fLi0QizkKTDRAnxKg14k48IQKBgHrNnneBEIZvceE9MBtV\nvOScBjLIGT2oWvQZ7Uu8rK3z8x2to46Yb3AKPZ+W0ICdV3wHKcY8V9GUhJ2XZPy+\nlJpPKw2DueFh/XbCpVsHO/UMeQNb6eThn/QPWaQ2binPJIRydykwkEGVuOoXXCxU\nkyWWz/gXAB6KoPkaifEVjT2x\n-----END PRIVATE KEY-----\n",
};

// Mapeamento coluna → índice (0-based) na planilha
// Ajuste conforme a ordem real das colunas da sua sheet
const COL_INDEX = {
  DATA:             0,
  MES:              1,
  BOT:              2,
  EMPRESA:          3,
  SERVICO:          4,
  CATEGORIA:        5,
  TELEFONE:         6,
  CIDADE:           7,
  COMERCIANTE:      8,
  PRIMEIRO_CONTATO: 9,
  DIAGNOSTICO:      10,
  PROPOSTA:         11,
  CONTRATO:         12,
  VALOR:            13,
  MOTIVO:           14,
  ESTAGIO_CRM:      15, // coluna nova que você adiciona na planilha
  NOTAS_CRM:        16, // coluna nova que você adiciona na planilha
};

// Comerciantes ativos
const COMERCIANTES = ["Amanda", "Caique", "Laísa", "Pedro", "Gustavo", "Enzo"];

// Estágios do funil CRM
const ESTAGIOS = [
  { id: "novo",       label: "Novos",          color: C.text2, desc: "Lead recém-chegado" },
  { id: "contato",    label: "Em Contato",      color: C.amber, desc: "Primeiro contato feito" },
  { id: "diagnostico",label: "Diagnóstico",     color: C.cyan, desc: "Reunião de diagnóstico" },
  { id: "proposta",   label: "Proposta Enviada",color: C.orange, desc: "Aguardando resposta" },
  { id: "negociacao", label: "Negociação",      color: C.orange, desc: "Em negociação ativa" },
  { id: "fechado",    label: "Fechados",        color: C.green, desc: "Contrato assinado" },
  { id: "perdido",    label: "Perdidos",        color: C.rose, desc: "Lead não convertido" },
];

// Cores (herda do App.jsx — copie o objeto C ou importe)


// ── JWT / OAUTH2 para Service Account ────────────────────────────────────────
// Gera um access token usando a Service Account key sem backend
async function getAccessToken() {
  const { clientEmail, privateKey } = SHEETS_CONFIG;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  function b64url(obj) {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  const signingInput = `${b64url(header)}.${b64url(payload)}`;

  // Importa a chave privada RSA para Web Crypto API
  const keyPem = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyDer = Uint8Array.from(atob(keyPem), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sig64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const jwt = `${signingInput}.${sig64}`;

  // Troca o JWT por um access token
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Falha ao obter token: " + JSON.stringify(data));
  return data.access_token;
}

// ── ESCRITA NA SHEETS ─────────────────────────────────────────────────────────
// Atualiza uma célula específica dado o índice da linha (1-based, já inclui header)
async function updateCell(rowIndex, colIndex, value, token) {
  const col = String.fromCharCode(65 + colIndex); // 0→A, 1→B, etc.
  const range = `${SHEETS_CONFIG.sheetName}!${col}${rowIndex}`;

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ range, majorDimension: "ROWS", values: [[value]] }),
    }
  );
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
}

// Atualiza múltiplas células de uma vez (batchUpdate)
async function batchUpdateCells(updates, token) {
  // updates: [{ rowIndex, colIndex, value }]
  const data = updates.map(({ rowIndex, colIndex, value }) => {
    const col = String.fromCharCode(65 + colIndex);
    const range = `${SHEETS_CONFIG.sheetName}!${col}${rowIndex}`;
    return { range, majorDimension: "ROWS", values: [[value]] };
  });

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEETS_CONFIG.spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ valueInputOption: "USER_ENTERED", data }),
    }
  );
  if (!res.ok) throw new Error(`Sheets batchUpdate error: ${res.status}`);
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function fmtWA(tel) {
  if (!tel) return null;
  let num = tel.replace(/\D/g, "");
  if (!num.startsWith("55")) num = "55" + num;
  return `https://wa.me/${num}`;
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
}

function inferEstagio(lead) {
  // Se já tem estágio salvo na planilha, usa ele
  if (lead["ESTAGIO_CRM"]) return lead["ESTAGIO_CRM"];
  // Senão, infere pelo funil atual
  if ((lead["CONTRATO"] || "").toLowerCase() === "sim") return "fechado";
  if ((lead["PROPOSTA"] || "").toLowerCase() === "sim") return "proposta";
  if ((lead["DIAGNÓSTICO"] || "").toLowerCase() === "sim") return "diagnostico";
  if ((lead["PRIMEIRO CONTATO"] || "").toLowerCase() === "sim") return "contato";
  if ((lead["BOT CHAMOU?"] || "").includes("✅")) return "contato";
  return "novo";
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }) {
  const colors = ["#F97316", "#06B6D4", "#22C55E", "#8B5CF6", "#F59E0B", "#F43F5E"];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: colors[idx], display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700,
      fontSize: size * 0.38, color: "var(--button-ink)", flexShrink: 0,
      fontFamily: "'Manrope', sans-serif",
    }}>{initials(name)}</div>
  );
}

// ── LEAD CARD ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, estagio, onOpen, onDragStart, index = 0 }) {
  const estObj = ESTAGIOS.find(e => e.id === estagio);
  const valor = lead["VALOR"];
  const tel = lead["TEL PARA CONTATO"];
  const [dragging, setDragging] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 10) * 0.03 }}
      whileHover={{ y: -2, borderColor: estObj?.color || C.border }}
      draggable
      className="lead-card"
      role="button"
      tabIndex={0}
      aria-label={`Abrir lead ${lead["NOME DA EMPRESA"] || "sem nome"}`}
      onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {e.preventDefault();onOpen(lead);} }}
      onDragStart={e => { setDragging(true); onDragStart(e, lead); }}
      onDragEnd={() => setDragging(false)}
      onClick={() => onOpen(lead)}
      style={{
        background: C.bgCard,
        border: `1px solid ${dragging ? estObj?.color || C.border : C.border}`,
        borderLeft: `3px solid ${estObj?.color || C.orange}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: "grab",
        opacity: dragging ? 0.5 : 1,
        userSelect: "none",
        marginBottom: 8,
      }}
    >
      {/* Empresa */}
      <div style={{
        fontFamily: "'Manrope', sans-serif", fontWeight: 600,
        fontSize: 13, color: C.text, marginBottom: 6,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {lead["NOME DA EMPRESA"] || "Sem nome"}
      </div>

      {/* Categoria + Cidade */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {lead["CATEGORIA"] && (
          <span style={{
            background: C.orangeDim, color: C.orange,
            borderRadius: 4, padding: "2px 6px",
            fontFamily: "'Manrope', sans-serif", fontSize: 10, fontWeight: 600,
          }}>{lead["CATEGORIA"]}</span>
        )}
        {lead["LOCALIZAÇÃO"] && (
          <span style={{
            background: C.bgHover, color: C.text3,
            borderRadius: 4, padding: "2px 6px",
            fontFamily: "'Manrope', sans-serif", fontSize: 10,
          }}>{lead["LOCALIZAÇÃO"]}</span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar name={lead["COMERCIANTE"]} size={22} />
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.text3 }}>
            {lead["COMERCIANTE"] || "-"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {valor && (
            <span style={{
              fontFamily: "'Manrope', sans-serif", fontSize: 11,
              fontWeight: 600, color: C.green,
            }}>R$ {valor}</span>
          )}
          {tel && (
            <a
              href={fmtWA(tel)}
              target="_blank"
              rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 24, height: 24, borderRadius: 6,
                background: "rgba(34,197,94,0.12)", color: C.green,
                textDecoration: "none", fontSize: 12,
              }}
              title="WhatsApp"
            >
              <WhatsappLogo size={17}/>
            </a>
          )}
        </div>
      </div>

      {/* Nota preview */}
      {lead["NOTAS_CRM"] && (
        <div style={{
          marginTop: 8, padding: "6px 8px",
          background: C.bgHover,
          borderRadius: 6, borderLeft: `2px solid ${C.amber}`,
          fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.text3,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          📝 {lead["NOTAS_CRM"]}
        </div>
      )}
    </motion.div>
  );
}

// ── COLUNA DO KANBAN ──────────────────────────────────────────────────────────
function KanbanColumn({ estagio, leads, onOpen, onDragStart, onDrop, isDragOver, onDragOver, onDragLeave }) {
  const total = leads.length;
  const valorTotal = leads.reduce((acc, r) => {
    const raw = (r["VALOR"] || "").replace(/[^\d,]/g, "").replace(",", ".");
    return acc + (parseFloat(raw) || 0);
  }, 0);

  return (
    <motion.div
      className="kanban-column"
      onDragOver={e => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(estagio.id); }}
      animate={{
        backgroundColor: isDragOver ? C.bgHover : C.bgInput,
        scale: isDragOver ? 1.015 : 1,
      }}
      transition={{ duration: 0.15 }}
      style={{
        minWidth: 258, width: 258, flexShrink: 0,
        padding: 12, background: C.bgInput,
        display: "flex", flexDirection: "column",
        borderRadius: 22,
        border: isDragOver ? `1px dashed ${estagio.color}` : "1px solid transparent",
      }}
    >
      {/* Header da coluna */}
      <div style={{ padding: "0 4px 12px", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: estagio.color }} />
            <span style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 600,
              fontSize: 12, color: C.text,
            }}>{estagio.label}</span>
          </div>
          <span style={{
            background: C.bgHover, borderRadius: 99,
            padding: "2px 8px", fontFamily: "'Manrope', sans-serif",
            fontSize: 11, fontWeight: 600, color: C.text2,
          }}>{total}</span>
        </div>
        {valorTotal > 0 && (
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.green, paddingLeft: 16 }}>
            R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "4px 4px",
        maxHeight: "none", minHeight: 0,
      }}>
        <AnimatePresence>
          {leads.map((lead, i) => (
            <LeadCard
              key={lead._rowIndex ?? i}
              lead={lead}
              estagio={estagio.id}
              onOpen={onOpen}
              onDragStart={onDragStart}
              index={i}
            />
          ))}
        </AnimatePresence>
        {leads.length === 0 && (
          <div style={{
            border: `1px dashed ${C.border2}`, borderRadius: 10,
            padding: "20px 14px", textAlign: "center",
            fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.text3,
          }}>
            Arraste um lead aqui
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── MODAL DE DETALHES DO LEAD ─────────────────────────────────────────────────
function LeadModal({ lead, rowIndex, onClose, onSave, saving }) {
  const [nota, setNota] = useState(lead["NOTAS_CRM"] || "");
  const [valor, setValor] = useState(lead["VALOR"] || "");
  const [motivo, setMotivo] = useState(lead["MOTIVO"] || "");
  const [comerciante, setComerciante] = useState(lead["COMERCIANTE"] || "");

  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => { dialog.close(); previous?.focus(); };
  }, []);

  const tel = lead["TEL PARA CONTATO"];
  const estagio = ESTAGIOS.find(e => e.id === inferEstagio(lead));

  function handleSave() {
    onSave(rowIndex, {
      nota,
      valor,
      motivo,
      comerciante,
    });
  }

  const fields = [
    { label: "Empresa",    value: lead["NOME DA EMPRESA"] },
    { label: "Serviço",    value: lead["SERVIÇO"] },
    { label: "Categoria",  value: lead["CATEGORIA"] },
    { label: "Cidade",     value: lead["LOCALIZAÇÃO"] },
    { label: "Data",       value: lead["DATA"] },
    { label: "Mês",        value: lead["MÊS DE ENTRADA"] },
  ];

  return (
    <motion.dialog ref={dialogRef} aria-label="Detalhes do lead" onCancel={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000, border: 0, margin: 0, width: "100%", height: "100dvh", maxWidth: "none", maxHeight: "none", color: C.text,
        background: "var(--overlay)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={e => e.stopPropagation()}
        style={{
          background: C.bgCard, borderRadius: 26,
          border: `1px solid ${C.border2}`,
          width: "100%", maxWidth: 560,
          maxHeight: "90vh", overflowY: "auto",
          padding: 28,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{
              fontFamily: "'Manrope', sans-serif", fontWeight: 700,
              fontSize: 20, color: C.text, marginBottom: 4,
            }}>
              {lead["NOME DA EMPRESA"] || "Lead sem nome"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {estagio && (
                <span style={{
                  background: `color-mix(in srgb, ${estagio.color} 12%, transparent)`, color: estagio.color,
                  borderRadius: 6, padding: "3px 10px",
                  fontFamily: "'Manrope', sans-serif", fontSize: 11, fontWeight: 600,
                }}>{estagio.label}</span>
              )}
              {lead["BOT CHAMOU?"]?.includes("✅") && (
                <span style={{
                  background: "rgba(34,197,94,0.12)", color: C.green,
                  borderRadius: 6, padding: "3px 10px",
                  fontFamily: "'Manrope', sans-serif", fontSize: 11,
                }}>Bot ativo</span>
              )}
            </div>
          </div>
          <button aria-label="Fechar detalhes" onClick={onClose} style={{
            background: C.bgHover, border: "none",
            color: C.text2, width: 32, height: 32, borderRadius: 8,
            cursor: "pointer", fontSize: 18, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}><X size={20}/></button>
        </div>

        {/* Funil visual */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {[
            { key: "PRIMEIRO CONTATO", label: "Contato" },
            { key: "DIAGNÓSTICO",       label: "Diag." },
            { key: "PROPOSTA",          label: "Proposta" },
            { key: "CONTRATO",          label: "Contrato" },
          ].map((step, i) => {
            const ok = (lead[step.key] || "").toLowerCase() === "sim";
            return (
              <div key={i} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  height: 4, borderRadius: 99,
                  background: ok ? C.green : C.bgHover,
                  marginBottom: 4,
                }} />
                <span style={{
                  fontFamily: "'Manrope', sans-serif", fontSize: 10,
                  color: ok ? C.green : C.text3,
                }}>{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Campos informativos */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 10, marginBottom: 20,
        }}>
          {fields.filter(f => f.value).map((f, i) => (
            <div key={i} style={{
              background: C.bgInput, borderRadius: 8,
              padding: "10px 12px",
            }}>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 10, color: C.text3, marginBottom: 2 }}>
                {f.label}
              </div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, color: C.text2 }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>

        {/* Campos editáveis */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 12, fontWeight: 600, color: C.text2, marginBottom: 12 }}>
            EDITAR
          </div>

          {/* Comerciante */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.text3, display: "block", marginBottom: 4 }}>
              Responsável
            </label>
            <select
              aria-label="Responsável pelo lead"
              value={comerciante}
              onChange={e => setComerciante(e.target.value)}
              style={{
                background: C.bgInput, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text,
                fontFamily: "'Manrope', sans-serif", fontSize: 13,
                padding: "9px 12px", width: "100%", outline: "none", appearance: "none",
              }}
            >
              {COMERCIANTES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Valor */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.text3, display: "block", marginBottom: 4 }}>
              Valor (R$)
            </label>
            <input
              aria-label="Valor do contrato"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Ex: 1.500,00"
              style={{
                background: C.bgInput, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text,
                fontFamily: "'Manrope', sans-serif", fontSize: 13,
                padding: "9px 12px", width: "100%", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Motivo de perda */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.text3, display: "block", marginBottom: 4 }}>
              Motivo de perda (se aplicável)
            </label>
            <input
              aria-label="Motivo de perda"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Preço, sem budget, sem interesse…"
              style={{
                background: C.bgInput, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text,
                fontFamily: "'Manrope', sans-serif", fontSize: 13,
                padding: "9px 12px", width: "100%", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Notas */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.text3, display: "block", marginBottom: 4 }}>
              Notas internas
            </label>
            <textarea
              aria-label="Notas internas"
              value={nota}
              onChange={e => setNota(e.target.value)}
              placeholder="Anotações sobre o lead, próximos passos, contexto da conversa…"
              rows={3}
              style={{
                background: C.bgInput, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.text,
                fontFamily: "'Manrope', sans-serif", fontSize: 13,
                padding: "9px 12px", width: "100%", outline: "none",
                resize: "vertical", boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {tel && (
              <a
                href={fmtWA(tel)}
                target="_blank"
                rel="noreferrer"
                style={{
                  flex: 1, display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                  background: "rgba(34,197,94,0.12)",
                  border: `1px solid rgba(34,197,94,0.3)`,
                  borderRadius: 10, color: C.green,
                  fontFamily: "'Manrope', sans-serif", fontWeight: 600,
                  fontSize: 13, padding: "11px",
                  textDecoration: "none",
                }}
              >
                <WhatsappLogo size={17}/>
                WhatsApp
              </a>
            )}
            <button
              onClick={handleSave}
              className="button-primary"
              disabled={saving}
              style={{
                flex: 2, background: saving ? C.bgInput : C.orange,
                border: "none", borderRadius: 10,
                color: saving ? C.text3 : "#fff",
                fontFamily: "'Manrope', sans-serif", fontWeight: 700,
                fontSize: 14, padding: "11px", cursor: saving ? "default" : "pointer",
                transition: "all .15s",
              }}
            >
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.dialog>
  );
}

// ═══════════════════════════ PAGE CRM ═════════════════════════════════════════
export default function PageCRM({ leads: rawLeads }) {
  const [leads, setLeads] = useState([]);
  const [dragLead, setDragLead] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [filterComercian, setFilterComercian] = useState("Todos");
  const tokenRef = useRef(null);
  const tokenExpRef = useRef(0);

  // Inicializa leads com estágio inferido
  useEffect(() => {
    // Refresh the editable board when a new sheet snapshot arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeads(rawLeads.map((lead, i) => ({
      ...lead,
      _rowIndex: i + 2, // +2 porque row 1 é header, índices 1-based
      ESTAGIO_CRM: inferEstagio(lead),
    })));
  }, [rawLeads]);

  // Token cacheado (válido por 1h)
  async function getToken() {
    if (tokenRef.current && Date.now() < tokenExpRef.current) return tokenRef.current;
    const token = await getAccessToken();
    tokenRef.current = token;
    tokenExpRef.current = Date.now() + 55 * 60 * 1000;
    return token;
  }

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Drag & Drop
  function handleDragStart(e, lead) {
    setDragLead(lead);
    e.dataTransfer.effectAllowed = "move";
  }

  async function handleDrop(novoEstagio) {
    if (!dragLead || dragLead.ESTAGIO_CRM === novoEstagio) {
      setDragLead(null); setDragOver(null); return;
    }

    // Atualiza estado local imediatamente (otimista)
    setLeads(prev => prev.map(l =>
      l._rowIndex === dragLead._rowIndex
        ? { ...l, ESTAGIO_CRM: novoEstagio }
        : l
    ));

    setDragLead(null);
    setDragOver(null);

    // Escreve na Sheets em background
    try {
      const token = await getToken();
      await updateCell(dragLead._rowIndex, COL_INDEX.ESTAGIO_CRM, novoEstagio, token);
      showToast("Lead movido e salvo ✓");
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar - verifique as credenciais", "err");
      // Reverte se falhou
      setLeads(prev => prev.map(l =>
        l._rowIndex === dragLead._rowIndex
          ? { ...l, ESTAGIO_CRM: dragLead.ESTAGIO_CRM }
          : l
      ));
    }
  }

  // Salvar edições do modal
  async function handleSave(rowIndex, { nota, valor, motivo, comerciante }) {
    setSaving(true);
    try {
      const token = await getToken();
      await batchUpdateCells([
        { rowIndex, colIndex: COL_INDEX.NOTAS_CRM,    value: nota },
        { rowIndex, colIndex: COL_INDEX.VALOR,         value: valor },
        { rowIndex, colIndex: COL_INDEX.MOTIVO,        value: motivo },
        { rowIndex, colIndex: COL_INDEX.COMERCIANTE,   value: comerciante },
      ], token);

      // Atualiza estado local
      setLeads(prev => prev.map(l =>
        l._rowIndex === rowIndex
          ? { ...l, NOTAS_CRM: nota, VALOR: valor, MOTIVO: motivo, COMERCIANTE: comerciante }
          : l
      ));
      setSelectedLead(prev => prev ? { ...prev, NOTAS_CRM: nota, VALOR: valor, MOTIVO: motivo, COMERCIANTE: comerciante } : null);

      showToast("Alterações salvas na planilha ✓");
      setSelectedLead(null);
    } catch (err) {
      console.error(err);
      showToast("Erro ao salvar - verifique as credenciais", "err");
    } finally {
      setSaving(false);
    }
  }

  // Leads filtrados
  const leadsFiltrados = useMemo(() => {
    return leads.filter(l => {
      const matchBusca = !filtro ||
        Object.values(l).some(v => String(v).toLowerCase().includes(filtro.toLowerCase()));
      const matchCom = filterComercian === "Todos" || l["COMERCIANTE"] === filterComercian;
      return matchBusca && matchCom;
    });
  }, [leads, filtro, filterComercian]);

  // Leads por estágio
  const leadsPorEstagio = useMemo(() => {
    const map = {};
    ESTAGIOS.forEach(e => { map[e.id] = []; });
    leadsFiltrados.forEach(l => {
      const est = l.ESTAGIO_CRM || "novo";
      if (map[est]) map[est].push(l);
      else map["novo"].push(l);
    });
    return map;
  }, [leadsFiltrados]);

  // Resumo de pipeline
  const pipeline = useMemo(() => {
    const fechados = leadsPorEstagio["fechado"] || [];
    const emAberto = leads.filter(l => !["fechado","perdido"].includes(l.ESTAGIO_CRM));
    const somaFechado = fechados.reduce((acc, r) => {
      const raw = (r["VALOR"] || "").replace(/[^\d,]/g, "").replace(",", ".");
      return acc + (parseFloat(raw) || 0);
    }, 0);
    return { fechados: fechados.length, somaFechado, emAberto: emAberto.length };
  }, [leadsPorEstagio, leads]);

  const inp = {
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text,
    fontFamily: "'Manrope', sans-serif", fontSize: 13,
    padding: "9px 12px", outline: "none",
  };

  return (
    <div className="page-shell crm-page" style={{ padding: "28px 28px 0", display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 28, color: C.text, marginBottom: 4 }}>
            CRM <span style={{ color: C.orange }}>Kanban</span>
          </h1>
          <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: C.text2 }}>
            {leads.length} leads · Alterações salvas automaticamente na planilha
          </p>
        </div>

        {/* KPIs rápidos */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "Em aberto", value: pipeline.emAberto, color: C.orange },
            { label: "Fechados", value: pipeline.fechados, color: C.green },
            { label: "Pipeline", value: pipeline.somaFechado > 0 ? `R$ ${pipeline.somaFechado.toLocaleString("pt-BR",{minimumFractionDigits:0})}` : "-", color: C.green },
          ].map((k, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              style={{
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "10px 16px", textAlign: "center",
            }}>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: 20, color: k.color }}>
                {k.value}
              </div>
              <div style={{ fontFamily: "'Manrope', sans-serif", fontSize: 11, color: C.text3 }}>
                {k.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.text3, pointerEvents: "none" }}>
            <MagnifyingGlass size={18}/>
          </span>
          <input
            aria-label="Buscar no CRM"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            placeholder="Buscar empresa, categoria…"
            style={{ ...inp, paddingLeft: 32, width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <select
          aria-label="Filtrar por comerciante"
          value={filterComercian}
          onChange={e => setFilterComercian(e.target.value)}
          style={{ ...inp, appearance: "none", paddingRight: 28, cursor: "pointer" }}
        >
          <option value="Todos">Todos os comerciantes</option>
          {COMERCIANTES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Kanban board */}
      <div style={{
        display: "flex", gap: 14,
        overflowX: "auto", flex: 1,
        paddingBottom: 24,
        alignItems: "flex-start",
      }}>
        {ESTAGIOS.map(estagio => (
          <KanbanColumn
            key={estagio.id}
            estagio={estagio}
            leads={leadsPorEstagio[estagio.id] || []}
            onOpen={lead => setSelectedLead(lead)}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
            isDragOver={dragOver === estagio.id}
            onDragOver={() => setDragOver(estagio.id)}
            onDragLeave={() => setDragOver(null)}
          />
        ))}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
            position: "fixed", bottom: 32, left: "50%", x: "-50%",
            translateX: "-50%",
            background: toast.type === "err" ? "rgba(244,63,94,0.9)" : "rgba(34,197,94,0.9)",
            color: "#fff", borderRadius: 10, padding: "12px 24px",
            fontFamily: "'Manrope', sans-serif", fontSize: 13, fontWeight: 600,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 2000, whiteSpace: "nowrap",
            transform: "translateX(-50%)",
          }}>
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <AnimatePresence>
        {selectedLead && (
          <LeadModal
            lead={selectedLead}
            rowIndex={selectedLead._rowIndex}
            onClose={() => setSelectedLead(null)}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
