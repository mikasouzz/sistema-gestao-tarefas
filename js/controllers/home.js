import { AppState } from "../state.js";
import { todayISO, localDateISO } from "../date.js";

export const HomeCtrl = {
  render() {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    document.getElementById("home-greeting").textContent = `${greeting}, Mikaella`;

    const opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const dateStr = now.toLocaleDateString("pt-BR", opts);
    document.getElementById("home-date").textContent =
      dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    const today = todayISO();

    document.getElementById("hkpi-inbox").textContent =
      AppState.tasks.filter((t) => !t.quadrant).length;

    document.getElementById("hkpi-pending").textContent =
      AppState.tasks.filter(
        (t) => (t.quadrant === "q1" || t.quadrant === "q2") && !t.execDate && !t.done,
      ).length;

    const todayTasks = AppState.tasks.filter((t) => t.execDate === today);
    document.getElementById("hkpi-today").textContent = todayTasks.length;

    document.getElementById("hkpi-projects").textContent =
      AppState.projects.filter((p) => p.status !== "done").length;

    document.getElementById("hkpi-delegated").textContent =
      AppState.tasks.filter(
        (t) => (t.category === "delegar" || t.quadrant === "q3") && t.delegStatus !== "done",
      ).length;

    this.renderAlert();
    this.renderHealth();

    const container = document.getElementById("home-today-list");
    const sorted = [...todayTasks].sort((a, b) =>
      (a.execTime || "").localeCompare(b.execTime || ""),
    );

    if (sorted.length === 0) {
      container.innerHTML =
        '<div class="home-today-empty">Nenhuma tarefa agendada para hoje.<br>Use o <strong>Plano de Execução</strong> para alocar demandas na semana.</div>';
    } else {
      const statusColor = {
        Concluído: {
          bg: "var(--accent-glow)",
          text: "var(--accent-light)",
          border: "1px solid rgba(16,185,129,0.28)",
        },
        "Em Andamento": {
          bg: "var(--primary-glow)",
          text: "var(--primary-light)",
          border: "1px solid var(--primary-border)",
        },
      };
      container.innerHTML = sorted
        .map((t) => {
          const s  = t.execStatus || "Pendente";
          const sc = statusColor[s] || {
            bg: "var(--bg-surface-2)",
            text: "var(--text-secondary)",
            border: "1px solid var(--border)",
          };
          const isMeeting = t.type === "Reunião";
          return `
            <div class="home-today-item${s === "Concluído" ? " done" : ""}${isMeeting ? " meeting" : ""}">
              <span class="home-today-time">${t.execTime || "—"}</span>
              <span class="home-today-title">${t.text}</span>
              <span class="badge" style="background:${sc.bg};color:${sc.text};border:${sc.border};text-transform:none;letter-spacing:0;">${s}</span>
            </div>`;
        })
        .join("");
    }
  },
  renderAlert() {
    const banner = document.getElementById("home-alert-q1");
    const q1Active = AppState.tasks.filter((t) => t.quadrant === "q1" && !t.done);
    if (q1Active.length >= 3) {
      document.getElementById("home-alert-q1-text").textContent =
        `Você tem ${q1Active.length} demandas urgentes (Q1) ativas. Considere delegar ou renegociar prazos.`;
      banner.style.display = "flex";
    } else {
      banner.style.display = "none";
    }
  },

  renderHealth() {
    const section = document.getElementById("home-health");
    const content = document.getElementById("home-health-content");

    const now = new Date();
    const day = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4);
    const ws = localDateISO(weekStart);
    const we = localDateISO(weekEnd);

    const weekTasks = AppState.tasks.filter(
      (t) => t.execDate && t.execDate >= ws && t.execDate <= we,
    );

    if (weekTasks.length === 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "";

    const total      = weekTasks.length;
    const q1Count    = weekTasks.filter((t) => t.quadrant === "q1").length;
    const meetCount  = weekTasks.filter((t) => t.type === "Reunião").length;
    const unscheduled = AppState.tasks.filter(
      (t) => (t.quadrant === "q1" || t.quadrant === "q2") && !t.execDate && !t.done,
    ).length;

    const q1Pct   = q1Count / total;
    const meetPct = meetCount / total;

    let status, color, msg;
    if (q1Pct > 0.5 || meetPct > 0.6) {
      status = "Crítica";
      color  = "var(--danger)";
      msg    = q1Pct > 0.5
        ? "Semana dominada por demandas urgentes (Q1). Avalie o que pode ser delegado ou adiado."
        : "Mais da metade da semana é reunião. Sobra pouco espaço para execução.";
    } else if (q1Pct > 0.3 || meetPct > 0.4) {
      status = "Atenção";
      color  = "var(--warning)";
      msg    = q1Pct > 0.3
        ? "Alta concentração de demandas urgentes (Q1). Tente proteger espaço para o estratégico."
        : "Muitas reuniões na semana. Reserve blocos para trabalho focado.";
    } else {
      status = "Equilibrada";
      color  = "var(--accent)";
      msg    = "Boa distribuição entre urgência e estratégia. Continue assim.";
    }

    const pct = (n) => Math.round((n / total) * 100);

    content.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <span style="font-size:0.78rem;color:var(--text-secondary);">${total} tarefa${total > 1 ? "s" : ""} na semana</span>
        <span class="badge" style="background:color-mix(in srgb,${color} 15%,transparent);color:${color};border:1px solid color-mix(in srgb,${color} 30%,transparent);font-size:0.72rem;">
          ${status}
        </span>
      </div>
      <div class="home-health-metrics">
        <div class="home-health-metric">
          <span class="home-health-metric-val" style="color:var(--danger)">${q1Count}</span>
          <span class="home-health-metric-label">Urgentes Q1 (${pct(q1Count)}%)</span>
        </div>
        <div class="home-health-metric">
          <span class="home-health-metric-val" style="color:var(--primary-light)">${meetCount}</span>
          <span class="home-health-metric-label">Reuniões (${pct(meetCount)}%)</span>
        </div>
        <div class="home-health-metric">
          <span class="home-health-metric-val" style="color:var(--warning)">${unscheduled}</span>
          <span class="home-health-metric-label">A agendar</span>
        </div>
      </div>
      <p style="font-size:0.77rem;color:var(--text-secondary);margin-top:12px;line-height:1.5;border-top:1px solid var(--border);padding-top:10px;">${msg}</p>`;
  },
};

window.HomeCtrl = HomeCtrl;
