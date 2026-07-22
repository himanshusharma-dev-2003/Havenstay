import { useEffect } from "react";

export const fmt = (n) => `$${Number(n).toLocaleString()}`;

export function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:"fixed", bottom:36, right:36, zIndex:9999, background: type==="success"?"var(--color-bg-secondary)":"#1a0808",
      color:"var(--color-text-primary)", padding:"18px 28px", border:"1px solid", borderColor: type==="success"?"var(--color-accent-gold)":"rgba(192,57,43,0.5)",
      fontSize:13, fontFamily:"'Jost',sans-serif", boxShadow:"0 16px 48px rgba(0,0,0,0.6)", display:"flex",
      alignItems:"center", gap:12, minWidth:280, borderLeft:`3px solid ${type==="success"?"var(--color-accent-gold)":"#ef5350"}` }}>
      <span style={{ color: type==="success"?"var(--color-accent-gold)":"#ef5350", fontSize:16 }}>{type==="success"?"✦":"✕"}</span>
      {msg}
      <span onClick={onClose} style={{ marginLeft:"auto", cursor:"pointer", color:"var(--color-text-muted)" }}>×</span>
    </div>
  );
}

export function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", padding:"80px 0" }}>
      <div style={{ width:40, height:40, border:"2px solid var(--color-border)", borderTop:"2px solid var(--color-accent-gold)", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export function Tag({ label, color = "var(--color-accent-gold)" }) {
  return (
    <span style={{ display:"inline-block", padding:"3px 10px", fontSize:10, fontWeight:600,
      letterSpacing:"1.5px", textTransform:"uppercase", background:`${color==="var(--color-accent-gold)"?"rgba(184,148,63,0.1)":color+"22"}`,
      color: color==="green"?"#81c784": color==="red"?"#ef9a9a": "var(--color-accent-gold-light)",
      borderColor: color==="green"?"rgba(46,125,50,0.3)": color==="red"?"rgba(192,57,43,0.3)":"var(--color-border)",
      border:"1px solid" }}>
      {label}
    </span>
  );
}

export function Stars({ rating }) {
  return <span style={{ color:"var(--color-accent-gold)", fontSize:13 }}>{"★".repeat(Math.floor(rating))}{"☆".repeat(5-Math.floor(rating))}</span>;
}

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --color-bg-primary: #0D0D12;
  --color-bg-secondary: #12130F;
  --color-text-primary: #F5F1E8;
  --color-text-muted: rgba(245, 241, 232, 0.6);
  --color-accent-gold: #b8943f;
  --color-accent-gold-light: #d4af6a;
  --color-accent-secondary: #0F3D2E;
  --color-border: rgba(184,148,63,0.2);
}
body{font-family:'Jost',sans-serif;background:var(--color-bg-primary);color:var(--color-text-primary);overflow-x:hidden}
h1,h2,h3,h4{font-family:'Cormorant Garamond',serif}
input,select,button,textarea{font-family:'Jost',sans-serif}
::selection{background:var(--color-accent-gold);color:var(--color-bg-primary)}

/* Custom Cursor */
@media (hover: hover) and (pointer: fine) {
  body { cursor: none; }
  * { cursor: none !important; }
}

.custom-cursor-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 99999;
}

.cursor-dot {
  position: absolute;
  top: -4px;
  left: -4px;
  width: 8px;
  height: 8px;
  background-color: var(--color-accent-gold);
  border-radius: 50%;
  pointer-events: none;
  backface-visibility: hidden;
  transition: opacity 0.3s ease;
}

.cursor-ring {
  position: absolute;
  top: -20px;
  left: -20px;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-accent-gold);
  border-radius: 50%;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.3s ease, border-color 0.3s ease;
}

