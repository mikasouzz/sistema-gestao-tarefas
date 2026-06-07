export const Toast = {
  show(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error")   icon = "❌";
    if (type === "warning") icon = "⚠️";

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },
};

export const ConfirmModal = {
  onConfirm: null,
  open(title, message, callback, btnText = "Confirmar", btnClass = "btn-danger") {
    document.getElementById("confirm-title").innerText = title;
    document.getElementById("confirm-message").innerText = message;
    const btnYes = document.getElementById("confirm-btn-yes");
    btnYes.className = `btn flex-1 ${btnClass}`;
    btnYes.style.justifyContent = "center";
    btnYes.innerText = btnText;
    this.onConfirm = callback;
    document.getElementById("modal-confirm").classList.add("active");

    btnYes.onclick = () => {
      if (this.onConfirm) this.onConfirm();
      this.close();
    };
  },
  close() {
    document.getElementById("modal-confirm").classList.remove("active");
    this.onConfirm = null;
  },
};

window.Toast        = Toast;
window.ConfirmModal = ConfirmModal;
