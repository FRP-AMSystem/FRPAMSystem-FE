export const saveToken = (token: string) => {
  localStorage.setItem("token", token);
  localStorage.setItem("accessToken", token);
};

export const getToken = () => {
  return localStorage.getItem("token") || localStorage.getItem("accessToken");
};

export const removeToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
};

export const normalizeRole = (role?: string | null): string => {
  if (!role) return "Seasonal";
  const r = role.trim();
  if (r.toLowerCase() === "student" || r.toLowerCase() === "seasonal") return "Seasonal";
  return r;
};

export const saveRole = (role: string) => {
  const normRole = normalizeRole(role);
  localStorage.setItem("role", normRole);
  localStorage.setItem("roleName", normRole);
};

export const getRole = () => {
  const raw = localStorage.getItem("role") || localStorage.getItem("roleName");
  return normalizeRole(raw);
};

export const saveUserData = (data: { userName?: string; email?: string; avatar?: string }) => {
  if (data.userName) {
    localStorage.setItem("user_name", data.userName);
    localStorage.setItem("fullName", data.userName);
  }
  if (data.email) localStorage.setItem("user_email", data.email);
  if (data.avatar) localStorage.setItem("user_avatar", data.avatar);
};

export const getUserData = () => {
  return {
    userName: localStorage.getItem("fullName") || localStorage.getItem("user_name") || "",
    email: localStorage.getItem("email") || localStorage.getItem("user_email") || "",
    avatar: localStorage.getItem("user_avatar") || "",
  };
};

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("role");
  localStorage.removeItem("roleName");
  localStorage.removeItem("userId");
  localStorage.removeItem("fullName");
  localStorage.removeItem("username");
  localStorage.removeItem("email");
  localStorage.removeItem("user_name");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_avatar");
};

export const logout = () => {
  clearAuth();
};