const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split(";") : [];
  for (const rawCookie of cookies) {
    const cookie = rawCookie.trim();
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.slice(name.length + 1));
    }
  }
  return "";
}

function parseDrfError(data) {
  if (!data || typeof data !== "object") {
    return { message: "An unexpected error occurred.", fieldErrors: {} };
  }

  const fieldErrors = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "detail" || key === "non_field_errors") {
      continue;
    }
    if (Array.isArray(value) && value.length > 0) {
      fieldErrors[key] = String(value[0]);
    } else if (typeof value === "string") {
      fieldErrors[key] = value;
    }
  }

  let message = "";
  if (typeof data.detail === "string") {
    message = data.detail;
  } else if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    message = String(data.non_field_errors[0]);
  } else if (Object.keys(fieldErrors).length > 0) {
    message = "Please review the highlighted fields below.";
  } else {
    message = "Request could not be completed.";
  }

  return { message, fieldErrors };
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const isSafeMethod = method === "GET" || method === "HEAD" || method === "OPTIONS";
  if (!isSafeMethod) {
    let csrfToken = getCookie("csrftoken");
    if (!csrfToken && path !== "/auth/csrf/") {
      await fetch(`${API_BASE_URL}/auth/csrf/`, {
        method: "GET",
        credentials: "include",
      });
      csrfToken = getCookie("csrftoken");
    }
    if (csrfToken) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });

  let payload = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  }

  if (!response.ok) {
    const { message, fieldErrors } = parseDrfError(payload);
    throw new ApiError(message, response.status, fieldErrors);
  }

  return payload;
}
