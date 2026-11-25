import { apiRequest } from "./client.js";

export function ensureCsrf() {
  return apiRequest("/auth/csrf/", { method: "GET" });
}

export async function fetchCurrentUser() {
  const data = await apiRequest("/auth/me/", { method: "GET" });
  return data.user;
}

export async function signup({ email, password, organization_name }) {
  const data = await apiRequest("/auth/signup/", {
    method: "POST",
    body: JSON.stringify({ email, password, organization_name }),
  });
  return data.user;
}

export async function login({ email, password }) {
  const data = await apiRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export function logout() {
  return apiRequest("/auth/logout/", { method: "POST" });
}
