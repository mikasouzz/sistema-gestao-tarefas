export const Curtain = {
  init() {
    const now = new Date();
    const opts = { weekday: "long", day: "numeric", month: "long", year: "numeric" };
    const dateStr = now.toLocaleDateString("pt-BR", opts);
    document.getElementById("curtain-date").textContent =
      dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    document.addEventListener("keydown", (e) => {
      const el = document.getElementById("app-curtain");
      if (e.key === "Enter" && el) this.open();
    });
  },
  open() {
    const el = document.getElementById("app-curtain");
    if (!el) return;
    el.classList.add("lifting");
    setTimeout(() => el.remove(), 750);
  },
};

window.Curtain = Curtain;
