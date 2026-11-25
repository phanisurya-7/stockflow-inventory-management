import { useEffect, useState } from "react";
import { createProduct, updateProduct } from "../api/inventory.js";
import { ApiError } from "../api/client.js";

function toFormValues(product, defaultThreshold) {
  if (!product) {
    return {
      name: "",
      sku: "",
      description: "",
      quantity_on_hand: "0",
      cost_price: "",
      selling_price: "",
      low_stock_threshold: "",
    };
  }

  return {
    name: product.name ?? "",
    sku: product.sku ?? "",
    description: product.description ?? "",
    quantity_on_hand: String(product.quantity_on_hand ?? 0),
    cost_price: product.cost_price ?? "",
    selling_price: product.selling_price ?? "",
    low_stock_threshold:
      product.low_stock_threshold !== null && product.low_stock_threshold !== undefined
        ? String(product.low_stock_threshold)
        : "",
    _defaultThreshold: defaultThreshold,
  };
}

export default function ProductFormModal({
  isOpen,
  product,
  defaultThreshold = 5,
  onClose,
  onSaved,
}) {
  const isEditing = Boolean(product);
  const [values, setValues] = useState(() => toFormValues(product, defaultThreshold));
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValues(toFormValues(product, defaultThreshold));
      setFieldErrors({});
      setFormError("");
    }
  }, [isOpen, product, defaultThreshold]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  function updateField(name, value) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  function validateClient() {
    const errors = {};
    if (!values.name.trim()) {
      errors.name = "Product name is required.";
    }
    if (!values.sku.trim()) {
      errors.sku = "SKU is required.";
    }

    const qty = Number(values.quantity_on_hand);
    if (
      values.quantity_on_hand.trim() === "" ||
      !Number.isInteger(qty) ||
      qty < 0
    ) {
      errors.quantity_on_hand = "Enter a non-negative whole number.";
    }

    if (values.cost_price.trim() !== "") {
      const cost = Number(values.cost_price);
      if (Number.isNaN(cost) || cost < 0) {
        errors.cost_price = "Cost price must be 0 or greater.";
      }
    }

    if (values.selling_price.trim() !== "") {
      const selling = Number(values.selling_price);
      if (Number.isNaN(selling) || selling < 0) {
        errors.selling_price = "Selling price must be 0 or greater.";
      }
    }

    if (values.low_stock_threshold.trim() !== "") {
      const threshold = Number(values.low_stock_threshold);
      if (!Number.isInteger(threshold) || threshold < 0) {
        errors.low_stock_threshold = "Threshold must be a non-negative whole number.";
      }
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError("");
    const clientErrors = validateClient();
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      return;
    }

    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim().toUpperCase(),
      description: values.description.trim(),
      quantity_on_hand: Number.parseInt(values.quantity_on_hand, 10),
      cost_price: values.cost_price.trim() === "" ? null : values.cost_price.trim(),
      selling_price: values.selling_price.trim() === "" ? null : values.selling_price.trim(),
      low_stock_threshold:
        values.low_stock_threshold.trim() === ""
          ? null
          : Number.parseInt(values.low_stock_threshold, 10),
    };

    setIsSubmitting(true);
    try {
      const saved = isEditing
        ? await updateProduct(product.id, payload)
        : await createProduct(payload);
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors || {});
        setFormError(error.message);
      } else {
        setFormError("Unable to save product. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="sf-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
    >
      <div className="sf-modal">
        <div className="sf-modal-header">
          <div>
            <h2 id="product-modal-title" className="sf-modal-title">
              {isEditing ? "Edit product" : "Add product"}
            </h2>
            <p className="sf-modal-subtitle">
              {isEditing
                ? "Update item specifications, pricing, or stock levels."
                : "Register a new SKU in your organization inventory."}
            </p>
          </div>
          <button
            type="button"
            className="sf-modal-close"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {formError && (
          <div className="sf-alert-error" role="alert">
            {formError}
          </div>
        )}

        <form className="sf-form" onSubmit={handleSubmit} noValidate>
          <div className="sf-field">
            <label className="sf-label" htmlFor="prod-name">
              Product name
            </label>
            <input
              id="prod-name"
              type="text"
              className="sf-input"
              placeholder="e.g. Brass Valve 12mm"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              aria-invalid={Boolean(fieldErrors.name)}
              disabled={isSubmitting}
            />
            {fieldErrors.name && <p className="sf-field-error">{fieldErrors.name}</p>}
          </div>

          <div className="sf-form-grid-2">
            <div className="sf-field">
              <label className="sf-label" htmlFor="prod-sku">
                SKU
              </label>
              <input
                id="prod-sku"
                type="text"
                className="sf-input"
                placeholder="e.g. BV-012"
                value={values.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                aria-invalid={Boolean(fieldErrors.sku)}
                disabled={isSubmitting}
              />
              {fieldErrors.sku ? (
                <p className="sf-field-error">{fieldErrors.sku}</p>
              ) : (
                <p className="sf-field-hint">Saved uppercase; unique per org.</p>
              )}
            </div>

            <div className="sf-field">
              <label className="sf-label" htmlFor="prod-qty">
                Quantity on hand
              </label>
              <input
                id="prod-qty"
                type="number"
                min="0"
                step="1"
                className="sf-input"
                value={values.quantity_on_hand}
                onChange={(e) => updateField("quantity_on_hand", e.target.value)}
                aria-invalid={Boolean(fieldErrors.quantity_on_hand)}
                disabled={isSubmitting}
              />
              {fieldErrors.quantity_on_hand && (
                <p className="sf-field-error">{fieldErrors.quantity_on_hand}</p>
              )}
            </div>
          </div>

          <div className="sf-form-grid-2">
            <div className="sf-field">
              <label className="sf-label" htmlFor="prod-cost">
                Cost price (optional)
              </label>
              <input
                id="prod-cost"
                type="number"
                min="0"
                step="0.01"
                className="sf-input"
                placeholder="0.00"
                value={values.cost_price}
                onChange={(e) => updateField("cost_price", e.target.value)}
                aria-invalid={Boolean(fieldErrors.cost_price)}
                disabled={isSubmitting}
              />
              {fieldErrors.cost_price && (
                <p className="sf-field-error">{fieldErrors.cost_price}</p>
              )}
            </div>

            <div className="sf-field">
              <label className="sf-label" htmlFor="prod-selling">
                Selling price (optional)
              </label>
              <input
                id="prod-selling"
                type="number"
                min="0"
                step="0.01"
                className="sf-input"
                placeholder="0.00"
                value={values.selling_price}
                onChange={(e) => updateField("selling_price", e.target.value)}
                aria-invalid={Boolean(fieldErrors.selling_price)}
                disabled={isSubmitting}
              />
              {fieldErrors.selling_price && (
                <p className="sf-field-error">{fieldErrors.selling_price}</p>
              )}
            </div>
          </div>

          <div className="sf-field">
            <label className="sf-label" htmlFor="prod-threshold">
              Low-stock threshold (optional)
            </label>
            <input
              id="prod-threshold"
              type="number"
              min="0"
              step="1"
              className="sf-input"
              placeholder={`Leave blank to use default (${defaultThreshold})`}
              value={values.low_stock_threshold}
              onChange={(e) => updateField("low_stock_threshold", e.target.value)}
              aria-invalid={Boolean(fieldErrors.low_stock_threshold)}
              disabled={isSubmitting}
            />
            {fieldErrors.low_stock_threshold && (
              <p className="sf-field-error">{fieldErrors.low_stock_threshold}</p>
            )}
          </div>

          <div className="sf-field">
            <label className="sf-label" htmlFor="prod-desc">
              Description (optional)
            </label>
            <textarea
              id="prod-desc"
              className="sf-textarea"
              placeholder="Brief material, unit, or storage notes"
              value={values.description}
              onChange={(e) => updateField("description", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="sf-modal-actions">
            <button
              type="button"
              className="sf-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="sf-btn-primary" disabled={isSubmitting}>
              <span className="sf-submit-dot" aria-hidden="true" />
              {isSubmitting
                ? isEditing
                  ? "Saving changes..."
                  : "Adding product..."
                : isEditing
                  ? "Save changes"
                  : "Add product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
