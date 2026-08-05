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

export const saveRole = (role: string) => {
  localStorage.setItem("role", role);
  localStorage.setItem("roleName", role);
};

export const getRole = () => {
  return localStorage.getItem("role") || localStorage.getItem("roleName");
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