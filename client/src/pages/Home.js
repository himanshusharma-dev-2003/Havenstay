import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Stars, fmt } from "../components/UI";
import { useHotels } from "../hooks";

function Hero() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ city:"", checkin:"", checkout:"", guests:"2" });
  const [slide, setSlide] = useState(0);
  const slides = [
    { img:"https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=85", title:"Rise Above", sub:"the Ordinary", loc:"Maldives Overwater Villas" },
    { img:"https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=85", title:"Live Within", sub:"Legend", loc:"Tuscan Castle Estate" },
    { img:"https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1600&q=85", title:"Touch the", sub:"Sky", loc:"Dubai Sky Towers" },
  ];
  useEffect(() => { const t = setInterval(() => setSlide(s => (s+1)%slides.length), 5000); return () => clearInterval(t); }, []);

  const search = () => {
    const params = new URLSearchParams();
    if (form.city)    params.set("city", form.city);
    if (form.checkin) params.set("checkin", form.checkin);
    if (form.checkout)params.set("checkout", form.checkout);
    params.set("guests", form.guests);
    navigate(`/hotels?${params.toString()}`);
  };

  return (
    <div className="hero-container" style={{ position:"relative", height:"100vh", minHeight:500, overflow:"hidden" }}>
      {slides.map((s,i) => (
        <div key={i} style={{ position:"absolute", inset:0, opacity: slide===i?1:0, transition:"opacity 1.2s ease", zIndex: slide===i?1:0 }}>
          <img src={s.img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right,rgba(13,13,18,0.82) 0%,rgba(13,13,18,0.3) 60%,rgba(13,13,18,0.2) 100%)" }} />
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(13,13,18,0.7) 0%,transparent 50%)" }} />
        </div>
      ))}
      <div className="hero-content" style={{ position:"absolute", inset:0, zIndex:2, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 80px", maxWidth:780 }}>
        <div className="section-tag hero-tag fade-in" style={{ marginBottom:18 }}>
          <span className="gold-line" />Exclusive Luxury Collection
        </div>
        <h1 className="fade-in hero-title" style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.5rem,8vw,7rem)", fontWeight:300, color:"var(--color-text-primary)", lineHeight:1, marginBottom:6 }}>
          {slides[slide].title}<br />
          <em style={{ fontWeight:600, color:"#d4af6a" }}>{slides[slide].sub}</em>
        </h1>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:16, marginBottom:32 }}>
          <div style={{ width:24, height:1, background:"#b8943f" }} />
          <span style={{ fontSize:12, letterSpacing:2, color:"var(--color-text-muted)", textTransform:"uppercase" }}>{slides[slide].loc}</span>
        </div>
        <div className="hero-buttons" style={{ display:"flex", gap:14 }}>
          <button className="btn-primary" onClick={() => navigate("/hotels")}>Explore Hotels</button>
          <button className="btn-outline" onClick={() => document.getElementById("booking-bar")?.scrollIntoView({ behavior:"smooth" })}>Book Now</button>
        </div>
      </div>
      <div style={{ position:"absolute", bottom:200, right:60, zIndex:3, display:"flex", flexDirection:"column", gap:8 }}>
        {slides.map((_,i) => (
          <div key={i} onClick={() => setSlide(i)} style={{ width: i===slide?2:1, height: i===slide?32:16, background: i===slide?"#b8943f":"rgba(255,255,255,0.3)", cursor:"pointer", transition:"all .3s" }} />
        ))}
      </div>
      {/* Booking bar */}
      <div id="booking-bar" className="booking-bar" style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:3, background:"rgba(13,13,18,0.95)", backdropFilter:"blur(20px)", borderTop:"1px solid var(--color-border)", padding:"28px 64px", display:"flex", gap:0, alignItems:"flex-end" }}>
        {[{ label:"Destination", key:"city", type:"text", ph:"City, country or property" },
          { label:"Check-In",    key:"checkin", type:"date" },
          { label:"Check-Out",   key:"checkout", type:"date" }].map(({ label,key,type,ph }, i) => (
          <div key={key} className="booking-item" style={{ flex:1, borderRight:"1px solid var(--color-border)", padding:`0 28px 0 ${i===0?0:28}px` }}>
            <div style={{ fontSize:9, letterSpacing:2.5, color:"#b8943f", textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>{label}</div>
            <input className="input-dark" type={type} placeholder={ph} value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))}
              style={{ background:"transparent", border:"none", borderBottom:"1px solid var(--color-border)", borderRadius:0, padding:"4px 0" }} />
          </div>
        ))}
        <div className="booking-item booking-guests" style={{ flex:0.6, padding:"0 28px" }}>
          <div style={{ fontSize:9, letterSpacing:2.5, color:"#b8943f", textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>Guests</div>
          <select className="input-dark" value={form.guests} onChange={e => setForm(f => ({ ...f, guests:e.target.value }))}
            style={{ background:"transparent", border:"none", borderBottom:"1px solid var(--color-border)", borderRadius:0, padding:"4px 0", width:"100%" }}>
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
          </select>
        </div>
        <div className="booking-btn-container" style={{ paddingLeft:32 }}>
          <button className="btn-primary booking-btn" style={{ height:48 }} onClick={search}>Check Availability</button>
        </div>
      </div>
    </div>
  );
}

