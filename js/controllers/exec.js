import { AppState, AppArchive } from "../state.js";
import { App } from "../app.js";
import { Toast } from "../toast.js";
import { ProjCtrl } from "./projects.js";
import { EditModal } from "../editModal.js";
import { localDateISO, todayISO } from "../date.js";
import { SyncCtrl } from "../sync.js";

export const ExecCtrl = {
  times: ["08h","09h","10h","11h","13h","14h","15h","16h"],
  selectedTaskId: null,
  currentWeekStart: null,
  months: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],

  init() { this.currentWeekStart = this.getWeekStart(new Date()); },

  getWeekStart(date) {
    const d   = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    d.setHours(0, 0, 0, 0);
    return d;
  },

  getWeekDates() {
    const names = ["Segunda","Terça","Quarta","Quinta","Sexta"];
    const abbr  = ["SEG","TER","QUA","QUI","SEX"];
    return names.map((name, i) => {
      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);
      return { date: d, iso: localDateISO(d), name, abbr: abbr[i] };
    });
  },

  formatWeekLabel() {
    const dates = this.getWeekDates();
    const s = dates[0].date, e = dates[4].date;
    const fmt = (d) => `${String(d.getDate()).padStart(2, "0")} ${this.months[d.getMonth()]}`;
    return `${fmt(s)} – ${fmt(e)} ${e.getFullYear()}`;
  },

  quadColor(quad) {
    return ({ q1: "var(--danger)", q2: "var(--primary-mid)", q3: "var(--warning)", q4: "var(--text-secondary)" }[quad] || "var(--primary-mid)");
  },

  prevWeek() { this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7); this.renderTaskList(); this.renderTable(); },
  nextWeek() { this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7); this.renderTaskList(); this.renderTable(); },

  selectTask(id) { this.selectedTaskId = this.selectedTaskId === id ? null : id; this.renderTaskList(); this.renderTable(); },

  openEdit(id) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    const types  = ["Reunião", "Estratégia", "Gestão de pessoas", "Crise", "Projeto", "Estudo", "Operacional"];
    const fontes = ["Diretoria", "Equipe", "Intersetorial", "Externa", "Própria"];
    EditModal.open({
      title: "Editar Tarefa",
      fields: [
        { label: "Texto",       key: "text",  type: "text",   value: task.text },
        { label: "Tipo",        key: "type",  type: "select", value: task.type,  options: types },
        { label: "Fonte",       key: "fonte", type: "select", value: task.fonte, options: fontes },
        { label: "Score (0–10)", key: "score", type: "number", value: task.score, min: 0, max: 10 },
      ],
      onSave({ text, type, fonte, score }) {
        if (!text) return;
        task.text  = text;
        task.type  = type;
        task.fonte = fonte;
        task.score = Number(score);
        App.touch(task);
        App.save();
        ExecCtrl.renderTaskList();
        ExecCtrl.renderTable();
      },
      onDelete() {
        AppState.tasks = AppState.tasks.filter((t) => t.id !== id);
        App.save();
        SyncCtrl.deleteTask(id);
        ExecCtrl.renderTaskList();
        ExecCtrl.renderTable();
        Toast.show("Tarefa excluída.", "error");
      },
    });
  },

  renderTaskList() {
    const container = document.getElementById("exec-task-list");
    if (!container) return;

    const tasks = AppState.tasks.filter(
      (t) => (t.quadrant === "q1" || t.quadrant === "q2") && !t.done && !t.execDate,
    );

    if (tasks.length === 0) {
      container.innerHTML = `<p style="font-size:0.78rem;color:var(--text-secondary);padding:6px 4px;">Nenhuma demanda disponível para alocar.</p>`;
      return;
    }
    container.innerHTML = "";
    tasks.forEach((t) => {
      const div = document.createElement("div");
      div.className = "exec-task-item";
      div.style.cursor = "grab";
      div.setAttribute("draggable", "true");
      div.dataset.listTaskId = t.id;
      if (t.type === "Reunião") div.classList.add("meeting");
      div.onclick = () => ExecCtrl.openEdit(t.id);
      div.innerHTML = `
        <div class="quad-dot" style="background:${t.type === "Reunião" ? "var(--primary)" : this.quadColor(t.quadrant)};flex-shrink:0;"></div>
        <div style="flex:1;min-width:0;">
          <div class="task-title">${t.text}</div>
          <div class="task-meta">${t.type || "—"} · Score ${t.score ?? "—"}/10</div>
        </div>`;
      container.appendChild(div);
    });
  },

  renderTable() {
    const head  = document.getElementById("schedule-head");
    const tbody = document.getElementById("schedule-body");
    const label = document.getElementById("exec-week-label");
    if (!head || !tbody) return;

    const weekDates = this.getWeekDates();
    if (label) label.textContent = this.formatWeekLabel();

    head.innerHTML =
      '<tr><th class="time-col">Hora</th>' +
      weekDates.map((d) => `<th>
        <div>${d.abbr}</div>
        <div style="font-size:0.66rem;color:var(--text-secondary);font-weight:400;margin-top:2px;">
          ${String(d.date.getDate()).padStart(2, "0")} ${this.months[d.date.getMonth()]}
        </div></th>`).join("") + "</tr>";

    const todayWeekStart = this.getWeekStart(new Date());
    const isPastWeek     = this.currentWeekStart < todayWeekStart;
    const notice = document.getElementById("exec-archive-notice");
    if (notice) notice.style.display = isPastWeek ? "flex" : "none";

    const weekStart = weekDates[0].iso;
    const weekEnd   = weekDates[4].iso;
    const taskIndex = new Map();
    const addToIndex = (t) => {
      if (!t.execDate || t.execDate < weekStart || t.execDate > weekEnd) return;
      const key = `${t.execDate}|${t.execTime}`;
      if (!taskIndex.has(key)) taskIndex.set(key, []);
      taskIndex.get(key).push(t);
    };
    AppState.tasks.forEach(addToIndex);
    if (isPastWeek) AppArchive.tasks.forEach(addToIndex);

    tbody.innerHTML = "";
    this.times.forEach((time) => {
      let tr = `<tr><td class="time-col">${time}</td>`;
      weekDates.forEach((d) => {
        tr += `<td class="drop-zone" data-date="${d.iso}" data-day="${d.name}" data-time="${time}">`;
        (taskIndex.get(`${d.iso}|${time}`) || []).forEach((t) => {
          const dot    = this.quadColor(t.quadrant);
          const isDone = t.execStatus === "Concluído";
          if (isPastWeek) {
            tr += `
              <div class="task-slot${isDone ? " done" : ""}" style="border-left-color:${dot};cursor:default;">
                <div class="slot-title" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.text}">${t.text}</div>
                <span style="font-size:0.68rem;color:var(--text-secondary);flex-shrink:0;">${t.execStatus || "—"}</span>
              </div>`;
          } else {
            const isMeeting = t.type === "Reunião";
            tr += `
              <div class="task-slot${isDone ? " done" : ""}${isMeeting ? " slot-meeting" : ""}" id="exec-${t.id}" data-exec-id="${t.id}" draggable="true" style="border-left-color:${isMeeting ? "var(--primary)" : dot};"
                   onclick="if(!event.target.closest('input,button'))ExecCtrl.openEdit('${t.id}')">
                <div class="slot-title" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.text}">${t.text}</div>
                <span class="slot-date-pick" title="Reagendar" ondragstart="event.stopPropagation()" onclick="event.stopPropagation()">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <input type="date" value="${t.execDate || ""}" ondragstart="event.stopPropagation()" onchange="event.stopPropagation();ExecCtrl.changeDate('${t.id}',this.value)">
                </span>
                <button class="slot-check${isDone ? " checked" : ""}" title="${isDone ? "Desfazer conclusão" : "Marcar como concluído"}"
                        ondragstart="event.stopPropagation()" onclick="event.stopPropagation();ExecCtrl.toggleDone('${t.id}')">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
              </div>`;
          }
        });
        tr += `</td>`;
      });
      tbody.innerHTML += tr + `</tr>`;
    });
  },

  changeDate(id, newDate) {
    if (!newDate) return;
    const d = new Date(newDate + "T12:00:00");
    if (this.getWeekStart(d) < this.getWeekStart(new Date())) {
      Toast.show("Não é possível reagendar para uma semana passada.", "warning");
      return;
    }
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    const days = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
    task.execDate = newDate;
    task.execDay  = days[d.getDay()];
    App.touch(task);
    App.save();
    this.renderTaskList();
    this.renderTable();
    Toast.show(`Reagendado para ${task.execDay}, ${d.toLocaleDateString("pt-BR")}.`, "success");
  },

  moveToSlot(id, dateIso, dayName, time) {
    if (this.getWeekStart(new Date(dateIso + "T12:00:00")) < this.getWeekStart(new Date())) {
      Toast.show("Não é possível mover para uma semana passada.", "warning");
      return;
    }
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    task.execDate = dateIso;
    task.execDay  = dayName;
    task.execTime = time;
    App.touch(task);
    App.save();
    this.renderTaskList();
    this.renderTable();
    Toast.show(`Movido para ${dayName} às ${time}.`, "success");
  },

  allocateToSlot(dateIso, dayName, time, taskId) {
    const id = taskId || this.selectedTaskId;
    if (!id) return;
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    task.execDate   = dateIso;
    task.execDay    = dayName;
    task.execTime   = time;
    task.execStatus = "Pendente";
    App.touch(task);
    App.save();
    this.selectedTaskId = null;
    this.renderTaskList();
    this.renderTable();
    Toast.show(`Alocado em ${dayName} às ${time}.`, "success");
  },

  updateDropdown() { this.renderTaskList(); this.renderTable(); },

  toggleDone(id) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;

    if (task.execStatus === "Concluído") {
      task.execStatus      = "Pendente";
      task.execCompletedAt = null;
      task.done            = false;
      if (task.projectId && task.subtaskId) {
        const proj = AppState.projects.find((p) => p.id === task.projectId);
        const sub  = proj?.subtasks?.find((s) => s.id === task.subtaskId);
        if (sub) { sub.done = false; ProjCtrl.render(); }
      }
    } else {
      task.execStatus      = "Concluído";
      task.execCompletedAt = todayISO();
      task.done            = true;
      if (task.projectId && task.subtaskId) {
        const proj = AppState.projects.find((p) => p.id === task.projectId);
        const sub  = proj?.subtasks?.find((s) => s.id === task.subtaskId);
        if (sub) { sub.done = true; ProjCtrl.render(); }
      }
      Toast.show("Tarefa concluída!", "success");
    }

    App.touch(task);
    App.save();
    this.renderTaskList();
    this.renderTable();
  },

  remove(id) {
    const task = AppState.tasks.find((t) => t.id === id);
    if (!task) return;
    task.execDate   = null;
    task.execDay    = null;
    task.execTime   = null;
    task.execStatus = null;
    App.touch(task);
    App.save();
    this.renderTaskList();
    this.renderTable();
  },
};

window.ExecCtrl = ExecCtrl;
