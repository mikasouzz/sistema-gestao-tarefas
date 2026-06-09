import { AppState } from "../state.js";
import { App } from "../app.js";
import { SyncCtrl } from "../sync.js";
import { Toast } from "../toast.js";
import { ProjCtrl } from "./projects.js";

export const InboxCtrl = {
  addDemand() {
    const input = document.getElementById("new-demand-input");
    const text  = input.value.trim();

    if (!text) { Toast.show("Digite uma demanda antes de adicionar.", "warning"); return; }

    AppState.tasks.push({
      id: App.generateId(),
      text,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      done: false,
    });

    input.value = "";
    App.save();
    this.render();
    Toast.show("Adicionado à Caixa de Entrada.", "primary");
  },

  delete(id) {
    AppState.tasks = AppState.tasks.filter((t) => t.id !== id);
    App.save();
    this.render();
    SyncCtrl.deleteTask(id);
  },

  goToTriage(id) {
    document.querySelector('.nav-item[data-target="mod-triage"]').click();
    setTimeout(() => { document.getElementById("triage-demand-select").value = id; }, 100);
  },

  goToProject(id) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    AppState.projects.push({
      id: App.generateId(),
      title: task.text,
      desc: "Criado via Caixa de Entrada",
      term: "Curto Prazo",
      status: "plan",
      updatedAt: new Date().toISOString(),
    });
    AppState.tasks = AppState.tasks.filter((t) => t.id !== id);
    App.save();
    ProjCtrl.render();
    this.render();
    Toast.show("Demanda enviada para Projetos!", "success");
    const projTab = document.querySelector('.nav-item[data-target="mod-projects"]');
    projTab.style.background = "rgba(16, 185, 129, 0.2)";
    projTab.style.transition = "background 0.3s ease";
    setTimeout(() => (projTab.style.background = ""), 800);
  },

  goToMonitor(id) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    task.quadrant    = "q3";
    task.category    = "delegar";
    task.delegStatus = "plan";
    App.touch(task);
    App.save();
    this.render();
    Toast.show("Demanda enviada para Monitoramento!", "success");
    const monTab = document.querySelector('.nav-item[data-target="mod-monitor"]');
    monTab.style.background = "rgba(16, 185, 129, 0.2)";
    monTab.style.transition = "background 0.3s ease";
    setTimeout(() => (monTab.style.background = ""), 800);
  },

  render() {
    const container = document.getElementById("inbox-list-container");
    const inbox     = AppState.tasks.filter((t) => !t.quadrant && !t.done);
    container.innerHTML = inbox.length === 0
      ? '<p style="color:var(--text-secondary); font-size:0.875rem;">Caixa de entrada vazia.</p>'
      : "";

    inbox.forEach((item) => {
      const div     = document.createElement("div");
      div.className = "inbox-item";
      div.innerHTML = `
        <span style="font-size:0.875rem; flex:1;">${item.text}</span>
        <div class="flex gap-2">
          <button class="btn btn-secondary inbox-action-btn" onclick="InboxCtrl.goToTriage('${item.id}')">Triar</button>
          <button class="btn btn-secondary inbox-action-btn" onclick="InboxCtrl.goToProject('${item.id}')">Projeto</button>
          <button class="btn btn-secondary inbox-action-btn" onclick="InboxCtrl.goToMonitor('${item.id}')">Monitoramento</button>
          <button class="btn btn-danger inbox-action-btn" onclick="InboxCtrl.delete('${item.id}')">✕</button>
        </div>`;
      container.appendChild(div);
    });
  },
};

window.InboxCtrl = InboxCtrl;
