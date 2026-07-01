import "./LoginPage.css";

import {
  FaTree,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { login } from "../../services/authService";
import { saveRole, saveToken } from "../../utils/storage";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await login({
        usernameOrEmail: email,
        password,
      });

      saveToken(response.accessToken);
      saveRole(response.roleName);

      navigate("/dashboard");

    } catch (err) {
      console.error(err);
      setError("Login failed. Please check your email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      {/* LEFT SIDE */}
      <div className="left">
        <div className="overlay"></div>

        <div className="content">
          <div className="logo">
            <FaTree />
          </div>

          <h1>PRRAM System</h1>

          <p>
            Optimizing our forests through intelligent planning and sustainable
            resource allocation.
          </p>

          <div className="cards">
            <div>
              <span>EFFICIENCY</span>
              <h2>+24%</h2>
              <small>Resource utilization</small>
            </div>

            <div>
              <span>IMPACT</span>
              <h2>Carbon</h2>
              <small>Footprint reduction</small>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="right">
        <div className="login-card">
          <h2>Sign In</h2>

          <p>Enter your credentials to access the management portal.</p>

          {error && <p className="error">{error}</p>}

          <label>Email</label>

          <div className="input">
            <FaEnvelope />

            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <label>Password</label>

          <div className="input">
            <FaLock />

            <input
              type={showPassword ? "text" : "password"}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {showPassword ? (
              <FaEyeSlash
                className="eye-icon"
                onClick={() => setShowPassword(false)}
              />
            ) : (
              <FaEye
                className="eye-icon"
                onClick={() => setShowPassword(true)}
              />
            )}
          </div>

          <div className="option">
            <label className="remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />

              Remember me
            </label>

            <a href="#">Forgot password?</a>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "Signing In..." : "Login"}
          </button>

          <hr />

          <div className="footer">
            <span>System Status</span>
            <span>Technical Support</span>
          </div>
        </div>
      </div>
    </div>
  );
}