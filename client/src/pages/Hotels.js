import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useHotels } from "../hooks";
import { fmt, Stars, Tag, Spinner } from "../components/UI";

export default function Hotels() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [filter, setFilter] = useState({
    city:     searchParams.get("city") || "",
    maxPrice: 2500,
    rating:   0,
    category: "",
  });
  const [sortBy, setSortBy] = useState("-rating");

  const apiParams = {
    ...(filter.city     && { city: filter.city }),
    ...(filter.rating   && { rating: filter.rating }),
    ...(filter.category && { category: filter.category }),
    maxPrice: filter.maxPrice,
    sort:     sortBy,
    limit:    24,
  };

  const { data, loading, error } = useHotels(apiParams);
  const hotels = data?.data || [];

  return (
    <div style={{ minHeight:"100vh", paddingTop:80, background:"var(--color-bg-primary)" }}>
      {/* Header */}
      <div className="hotels-header" style={{ background:"linear-gradient(135deg,var(--color-bg-secondary) 0%,var(--color-bg-secondary) 100%)", padding:"56px 64px 40px", borderBottom:"1px solid var(--color-border)" }}>
        <div className="section-tag" style={{ marginBottom:12 }}><span className="gold-line" />Our Collection</div>
        <h1 className="hotels-title" style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.5rem,5vw,5rem)", fontWeight:300, color:"var(--color-text-primary)" }}>
          Luxury <em style={{ fontWeight:600, color:"#d4af6a" }}>Properties</em>
        </h1>
        <p style={{ color:"var(--color-text-muted)", marginTop:10, fontSize:13 }}>{hotels.length} exceptional properties</p>
      </div>

      <div className="hotels-layout" style={{ display:"flex" }}>
        {/* Sidebar */}
        <div className="hotels-sidebar" style={{ width:280, flexShrink:0, borderRight:"1px solid var(--color-border)", padding:"40px 32px", position:"sticky", top:80, height:"calc(100vh - 80px)", overflowY:"auto", background:"var(--color-bg-secondary)" }}>
          <div style={{ fontSize:10, letterSpacing:2.5, color:"#b8943f", textTransform:"uppercase", fontWeight:600, marginBottom:28 }}>Refine Search</div>

          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, letterSpacing:1.5, color:"var(--color-text-muted)", textTransform:"uppercase", marginBottom:10 }}>Destination</div>
            <input className="input-dark" placeholder="City or property..." value={filter.city}
              onChange={e => setFilter(f => ({ ...f, city:e.target.value }))} />
          </div>

          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, letterSpacing:1.5, color:"var(--color-text-muted)", textTransform:"uppercase", marginBottom:10 }}>Category</div>
            {["","Resort","Urban","Heritage","Eco-Luxury"].map(c => (
              <div key={c} onClick={() => setFilter(f => ({ ...f, category:c }))}
                style={{ padding:"8px 12px", border:"1px solid", borderColor: filter.category===c?"#b8943f":"var(--color-border)", color: filter.category===c?"#d4af6a":"var(--color-text-muted)", fontSize:12, cursor:"pointer", transition:"all .2s", marginBottom:4, background: filter.category===c?"rgba(184,148,63,0.08)":"transparent" }}>
                {c || "All Categories"}
              </div>
            ))}
          </div>

          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, letterSpacing:1.5, color:"var(--color-text-muted)", textTransform:"uppercase", marginBottom:10 }}>Max Price: {fmt(filter.maxPrice)}/night</div>
            <input type="range" min={200} max={2500} step={50} value={filter.maxPrice}
              onChange={e => setFilter(f => ({ ...f, maxPrice:+e.target.value }))}
              style={{ width:"100%", accentColor:"#b8943f" }} />
          </div>

          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, letterSpacing:1.5, color:"var(--color-text-muted)", textTransform:"uppercase", marginBottom:10 }}>Min Rating</div>
            {[[0,"All ratings"],[4,"4+ ★"],[4.5,"4.5+ ★"],[4.8,"4.8+ ★"]].map(([r,label]) => (
              <label key={r} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, cursor:"pointer", fontSize:12, color: filter.rating===r?"#d4af6a":"var(--color-text-muted)" }}>
                <input type="radio" name="rating" checked={filter.rating===r} onChange={() => setFilter(f => ({ ...f, rating:r }))} style={{ accentColor:"#b8943f" }} />
                {label}
              </label>
            ))}
          </div>

          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, letterSpacing:1.5, color:"var(--color-text-muted)", textTransform:"uppercase", marginBottom:10 }}>Sort By</div>
            <select className="input-dark" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="-rating">Highest Rated</option>
              <option value="cheapestPrice">Lowest Price</option>
              <option value="-cheapestPrice">Highest Price</option>
            </select>
          </div>

          <button className="btn-outline" style={{ width:"100%", fontSize:10, padding:10 }}
            onClick={() => setFilter({ city:"", maxPrice:2500, rating:0, category:"" })}>
            Reset Filters
          </button>
        </div>

        {/* Grid */}
        <div className="hotels-grid" style={{ flex:1, padding:"40px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))", gap:3, alignContent:"start" }}>
          {loading && <div style={{ gridColumn:"1/-1" }}><Spinner /></div>}
          {error && <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px 0", color:"#ef9a9a" }}>Failed to load hotels: {error}</div>}
          {!loading && hotels.map(h => (
            <div key={h._id} className="hotel-card" style={{ height:400 }} onClick={() => navigate(`/hotels/${h._id}`)}>
              <img src={h.photos?.[0]} alt={h.name} />
              <div className="overlay" />
              <div className="card-content">
                <Tag label={h.tag} />
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:600, color:"var(--color-text-primary)", margin:"10px 0 6px" }}>{h.name}</h3>
                <div style={{ fontSize:12, color:"var(--color-text-muted)", marginBottom:12 }}>📍 {h.city}, {h.country}</div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:"#d4af6a" }}>
                    From {fmt(h.cheapestPrice)}<span style={{ fontSize:12, color:"var(--color-text-muted)", fontFamily:"'Jost',sans-serif" }}>/night</span>
                  </span>
                  <span style={{ color:"#b8943f", fontSize:12 }}>★ {h.rating}</span>
                </div>
              </div>
            </div>
          ))}
          {!loading && !error && hotels.length === 0 && (
            <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"100px 0", color:"var(--color-text-muted)" }}>
              <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:64, color:"var(--color-bg-secondary)", marginBottom:16 }}>✦</div>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:"#ede4d6" }}>No properties found</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
