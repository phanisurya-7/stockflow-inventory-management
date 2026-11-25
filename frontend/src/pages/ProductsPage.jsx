import { useEffect, useState } from "react";
import {
  deleteProduct,
  listProducts,
  updateProduct,
} from "../api/inventory.js";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import ProductFormModal from "../components/ProductFormModal.jsx";

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return String(value);
  }
  return `$${num.toFixed(2)}`;
}

function StockStatusBadge({ product }) {
  if (product.quantity_on_hand === 0) {
    return <span className="sf-badge sf-badge--out">Out of stock</span>;
  }
  if (product.is_low_stock) {
    return (
      <span className="sf-badge sf-badge--low">
        Low (&le;{product.effective_low_stock_threshold})
      </span>
    );
  }
  return <span className="sf-badge sf-badge--ok">In stock</span>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [updatingQtyIds, setUpdatingQtyIds] = useState({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  async function loadProducts(searchTerm) {
    setIsLoading(true);
    setPageError("");
    try {
      const data = await listProducts(searchTerm);
      setProducts(data);
    } catch (err) {
      setPageError(err.message || "Unable to load products.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts(debouncedSearch);
  }, [debouncedSearch]);

  function openCreateModal() {
    setEditingProduct(null);
    setIsFormOpen(true);
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setIsFormOpen(true);
  }

  function handleFormSaved() {
    setIsFormOpen(false);
    setEditingProduct(null);
    loadProducts(debouncedSearch);
  }

  async function handleQuantityDelta(product, delta) {
    const nextQuantity = product.quantity_on_hand + delta;
    if (nextQuantity < 0 || updatingQtyIds[product.id]) {
      return;
    }

    setPageError("");
    setUpdatingQtyIds((prev) => ({ ...prev, [product.id]: true }));
    try {
      const updated = await updateProduct(product.id, {
        quantity_on_hand: nextQuantity,
      });
      setProducts((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (err) {
      setPageError(err.message || "Unable to update product quantity.");
    } finally {
      setUpdatingQtyIds((prev) => {
        const next = { ...prev };
        delete next[product.id];
        return next;
      });
    }
  }

  async function handleConfirmDelete() {
    if (!deletingProduct) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteProduct(deletingProduct.id);
      setProducts((prev) => prev.filter((item) => item.id !== deletingProduct.id));
      setDeletingProduct(null);
    } catch (err) {
      setDeleteError(err.message || "Unable to delete product.");
    } finally {
      setIsDeleting(false);
    }
  }

  const defaultThreshold =
    products.length > 0 && products[0].low_stock_threshold === null
      ? products[0].effective_low_stock_threshold
      : 5;

  return (
    <div>
      <header className="sf-page-header">
        <div>
          <p className="sf-page-kicker">Inventory</p>
          <h1 className="sf-page-title">Product Ledger</h1>
          <p className="sf-page-subtitle">
            Manage SKUs, pricing, and on-hand stock quantities for your organization.
          </p>
        </div>

        <button type="button" className="sf-btn-primary" onClick={openCreateModal}>
          <span className="sf-submit-dot" aria-hidden="true" />
          Add product
        </button>
      </header>

      <div className="sf-toolbar">
        <div className="sf-search-wrap">
          <input
            type="search"
            className="sf-search-input"
            placeholder="Search by product name or SKU..."
            aria-label="Search products by name or SKU"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="sf-search-clear"
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <span className="sf-count-meta">
          {isLoading
            ? "Loading..."
            : `${products.length} ${products.length === 1 ? "item" : "items"}`}
        </span>
      </div>

      {pageError && (
        <div className="sf-alert-error" role="alert">
          {pageError}
        </div>
      )}

      <section className="sf-panel" aria-label="Product catalog">
        {isLoading ? (
          <div className="sf-empty-state">
            <p className="sf-count-meta">Loading product ledger...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="sf-empty-state">
            <h2 className="sf-empty-title">
              {debouncedSearch ? "No matching products" : "No products yet"}
            </h2>
            <p className="sf-empty-copy">
              {debouncedSearch
                ? `No items matched "${debouncedSearch}". Try a different name or SKU.`
                : "Create your first SKU to track quantities and low-stock thresholds."}
            </p>
            {!debouncedSearch && (
              <button type="button" className="sf-btn-primary" onClick={openCreateModal}>
                <span className="sf-submit-dot" aria-hidden="true" />
                Add first product
              </button>
            )}
          </div>
        ) : (
          <div className="sf-table-wrap">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Selling Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isBusy = Boolean(updatingQtyIds[product.id]);
                  return (
                    <tr key={product.id}>
                      <td>
                        <div className="sf-product-name">{product.name}</div>
                        {product.description && (
                          <p className="sf-product-desc" title={product.description}>
                            {product.description}
                          </p>
                        )}
                      </td>
                      <td>
                        <span className="sf-sku-code">{product.sku}</span>
                      </td>
                      <td>
                        <div className="sf-qty-control" aria-label={`Quantity for ${product.name}`}>
                          <button
                            type="button"
                            className="sf-qty-btn"
                            aria-label={`Decrease quantity for ${product.name}`}
                            disabled={isBusy || product.quantity_on_hand <= 0}
                            onClick={() => handleQuantityDelta(product, -1)}
                          >
                            −
                          </button>
                          <span className="sf-qty-value">
                            {isBusy ? "…" : product.quantity_on_hand}
                          </span>
                          <button
                            type="button"
                            className="sf-qty-btn"
                            aria-label={`Increase quantity for ${product.name}`}
                            disabled={isBusy}
                            onClick={() => handleQuantityDelta(product, 1)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        <StockStatusBadge product={product} />
                      </td>
                      <td className="sf-price-cell">
                        {formatPrice(product.selling_price)}
                      </td>
                      <td>
                        <div className="sf-row-actions">
                          <button
                            type="button"
                            className="sf-btn-ghost"
                            onClick={() => openEditModal(product)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="sf-btn-ghost sf-btn-ghost-danger"
                            onClick={() => {
                              setDeleteError("");
                              setDeletingProduct(product);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ProductFormModal
        isOpen={isFormOpen}
        product={editingProduct}
        defaultThreshold={defaultThreshold}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onSaved={handleFormSaved}
      />

      <DeleteConfirmModal
        product={deletingProduct}
        isDeleting={isDeleting}
        error={deleteError}
        onCancel={() => {
          setDeletingProduct(null);
          setDeleteError("");
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
