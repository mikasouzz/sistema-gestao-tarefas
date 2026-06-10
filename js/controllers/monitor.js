import { AppState } from "../state.js";
import { App } from "../app.js";
import { Toast } from "../toast.js";
import { EditModal } from "../editModal.js";
import { todayISO } from "../date.js";
import { SyncCtrl } from "../sync.js";

export const MonCtrl = {
  updateStatus(id, newStatus) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    if (newStatus === "done") {
      task.delegStatus = "done";
      task.delegCompletedAt = todayISO();
      task.done = true;
      Toast.show("Demanda delegada concluída!", "success");
    } else {
      task.delegStatus = newStatus;
    }
    App.touch(task);
    App.save();
    this.render();
  },
  edit(id) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    EditModal.open({
      title: "Editar Tarefa Delegada",
      fields: [
        { label: "Texto", key: "text", type: "text", value: task.text },
        { label: "Responsável", key: "responsavel", type: "text", value: task.responsavel || "" },
      ],
      onSave({ text, responsavel }) {
        if (!text) return;
        task.text        = text;
        task.responsavel = responsavel;
        App.touch(task);
        App.save();
        MonCtrl.render();
      },
      onDelete() {
        const idx = AppState.tasks.findIndex((x) => x.id === id);
        if (idx === -1) return;
        AppState.tasks.splice(idx, 1);
        App.save();
        SyncCtrl.deleteTask(id);
        MonCtrl.render();
        Toast.show("Tarefa excluída.", "error");
      },
    });
  },

  toggleReport() {
    const el = document.getElementById("mon-report");
    const open = el.style.display === "none";
    el.style.display = open ? "" : "none";
    if (open) this.renderReport();
  },

  renderReport() {
    const el = document.getElementById("mon-report-content");
    if (!el) return;

    const delegated = AppState.tasks.filter(
      (t) => t.category === "delegar" || t.quadrant === "q3",
    );

    const total    = delegated.length;
    const active   = delegated.filter((t) => t.delegStatus !== "done").length;
    const done     = delegated.filter((t) => t.delegStatus === "done").length;
    const taxaPct  = total > 0 ? Math.round((done / total) * 100) : 0;

    // Avg resolution time for completed tasks
    const resolvedTimes = delegated
      .filter((t) => t.delegStatus === "done" && t.delegCompletedAt && t.createdAt)
      .map((t) => {
        const diff = new Date(t.delegCompletedAt) - new Date(t.createdAt.split("T")[0]);
        return Math.max(0, Math.round(diff / 86400000));
      });
    const avgDays = resolvedTimes.length
      ? Math.round(resolvedTimes.reduce((a, b) => a + b, 0) / resolvedTimes.length)
      : null;

    // Group by responsável
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
        const avg = r.days.length
          ? Math.round(r.days.reduce((a, b) => a + b, 0) / r.days.length) + "d"
          : "—";
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
      <div class="mon-report-table-wrap">
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

  render() {
    ["plan", "prog", "done"].forEach((status) => {
      const col = document.getElementById(`mon-col-${status}`);
      col.innerHTML = "";
      const items = AppState.tasks.filter(
        (t) =>
          (t.category === "delegar" || t.quadrant === "q3") &&
          t.delegStatus === status,
      );
      document.getElementById(`mon-count-${status}`).innerText = items.length;

      items.forEach((t) => {
        col.innerHTML += `
          <div class="kanban-card" draggable="true" id="mon-${t.id}" data-type="monitor" style="cursor:pointer;"
               onclick="MonCtrl.edit('${t.id}')">
            <h4>${t.text}</h4>
            <p style="margin-bottom:4px">Score: ${t.score != null ? t.score + "/10" : "—"}</p>
            <p style="font-size:0.77rem;color:var(--text-secondary);margin:0">${t.responsavel ? "👤 " + t.responsavel : "<em style='opacity:.5'>Sem responsável</em>"}</p>
          </div>`;
      });
    });
  },
};

window.MonCtrl = MonCtrl;