.cursor-text {
  font-family: 'Jost', sans-serif;
  font-size: 8px;
  letter-spacing: 2px;
  font-weight: 600;
  color: var(--color-bg-primary);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.hover-button .cursor-ring {
  transform: scale(1.6);
  background-color: rgba(201, 162, 39, 0.2);
  border-color: rgba(201, 162, 39, 0.4);
}

.hover-link .cursor-ring {
  transform: scale(1.2);
}

.hover-image .cursor-ring {
  transform: scale(2.5);
  background-color: var(--color-accent-gold);
  border-color: transparent;
}
.hover-image .cursor-dot {
  opacity: 0;
}
.hover-image .cursor-text {
  opacity: 1;
}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:var(--color-bg-secondary)}::-webkit-scrollbar-thumb{background:var(--color-accent-gold);border-radius:3px}
.gold-line{display:inline-block;width:40px;height:1px;background:var(--color-accent-gold);vertical-align:middle;margin-right:12px}
.section-tag{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--color-accent-gold);font-weight:500;display:flex;align-items:center}
.btn-primary{background:var(--color-accent-gold);color:var(--color-bg-primary);border:none;padding:14px 36px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .3s}
.btn-primary:hover{background:#a07830;transform:translateY(-2px);box-shadow:0 12px 40px rgba(184,148,63,0.35)}
.btn-primary:disabled{opacity:0.6;cursor:not-allowed;transform:none}
.btn-outline{background:transparent;color:var(--color-accent-gold-light);border:1px solid var(--color-accent-gold);padding:13px 34px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .3s}
.btn-outline:hover{background:var(--color-accent-gold);color:var(--color-bg-primary)}
.input-dark{width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(184,148,63,0.25);color:var(--color-text-primary);padding:13px 16px;font-size:13px;outline:none;transition:border .2s}
.input-dark::placeholder{color:var(--color-text-muted)}
.input-dark:focus{border-color:var(--color-accent-gold)}
.input-dark option{background:var(--color-bg-secondary);color:var(--color-text-primary)}
.hotel-card{position:relative;overflow:hidden;cursor:pointer;background:var(--color-bg-secondary)}
.hotel-card img{transition:transform .6s ease;display:block;width:100%;height:100%;object-fit:cover}
.hotel-card:hover img{transform:scale(1.07)}
.hotel-card .overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(13,13,18,0.95) 0%,rgba(13,13,18,0.2) 60%,transparent 100%)}
.hotel-card .card-content{position:absolute;bottom:0;left:0;right:0;padding:28px 24px;transition:transform .3s}
.hotel-card:hover .card-content{transform:translateY(-6px)}
.nav-item{color:var(--color-text-muted);font-size:12px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:color .2s;padding:4px 0;border-bottom:1px solid transparent;background:none;border-top:none;border-left:none;border-right:none}
.nav-item:hover,.nav-item.active{color:var(--color-accent-gold-light);border-bottom-color:var(--color-accent-gold)}
.room-card{border:1px solid var(--color-border);background:var(--color-bg-secondary);cursor:pointer;transition:all .3s;overflow:hidden}
.room-card:hover,.room-card.selected{border-color:var(--color-accent-gold);background:var(--color-bg-primary)}
.stat-card{border:1px solid var(--color-border);background:var(--color-bg-secondary);padding:28px 24px;position:relative;overflow:hidden}
.stat-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:var(--color-accent-secondary)}
.table-row{border-bottom:1px solid var(--color-border)}
.table-row:hover{background:rgba(15,61,46,0.15)} 
.amenity-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid var(--color-border);color:var(--color-text-muted);font-size:12px}
.amenity-pill::before{content:'';display:inline-block;width:4px;height:4px;background:var(--color-accent-secondary);border-radius:50%} 
.fade-in{animation:fadeUp .8s ease both}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

/* Responsive Utilities */
@media(max-width: 1024px) {
  .hero-content { padding: 0 40px !important; }
  .stats-grid { grid-template-columns: 1fr 1fr !important; }
  .stats-item { border-right: none !important; border-bottom: 1px solid var(--color-border); }
}

@media(max-width: 768px) {
  /* Utility */
  .d-flex-mobile-col { flex-direction: column !important; }
  .grid-mobile-1 { grid-template-columns: 1fr !important; }
  .p-mobile-20 { padding: 20px !important; padding-top: 20px !important; padding-bottom: 20px !important; }
  .px-mobile-20 { padding-left: 20px !important; padding-right: 20px !important; }
  .mt-mobile-20 { margin-top: 20px !important; }
  .hide-mobile { display: none !important; }
  
  /* Navbar */
  .navbar { padding: 16px 20px !important; flex-wrap: nowrap; justify-content: space-between !important; }
  .hamburger { display: block !important; }
  .nav-links { display: none !important; }
  
  /* Home */
  .hero-container { height: auto !important; min-height: 500px !important; }
  .hero-content { padding: 0 20px !important; text-align: center; }
  .hero-tag { justify-content: center; }
  .hero-title { font-size: 3rem !important; }
  .hero-buttons { flex-direction: column !important; width: 100% !important; gap: 12px !important; }
  .booking-bar { position: static !important; flex-direction: column !important; padding: 24px 20px !important; gap: 20px !important; align-items: stretch !important; border-top: none !important; }
  .booking-item { border-right: none !important; padding: 0 !important; width: 100% !important; border-bottom: none !important; }
  .booking-guests { padding: 0 !important; }
  .booking-btn-container { padding-left: 0 !important; width: 100% !important; }
  .booking-btn { width: 100% !important; min-height: 44px; }
  
  .featured-section { padding: 60px 20px !important; }
  .featured-header { flex-direction: column !important; align-items: flex-start !important; gap: 20px; }
  .featured-grid { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
  .featured-main-card { grid-row: auto !important; height: 350px !important; }
  
  .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; text-align: center; }
  .footer-section { padding: 40px 20px 24px !important; }
  .footer-bottom { flex-direction: column !important; gap: 10px; align-items: center; }
  
  /* Hotels */
  .hotels-header { padding: 40px 20px 30px !important; text-align: center; }
  .hotels-title { font-size: 3rem !important; }
  .hotels-layout { flex-direction: column !important; }
  .hotels-sidebar { width: 100% !important; height: auto !important; position: static !important; border-right: none !important; border-bottom: 1px solid var(--color-border); padding: 20px !important; }
  .hotels-grid { padding: 20px !important; grid-template-columns: 1fr !important; }
  
  /* Hotel Detail */
  .detail-layout { grid-template-columns: 1fr !important; }
  .detail-main { padding: 30px 20px !important; border-right: none !important; }
  .detail-sidebar { padding: 30px 20px !important; position: static !important; }
  .room-item { flex-direction: column !important; }
  .room-img { width: 100% !important; height: auto !important; max-height: 200px; }
  .room-info { flex-direction: column !important; align-items: flex-start !important; gap: 12px; }
  .room-price { text-align: left !important; }
}
@media(max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr !important; }
  .hero-title { font-size: 2.5rem !important; }
}
`;
