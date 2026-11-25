import { useEffect, useState } from "react";
import { fetchDashboardMetrics } from "../api/inventory.js";

export default function DashboardPage({ onOpenInventory }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadMetrics() {
    setIsLoading(true);
    setError("");
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err.message || "Unable to load inventory metrics.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  return (
    <div>
      <header className="sf-page-header">
        <div>
          <p className="sf-page-kicker">Dashboard</p>
          <h1 className="sf-page-title">Inventory Overview</h1>
          <p className="sf-page-subtitle">
            Live catalog counts, total stock on hand, and items at or below threshold.
          </p>
        </div>

        <button type="button" className="sf-btn-primary" onClick={onOpenInventory}>
          <span className="sf-submit-dot" aria-hidden="true" />
          Open Inventory
        </button>
      </header>

      {error && (
        <div className="sf-alert-error" role="alert">
          {error}
        </div>
      )}

      {isLoading ? (
        <p className="sf-count-meta">Loading workspace metrics...</p>
      ) : metrics ? (
        <>
          <section className="sf-kpi-grid" aria-label="Key inventory metrics">
            <article className="sf-kpi-card">
              <p className="sf-kpi-index">01 / Catalog</p>
              <p className="sf-kpi-value">{metrics.total_products}</p>
              <p className="sf-kpi-note">Total products</p>
            </article>

            <article className="sf-kpi-card">
              <p className="sf-kpi-index">02 / Stock Volume</p>
              <p className="sf-kpi-value">{metrics.total_quantity}</p>
              <p className="sf-kpi-note">Total units on hand</p>
            </article>

            <article
              className={`sf-kpi-card ${
                metrics.low_stock_count > 0 ? "sf-kpi-card--alert" : ""
              }`}
            >
              <p className="sf-kpi-index">03 / Attention</p>
              <p className="sf-kpi-value">{metrics.low_stock_count}</p>
              <p className="sf-kpi-note">
                Low-stock items (default threshold: {metrics.default_low_stock_threshold})
              </p>
            </article>
          </section>

          <section className="sf-panel" aria-label="Low-stock products">
            <div className="sf-panel-header">
              <div>
                <h2 className="sf-panel-title">Low-Stock Watchlist</h2>
                <p className="sf-panel-subtitle">
                  Products where quantity on hand is less than or equal to threshold.
                </p>
              </div>
              <button
                type="button"
                className="sf-btn-secondary"
                onClick={onOpenInventory}
              >
                Manage stock
              </button>
            </div>

            {metrics.low_stock_products.length === 0 ? (
              <div className="sf-empty-state">
                <h3 className="sf-empty-title">Stock levels are healthy</h3>
                <p className="sf-empty-copy">
                  {metrics.total_products === 0
                    ? "Add your first product in Inventory to begin tracking stock levels."
                    : "No products are currently at or below their low-stock threshold."}
                </p>
              </div>
            ) : (
              <div className="sf-table-wrap">
                <table className="sf-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Threshold</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.low_stock_products.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="sf-product-name">{item.name}</span>
                        </td>
                        <td>
                          <span className="sf-sku-code">{item.sku}</span>
                        </td>
                        <td className="sf-price-cell">{item.quantity_on_hand}</td>
                        <td className="sf-price-cell">
                          {item.effective_low_stock_threshold}
                        </td>
                        <td>
                          {item.quantity_on_hand === 0 ? (
                            <span className="sf-badge sf-badge--out">Out of stock</span>
                          ) : (
                            <span className="sf-badge sf-badge--low">Low stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
