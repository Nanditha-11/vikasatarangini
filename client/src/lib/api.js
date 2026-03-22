const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  
  // In production (deployed), use relative paths to the same host
  if (import.meta.env.PROD) return ""; 

  // Fallback: Use the same host but port 5000 for local development
  const { hostname } = window.location;
  return `http://${hostname}:5000`;
};

const API_BASE = getApiBase();

export function getToken() {
  return localStorage.getItem("vt_token") || "";
}

export function setToken(token) {
  if (token) localStorage.setItem("vt_token", token);
  else localStorage.removeItem("vt_token");
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      if (contentType.includes("application/json")) {
        const body = await res.json();
        msg = body?.error || msg;
      } else {
        msg = (await res.text()) || msg;
      }
    } catch {
      // ignore
    }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  if (contentType.includes("application/json")) return await res.json();
  return res;
}

