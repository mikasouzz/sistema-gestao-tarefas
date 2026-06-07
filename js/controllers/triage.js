import { AppState } from "../state.js";
import { App } from "../app.js";
import { Toast } from "../toast.js";
import { InboxCtrl } from "./inbox.js";
import { ProjCtrl } from "./projects.js";
import { MonCtrl } from "./monitor.js";

export const TriageCtrl = {
  criteria: [
    { name: "Impacto",      options: [{ l: "Nenhum", v: 0 }, { l: "Baixo", v: 1 }, { l: "Médio", v: 1.5 }, { l: "Alto", v: 2 }] },
    { name: "Relevância",   options: [{ l: "Nenhum", v: 0 }, { l: "Baixo", v: 1 }, { l: "Médio", v: 1.5 }, { l: "Alto", v: 2 }] },
    { name: "Complexidade", options: [{ l: "Nenhum", v: 2 }, { l: "Baixo", v: 1.5 }, { l: "Médio", v: 1 }, { l: "Alto", v: 0 }] },
    { name: "Tempo",        options: [{ l: "Nenhum", v: 2 }, { l: "Baixo", v: 1.5 }, { l: "Médio", v: 1 }, { l: "Alto", v: 0 }] },
    { name: "Custo",        options: [{ l: "Nenhum", v: 2 }, { l: "Baixo", v: 1.5 }, { l: "Médio", v: 1 }, { l: "Alto", v: 0 }] },
  ],

  renderCriteria() {
    const container = document.getElementById("triage-criteria");
    container.innerHTML = "";
    this.criteria.forEach((c, idx) => {
      let html = `<div class="mt-4"><label>${c.name}</label><div class="radio-group">`;
      c.options.forEach((opt) => {
        html += `<div class="radio-btn t-radio-${idx}" data-val="${opt.v}" onclick="TriageCtrl.selectRadio(this, ${idx})">${opt.l} (${opt.v})</div>`;
      });
      html += `</div></div>`;
      container.innerHTML += html;
    });
  },

  selectRadio(el, groupIdx) {
    document.querySelectorAll(`.t-radio-${groupIdx}`).forEach((r) => r.classList.remove("selected"));
    el.classList.add("selected");
    this.evaluateMatrix();
  },

  evaluateMatrix() {
    let score = 0;
    document.querySelectorAll(".radio-btn.selected").forEach((el) => { score += parseFloat(el.dataset.val); });
    document.getElementById("triage-score-val").innerText        = score;
    document.getElementById("triage-score-fill").style.width     = `${(score / 10) * 100}%`;
    document.querySelectorAll(".quadrant").forEach((q) => q.classList.remove("active"));

    const isDelegar = document.getElementById("triage-category").value === "delegar";
    let quad = "q4";
    if (isDelegar)    { quad = "q3"; }
    else if (score >= 7.5) { quad = "q1"; }
    else if (score >= 5)   { quad = "q2"; }
    else if (score >= 3)   { quad = "q3"; }

    document.getElementById(`quad-${quad}`).classList.add("active");
    return { score, quad };
  },

  updateDropdown() {
    const select = document.getElementById("triage-demand-select");
    select.innerHTML = '<option value="">Selecione uma demanda da Caixa de Entrada...</option>';
    AppState.tasks.filter((t) => !t.quadrant).forEach((item) => {
      select.innerHTML += `<option value="${item.id}">${item.text}</option>`;
    });
    this.updateProjectDropdown();
  },

  updateProjectDropdown() {
    const select = document.getElementById("triage-project-link");
    if (!select) return;
    select.innerHTML = '<option value="">— Nenhum projeto —</option>';
    AppState.projects.forEach((p) => {
      select.innerHTML += `<option value="${p.id}">${p.title}</option>`;
    });
  },

  saveTriage() {
    const demandId = document.getElementById("triage-demand-select").value;
    if (!demandId) return Toast.show("Selecione uma demanda na lista!", "warning");

    const selectedRadios = document.querySelectorAll(".radio-btn.selected");
    if (selectedRadios.length < 5)
      return Toast.show("Preencha todos os 5 condicionantes para continuar!", "warning");

    const task = AppState.tasks.find((t) => t.id === demandId);
    if (!task) return;

    const evalData    = this.evaluateMatrix();
    task.type         = document.getElementById("triage-type").value;
    task.category     = document.getElementById("triage-category").value;
    task.fonte        = document.getElementById("triage-fonte").value;
    task.score        = evalData.score;
    task.quadrant     = evalData.quad;
    App.touch(task);

    if (evalData.quad === "q3" || task.category === "delegar") {
      task.responsavel = "";
      task.delegStatus = "plan";
      Toast.show("Triagem salva! Demanda enviada para Monitoramento (Delegada).", "success");
    } else {
      Toast.show("Triagem salva! Demanda aguardando no Plano de Execução.", "success");
    }

    const linkedProjectId = document.getElementById("triage-project-link").value;
    if (linkedProjectId) {
      const project = AppState.projects.find((p) => p.id === linkedProjectId);
      if (project) {
        if (!project.subtasks) project.subtasks = [];
        const subtask = { id: App.generateId(), title: task.text, done: false };
        project.subtasks.push(subtask);
        task.projectId = linkedProjectId;
        task.subtaskId = subtask.id;
        ProjCtrl.render();
      }
    }

    App.save();
    InboxCtrl.render();
    MonCtrl.render();
    this.updateDropdown();

    document.getElementById("triage-demand-select").value = "";
    document.getElementById("triage-project-link").value  = "";
    document.querySelectorAll(".radio-btn").forEach((r) => r.classList.remove("selected"));
    this.evaluateMatrix();
  },
};

window.TriageCtrl = TriageCtrl;
