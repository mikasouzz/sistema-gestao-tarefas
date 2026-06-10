export function printWindow(title, bodyHtml) {
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; padding: 32px; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; color: #1a1a2e; }
    h2 { font-size: 13px; font-weight: 600; margin: 20px 0 8px; color: #3a3a5c; text-transform: uppercase; letter-spacing: 0.05em; }
    .subtitle { font-size: 11px; color: #6b6b8a; margin-bottom: 24px; }
    .kpi-row { display: grid; gap: 10px; margin-bottom: 20px; }
    .kpi-row-4 { grid-template-columns: repeat(4, 1fr); }
    .kpi-row-5 { grid-template-columns: repeat(5, 1fr); }
    .kpi { border: 1px solid #e0e0f0; border-radius: 8px; padding: 12px 14px; }
    .kpi-val { font-size: 22px; font-weight: 800; color: #5b21b6; line-height: 1; margin-bottom: 4px; }
    .kpi-label { font-size: 10px; color: #6b6b8a; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .section { border: 1px solid #e0e0f0; border-radius: 8px; padding: 14px; }
    .task-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-bottom: 1px solid #f0f0f8; font-size: 11px; }
    .task-row:last-child { border-bottom: none; }
    .task-day { font-weight: 700; color: #5b21b6; min-width: 60px; flex-shrink: 0; }
    .task-type { color: #9b9bb0; flex-shrink: 0; }
    .task-text { flex: 1; }
    .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 11px; }
    .bar-label { min-width: 110px; color: #6b6b8a; }
    .bar-track { flex: 1; height: 6px; background: #f0f0f8; border-radius: 3px; }
    .bar-fill { height: 100%; background: #8b5cf6; border-radius: 3px; }
    .bar-count { min-width: 55px; text-align: right; color: #9b9bb0; }
    .chart-img { width: 100%; max-height: 200px; object-fit: contain; margin-top: 4px; }
    .empty { color: #9b9bb0; font-size: 11px; padding: 8px 0; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e0e0f0; font-size: 10px; color: #9b9bb0; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  ${bodyHtml}
  <div class="footer">
    <span>Sistema de Gestão de Liderança</span>
    <span>Gerado em ${new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" })}</span>
  </div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`);
  w.document.close();
}
