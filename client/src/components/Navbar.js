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
      <div onClick={() => go("/")} style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:36, height:36, border:"1.5px solid #b8943f", display:"flex", alignItems:"center",
          justifyContent:"center", position:"relative" }}>
          <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:700, color:"#b8943f" }}>H</span>
          <div style={{ position:"absolute", top:-3, left:-3, right:-3, bottom:-3, border:"1px solid rgba(184,148,63,0.3)" }} />
        </div>
        <div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:700, color:"var(--color-text-primary)", letterSpacing:3, lineHeight:1 }}>HAVENSTAY</div>
          <div style={{ fontSize:8, letterSpacing:3, color:"#b8943f", textTransform:"uppercase", fontWeight:500 }}>Luxury Collection</div>
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
