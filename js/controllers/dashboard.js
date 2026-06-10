import { AppState, AppArchive } from "../state.js";

export const DashCtrl = {
  chartPerf: null, chartMonth: null, chartFonte: null, chartTipo: null,
  chartFonteRate: null, chartQuadrante: null, chartScoreTipo: null, chartDelegados: null,
  chartProjTasks: null,

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

  switchTab(tab) {
    const tabs = ["overview", "deleg", "retro", "proj"];
    document.querySelectorAll(".dash-tab").forEach((btn, i) => {
      btn.classList.toggle("active", tabs[i] === tab);
    });
    document.getElementById("dash-panel-overview").style.display = tab === "overview" ? "" : "none";
    document.getElementById("dash-panel-deleg").style.display    = tab === "deleg"    ? "" : "none";
    document.getElementById("dash-panel-retro").style.display    = tab === "retro"    ? "" : "none";
    document.getElementById("dash-panel-proj").style.display     = tab === "proj"     ? "" : "none";
    if (tab === "deleg") this.renderDelegReport();
    if (tab === "retro") window.RetroCtrl.render();
    if (tab === "proj")  this.renderProjReport();
  },

  renderDelegReport() {
    const el = document.getElementById("dash-deleg-content");
    if (!el) return;

    const allTasks = [...AppState.tasks, ...AppArchive.tasks];
    const delegated = allTasks.filter((t) => t.category === "delegar" || t.quadrant === "q3");

    const total   = delegated.length;
    const active  = delegated.filter((t) => t.delegStatus !== "done").length;
    const done    = delegated.filter((t) => t.delegStatus === "done").length;
    const taxaPct = total > 0 ? Math.round((done / total) * 100) : 0;

    const resolvedTimes = delegated
      .filter((t) => t.delegStatus === "done" && t.delegCompletedAt && t.createdAt)
      .map((t) => {
        const diff = new Date(t.delegCompletedAt) - new Date(t.createdAt.split("T")[0]);
        return Math.max(0, Math.round(diff / 86400000));
      });
    const avgDays = resolvedTimes.length
      ? Math.round(resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length)
      : null;

    const byResp = {};
    delegated.forEach((t) => {
      const name = t.responsavel || "Sem responsável";
      if (!byResp[name]) byResp[name] = { total: 0, active: 0, done: 0, days: [] };
      byResp[name].total++;
      if (t.delegStatus === "done") {
        byResp[name].done++;
        if (t.delegCompletedAt && t.createdAt) {
          const diff = new Date(t.delegCompletedAt) - new Date(t.createdAt.split("T")[0]);
          byResp[name].days.push(Math.max(0, Math.round(diff / 86400000)));
        }
      } else {
        byResp[name].active++;
      }
    });

    const respRows = Object.entries(byResp)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, r]) => {
        const avg  = r.days.length ? Math.round(r.days.reduce((a, b) => a + b, 0) / r.days.length) + "d" : "—";
        const taxa = Math.round((r.done / r.total) * 100);
        return `<tr>
          <td>${name}</td>
          <td style="text-align:center">${r.total}</td>
          <td style="text-align:center;color:var(--warning)">${r.active}</td>
          <td style="text-align:center;color:var(--accent)">${r.done}</td>
          <td style="text-align:center">${taxa}%</td>
          <td style="text-align:center;color:var(--text-secondary)">${avg}</td>
        </tr>`;
      }).join("");

    el.innerHTML = `
      <div class="mon-report-kpis">
        <div class="mon-report-kpi">
          <span class="mon-report-kpi-val">${total}</span>
          <span class="mon-report-kpi-label">Total delegadas</span>
        </div>
        <div class="mon-report-kpi">
          <span class="mon-report-kpi-val" style="color:var(--warning)">${active}</span>
          <span class="mon-report-kpi-label">Em aberto</span>
        </div>
        <div class="mon-report-kpi">
          <span class="mon-report-kpi-val" style="color:var(--accent)">${done}</span>
          <span class="mon-report-kpi-label">Concluídas</span>
        </div>
        <div class="mon-report-kpi">
          <span class="mon-report-kpi-val" style="color:var(--primary-light)">${taxaPct}%</span>
          <span class="mon-report-kpi-label">Taxa de conclusão</span>
        </div>
        <div class="mon-report-kpi">
          <span class="mon-report-kpi-val" style="color:var(--text-secondary)">${avgDays != null ? avgDays + "d" : "—"}</span>
          <span class="mon-report-kpi-label">Tempo médio (dias)</span>
        </div>
      </div>
      ${respRows ? `
      <div class="mon-report-table-wrap" style="margin-top:20px;">
        <table class="mon-report-table">
          <thead>
            <tr>
              <th>Responsável</th>
              <th>Total</th>
              <th>Em aberto</th>
              <th>Concluídas</th>
              <th>Taxa</th>
              <th>Tempo médio</th>
            </tr>
          </thead>
          <tbody>${respRows}</tbody>
        </table>
      </div>` : ""}`;
  },

  renderProjReport() {
    const el = document.getElementById("dash-proj-content");
    if (!el) return;

    const projects = AppState.projects;
    const allTasks = [...AppState.tasks, ...AppArchive.tasks];
    const today    = new Date().toISOString().split("T")[0];

    const total = projects.length;
    const plan  = projects.filter((p) => p.status === "plan").length;
    const prog  = projects.filter((p) => p.status === "prog").length;
    const done  = projects.filter((p) => p.status === "done").length;
    const taxa  = total > 0 ? Math.round((done / total) * 100) : 0;

    const projData = projects.map((p) => {
      const tasks        = allTasks.filter((t) => t.projectId === p.id);
      const tasksDone    = tasks.filter((t) => t.done).length;
      const subtasks     = p.subtasks || [];
      const subtasksDone = subtasks.filter((s) => s.done).length;
      return { ...p, tasksTotal: tasks.length, tasksDone, subtasks, subtasksDone };
    });

    const statusLabel = { plan: "Planejamento", prog: "Em andamento", done: "Concluído" };
    const statusColor = { plan: "var(--text-secondary)", prog: "var(--warning)", done: "var(--accent)" };

    const tableRows = projData.map((p) => {
      const termStr = p.term ? new Date(p.term + "T12:00:00").toLocaleDateString("pt-BR") : "—";
      const overdue = p.term && p.status !== "done" && p.term < today;
      const subProg = p.subtasks.length ? `${p.subtasksDone}/${p.subtasks.length}` : "—";
      return `<tr>
        <td>${p.title}</td>
        <td style="color:${statusColor[p.status] || ""}">${statusLabel[p.status] || p.status}</td>
        <td style="text-align:center${overdue ? ";color:var(--danger)" : ""}">${termStr}${overdue ? " ⚠" : ""}</td>
        <td style="text-align:center">${subProg}</td>
        <td style="text-align:center">${p.tasksTotal}</td>
        <td style="text-align:center;color:var(--accent)">${p.tasksDone}</td>
      </tr>`;
    }).join("");

    const chartData = projData.filter((p) => p.tasksTotal > 0);
    const chartHeight = Math.max(100, chartData.length * 36);

    el.innerHTML = `
      <div class="mon-report-kpis">
        <div class="mon-report-kpi"><span class="mon-report-kpi-val">${total}</span><span class="mon-report-kpi-label">Total</span></div>
        <div class="mon-report-kpi"><span class="mon-report-kpi-val" style="color:var(--text-secondary)">${plan}</span><span class="mon-report-kpi-label">Planejamento</span></div>
        <div class="mon-report-kpi"><span class="mon-report-kpi-val" style="color:var(--warning)">${prog}</span><span class="mon-report-kpi-label">Em andamento</span></div>
        <div class="mon-report-kpi"><span class="mon-report-kpi-val" style="color:var(--accent)">${done}</span><span class="mon-report-kpi-label">Concluídos</span></div>
        <div class="mon-report-kpi"><span class="mon-report-kpi-val" style="color:var(--primary-light)">${taxa}%</span><span class="mon-report-kpi-label">Taxa de conclusão</span></div>
      </div>
      ${chartData.length ? `
      <div class="chart-container" style="margin:20px 0;height:${chartHeight}px;">
        <canvas id="chart-proj-tasks"></canvas>
      </div>` : ""}
      ${tableRows ? `
      <div class="mon-report-table-wrap" style="margin-top:20px;">
        <table class="mon-report-table">
          <thead><tr>
            <th>Projeto</th><th>Status</th><th>Prazo</th><th>Subtarefas</th><th>Tarefas</th><th>Concluídas</th>
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>` : `<p style="color:var(--text-secondary);font-size:0.85rem;margin-top:24px;">Nenhum projeto cadastrado.</p>`}`;

    if (chartData.length) {
      if (this.chartProjTasks) this.chartProjTasks.destroy();
      const labels   = chartData.map((p) => p.title.length > 22 ? p.title.substring(0, 22) + "…" : p.title);
      const dataDone = chartData.map((p) => p.tasksDone);
      const dataPend = chartData.map((p) => p.tasksTotal - p.tasksDone);
      const tick     = { color: "#7878a0", font: { size: 10 } };
      this.chartProjTasks = new Chart(document.getElementById("chart-proj-tasks").getContext("2d"), {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Concluídas", data: dataDone, backgroundColor: "#10b981", borderRadius: 4 },
            { label: "Pendentes",  data: dataPend, backgroundColor: "#2a2a45",  borderRadius: 4 },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { stacked: true, ticks: tick, grid: { color: "rgba(255,255,255,0.05)" } },
            y: { stacked: true, ticks: tick, grid: { display: false } },
          },
          plugins: {
            legend: { labels: { color: "#eeeeff", font: { size: 11 }, boxWidth: 10 } },
            title: { display: true, text: "Tarefas por Projeto", color: "#eeeeff", font: { size: 12, weight: "600" }, padding: { bottom: 8 } },
          },
        },
      });
    }
  },

  exportExcel() {
    const month   = document.getElementById("dash-month-filter").value;
    const allTasks = [...AppState.tasks, ...AppArchive.tasks];
    const done = allTasks.filter((t) =>
      (t.execStatus === "Concluído" && t.execCompletedAt && t.execCompletedAt.substring(0, 7) === month) ||
      (t.delegStatus === "done"     && t.delegCompletedAt && t.delegCompletedAt.substring(0, 7) === month),
    );

    const headers = ["Texto","Tipo","Fonte","Quadrante","Score","Data Conclusão","Responsável","Status"];
    const quadMap = { q1:"Q1 Urgente", q2:"Q2 Estratégico", q3:"Q3 Delegado", q4:"Q4 Eliminar" };
    const rows = done.map((t) => [
      t.text,
      t.type || "",
      t.fonte || "",
      quadMap[t.quadrant] || t.quadrant || "",
      t.score ?? "",
      t.execCompletedAt || t.delegCompletedAt || "",
      t.responsavel || "",
      t.execStatus === "Concluído" ? "Execução" : "Delegada",
    ]);

    const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const bom  = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `tarefas_concluidas_${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
