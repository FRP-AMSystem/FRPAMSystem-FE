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

export function parseJwt(token?: string | null): Record<string, any> | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decoded = new TextDecoder("utf-8").decode(bytes);
    return JSON.parse(decoded);
  } catch {
    try {
      const parts = token.split(".");
      if (parts.length >= 2) {
        return JSON.parse(atob(parts[1]));
      }
    } catch {}
    return null;
  }
}

export function isTokenExpired(token?: string | null): boolean {
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload || typeof payload.exp !== "number") return false;
  return payload.exp * 1000 <= Date.now();
}

export function getCurrentUserTokenInfo() {
  const token = getToken();
  const payload = parseJwt(token);

  const userId =
    Number(
      payload?.userId ||
        payload?.id ||
        payload?.nameid ||
        payload?.sub ||
        payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"]
    ) ||
    Number(localStorage.getItem("userId")) ||
    0;

  const fullName =
    (payload?.fullName as string) ||
    (payload?.name as string) ||
    (payload?.unique_name as string) ||
    (payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string) ||
    localStorage.getItem("fullName") ||
    localStorage.getItem("user_name") ||
    "";

  const email =
    (payload?.email as string) ||
    (payload?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] as string) ||
    localStorage.getItem("email") ||
    localStorage.getItem("user_email") ||
    "";

  const role = normalizeRole(
    (payload?.role as string) ||
      (payload?.roleName as string) ||
      (payload?.["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as string) ||
      localStorage.getItem("role") ||
      localStorage.getItem("roleName") ||
      "Researcher"
  );

  return { userId, fullName, email, role, payload };
}