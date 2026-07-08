const BASE_URL = process.env.REACT_APP_API_URL || "https://restrip-backend-production.up.railway.app/api";

let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;

async function refreshAccessToken() {
  try {
    const res  = await fetch(`${BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    const json = await res.json();
    if (json.accessToken) { setAccessToken(json.accessToken); return true; }
    return false;
  } catch { return false; }
}

async function request(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: "include" });

  if (res.status === 401 && endpoint !== "/auth/refresh" && endpoint !== "/auth/login") {
    const ok = await refreshAccessToken();
    if (ok) {
      headers["Authorization"] = `Bearer ${accessToken}`;
      const retry = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: "include" });
      const data  = await retry.json();
      if (!retry.ok) throw new Error(data.message || "Request failed");
      return data;
    }
    setAccessToken(null);
    throw new Error("Session expired. Please log in again.");
  }

  const data = await res.json();
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