function FeaturedHotels({ hotels }) {
  const navigate = useNavigate();
  if (!hotels?.length) return null;
  return (
    <section className="featured-section" style={{ padding:"100px 64px", background:"var(--color-bg-primary)" }}>
      <div className="featured-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:56 }}>
        <div>
          <div className="section-tag" style={{ marginBottom:14 }}><span className="gold-line" />Curated Collection</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.5rem,4vw,4rem)", fontWeight:300, color:"var(--color-text-primary)", lineHeight:1.1 }}>
            Luxury Rooms<br /><em style={{ fontWeight:600, color:"#d4af6a" }}>&amp; Suites</em>
          </h2>
        </div>
        <button className="btn-outline" onClick={() => navigate("/hotels")}>View All Properties</button>
      </div>
      <div className="featured-grid" style={{ display:"grid", gridTemplateColumns:"1.4fr 1fr 1fr", gridTemplateRows:"auto auto", gap:3 }}>
        <div className="hotel-card featured-main-card" style={{ gridRow:"1/3", height:580 }} onClick={() => navigate(`/hotels/${hotels[0]._id}`)}>
          <img src={hotels[0].photos?.[0]} alt={hotels[0].name} />
          <div className="overlay" />
          <div className="card-content">
            <Tag label={hotels[0].tag} />
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:600, color:"var(--color-text-primary)", margin:"10px 0 6px" }}>{hotels[0].name}</h3>
            <div style={{ fontSize:12, color:"var(--color-text-muted)", marginBottom:10 }}>📍 {hotels[0].city}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, color:"#d4af6a" }}>From {fmt(hotels[0].cheapestPrice)}<span style={{ fontSize:13, color:"var(--color-text-muted)", fontFamily:"'Jost',sans-serif" }}>/night</span></span>
              <Stars rating={hotels[0].rating} />
            </div>
          </div>
        </div>
        {hotels.slice(1,5).map(h => (
          <div key={h._id} className="hotel-card" style={{ height:286 }} onClick={() => navigate(`/hotels/${h._id}`)}>
            <img src={h.photos?.[0]} alt={h.name} />
            <div className="overlay" />
            <div className="card-content" style={{ padding:"20px 18px" }}>
              <Tag label={h.tag} />
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:600, color:"var(--color-text-primary)", margin:"8px 0 4px" }}>{h.name}</h3>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:"var(--color-text-muted)" }}>{h.city}</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, color:"#d4af6a" }}>{fmt(h.cheapestPrice)}/nt</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { data } = useHotels({ featured: true, limit: 6 });
  return (
    <>
      <Hero />
      {/* Stats */}
      <section className="featured-section" style={{ padding:"80px 64px", background:"var(--color-bg-secondary)", borderTop:"1px solid var(--color-border)", borderBottom:"1px solid var(--color-border)" }}>
        <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)" }}>
          {[["6,000+","Properties Worldwide"],["120+","Countries"],["50,000+","Happy Guests"],["★ 4.9","Average Rating"]].map(([val,label],i) => (
            <div key={i} className="stats-item" style={{ textAlign:"center", padding:"20px 0", borderRight: i<3?"1px solid var(--color-border)":"none" }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2rem,3.5vw,3.5rem)", fontWeight:600, color:"#d4af6a", lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:11, letterSpacing:2, color:"var(--color-text-muted)", textTransform:"uppercase", marginTop:8 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>
      <FeaturedHotels hotels={data?.data} />
      {/* CTA banner */}
      <section style={{ position:"relative", height:440, overflow:"hidden" }}>
        <img src="https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1600&q=85" alt="cta" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        <div style={{ position:"absolute", inset:0, background:"rgba(13,13,18,0.75)" }} />
        <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
          <div className="section-tag" style={{ justifyContent:"center", marginBottom:16 }}><span className="gold-line" />Begin Your Journey</div>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.5rem,5vw,5rem)", fontWeight:300, color:"var(--color-text-primary)", marginBottom:28 }}>
            Your Next <em style={{ color:"#d4af6a", fontWeight:600 }}>Legend</em> Awaits
          </h2>
          <button className="btn-primary" onClick={() => window.location.href="/hotels"}>Explore Collection</button>
        </div>
      </section>
      {/* Footer */}
      <footer className="footer-section" style={{ background:"var(--color-bg-primary)", padding:"60px 64px 32px", borderTop:"1px solid var(--color-border)" }}>
        <div className="footer-grid" style={{ display:"grid", gridTemplateColumns:"1.5fr 1fr 1fr 1fr", gap:48, marginBottom:48 }}>
          <div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:700, color:"var(--color-text-primary)", letterSpacing:3 }}>HAVENSTAY</div>
            <div style={{ fontSize:9, letterSpacing:3, color:"#b8943f", textTransform:"uppercase", marginBottom:16 }}>Luxury Collection</div>
            <p style={{ fontSize:13, color:"var(--color-text-muted)", lineHeight:1.8 }}>Redefining luxury travel with curated properties, concierge service, and real-time booking.</p>
          </div>
          {[["Collection",["Resorts","City Hotels","Heritage","Eco-Luxury"]],["Company",["About Us","Press","Careers","Partners"]],["Support",["Help Center","Cancellations","Privacy","Terms"]]].map(([title,links]) => (
            <div key={title}>
              <div style={{ fontSize:10, letterSpacing:2.5, color:"#b8943f", textTransform:"uppercase", fontWeight:600, marginBottom:20 }}>{title}</div>
              {links.map(l => (
                <div 
                  key={l} 
                  style={{ color:"var(--color-text-muted)", fontSize:13, marginBottom:12, cursor: l === "About Us" ? "pointer" : "default", transition: "color 0.3s" }}
                  onClick={() => l === "About Us" && navigate("/about")}
                  onMouseEnter={(e) => l === "About Us" && (e.target.style.color = "#b8943f")}
                  onMouseLeave={(e) => l === "About Us" && (e.target.style.color = "var(--color-text-muted)")}
                >
                  {l}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="footer-bottom" style={{ borderTop:"1px solid var(--color-border)", paddingTop:24, display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--color-text-muted)" }}>
          <span>© 2025 HavenStay Luxury Collection. All rights reserved.</span>
          <span>Built with Node.js · React · MongoDB</span>
        </div>
      </footer>
    </>
  );
}
