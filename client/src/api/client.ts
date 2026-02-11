import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Normalize error.response.data.error to always be a string
    // (Vercel returns { error: { code, message } } on function crashes)
    if (error.response?.data?.error && typeof error.response.data.error !== "string") {
      error.response.data.error = error.response.data.error.message || "Server error";
    }

    const originalRequest = error.config;

    // Don't intercept auth endpoints — let login/register errors propagate directly
    const url = originalRequest?.url || "";
    if (url.includes("/auth/")) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post("/api/auth/refresh", {
          refreshToken,
        });
        localStorage.setItem("accessToken", data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
