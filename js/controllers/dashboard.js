import { AppState, AppArchive } from "../state.js";

export const DashCtrl = {
  chartPerf: null, chartMonth: null, chartFonte: null, chartTipo: null,
  chartFonteRate: null, chartQuadrante: null, chartScoreTipo: null, chartDelegados: null,

  execMonth(month) {
    const seen = new Map();
    const allTasks = [...AppState.tasks, ...AppArchive.tasks];
    allTasks
      .filter((t) => t.execDate && t.execDate.substring(0, 7) === month)
      .forEach((t) => seen.set(t.id, t));
    allTasks
      .filter((t) => t.category === "delegar" || t.quadrant === "q3")
      .forEach((t) => {
        const doneInMonth   = t.delegCompletedAt && t.delegCompletedAt.substring(0, 7) === month;
        const activeInMonth = t.delegStatus !== "done" && t.createdAt && t.createdAt.substring(0, 7) === month;
        if (doneInMonth || activeInMonth) seen.set(t.id, t);
      });
    return [...seen.values()];
  },

  render() {
    const month   = document.getElementById("dash-month-filter").value;
    const entries = this.execMonth(month);
    const execDone = entries.filter(
      (t) => t.execStatus === "Concluído" || t.delegStatus === "done",
    ).length;

    const projActive = AppState.projects.filter((p) => p.status !== "done").length;
    const projDone   = AppState.projects.filter((p) => p.status === "done").length;

    document.getElementById("kpi-tasks").innerText     = `${execDone} / ${entries.length}`;
    document.getElementById("kpi-projects").innerText  = `${projActive} / ${projDone}`;
    document.getElementById("kpi-inbox").innerText     = AppState.tasks.filter((t) => !t.quadrant).length;
    document.getElementById("kpi-delegated").innerText = AppState.tasks.filter(
      (t) => (t.category === "delegar" || t.quadrant === "q3") && t.delegStatus !== "done",
    ).length;

    this.renderCharts(execDone, entries.length - execDone, month);
    this.renderOrigemVolume(entries);
    this.renderPriorizacao(entries);
    this.renderDelegacao(entries);
    this.renderHistory();
  },

  renderCharts(done, pending, currentMonth) {
    const ctx1 = document.getElementById("chart-performance").getContext("2d");
    if (this.chartPerf) this.chartPerf.destroy();
    this.chartPerf = new Chart(ctx1, {
      type: "doughnut",
      data: { labels: ["Concluídas", "Pendentes"], datasets: [{ data: [done, pending], backgroundColor: ["#8b5cf6", "#1c1c30"], borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#eeeeff", font: { size: 11 }, boxWidth: 10 } }, title: { display: true, text: "Taxa de Execução no Mês", color: "#eeeeff", font: { size: 12, weight: "600" }, padding: { bottom: 8 } } } },
    });

    const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const [refYear, refMon] = currentMonth.split("-").map(Number);
    const last3 = [-2, -1, 0].map((offset) => {
      const d = new Date(refYear, refMon - 1 + offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      const count = this.execMonth(key).filter((t) => t.execStatus === "Concluído" || t.delegStatus === "done").length;
      return { label, count };
    });

    const ctx2 = document.getElementById("chart-monthly").getContext("2d");
    if (this.chartMonth) this.chartMonth.destroy();
    this.chartMonth = new Chart(ctx2, {
      type: "bar",
      data: { labels: last3.map((m) => m.label), datasets: [{ label: "Tarefas Concluídas", data: last3.map((m) => m.count), backgroundColor: "#10b981", borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { color: "#7878a0", font: { size: 10 } }, grid: { color: "rgba(255,255,255,0.05)" } }, x: { ticks: { color: "#7878a0", font: { size: 10 } }, grid: { display: false } } }, plugins: { legend: { labels: { color: "#eeeeff", font: { size: 11 }, boxWidth: 10 } }, title: { display: true, text: "Comparativo Mensal", color: "#eeeeff", font: { size: 12, weight: "600" }, padding: { bottom: 8 } } } },
    });
  },

  renderOrigemVolume(entries) {
    const CO = { color: "#eeeeff", font: { size: 10 }, boxWidth: 10 };
    const titleOpts = (text) => ({ display: true, text, color: "#eeeeff", font: { size: 12, weight: "600" }, padding: { bottom: 8 } });
    const gridColor = "rgba(255,255,255,0.05)";
    const tickStyle = { color: "#7878a0", font: { size: 10 } };

    const fonteOrder  = ["Diretoria","Equipe","Intersetorial","Externa","Própria","Não informado"];
    const fonteColors = { Diretoria:"#8b5cf6", Equipe:"#10b981", Intersetorial:"#0ea5e9", Externa:"#f59e0b", Própria:"#f43f5e", "Não informado":"#7878a0" };
    const fonteCounts = {};
    entries.forEach((t) => { const f = t.fonte || "Não informado"; fonteCounts[f] = (fonteCounts[f] || 0) + 1; });
    const fLabels = fonteOrder.filter((l) => fonteCounts[l]);

    if (this.chartFonte) this.chartFonte.destroy();
    this.chartFonte = new Chart(document.getElementById("chart-fonte").getContext("2d"), {
      type: "doughnut",
      data: { labels: fLabels, datasets: [{ data: fLabels.map((l) => fonteCounts[l]), backgroundColor: fLabels.map((l) => fonteColors[l]), borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: CO }, title: titleOpts("Por Fonte") } },
    });

    const tipoColors = { "Reunião":"#0ea5e9","Estratégia":"#8b5cf6","Gestão de pessoas":"#10b981","Crise":"#f43f5e","Projeto":"#f59e0b","Estudo":"#a78bfa","Operacional":"#7878a0" };
    const tipoCounts = {};
    entries.forEach((t) => { if (t.type) tipoCounts[t.type] = (tipoCounts[t.type] || 0) + 1; });
    const tLabels = Object.keys(tipoCounts).sort((a, b) => tipoCounts[b] - tipoCounts[a]);

    if (this.chartTipo) this.chartTipo.destroy();
    this.chartTipo = new Chart(document.getElementById("chart-tipo").getContext("2d"), {
      type: "bar",
      data: { labels: tLabels, datasets: [{ data: tLabels.map((l) => tipoCounts[l]), backgroundColor: tLabels.map((l) => tipoColors[l] || "#7878a0"), borderRadius: 4 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { ticks: tickStyle, grid: { color: gridColor } }, y: { ticks: tickStyle, grid: { display: false } } }, plugins: { legend: { display: false }, title: titleOpts("Por Tipo") } },
    });

    const fonteConc = {}, fontePend = {};
    entries.forEach((t) => {
      const f    = t.fonte || "Não informado";
      const done = t.execStatus === "Concluído" || t.delegStatus === "done";
      (done ? fonteConc : fontePend)[f] = ((done ? fonteConc : fontePend)[f] || 0) + 1;
    });
    const rLabels = [...new Set(entries.map((t) => t.fonte || "Não informado"))];

    if (this.chartFonteRate) this.chartFonteRate.destroy();
    this.chartFonteRate = new Chart(document.getElementById("chart-fonte-rate").getContext("2d"), {
      type: "bar",
      data: { labels: rLabels, datasets: [
        { label: "Concluídas", data: rLabels.map((l) => fonteConc[l] || 0), backgroundColor: "#10b981", borderRadius: 4 },
        { label: "Pendentes",  data: rLabels.map((l) => fontePend[l] || 0), backgroundColor: "#1c1c30", borderRadius: 4 },
      ]},
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true, ticks: tickStyle, grid: { display: false } }, y: { stacked: true, ticks: tickStyle, grid: { color: gridColor } } }, plugins: { legend: { labels: CO }, title: titleOpts("Conclusão por Fonte") } },
    });
  },

  renderPriorizacao(entries) {
    const CO = { color: "#eeeeff", font: { size: 10 }, boxWidth: 10 };
    const titleOpts = (text) => ({ display: true, text, color: "#eeeeff", font: { size: 12, weight: "600" }, padding: { bottom: 8 } });
    const gridColor = "rgba(255,255,255,0.05)";
    const tickStyle = { color: "#7878a0", font: { size: 10 } };

    const quadMap    = { q1: "Q1 — Fazer Agora", q2: "Q2 — Agendar", q3: "Q3 — Delegar", q4: "Q4 — Eliminar" };
    const quadColors = { q1: "#f43f5e", q2: "#8b5cf6", q3: "#f59e0b", q4: "#7878a0" };
    const quadCounts = { q1: 0, q2: 0, q3: 0, q4: 0 };
    entries.forEach((t) => { if (t.quadrant && quadCounts[t.quadrant] !== undefined) quadCounts[t.quadrant]++; });
    const qKeys = Object.keys(quadCounts).filter((k) => quadCounts[k] > 0);

    if (this.chartQuadrante) this.chartQuadrante.destroy();
    this.chartQuadrante = new Chart(document.getElementById("chart-quadrante").getContext("2d"), {
      type: "doughnut",
      data: { labels: qKeys.map((k) => quadMap[k]), datasets: [{ data: qKeys.map((k) => quadCounts[k]), backgroundColor: qKeys.map((k) => quadColors[k]), borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: CO }, title: titleOpts("Por Quadrante (Eisenhower)") } },
    });

    const scoreSum = {}, scoreN = {};
    entries.forEach((t) => { if (t.type && t.score != null) { scoreSum[t.type] = (scoreSum[t.type] || 0) + t.score; scoreN[t.type] = (scoreN[t.type] || 0) + 1; } });
    const sLabels = Object.keys(scoreSum).sort((a, b) => scoreSum[b] / scoreN[b] - scoreSum[a] / scoreN[a]);
    const sData   = sLabels.map((l) => parseFloat((scoreSum[l] / scoreN[l]).toFixed(1)));

    if (this.chartScoreTipo) this.chartScoreTipo.destroy();
    this.chartScoreTipo = new Chart(document.getElementById("chart-score-tipo").getContext("2d"), {
      type: "bar",
      data: { labels: sLabels, datasets: [{ label: "Score médio", data: sData, backgroundColor: "#8b5cf6", borderRadius: 4 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { min: 0, max: 10, ticks: tickStyle, grid: { color: gridColor } }, y: { ticks: tickStyle, grid: { display: false } } }, plugins: { legend: { display: false }, title: titleOpts("Score Médio por Tipo") } },
    });
  },

  renderDelegacao(entries) {
    const titleOpts = (text) => ({ display: true, text, color: "#eeeeff", font: { size: 12, weight: "600" }, padding: { bottom: 8 } });
    const tickStyle = { color: "#7878a0", font: { size: 10 } };

    const delegTasks = entries.filter((t) => (t.category === "delegar" || t.quadrant === "q3") && t.responsavel && t.responsavel.trim());
    const respCounts = {};
    delegTasks.forEach((t) => { const r = t.responsavel.trim(); respCounts[r] = (respCounts[r] || 0) + 1; });
    const dLabels = Object.entries(respCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k);

    const canvas = document.getElementById("chart-delegados");
    const empty  = document.getElementById("chart-delegados-empty");
    if (this.chartDelegados) this.chartDelegados.destroy();

    if (dLabels.length === 0) {
      canvas.style.display = "none";
      empty.style.display  = "block";
      return;
    }
    canvas.style.display = "block";
    empty.style.display  = "none";

    this.chartDelegados = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: { labels: dLabels, datasets: [{ label: "Tarefas", data: dLabels.map((l) => respCounts[l]), backgroundColor: "#0ea5e9", borderRadius: 4 }] },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, scales: { x: { ticks: tickStyle, grid: { color: "rgba(255,255,255,0.05)" } }, y: { ticks: tickStyle, grid: { display: false } } }, plugins: { legend: { display: false }, title: titleOpts("Delegadas por Responsável") } },
    });
  },

  renderHistory() {
    const container = document.getElementById("history-container");
    const items = [];

    AppState.tasks.filter((t) => t.execStatus === "Concluído").forEach((t) => {
      items.push({ title: t.text, type: "Execução", date: t.execCompletedAt || "" });
    });
    AppState.tasks.filter((t) => t.delegStatus === "done").forEach((t) => {
      items.push({ title: t.text, type: "Delegada", date: t.delegCompletedAt || "" });
    });
    AppState.projects.filter((p) => p.status === "done").forEach((p) => {
      items.push({ title: p.title, type: "Projeto", date: p.completedAt || "" });
    });

    items.sort((a, b) => (b.date > a.date ? 1 : -1));

    container.innerHTML = items.length === 0
      ? '<p style="color:var(--text-secondary); font-size:0.875rem;">Nenhum histórico registrado.</p>'
      : "";
    items.forEach((h) => {
      const dateStr = h.date ? new Date(h.date + "T00:00:00").toLocaleDateString("pt-BR") : "—";
      container.innerHTML += `
        <div class="history-item">
          <span><strong style="color:var(--primary-light)">[${h.type}]</strong> <span style="margin-left:6px;">${h.title}</span></span>
          <span style="color:var(--text-secondary); font-size:0.77rem; flex-shrink:0; margin-left:16px;">${dateStr}</span>
        </div>`;
    });
  },
};

window.DashCtrl = DashCtrl;
