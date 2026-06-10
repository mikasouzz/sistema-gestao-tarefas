export const EditModal = {
  open({ title, fields, onSave, onDelete }) {
    document.getElementById("edit-modal-title").textContent = title;
    const container = document.getElementById("edit-modal-fields");
    container.innerHTML = fields.map((f) => {
      let input;
      if (f.type === "textarea") {
        input = `<textarea id="ef-${f.key}" style="width:100%;min-height:70px;">${f.value || ""}</textarea>`;
      } else if (f.type === "select") {
        const opts = f.options.map((o) => `<option${o === f.value ? " selected" : ""}>${o}</option>`).join("");
        input = `<select id="ef-${f.key}">${opts}</select>`;
      } else if (f.type === "number") {
        input = `<input id="ef-${f.key}" type="number" min="${f.min ?? 0}" max="${f.max ?? 10}" value="${f.value ?? ""}">`;
      } else {
        input = `<input id="ef-${f.key}" type="text" value="${f.value || ""}">`;
      }
      return `<div style="margin-bottom:12px;">
        <label style="font-size:0.78rem;color:var(--text-secondary);display:block;margin-bottom:4px;">${f.label}</label>
        ${input}
      </div>`;
    }).join("");

    document.getElementById("edit-modal-save").onclick = () => {
      const values = Object.fromEntries(
        fields.map((f) => [f.key, document.getElementById(`ef-${f.key}`).value.trim()])
      );
      onSave(values);
      EditModal.close();
    };

    const deleteBtn = document.getElementById("edit-modal-delete");
    if (onDelete) {
      deleteBtn.style.display = "";
      deleteBtn.onclick = () => {
        window.ConfirmModal.open(
          "Excluir",
          "Tem certeza? Esta ação não pode ser desfeita.",
          () => { EditModal.close(); onDelete(); }
        );
      };
    } else {
      deleteBtn.style.display = "none";
    }

    document.getElementById("modal-edit").classList.add("active");
  },

  close() {
    document.getElementById("modal-edit").classList.remove("active");
  },
};

window.EditModal = EditModal;
