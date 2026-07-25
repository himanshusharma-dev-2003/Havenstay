const getBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  let url = envUrl || (process.env.NODE_ENV === 'development' ? 'http://localhost:5000/api' : 'https://havenstay-backend-production.up.railway.app/api');
  
  // Remove trailing slashes
  url = url.replace(/\/+$/, '');
  
  // Ensure /api suffix exists
  if (!url.endsWith('/api')) {
    url = `${url}/api`;
  }
  return url;
};

const BASE_URL = getBaseUrl();

// ── Token helpers (localStorage) ─────────────────────────────────────
// Using localStorage as a fallback to httpOnly cookies.
// This ensures cross-origin deployments (Vercel frontend + Railway backend) work
// even when browsers block third-party SameSite cookies.
export const tokenStore = {
  get:    ()      => localStorage.getItem('hs_access_token'),
  set:    (token) => localStorage.setItem('hs_access_token', token),
  clear:  ()      => localStorage.removeItem('hs_access_token'),
};

// ── Refresh using the refresh-token cookie ────────────────────────────
async function refreshAccessToken() {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json();
    // Store the new access token if returned in body
    if (data.accessToken) tokenStore.set(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// ── Core request helper ───────────────────────────────────────────────
async function request(endpoint, options = {}) {
  // Attach token from localStorage as Bearer header (cross-origin safe)
  const token = tokenStore.get();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",   // still send cookies if browser allows it
  });

  // Auto-refresh on 401 (but not for auth endpoints themselves)
  if (res.status === 401 && endpoint !== "/auth/refresh" && endpoint !== "/auth/login" && endpoint !== "/auth/register") {
    const ok = await refreshAccessToken();
    if (ok) {
      // Retry with the new token
      const newToken = tokenStore.get();
      const retryHeaders = {
        "Content-Type": "application/json",
        ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
        ...options.headers,
      };
      const retry = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers: retryHeaders, credentials: "include" });
      const data  = await retry.json();
      if (!retry.ok) throw new Error(data.message || "Request failed");
      return data;
    }
    tokenStore.clear();
    throw new Error("Session expired. Please log in again.");
  }

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text }; }
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export const authAPI = {
  register: (name, email, password) =>
    request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () =>
    request("/auth/logout", { method: "POST" }),
  getMe: () => request("/auth/me"),
};

export const hotelsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/hotels${qs ? "?" + qs : ""}`);
  },
  getById:  (id)       => request(`/hotels/${id}`),
  create:   (data)     => request("/hotels",      { method: "POST",   body: JSON.stringify(data) }),
  update:   (id, data) => request(`/hotels/${id}`,{ method: "PUT",    body: JSON.stringify(data) }),
  delete:   (id)       => request(`/hotels/${id}`,{ method: "DELETE" }),
};

export const roomsAPI = {
  getByHotel: (hotelId, checkIn, checkOut) => {
    const p = new URLSearchParams({ hotelId, ...(checkIn && { checkIn }), ...(checkOut && { checkOut }) });
    return request(`/rooms?${p}`);
  },
  getById:          (id)         => request(`/rooms/${id}`),
  checkAvailability:(id, ci, co) => request(`/rooms/${id}/availability?checkIn=${ci}&checkOut=${co}`),
  create:           (data)       => request("/rooms",      { method: "POST",   body: JSON.stringify(data) }),
  update:           (id, data)   => request(`/rooms/${id}`,{ method: "PUT",    body: JSON.stringify(data) }),
  delete:           (id)         => request(`/rooms/${id}`,{ method: "DELETE" }),
};

export const bookingsAPI = {
  create: (body) =>
    request("/bookings", { method: "POST", body: JSON.stringify(body) }),
  getMyBookings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/bookings/my${qs ? "?" + qs : ""}`);
  },
  getById: (id)         => request(`/bookings/${id}`),
  cancel:  (id, reason) => request(`/bookings/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  verifyPayment: (id, data) => request(`/bookings/${id}/verify-payment`, { method: "POST", body: JSON.stringify(data) }),
  getAll:  (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/bookings${qs ? "?" + qs : ""}`);
  },
};
