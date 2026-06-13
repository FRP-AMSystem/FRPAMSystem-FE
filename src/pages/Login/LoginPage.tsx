export default function LoginPage() {
  return (
    <div className="login-container">
      <div className="login-left">
        <div className="overlay">
          <h1>PRRAM System</h1>

          <p>
            Optimizing our forests through data-driven planning.
            Our mission is to balance ecological health with
            sustainable industrial efficiency through advanced
            spatial intelligence.
          </p>

          <div className="stats">
            <div>
              <h4>+24%</h4>
              <span>Resource Utilization</span>
            </div>

            <div>
              <h4>Impact</h4>
              <span>Carbon Footprint Reduction</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>PRRAM System</h2>

          <h1>Sign In</h1>

          <p>
            Enter your credentials to access the management portal.
          </p>

          <form>
            <label>Email Address</label>

            <input
              type="email"
              placeholder="name@company.com"
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="********"
            />

            <div className="login-options">
              <label>
                <input type="checkbox" />
                Remember me
              </label>

              <a href="#">Forgot password?</a>
            </div>

            <button type="submit">
              Login →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}