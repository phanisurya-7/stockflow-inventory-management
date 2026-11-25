import { useEffect } from "react";

export default function DeleteConfirmModal({
  product,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!product) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [product, isDeleting, onCancel]);

  if (!product) {
    return null;
  }

  return (
    <div
      className="sf-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="sf-modal sf-modal--compact">
        <div className="sf-modal-header">
          <div>
            <h2 id="delete-modal-title" className="sf-modal-title">
              Delete product?
            </h2>
            <p className="sf-modal-subtitle">
              This will permanently remove <strong>{product.name}</strong> (
              <code>{product.sku}</code>) from your inventory.
            </p>
          </div>
        </div>

        {error && (
          <div className="sf-alert-error" role="alert">
            {error}
          </div>
        )}

        <div className="sf-modal-actions">
          <button
            type="button"
            className="sf-btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="sf-btn-danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete product"}
          </button>
        </div>
      </div>
    </div>
  );
}
