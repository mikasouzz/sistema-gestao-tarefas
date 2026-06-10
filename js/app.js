import {
  AppState, AppArchive, STORAGE_KEY, ARCHIVE_KEY, defaultState,
  setAppState, setAppArchive,
} from "./state.js";
import { db } from "./db.js";
import { localDateISO, todayISO } from "./date.js";
import { SyncCtrl } from "./sync.js";
import { Toast, ConfirmModal } from "./toast.js";
import { Curtain } from "./curtain.js";
import { HomeCtrl }    from "./controllers/home.js";
import { InboxCtrl }   from "./controllers/inbox.js";
import { TriageCtrl }  from "./controllers/triage.js";
import { ExecCtrl }    from "./controllers/exec.js";
import { ProjCtrl }    from "./controllers/projects.js";
import { MonCtrl }     from "./controllers/monitor.js";
import { DashCtrl }    from "./controllers/dashboard.js";
import { RetroCtrl }   from "./controllers/retro.js";

export const App = {
  navigate(targetId) {
    document.querySelector(`.nav-item[data-target="${targetId}"]`)?.click();
  },

  init() {
    this.migrateIfNeeded();
    this.migrateUpdatedAt();
    this.bindNav();
    this.setupFileImport();
    this.setDefaultMonths();

    Curtain.init();
    this.rerender();
    ExecCtrl.init();
    RetroCtrl.init();

    this.setupDragAndDrop();
  },

  rerender() {
    this.archiveOldTasks();
    HomeCtrl.render();
    InboxCtrl.render();
    TriageCtrl.renderCriteria();
    TriageCtrl.updateDropdown();
    ExecCtrl.renderTaskList();
    ExecCtrl.renderTable();
    ProjCtrl.render();
    MonCtrl.render();
  },

  touch(...objs) {
    const now = new Date().toISOString();
    objs.forEach((o) => { if (o) o.updatedAt = now; });
  },

  save(skipSync = false) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
    if (!skipSync) SyncCtrl.syncInBackground();
  },

  saveArchive(skipSync = false) {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(AppArchive));
    if (!skipSync) SyncCtrl.syncInBackground();
  },

  migrateUpdatedAt() {
    const now = new Date().toISOString();
    let dirty = false;
    [...AppState.tasks, ...AppArchive.tasks].forEach((t) => {
      if (!t.updatedAt) { t.updatedAt = t.createdAt || now; dirty = true; }
    });
    AppState.projects.forEach((p) => {
      if (!p.updatedAt) { p.updatedAt = now; dirty = true; }
    });
    if (dirty) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(AppArchive));
    }
  },

  archiveOldTasks() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = localDateISO(cutoff);

    const toArchive = AppState.tasks.filter((t) => {
      if (!t.done) return false;
      const completedAt = t.execCompletedAt || t.delegCompletedAt;
      return completedAt && completedAt < cutoffStr;
    });
    if (toArchive.length === 0) return;

    AppArchive.tasks.push(...toArchive);
    this.saveArchive();
    const ids = new Set(toArchive.map((t) => t.id));
    AppState.tasks = AppState.tasks.filter((t) => !ids.has(t.id));
    this.save();
    console.log(`[Arquivo] ${toArchive.length} tarefa(s) arquivada(s).`);
  },

  migrateIfNeeded() {
    if (AppState.tasks !== undefined) return;

    const tasks = [];
    const today = todayISO();

    (AppState.inbox || []).forEach((item) => {
      tasks.push({ id: item.id, text: item.text, createdAt: item.createdAt || new Date().toISOString(), done: false });
    });

    (AppState.triaged || []).forEach((item) => {
      tasks.push({
        id: item.id, text: item.originalText, createdAt: new Date().toISOString(),
        type: item.type, category: item.category, score: item.score, quadrant: item.quadrant,
        projectId: item.projectId || null, subtaskId: item.subtaskId || null, done: item.done || false,
      });
    });

    (AppState.execution || []).forEach((entry) => {
      const task = tasks.find((t) => t.id === entry.taskId);
      if (task) {
        task.execDate = entry.date; task.execDay = entry.day; task.execTime = entry.time; task.execStatus = entry.status;
        if (entry.status === "Concluído") { task.execCompletedAt = today; task.done = true; }
      }
    });

    (AppState.delegated || []).forEach((entry) => {
      const task = tasks.find((t) => t.text === entry.title && (t.category === "delegar" || t.quadrant === "q3"));
      if (task) {
        task.responsavel = entry.resp || ""; task.delegStatus = entry.status;
        if (entry.status === "done") { task.delegCompletedAt = today; task.done = true; }
      } else {
        tasks.push({
          id: entry.id, text: entry.title, createdAt: new Date().toISOString(),
          category: "delegar", quadrant: "q3", responsavel: entry.resp || "",
          delegStatus: entry.status, done: entry.status === "done",
          delegCompletedAt: entry.status === "done" ? today : null,
        });
      }
    });

    (AppState.history || []).forEach((h) => {
      if (h.type === "Execução") {
        const task = tasks.find((t) => t.text === h.title && !t.execCompletedAt);
        if (task) { task.done = true; task.execCompletedAt = today; task.execStatus = "Concluído"; }
      } else if (h.type === "Delegada") {
        const task = tasks.find((t) => t.text === h.title && !t.delegCompletedAt);
        if (task) { task.done = true; task.delegCompletedAt = today; task.delegStatus = "done"; }
      }
    });

    AppState.tasks = tasks;
    if (!AppState.projects) AppState.projects = [];
    delete AppState.inbox; delete AppState.triaged; delete AppState.execution;
    delete AppState.delegated; delete AppState.history;
    this.save();
    console.log("[Migração] Modelo unificado:", tasks.length, "tarefas");
  },

  exportData() {
    const payload = { state: AppState, archive: AppArchive };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `backup_lideranca_${todayISO()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    Toast.show("Backup exportado com sucesso!", "success");
  },

  setupFileImport() {
    document.getElementById("import-file").addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function (e) {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed.state) {
            setAppState(parsed.state);
            setAppArchive(parsed.archive || { tasks: [] });
            App.save(true);
            App.saveArchive(true);
          } else {
            setAppState(parsed);
            App.save(true);
          }
          Toast.show("Sincronizando backup com a nuvem...", "primary");
          try {
            await SyncCtrl.pushAll();
          } catch (syncErr) {
            console.warn("[Import] Push falhou, dados salvos localmente:", syncErr.message);
          }
          Toast.show("Backup importado com sucesso! Atualizando...", "success");
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          Toast.show("Erro ao ler o arquivo JSON.", "error");
        }
      };
      reader.readAsText(file);
    });
  },

  clearData() {
    ConfirmModal.open(
      "Limpar Histórico",
      "ATENÇÃO: Deseja mesmo apagar TODOS os dados do sistema? Esta ação não pode ser desfeita.",
      async () => {
        if (navigator.onLine && SyncCtrl.userId) {
          await Promise.all([
            db.from("tasks").delete().eq("user_id", SyncCtrl.userId),
            db.from("projects").delete().eq("user_id", SyncCtrl.userId),
          ]);
        }
        setAppState(JSON.parse(JSON.stringify(defaultState)));
        setAppArchive({ tasks: [] });
        App.save(true);
        App.saveArchive(true);
        Toast.show("Dados apagados. Atualizando...", "warning");
        setTimeout(() => location.reload(), 1500);
      },
    );
  },

  bindNav() {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
        document.querySelectorAll(".module-container").forEach((m) => m.classList.remove("active"));

        e.currentTarget.classList.add("active");
        const targetId = e.currentTarget.getAttribute("data-target");
        document.getElementById(targetId).classList.add("active");
        document.getElementById("current-module-title").innerText = e.currentTarget.innerText.trim();

        if (targetId === "mod-home")      HomeCtrl.render();
        if (targetId === "mod-triage")    TriageCtrl.updateDropdown();
        if (targetId === "mod-execution") ExecCtrl.updateDropdown();
        if (targetId === "mod-dashboard") DashCtrl.render();
      });
    });
  },

  setDefaultMonths() {
    const now      = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    document.getElementById("dash-month-filter").value = monthStr;
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  setupDragAndDrop() {
    document.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("kanban-card")) {
        e.dataTransfer.setData("text/plain", e.target.id);
        e.dataTransfer.setData("type", e.target.dataset.type);
        return;
      }
      const listItem = e.target.closest("[data-list-task-id]");
      if (listItem) {
        e.dataTransfer.setData("list-task-id", listItem.dataset.listTaskId);
        e.dataTransfer.effectAllowed = "copy";
        return;
      }
      const slot = e.target.closest(".task-slot[data-exec-id]");
      if (slot) {
        e.dataTransfer.setData("exec-task-id", slot.dataset.execId);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => slot.classList.add("dragging"), 0);
      }
    });

    document.addEventListener("dragend", (e) => {
      const slot = e.target.closest(".task-slot");
      if (slot) slot.classList.remove("dragging");
    });

    const schedBody = document.getElementById("schedule-body");
    if (schedBody) {
      schedBody.addEventListener("dragover",  (e) => { const td = e.target.closest("td[data-date]"); if (td) e.preventDefault(); });
      schedBody.addEventListener("dragleave", (e) => { const td = e.target.closest("td[data-date]"); if (td && !td.contains(e.relatedTarget)) td.classList.remove("drag-over"); });
      schedBody.addEventListener("dragenter", (e) => { const td = e.target.closest("td[data-date]"); if (td) td.classList.add("drag-over"); });
      schedBody.addEventListener("drop", (e) => {
        const td = e.target.closest("td[data-date]");
        if (!td) return;
        e.preventDefault();
        td.classList.remove("drag-over");
        const listId = e.dataTransfer.getData("list-task-id");
        if (listId) {
          ExecCtrl.allocateToSlot(td.dataset.date, td.dataset.day, td.dataset.time, listId);
          return;
        }
        const execId = e.dataTransfer.getData("exec-task-id");
        if (execId) ExecCtrl.moveToSlot(execId, td.dataset.date, td.dataset.day, td.dataset.time);
      });
    }

    const taskPanel = document.querySelector(".exec-task-panel");
    if (taskPanel) {
      document.addEventListener("dragstart", () => {}, false);
      taskPanel.addEventListener("dragover", (e) => {
        if (e.dataTransfer.types.includes("exec-task-id")) e.preventDefault();
      });
      taskPanel.addEventListener("dragenter", (e) => {
        if (e.dataTransfer.types.includes("exec-task-id")) taskPanel.classList.add("drop-return-active");
      });
      taskPanel.addEventListener("dragleave", (e) => {
        if (!taskPanel.contains(e.relatedTarget)) taskPanel.classList.remove("drop-return-active");
      });
      taskPanel.addEventListener("drop", (e) => {
        taskPanel.classList.remove("drop-return-active");
        const execId = e.dataTransfer.getData("exec-task-id");
        if (!execId) return;
        e.preventDefault();
        ExecCtrl.remove(execId);
      });
    }

    document.querySelectorAll(".drop-zone-kanban").forEach((zone) => {
      zone.addEventListener("dragover",  (e) => { e.preventDefault(); zone.style.background = "rgba(124, 58, 237, 0.1)"; });
      zone.addEventListener("dragleave", () => { zone.style.background = "transparent"; });
      zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.style.background = "transparent";
        const id        = e.dataTransfer.getData("text/plain");
        const type      = e.dataTransfer.getData("type");
        const newStatus = zone.dataset.status;
        if (type === "project") ProjCtrl.updateStatus(id.replace("proj-", ""), newStatus);
        if (type === "monitor") MonCtrl.updateStatus(id.replace("mon-", ""), newStatus);
      });
    });
  },
};

window.App = App;
