// Fixed upstream: this route cannot proxy arbitrary URLs.
const SHEET_URL = "https://docs.google.com/spreadsheets/d/1wP2svngeeWtthMMoCJcE5Vv2i1lMGTp_5ONeWbVT-qA/export?format=csv&gid=1568819980";

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  function error(status, message) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: message }));
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return error(405, 'Método não permitido.');
  }
  try {
    const upstream = await fetch(SHEET_URL, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (!upstream.ok) {
      return error(502, 'Google Sheets retornou HTTP ' + upstream.status + '. Verifique as permissões de leitura da planilha.');
    }
    const csv = await upstream.text();
    if (!(upstream.headers.get('content-type') || '').includes('text/csv') || /^\s*</.test(csv)) {
      return error(502, 'O Google não retornou CSV. Verifique se a planilha permite leitura sem login.');
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.end(csv);
  } catch (err) {
    return error(err.name === 'TimeoutError' ? 504 : 502, 'Não foi possível acessar o Google Sheets. Tente novamente.');
  }
}
