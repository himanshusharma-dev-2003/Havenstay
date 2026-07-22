export default function About() {
  const urls = [
    { label: "Frontend (Vercel)", url: "https://client-frn6kczqo-friedrick2003s-projects.vercel.app" },
    { label: "Backend API (Railway)", url: "https://havenstay-backend-production.up.railway.app/api" },
    { label: "Health Check", url: "https://havenstay-backend-production.up.railway.app/api/health" },
    { label: "GitHub Repository", url: "https://github.com/Friedrick2003/havenstay" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg-primary)", paddingTop: 80, paddingBottom: 60 }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 32px" }}>
        {/* Header */}
        <div style={{ marginBottom: 60, textAlign: "center" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 16, letterSpacing: 2 }}>
            About HavenStay
          </h1>
          <p style={{ fontSize: 16, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
            A luxury hotel booking platform built with modern web technologies and deployed on cutting-edge cloud infrastructure.
          </p>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 16, letterSpacing: 1.5 }}>
            Tech Stack
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, margin: "24px 0" }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#b8943f", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Frontend</h3>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.8 }}>React 18 with Create React App</p>
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#b8943f", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Backend</h3>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.8 }}>Node.js + Express.js</p>
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#b8943f", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Database</h3>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.8 }}>MongoDB Atlas</p>
            </div>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "#b8943f", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Deployment</h3>
              <p style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.8 }}>Vercel + Railway</p>
            </div>
          </div>
        </div>

        {/* Production URLs */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 24, letterSpacing: 1.5 }}>
            Production URLs
          </h2>
          <div style={{ display: "grid", gap: 16 }}>
            {urls.map((item) => (
              <a
                key={item.label}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block",
                  padding: 20,
                  background: "var(--color-bg-secondary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 4,
                  textDecoration: "none",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = "#b8943f";
                  e.target.style.background = "var(--color-bg-primary)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = "var(--color-border)";
                  e.target.style.background = "var(--color-bg-secondary)";
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#b8943f", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 14, color: "var(--color-text-primary)", wordBreak: "break-all", fontFamily: "monospace" }}>
                  {item.url}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Demo Credentials */}
        <div style={{ marginBottom: 60 }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 24, letterSpacing: 1.5 }}>
            Demo Credentials
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 20, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#b8943f", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                Admin Account
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 8 }}>
                <strong>Email:</strong> admin@havenstay.com
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
                <strong>Password:</strong> Admin@123
              </div>
            </div>
            <div style={{ padding: 20, background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: 4 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#b8943f", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>
                Demo Account
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 8 }}>
                <strong>Email:</strong> demo@havenstay.com
              </div>
              <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
                <strong>Password:</strong> Demo@1234
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 24, letterSpacing: 1.5 }}>
            Features
          </h2>
          <ul style={{ fontSize: 14, color: "var(--color-text-muted)", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Browse luxury hotels and rooms with detailed information</li>
            <li>Real-time availability checking and booking confirmation</li>
            <li>Secure JWT authentication with refresh tokens</li>
            <li>Admin panel for hotel and room management</li>
            <li>Booking history and cancellation support</li>
            <li>Concurrency-safe booking system</li>
            <li>Responsive design for all devices</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
