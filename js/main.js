import { db } from "./db.js";
import { App } from "./app.js";
import { SyncCtrl } from "./sync.js";

window.onload = async () => {
  App.init();
  SyncCtrl._initAuthForm();

  const { data: { session } } = await db.auth.getSession();
  if (session) {
    SyncCtrl.userId = session.user.id;
    SyncCtrl.setStatus("syncing");
    try {
      await SyncCtrl.loadAll();
      SyncCtrl.setStatus("synced");
      App.rerender();
    } catch (e) {
      SyncCtrl.setStatus("error");
      console.warn("[Sync] loadAll falhou, usando local:", e.message);
    }
  }

  window.addEventListener("online", () => {
    if (SyncCtrl.userId) SyncCtrl.syncInBackground();
  });
};
