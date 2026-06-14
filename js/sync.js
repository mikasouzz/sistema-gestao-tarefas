import { AppState, AppArchive, STORAGE_KEY, ARCHIVE_KEY } from "./state.js";
import { db } from "./db.js";

export const SyncCtrl = {
  userId: null,

  _taskToRow(t, archived = false) {
    return {
      id: t.id,
      user_id: this.userId,
      text: t.text,
      created_at: t.createdAt || new Date().toISOString(),
      updated_at: t.updatedAt || t.createdAt || new Date().toISOString(),
      done: t.done || false,
      type: t.type || null,
      category: t.category || null,
      fonte: t.fonte || null,
      score: t.score ?? null,
      quadrant: t.quadrant || null,
      project_id: t.projectId || null,
      subtask_id: t.subtaskId || null,
      exec_date: t.execDate || null,
      exec_day: t.execDay || null,
      exec_time: t.execTime || null,
      exec_status: t.execStatus || null,
      exec_completed_at: t.execCompletedAt || null,
      responsavel: t.responsavel || null,
      deleg_status: t.delegStatus || null,
      deleg_completed_at: t.delegCompletedAt || null,
      archived,
    };
  },

  _rowToTask(row) {
    return {
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      done: row.done,
      type: row.type,
      category: row.category,
      fonte: row.fonte,
      score: row.score,
      quadrant: row.quadrant,
      projectId: row.project_id,
      subtaskId: row.subtask_id,
      execDate: row.exec_date,
      execDay: row.exec_day,
      execTime: row.exec_time,
      execStatus: row.exec_status,
      execCompletedAt: row.exec_completed_at,
      responsavel: row.responsavel,
      delegStatus: row.deleg_status,
      delegCompletedAt: row.deleg_completed_at,
    };
  },

  _projectToRow(p) {
    return {
      id: p.id,
      user_id: this.userId,
      title: p.title,
      description: p.desc || "",
      term: p.term,
      status: p.status,
      completed_at: p.completedAt || null,
      updated_at: p.updatedAt || new Date().toISOString(),
      subtasks: p.subtasks || [],
    };
  },

  _rowToProject(row) {
    return {
      id: row.id,
      title: row.title,
      desc: row.description,
      term: row.term,
      status: row.status,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
      subtasks: row.subtasks || [],
    };
  },

  async loadAll() {
    const [{ data: remoteTasks, error: e1 }, { data: remoteProjects, error: e2 }] =
      await Promise.all([
        db.from("tb_super_tasks").select("*").eq("user_id", this.userId),
        db.from("tb_super_projects").select("*").eq("user_id", this.userId),
      ]);

    if (e1 || e2) throw new Error(e1?.message || e2?.message);

    const localAll = [
      ...AppState.tasks.map((t) => ({ ...t, _arc: false })),
      ...AppArchive.tasks.map((t) => ({ ...t, _arc: true })),
    ];
    const remoteMap = new Map(remoteTasks.map((r) => [r.id, r]));
    const localMap  = new Map(localAll.map((t) => [t.id, t]));
    const allIds    = new Set([...remoteMap.keys(), ...localMap.keys()]);

    const mergedActive = [], mergedArchived = [];
    for (const id of allIds) {
      const remote = remoteMap.get(id);
      const local  = localMap.get(id);
      let winner;
      if (!remote) {
        winner = local;
      } else if (!local) {
        winner = { ...this._rowToTask(remote), _arc: remote.archived };
      } else {
        const rt = remote.updated_at || remote.created_at || "0";
        const lt = local.updatedAt   || local.createdAt   || "0";
        winner = rt > lt
          ? { ...this._rowToTask(remote), _arc: remote.archived }
          : local;
      }
      const { _arc, ...task } = winner;
      (_arc ? mergedArchived : mergedActive).push(task);
    }

    const remotePMap = new Map(remoteProjects.map((r) => [r.id, r]));
    const localPMap  = new Map(AppState.projects.map((p) => [p.id, p]));
    const allPIds    = new Set([...remotePMap.keys(), ...localPMap.keys()]);

    const mergedProjects = [];
    for (const id of allPIds) {
      const remote = remotePMap.get(id);
      const local  = localPMap.get(id);
      if (!remote) {
        mergedProjects.push(local);
      } else if (!local) {
        mergedProjects.push(this._rowToProject(remote));
      } else {
        const rt = remote.updated_at || "0";
        const lt = local.updatedAt   || "0";
        mergedProjects.push(rt > lt ? this._rowToProject(remote) : local);
      }
    }

    AppState.tasks    = mergedActive;
    AppState.projects = mergedProjects;
    AppArchive.tasks  = mergedArchived;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState));
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(AppArchive));

    await this.pushAll();
  },

  async pushAll() {
    if (!this.userId) return;
    const taskRows = [
      ...AppState.tasks.map((t) => this._taskToRow(t, false)),
      ...AppArchive.tasks.map((t) => this._taskToRow(t, true)),
    ];
    const projRows = AppState.projects.map((p) => this._projectToRow(p));

    await Promise.all([
      db.from("tb_super_tasks").upsert(taskRows, { onConflict: "id" }),
      db.from("tb_super_projects").upsert(projRows, { onConflict: "id" }),
    ]);
  },

  async deleteTask(id) {
    if (!navigator.onLine || !this.userId) return;
    await db.from("tb_super_tasks").delete().eq("id", id).eq("user_id", this.userId);
  },

  async deleteProject(id) {
    if (!navigator.onLine || !this.userId) return;
    await db.from("tb_super_projects").delete().eq("id", id).eq("user_id", this.userId);
  },

  async syncInBackground() {
    if (!navigator.onLine || !this.userId) return;
    this.setStatus("syncing");
    try {
      await this.pushAll();
      this.setStatus("synced");
    } catch (e) {
      this.setStatus("error");
      console.warn("[Sync] Falha:", e.message);
    }
  },

  setStatus(s) {
    const dot       = document.getElementById("sync-dot");
    const label     = document.getElementById("sync-label");
    const btn       = document.getElementById("sync-status-btn");
    const logoutBtn = document.getElementById("sync-logout");
    if (!dot || !label) return;
    dot.className = "sync-dot";
    if (s === "idle") {
      label.textContent = "Não conectado";
      if (btn) { btn.classList.remove("no-action"); btn.onclick = () => SyncCtrl.openLogin(); }
      if (logoutBtn) logoutBtn.style.display = "none";
    } else if (s === "syncing") {
      dot.classList.add("syncing");
      label.textContent = "Sincronizando…";
      if (btn) { btn.classList.add("no-action"); btn.onclick = null; }
      if (logoutBtn) logoutBtn.style.display = "none";
    } else if (s === "synced") {
      dot.classList.add("synced");
      label.textContent = "Sincronizado";
      if (btn) { btn.classList.add("no-action"); btn.onclick = null; }
      if (logoutBtn) logoutBtn.style.display = "inline";
    } else if (s === "error") {
      dot.classList.add("error");
      label.textContent = "Erro ao sincronizar";
      if (btn) { btn.classList.remove("no-action"); btn.onclick = () => SyncCtrl.openLogin(); }
      if (logoutBtn) logoutBtn.style.display = "none";
    }
  },

  openLogin() {
    document.getElementById("auth-screen").classList.add("open");
  },

  closeLogin() {
    document.getElementById("auth-screen").classList.remove("open");
    document.getElementById("auth-error").textContent = "";
  },

  async logout() {
    await db.auth.signOut();
    this.userId = null;
    this.setStatus("idle");
  },

  _initAuthForm() {
    const authForm  = document.getElementById("auth-form");
    const authBtn   = document.getElementById("auth-btn");
    const authError = document.getElementById("auth-error");
    authForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      authBtn.disabled = true;
      authError.textContent = "";
      const email    = document.getElementById("auth-email").value.trim();
      const password = document.getElementById("auth-password").value;
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) {
        authError.textContent = error.message;
        authBtn.disabled = false;
        return;
      }
      this.closeLogin();
      this.userId = data.user.id;
      this.setStatus("syncing");
      try {
        await this.loadAll();
        this.setStatus("synced");
        // App importado por main.js — acesso via window para evitar circular
        window.App.rerender();
      } catch (err) {
        this.setStatus("error");
        console.warn("[Sync] loadAll falhou:", err.message);
      }
      authBtn.disabled = false;
    });
  },
};

window.SyncCtrl = SyncCtrl;
