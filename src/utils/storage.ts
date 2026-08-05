export const saveToken = (token: string) => {
  localStorage.setItem("token", token);
};

export const saveRole = (role: string) => {
  localStorage.setItem("role", role);
};

export const saveUserData = (data: { userName?: string; email?: string; avatar?: string }) => {
  if (data.userName) localStorage.setItem("user_name", data.userName);
  if (data.email) localStorage.setItem("user_email", data.email);
  if (data.avatar) localStorage.setItem("user_avatar", data.avatar);
};

export const getToken = () => {
  return localStorage.getItem("token");
};

export const getRole = () => {
  return localStorage.getItem("role");
};

export const getUserData = () => {
  return {
    userName: localStorage.getItem("user_name") || "",
    email: localStorage.getItem("user_email") || "",
    avatar: localStorage.getItem("user_avatar") || "",
  };
};

export const logout = () => {
  localStorage.clear();
};