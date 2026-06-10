import { AppState } from "../state.js";
import { App } from "../app.js";
import { Toast } from "../toast.js";
import { EditModal } from "../editModal.js";
import { SyncCtrl } from "../sync.js";
import { todayISO } from "../date.js";
import { ExecCtrl } from "./exec.js";

export const ProjCtrl = {
  addProject() {
    const title = document.getElementById("proj-title").value;
    if (!title) return;
    AppState.projects.push({
      id: App.generateId(),
      title,
      desc: document.getElementById("proj-desc").value,
      term: document.getElementById("proj-term").value,
      status: "plan",
      updatedAt: new Date().toISOString(),
    });
    App.save();
    this.render();
    document.getElementById("modal-project").classList.remove("active");
    document.getElementById("proj-title").value = "";
    document.getElementById("proj-desc").value  = "";
  },

  updateStatus(id, newStatus) {
    const p = AppState.projects.find((x) => x.id === id);
    if (p) {
      p.status = newStatus;
      if (newStatus === "done") {
        p.completedAt = todayISO();
        Toast.show("Projeto marcado como concluído!", "success");
      }
      App.touch(p);
      App.save();
      this.render();
    }
  },

  toggleSubtask(projectId, subtaskId, done) {
    const project = AppState.projects.find((p) => p.id === projectId);
    if (!project || !project.subtasks) return;
    const subtask = project.subtasks.find((s) => s.id === subtaskId);
    if (!subtask) return;

    subtask.done = done;

    const task = AppState.tasks.find(
      (t) => t.projectId === projectId && t.subtaskId === subtaskId,
    );
    if (task) {
      if (done) {
        const today         = todayISO();
        task.execStatus      = "Concluído";
        task.execCompletedAt = today;
        task.done            = true;
      } else {
        task.execStatus      = task.execDate ? "Pendente" : null;
        task.execCompletedAt = null;
        task.done            = false;
      }
      App.touch(task);
      ExecCtrl.renderTaskList();
      ExecCtrl.renderTable();
    }

    App.touch(project);
    App.save();
    this.render();
  },

  edit(id) {
    const proj = AppState.projects.find((p) => p.id === id);
    if (!proj) return;
    EditModal.open({
      title: "Editar Projeto",
      fields: [
        { label: "Título", key: "title", type: "text", value: proj.title },
        { label: "Descrição", key: "desc", type: "textarea", value: proj.desc },
        { label: "Prazo", key: "term", type: "select", value: proj.term, options: ["Curto Prazo", "Longo Prazo"] },
      ],
      onSave({ title, desc, term }) {
        if (!title) return;
        proj.title = title;
        proj.desc  = desc;
        proj.term  = term;
        App.touch(proj);
        App.save();
        ProjCtrl.render();
      },
      onDelete() {
        AppState.projects = AppState.projects.filter((p) => p.id !== id);
        App.save();
        ProjCtrl.render();
        Toast.show("Projeto excluído.", "primary");
        SyncCtrl.deleteProject(id);
      },
    });
  },

  render() {
    ["plan", "prog", "done"].forEach((status) => {
      const col = document.getElementById(`proj-col-${status}`);
      col.innerHTML = "";
      const items = AppState.projects.filter((p) => p.status === status);
      document.getElementById(`proj-count-${status}`).innerText = items.length;

      items.forEach((p) => {
        const subtasks     = p.subtasks || [];
        const subtasksHtml = subtasks.length > 0
          ? `<div style="margin-top:10px; border-top:1px solid var(--border); padding-top:10px; display:flex; flex-direction:column; gap:5px;">
              <span style="font-size:0.68rem; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px;">Tarefas Associadas</span>
              ${subtasks.map((st) => `
                <div style="display:flex; align-items:center; gap:7px;">
                  <input type="checkbox" ${st.done ? "checked" : ""} onchange="ProjCtrl.toggleSubtask('${p.id}','${st.id}',this.checked)"
                    style="width:14px; height:14px; accent-color:var(--primary-mid); cursor:pointer; flex-shrink:0;">
                  <span style="font-size:0.77rem; color:${st.done ? "var(--text-secondary)" : "var(--text-primary)"}; text-decoration:${st.done ? "line-through" : "none"};">${st.title}</span>
                </div>`).join("")}
             </div>`
          : "";
        col.innerHTML += `
          <div class="kanban-card project-card" draggable="true" id="proj-${p.id}" data-type="project" style="cursor:pointer;"
               onclick="if(!event.target.closest('input,select,button'))ProjCtrl.edit('${p.id}')">
            <h4>${p.title}</h4>
            <p>${p.desc.substring(0, 50)}${p.desc.length > 50 ? "..." : ""}</p>
            <span class="badge" style="background:var(--bg-surface-2); color:var(--text-secondary); border:1px solid var(--border);">${p.term}</span>
            ${subtasksHtml}
          </div>`;
      });
    });
  },
};

window.ProjCtrl = ProjCtrl;
