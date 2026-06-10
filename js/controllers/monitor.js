import { AppState } from "../state.js";
import { App } from "../app.js";
import { Toast } from "../toast.js";
import { EditModal } from "../editModal.js";

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
        MonCtrl.render();
        Toast.show("Tarefa excluída.", "error");
      },
    });
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
