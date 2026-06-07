import { AppState } from "../state.js";
import { App } from "../app.js";
import { Toast } from "../toast.js";

export const MonCtrl = {
  updateStatus(id, newStatus) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    if (newStatus === "done") {
      task.delegStatus = "done";
      task.delegCompletedAt = new Date().toISOString().split("T")[0];
      task.done = true;
      Toast.show("Demanda delegada concluída!", "success");
    } else {
      task.delegStatus = newStatus;
    }
    App.touch(task);
    App.save();
    this.render();
  },
  updateResp(id, val) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (task) {
      task.responsavel = val;
      App.touch(task);
      App.save();
    }
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
          <div class="kanban-card" draggable="true" id="mon-${t.id}" data-type="monitor">
            <h4>${t.text}</h4>
            <p style="margin-bottom:8px">Score: ${t.score != null ? t.score + "/10" : "—"}</p>
            <input type="text" placeholder="Responsável..." value="${t.responsavel || ""}"
              onchange="MonCtrl.updateResp('${t.id}', this.value)"
              style="padding:5px 9px; font-size:0.77rem; background:var(--bg-base)">
          </div>`;
      });
    });
  },
};

window.MonCtrl = MonCtrl;
