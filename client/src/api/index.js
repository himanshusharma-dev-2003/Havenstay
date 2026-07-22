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

// Cookie-based auth: all requests include credentials. Do not rely on client-stored access tokens.
async function refreshAccessToken() {
  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return false;
    return true;
  } catch (err) {
    return false;
  }
}

async function request(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: "include" });

  if (res.status === 401 && endpoint !== "/auth/refresh" && endpoint !== "/auth/login") {
    const ok = await refreshAccessToken();
    if (ok) {
      // retry original request after refresh (cookies set by server)
      const retry = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: "include" });
      const data  = await retry.json();
      if (!retry.ok) throw new Error(data.message || "Request failed");
      return data;
    }
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
  getById:          (id)              => request(`/rooms/${id}`),
  checkAvailability:(id, ci, co)      => request(`/rooms/${id}/availability?checkIn=${ci}&checkOut=${co}`),
  create:           (data)            => request("/rooms",      { method: "POST",   body: JSON.stringify(data) }),
  update:           (id, data)        => request(`/rooms/${id}`,{ method: "PUT",    body: JSON.stringify(data) }),
  delete:           (id)              => request(`/rooms/${id}`,{ method: "DELETE" }),
};

export const bookingsAPI = {
  create: (body) =>
    request("/bookings", { method: "POST", body: JSON.stringify(body) }),
  getMyBookings: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/bookings/my${qs ? "?" + qs : ""}`);
  },
  getById: (id)          => request(`/bookings/${id}`),
  cancel:  (id, reason)  => request(`/bookings/${id}/cancel`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  verifyPayment: (id, data) => request(`/bookings/${id}/verify-payment`, { method: "POST", body: JSON.stringify(data) }),
  getAll:  (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/bookings${qs ? "?" + qs : ""}`);
  },
};
