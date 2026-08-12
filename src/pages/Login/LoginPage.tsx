import "./LoginPage.css";
import forestBg from "../../assets/forest.jpg";

import {
  FaTree,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaTimes,
} from "react-icons/fa";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../../services/authService";
import { startSignalRConnection } from "../../services/signalrService";
import { saveRole, saveToken, saveUserData } from "../../utils/storage";

export default function LoginPage() {
  const navigate = useNavigate();

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email or username.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await login({
        usernameOrEmail: email.trim(),
        password,
      });

      saveToken(response.accessToken);
      saveRole(response.roleName);

      localStorage.setItem("userId", String(response.userId));
      localStorage.setItem("fullName", response.fullName);
      localStorage.setItem("username", response.username);
      localStorage.setItem("email", response.email);

      saveUserData({
        userName: response.fullName || response.username || email.split("@")[0],
        email: response.email || email.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(response.fullName || response.username || "User")}&background=E8F5E9&color=16A34A&font-size=0.45&bold=true`,
      });

      void startSignalRConnection();

      console.log("Remember me:", rememberMe);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Login failed. Please check your credentials.");
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
              <p className="modal-desc">Enter your credentials to access the management portal.</p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
            >
              {error && <div className="error-alert">{error}</div>}

              <div className="form-group">
                <label>Email Address / Username</label>
                <div className="input-box">
                  <FaEnvelope className="input-icon" />
                  <input
                    type="text"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
