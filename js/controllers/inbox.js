import { AppState } from "../state.js";
import { App } from "../app.js";
import { SyncCtrl } from "../sync.js";
import { Toast } from "../toast.js";
import { ProjCtrl } from "./projects.js";

export const InboxCtrl = {
  addDemand() {
    const input = document.getElementById("new-demand-input");
    const type  = document.getElementById("new-demand-type").value;
    const text  = input.value.trim();

    if (!text) { Toast.show("Digite uma demanda antes de adicionar.", "warning"); return; }

    if (type === "projeto") {
      AppState.projects.push({
        id: App.generateId(),
        title: text,
        desc: "Criado via Caixa de Entrada",
        term: "Curto Prazo",
        status: "plan",
        updatedAt: new Date().toISOString(),
      });
      ProjCtrl.render();
      Toast.show("Demanda enviada diretamente para Projetos!", "success");

      const projTab = document.querySelector('.nav-item[data-target="mod-projects"]');
      projTab.style.background  = "rgba(16, 185, 129, 0.2)";
      projTab.style.transition  = "background 0.3s ease";
      setTimeout(() => (projTab.style.background = ""), 800);
    } else {
      AppState.tasks.push({
        id: App.generateId(),
        text,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        done: false,
      });
      Toast.show("Adicionado à Caixa de Entrada.", "primary");
    }

    input.value = "";
    App.save();
    this.render();
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

  render() {
    const container = document.getElementById("inbox-list-container");
    const inbox     = AppState.tasks.filter((t) => !t.quadrant);
    container.innerHTML = inbox.length === 0
      ? '<p style="color:var(--text-secondary); font-size:0.875rem;">Caixa de entrada vazia.</p>'
      : "";

    inbox.forEach((item) => {
      const div       = document.createElement("div");
      div.className   = "inbox-item";
      div.innerHTML   = `
        <div class="flex align-center gap-3">
          <span class="badge badge-triagem">Triagem</span>
          <span style="font-size:0.875rem;">${item.text}</span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary" onclick="InboxCtrl.goToTriage('${item.id}')" style="padding: 5px 11px; font-size: 0.78rem;">Triar</button>
          <button class="btn btn-danger" onclick="InboxCtrl.delete('${item.id}')" style="padding: 5px 10px;">✕</button>
        </div>`;
      container.appendChild(div);
    });
  },
};

window.InboxCtrl = InboxCtrl;
