import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  const isHome = location.pathname === "/";
  const bg = scrolled || !isHome ? "rgba(13,13,18,0.97)" : "transparent";

  const go = (path) => navigate(path);

  return (
    <nav className="navbar" style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, background:bg,
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? "1px solid var(--color-border)" : "none",
      transition:"all .4s", padding:"22px 64px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>

      {/* Logo */}
      <div onClick={() => go("/")} style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg width="45" height="45" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#d4af6a" />
                <stop offset="100%" stopColor="#b8943f" />
              </linearGradient>
              <mask id="roofMask">
                <rect width="100" height="100" fill="white" />
                <path d="M 0 58 L 50 24 L 100 58" fill="none" stroke="black" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="71" y="20" width="12" height="25" fill="black" />
              </mask>
            </defs>

            <path d="M50 95 C 50 95, 15 65, 15 40 C 15 20, 30 10, 50 10 C 70 10, 85 20, 85 40 C 85 65, 50 95, 50 95 Z" 
                  fill="none" stroke="url(#pinGrad)" strokeWidth="10" strokeLinejoin="round" mask="url(#roofMask)"/>
                  
            <path d="M 5 57 L 50 26 L 95 57" fill="none" stroke="var(--color-text-primary)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
            
            <rect x="74" y="23" width="6" height="16" fill="var(--color-text-primary)" />
            
            <rect x="41" y="52" width="7" height="7" fill="url(#pinGrad)" />
            <rect x="52" y="52" width="7" height="7" fill="url(#pinGrad)" />
            <rect x="41" y="63" width="7" height="7" fill="url(#pinGrad)" />
            <rect x="52" y="63" width="7" height="7" fill="url(#pinGrad)" />
          </svg>
        </div>
        <div style={{ marginLeft: 2 }}>
          <div style={{ 
            fontFamily:"'Jost', sans-serif", 
            fontSize: 26, 
            fontWeight: 700, 
            color: "var(--color-text-primary)",
            letterSpacing: 0.5, 
            lineHeight: 1,
            display: "flex",
            alignItems: "center"
          }}>
            Haven<span style={{ 
              background: "linear-gradient(90deg, #d4af6a, #b8943f)", 
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Stay</span>
          </div>
          <div style={{ fontSize: 7.5, letterSpacing: 1.5, color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 600, marginTop: 4 }}>
            STAY COMFORT. STAY HAPPY.
          </div>
        </div>
      </div>

      {/* Hamburger Toggle */}
      <button className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background:"transparent", border:"none", color:"#b8943f", fontSize:28, cursor:"pointer", display:"none" }}>
        {mobileMenuOpen ? "✕" : "☰"}
      </button>

      {/* Nav links (Desktop) */}
      <div className="nav-links hide-mobile" style={{ display:"flex", gap:36, alignItems:"center" }}>
        {[["Home","/"],["Hotels","/hotels"]].map(([label, path]) => (
          <button key={path} className={`nav-item ${location.pathname === path ? "active" : ""}`}
            onClick={() => go(path)}>{label}</button>
        ))}
        {user?.role === "admin" && (
          <button className={`nav-item ${location.pathname === "/admin" ? "active" : ""}`}
            onClick={() => go("/admin")}>Admin</button>
        )}

        {user ? (
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            <button className="nav-item" onClick={() => go("/bookings")}
              style={{ color:"#b8943f" }}>My Stays</button>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div onClick={logout} style={{ width:32, height:32, border:"1px solid #b8943f",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:700,
                color:"#b8943f", cursor:"pointer" }} title="Logout">
                {user.name[0].toUpperCase()}
              </div>
              <span style={{ fontSize:11, color:"var(--color-text-muted)", letterSpacing:1 }}>{user.name}</span>
            </div>
          </div>
        ) : (
          <button className="btn-primary" style={{ padding:"10px 24px", fontSize:10 }}
            onClick={() => go("/auth")}>Sign In</button>
        )}
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu" style={{ position:"fixed", top:"72px", left:0, right:0, background:"rgba(13,13,18,0.98)", backdropFilter:"blur(10px)", borderBottom:"1px solid var(--color-border)", display:"flex", flexDirection:"column", padding:"32px 24px", gap:24 }}>
          {[["Home","/"],["Hotels","/hotels"]].map(([label, path]) => (
            <button key={path} className="nav-item" style={{ fontSize:16, borderBottom:"1px solid rgba(184,148,63,0.1)", paddingBottom:12, textAlign:"left" }}
              onClick={() => { setMobileMenuOpen(false); go(path); }}>{label}</button>
          ))}
          {user?.role === "admin" && (
            <button className="nav-item" style={{ fontSize:16, borderBottom:"1px solid rgba(184,148,63,0.1)", paddingBottom:12, textAlign:"left" }}
              onClick={() => { setMobileMenuOpen(false); go("/admin"); }}>Admin</button>
          )}

          {user ? (
            <>
              <button className="nav-item" style={{ color:"#b8943f", fontSize:16, borderBottom:"1px solid rgba(184,148,63,0.1)", paddingBottom:12, textAlign:"left" }}
                onClick={() => { setMobileMenuOpen(false); go("/bookings"); }}>My Stays</button>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:8 }}>
                <div style={{ width:40, height:40, border:"1px solid #b8943f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:"#b8943f" }}>
                  {user.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:14, color:"var(--color-text-primary)", letterSpacing:1 }}>{user.name}</div>
                  <div onClick={() => { setMobileMenuOpen(false); logout(); }} style={{ fontSize:12, color:"var(--color-text-muted)", textDecoration:"underline", cursor:"pointer", marginTop:4 }}>Logout</div>
                </div>
              </div>
            </>
          ) : (
            <button className="btn-primary" style={{ padding:"16px", fontSize:14, width:"100%" }}
              onClick={() => { setMobileMenuOpen(false); go("/auth"); }}>Sign In</button>
          )}
        </div>
      )}
    </nav>
  );
}
