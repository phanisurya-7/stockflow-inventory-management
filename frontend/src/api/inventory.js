import { apiRequest } from "./client.js";

export function fetchDashboardMetrics() {
  return apiRequest("/dashboard/metrics/", { method: "GET" });
}

export function listProducts(search = "") {
  const trimmed = search.trim();
  const query = trimmed ? `?search=${encodeURIComponent(trimmed)}` : "";
  return apiRequest(`/products/${query}`, { method: "GET" });
}

export function getProduct(id) {
  return apiRequest(`/products/${id}/`, { method: "GET" });
}

export function createProduct(payload) {
  return apiRequest("/products/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id, payload) {
  return apiRequest(`/products/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id) {
  return apiRequest(`/products/${id}/`, {
    method: "DELETE",
  });
}
