export const saveToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const saveRole = (role: string) => {
  localStorage.setItem("role", role);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const getRole = () => {
  return localStorage.getItem("role");
};

export const logout = () => {
  localStorage.clear();
};