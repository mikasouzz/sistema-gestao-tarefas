import { AppState, AppArchive } from "../state.js";
import { localDateISO } from "../date.js";
import { printWindow } from "../print.js";

export const RetroCtrl = {
  currentWeekStart: null,
  months: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],

  init() {
    // Start on previous week so there's data to show
    const ws = this.getWeekStart(new Date());
    ws.setDate(ws.getDate() - 7);
    this.currentWeekStart = ws;
  },

  getWeekStart(date) {
    const d   = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
  },

  getWeekDates() {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);
      return localDateISO(d);
    });
  },

  formatWeekLabel() {
    const dates = this.getWeekDates();
    const s = new Date(dates[0] + "T12:00:00");
    const e = new Date(dates[4] + "T12:00:00");
    const fmt = (d) => `${String(d.getDate()).padStart(2,"0")} ${this.months[d.getMonth()]}`;
    return `${fmt(s)} – ${fmt(e)} ${e.getFullYear()}`;
  },

  prevWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.render();
  },

  nextWeek() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.render();
  },

  render() {
    const label = document.getElementById("retro-week-label");
    if (label) label.textContent = this.formatWeekLabel();

    const dates   = this.getWeekDates();
    const ws      = dates[0];
    const we      = dates[4];
    const allTasks = [...AppState.tasks, ...AppArchive.tasks];
    const weekTasks = allTasks.filter((t) => t.execDate && t.execDate >= ws && t.execDate <= we);

    const planned   = weekTasks.length;
    const completed = weekTasks.filter((t) => t.execStatus === "Concluído").length;
    const pending   = weekTasks.filter((t) => t.execStatus !== "Concluído").length;
    const taxa      = planned > 0 ? Math.round((completed / planned) * 100) : 0;

    const taxaColor = taxa >= 80 ? "var(--accent)" : taxa >= 50 ? "var(--warning)" : "var(--danger)";

    // Distribution by type
    const byType = {};
    weekTasks.forEach((t) => {
      const key = t.type || "Sem tipo";
      byType[key] = (byType[key] || 0) + 1;
    });
    const typeRows = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => {
        const pct = Math.round((count / planned) * 100);
        return `
          <div class="retro-dist-row">
            <span class="retro-dist-label">${type}</span>
            <div class="retro-dist-bar-track">
              <div class="retro-dist-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="retro-dist-count">${count} (${pct}%)</span>
          </div>`;
      }).join("");

    // Distribution by quadrant
    const quadLabels = { q1: "Q1 Urgente", q2: "Q2 Estratégico", q3: "Q3 Delegado", q4: "Q4 Eliminar" };
    const quadColors = { q1: "var(--danger)", q2: "var(--primary-mid)", q3: "var(--warning)", q4: "var(--text-secondary)" };
    const byQuad = {};
    weekTasks.forEach((t) => { if (t.quadrant) byQuad[t.quadrant] = (byQuad[t.quadrant] || 0) + 1; });
    const quadRows = Object.entries(byQuad)
      .sort((a, b) => b[1] - a[1])
      .map(([q, count]) => {
        const pct = Math.round((count / planned) * 100);
        return `
          <div class="retro-dist-row">
            <span class="retro-dist-label">${quadLabels[q] || q}</span>
            <div class="retro-dist-bar-track">
              <div class="retro-dist-bar-fill" style="width:${pct}%;background:${quadColors[q]}"></div>
            </div>
            <span class="retro-dist-count">${count} (${pct}%)</span>
          </div>`;
      }).join("");

    const taskCard = (t) => {
      const dayName = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][new Date(t.execDate + "T12:00:00").getDay()];
      return `
        <div class="retro-task-card">
          <span class="retro-task-day">${dayName} ${t.execTime || ""}</span>
          <span class="retro-task-text">${t.text}</span>
          <span class="retro-task-type">${t.type || "—"}</span>
        </div>`;
    };

    const doneTasks    = weekTasks.filter((t) => t.execStatus === "Concluído");
    const pendingTasks = weekTasks.filter((t) => t.execStatus !== "Concluído");

    const el = document.getElementById("retro-content");
    if (!el) return;

    if (planned === 0) {
      el.innerHTML = `<div class="retro-empty">Nenhuma tarefa foi alocada nessa semana.</div>`;
      return;
    }

    el.innerHTML = `
      <div class="retro-kpis">
        <div class="retro-kpi">
          <span class="retro-kpi-val">${planned}</span>
          <span class="retro-kpi-label">Planejadas</span>
        </div>
        <div class="retro-kpi">
          <span class="retro-kpi-val" style="color:var(--accent)">${completed}</span>
          <span class="retro-kpi-label">Concluídas</span>
        </div>
        <div class="retro-kpi">
          <span class="retro-kpi-val" style="color:${taxaColor}">${taxa}%</span>
          <span class="retro-kpi-label">Taxa de entrega</span>
        </div>
        <div class="retro-kpi">
          <span class="retro-kpi-val" style="color:var(--warning)">${pending}</span>
          <span class="retro-kpi-label">Não concluídas</span>
        </div>
      </div>

      <div class="retro-main-grid">
        <div class="retro-section">
          <p class="retro-section-title">✓ Concluídas (${doneTasks.length})</p>
          ${doneTasks.length ? doneTasks.map(taskCard).join("") : `<p class="retro-empty-small">Nenhuma tarefa concluída.</p>`}
        </div>
        <div class="retro-section">
          <p class="retro-section-title">⚠ Não concluídas (${pendingTasks.length})</p>
          ${pendingTasks.length ? pendingTasks.map(taskCard).join("") : `<p class="retro-empty-small">Tudo foi entregue!</p>`}
        </div>
      </div>

      <div class="retro-dist-grid">
        <div class="retro-section">
          <p class="retro-section-title">Distribuição por Tipo</p>
          ${typeRows || "<p class='retro-empty-small'>—</p>"}
        </div>
        <div class="retro-section">
          <p class="retro-section-title">Distribuição por Quadrante</p>
          ${quadRows || "<p class='retro-empty-small'>—</p>"}
        </div>
      </div>`;
  },

  exportPDF() {
    const dates     = this.getWeekDates();
    const ws        = dates[0], we = dates[4];
    const allTasks  = [...AppState.tasks, ...AppArchive.tasks];
    const weekTasks = allTasks.filter((t) => t.execDate && t.execDate >= ws && t.execDate <= we);

    const planned   = weekTasks.length;
    const completed = weekTasks.filter((t) => t.execStatus === "Concluído").length;
    const pending   = planned - completed;
    const taxa      = planned > 0 ? Math.round((completed / planned) * 100) : 0;
    const taxaColor = taxa >= 80 ? "#10b981" : taxa >= 50 ? "#f59e0b" : "#f43f5e";

    const taskRow = (t) => {
      const day = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][new Date(t.execDate + "T12:00:00").getDay()];
      return `<div class="task-row">
        <span class="task-day">${day} ${t.execTime || ""}</span>
        <span class="task-text">${t.text}</span>
        <span class="task-type">${t.type || "—"}</span>
      </div>`;
    };

    const barRows = (counts, total) => Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => {
        const pct = Math.round((count / total) * 100);
        return `<div class="bar-row">
          <span class="bar-label">${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span class="bar-count">${count} (${pct}%)</span>
        </div>`;
      }).join("");

    const byType = {}, byQuad = {};
    const quadLabels = { q1:"Q1 Urgente", q2:"Q2 Estratégico", q3:"Q3 Delegado", q4:"Q4 Eliminar" };
    weekTasks.forEach((t) => {
      if (t.type) byType[t.type] = (byType[t.type] || 0) + 1;
      if (t.quadrant) byQuad[quadLabels[t.quadrant] || t.quadrant] = (byQuad[quadLabels[t.quadrant] || t.quadrant] || 0) + 1;
    });

    const doneTasks    = weekTasks.filter((t) => t.execStatus === "Concluído");
    const pendingTasks = weekTasks.filter((t) => t.execStatus !== "Concluído");

    const body = `
      <h1>Retrospectiva Semanal</h1>
      <p class="subtitle">${this.formatWeekLabel()}</p>
      <div class="kpi-row kpi-row-4">
        <div class="kpi"><div class="kpi-val">${planned}</div><div class="kpi-label">Planejadas</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#10b981">${completed}</div><div class="kpi-label">Concluídas</div></div>
        <div class="kpi"><div class="kpi-val" style="color:${taxaColor}">${taxa}%</div><div class="kpi-label">Taxa de entrega</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#f59e0b">${pending}</div><div class="kpi-label">Não concluídas</div></div>
      </div>
      <div class="two-col">
        <div class="section">
          <h2>✓ Concluídas (${doneTasks.length})</h2>
          ${doneTasks.length ? doneTasks.map(taskRow).join("") : '<p class="empty">Nenhuma tarefa concluída.</p>'}
        </div>
        <div class="section">
          <h2>⚠ Não concluídas (${pendingTasks.length})</h2>
          ${pendingTasks.length ? pendingTasks.map(taskRow).join("") : '<p class="empty">Tudo foi entregue!</p>'}
        </div>
      </div>
      <div class="two-col">
        <div class="section">
          <h2>Distribuição por Tipo</h2>
          ${planned ? barRows(byType, planned) : '<p class="empty">—</p>'}
        </div>
        <div class="section">
          <h2>Distribuição por Quadrante</h2>
          ${planned ? barRows(byQuad, planned) : '<p class="empty">—</p>'}
        </div>
      </div>`;

    printWindow(`Retrospectiva — ${this.formatWeekLabel()}`, body);
  },
};

window.RetroCtrl = RetroCtrl;
