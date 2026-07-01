export const saveToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const removeToken = () => {
  localStorage.removeItem("token");
};

export const saveRole = (role: string) => {
  localStorage.setItem("role", role);
};

export const getRole = () => {
  return localStorage.getItem("role");
};

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};