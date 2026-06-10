import { AppState } from "../state.js";
import { todayISO } from "../date.js";

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
};

window.HomeCtrl = HomeCtrl;
