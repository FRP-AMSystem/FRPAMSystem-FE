import "./LoginPage.css";
import forestBg from "../../assets/forest.jpg";

import {
  FaTree,
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaTimes,
} from "react-icons/fa";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../../services/authService";
import { saveRole, saveToken, saveUserData } from "../../utils/storage";

export default function LoginPage() {
  const navigate = useNavigate();

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await login({
        usernameOrEmail: username.trim(),
        password,
      });

      saveToken(response.accessToken);
      saveRole(response.roleName);

      localStorage.setItem("userId", String(response.userId));
      localStorage.setItem("fullName", response.fullName);
      localStorage.setItem("username", response.username);
      localStorage.setItem("email", response.email || `${username.trim()}@frpam.edu.vn`);

      saveUserData({
        userName: response.fullName || response.username || username.trim(),
        email: response.email || `${username.trim()}@frpam.edu.vn`,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(response.fullName || response.username || username.trim())}&background=E8F5E9&color=16A34A&font-size=0.45&bold=true`,
      });

      console.log("Remember me:", rememberMe);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Login failed. Please check your username and password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="landing"
      style={{
        backgroundImage: `url(${forestBg})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="overlay"></div>

      {/* HEADER LOGO */}
      <header className="header">
        <div className="logo-brand">
          <div className="logo-badge">
            <FaTree />
          </div>
          <span className="logo-text">PRRAM System</span>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="hero">
        <h1 className="hero-title">PRRAM System</h1>

        <p className="hero-slogan">
          Optimizing forest resources through intelligent planning and sustainable resource allocation.
        </p>

        <button
          className="login-trigger-btn"
          onClick={() => setIsLoginOpen(true)}
        >
          <span>Login</span>
          <FaArrowRight className="btn-arrow" />
        </button>
      </main>

      {/* LOGIN MODAL */}
      {isLoginOpen && (
        <div className="modal-backdrop" onClick={() => setIsLoginOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setIsLoginOpen(false)}
              aria-label="Close login dialog"
            >
              <FaTimes />
            </button>

            <div className="modal-header">
              <div className="modal-logo">
                <FaTree />
              </div>
              <span className="welcome-subtitle">Welcome Back</span>
              <h2>Sign In</h2>
              <p className="modal-desc">Enter your username to access the internal management portal.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              {error && <div className="error-alert">{error}</div>}

              <div className="form-group">
                <label>Username</label>
                <div className="input-box">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter your username (e.g. admin, researcher01)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-box">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-check">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="forgot-link"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? "Signing In..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
