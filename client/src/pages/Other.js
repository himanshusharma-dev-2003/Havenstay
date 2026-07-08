import { useLocation, useNavigate } from "react-router-dom";
import { useMyBookings, useAllBookings, useHotels } from "../hooks";
import { hotelsAPI, roomsAPI } from "../api";
import { fmt, Tag, Spinner, Toast } from "../components/UI";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import AdminChat from "../components/AdminChat";

// ── Booking Confirmation ──────────────────────────────────────────
export function BookingConfirm() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const booking   = state?.booking;

  if (!booking) {
    navigate("/"); return null;
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#111009", paddingTop:80 }}>
      <div style={{ background:"#1a1610", border:"1px solid rgba(184,148,63,0.2)", maxWidth:520, width:"90%", padding:"56px 48px", textAlign:"center", position:"relative" }}>
        <div style={{ position:"absolute", top:-1, left:"50%", transform:"translateX(-50%)", width:80, height:2, background:"#b8943f" }} />
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:64, color:"rgba(184,148,63,0.2)", lineHeight:1, marginBottom:4 }}>✦</div>
        <div className="section-tag" style={{ justifyContent:"center", marginBottom:12 }}><span className="gold-line" />Confirmed</div>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:300, color:"#f5efe6", marginBottom:6 }}>Your Suite Awaits</h2>
        <p style={{ color:"#9a8e7e", fontSize:13, marginBottom:36 }}>Your reservation has been secured successfully.</p>
        <div style={{ border:"1px solid rgba(184,148,63,0.2)", padding:"24px 28px", textAlign:"left", marginBottom:32 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16, paddingBottom:16, borderBottom:"1px solid rgba(184,148,63,0.15)" }}>
            <span style={{ fontSize:10, letterSpacing:2, color:"#b8943f", textTransform:"uppercase" }}>Booking Reference</span>
            <span style={{ fontFamily:"monospace", fontWeight:700, color:"#d4af6a", fontSize:13 }}>{booking._id?.slice(-10).toUpperCase()}</span>
          </div>
          {[
            ["Property",  booking.hotelId?.name || "—"],
            ["Suite",     booking.roomId?.title || "—"],
            ["Arrival",   new Date(booking.checkIn).toLocaleDateString()],
            ["Departure", new Date(booking.checkOut).toLocaleDateString()],
            ["Guests",    booking.guests],
            ["Duration",  `${booking.nights} night${booking.nights>1?"s":""}`],
            ["Total",     fmt(booking.totalPrice)],
          ].map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid rgba(184,148,63,0.07)", fontSize:13 }}>
              <span style={{ color:"#9a8e7e" }}>{k}</span>
              <span style={{ color: k==="Total"?"#d4af6a":"#f5efe6", fontWeight: k==="Total"?600:400, fontFamily: k==="Total"?"'Cormorant Garamond',serif":"inherit", fontSize: k==="Total"?18:13 }}>{v}</span>
            </div>
          ))}
        </div>
        <button className="btn-primary" style={{ width:"100%", padding:16 }} onClick={() => navigate("/bookings")}>View My Reservations</button>
      </div>
    </div>
  );
}

// ── My Bookings ───────────────────────────────────────────────────
export function MyBookings() {
  const { data, loading, cancel } = useMyBookings();
  const [toast, setToast] = useState(null);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this reservation?")) return;
    try {
      await cancel(id, "Cancelled by user");
      setToast({ msg:"Reservation cancelled.", type:"error" });
    } catch (err) {
      setToast({ msg:err.message, type:"error" });
    }
  };

  return (
    <div style={{ minHeight:"100vh", paddingTop:80, background:"#0a0806" }}>
      <div style={{ background:"#111009", padding:"56px 64px 40px", borderBottom:"1px solid rgba(184,148,63,0.2)" }}>
        <div className="section-tag" style={{ marginBottom:12 }}><span className="gold-line" />Your Journey</div>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"4rem", fontWeight:300, color:"#f5efe6" }}>
          My <em style={{ fontWeight:600, color:"#d4af6a" }}>Reservations</em>
        </h1>
      </div>
      <div style={{ maxWidth:1000, margin:"48px auto", padding:"0 64px" }}>
        {loading && <Spinner />}
        {!loading && data.length === 0 && (
          <div style={{ textAlign:"center", padding:"100px 0" }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:80, color:"rgba(184,148,63,0.12)", lineHeight:1, marginBottom:16 }}>✦</div>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, color:"#ede4d6", marginBottom:12 }}>No reservations yet</h3>
            <p style={{ color:"#9a8e7e", fontSize:13 }}>Your extraordinary stays await discovery.</p>
          </div>
        )}
        {data.map(b => (
          <div key={b._id} className="d-flex-mobile-col" style={{ border:"1px solid rgba(184,148,63,0.2)", marginBottom:3, display:"flex", overflow:"hidden", background:"#111009" }}>
            <img className="w-mobile-100 h-mobile-auto" src={b.hotelId?.photos?.[0]} alt="" style={{ width:200, height:160, objectFit:"cover", flexShrink:0 }} />
            <div className="room-info" style={{ padding:"24px 32px", flex:1, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:600, color:"#f5efe6", marginBottom:4 }}>{b.hotelId?.name}</h3>
                <p style={{ color:"#9a8e7e", fontSize:12, marginBottom:16 }}>{b.roomId?.title} · {b.hotelId?.city}</p>
                <div style={{ display:"flex", gap:24, fontSize:12 }}>
                  {[["Arrival",new Date(b.checkIn).toLocaleDateString()],["Departure",new Date(b.checkOut).toLocaleDateString()],["Guests",b.guests],["Nights",b.nights]].map(([k,v]) => (
                    <div key={k}>
                      <div style={{ fontSize:9, letterSpacing:2, color:"#b8943f", textTransform:"uppercase", marginBottom:3 }}>{k}</div>
                      <div style={{ color:"#f5efe6", fontWeight:500 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:600, color:"#d4af6a", marginBottom:8 }}>{fmt(b.totalPrice)}</div>
                <Tag label={b.status.toUpperCase()} color={b.status==="cancelled"?"red":b.status==="confirmed"?"green":"#b8943f"} />
                {b.status==="confirmed" && (
                  <div style={{ marginTop:12 }}>
                    <button onClick={() => handleCancel(b._id)} style={{ background:"transparent", border:"1px solid rgba(192,57,43,0.4)", color:"#ef9a9a", padding:"6px 16px", cursor:"pointer", fontSize:9, letterSpacing:1, textTransform:"uppercase", fontFamily:"'Jost',sans-serif" }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────────
export function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState(null);
  const { data: bookingsData, loading } = useAllBookings({ limit:100 });
  const { data: hotelsData, loading: hotelsLoading, refetch: refetchHotels } = useHotels({ limit: 100, sort: "name" });
  const bookings = bookingsData?.data || [];
  const revenue  = bookingsData?.revenue || 0;
  const hotels = hotelsData?.data || [];

  const [selectedHotelId, setSelectedHotelId] = useState("");
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [editingHotelId, setEditingHotelId] = useState(null);
  const [editingRoomId, setEditingRoomId] = useState(null);

  const [hotelForm, setHotelForm] = useState({
    name: "",
    city: "",
    country: "",
    address: "",
    description: "",
    cheapestPrice: "",
    category: "Resort",
    photos: [""],
    lat: "",
    lng: "",
  });

  const [roomForm, setRoomForm] = useState({
    hotelId: "",
    title: "",
    description: "",
    price: "",
    maxPeople: "",
    beds: "1",
    photosText: "",
    amenitiesText: "",
    roomNumbersText: "101",
  });

  const [saving, setSaving] = useState(false);

  const splitCsv = (text = "") =>
    text
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const parseRoomNumbers = (text = "") =>
    splitCsv(text)
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n > 0)
      .map((number) => ({ number }));

  const loadRooms = async (hotelId) => {
    if (!hotelId) {
      setRooms([]);
      return;
    }
    setRoomsLoading(true);
    try {
      const res = await roomsAPI.getByHotel(hotelId);
      setRooms(res.data || []);
    } catch (err) {
      setToast({ msg: err.message || "Failed to load rooms", type: "error" });
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (!hotels.length || selectedHotelId) return;
    const firstId = hotels[0]._id;
    setSelectedHotelId(firstId);
    setRoomForm((prev) => ({ ...prev, hotelId: firstId }));
    loadRooms(firstId);
  }, [hotels, selectedHotelId]);

  const createOrUpdateHotel = async () => {
    setSaving(true);
    try {
      const payload = {
        ...hotelForm,
        cheapestPrice: Number(hotelForm.cheapestPrice),
      };

      if (editingHotelId) {
        await hotelsAPI.update(editingHotelId, payload);
        setToast({ msg: "Hotel updated!", type: "success" });
      } else {
        await hotelsAPI.create(payload);
        setToast({ msg: "Hotel created!", type: "success" });
      }

      await refetchHotels();
      setEditingHotelId(null);
      setHotelForm({ name:"", city:"", country:"", address:"", description:"", cheapestPrice:"", category:"Resort", photos:[""], lat:"", lng:"" });
    } catch (err) {
      setToast({ msg:err.message, type:"error" });
    } finally { setSaving(false); }
  };

  const editHotel = (hotel) => {
    setEditingHotelId(hotel._id);
    setHotelForm({
      name: hotel.name || "",
      city: hotel.city || "",
      country: hotel.country || "",
      address: hotel.address || "",
      description: hotel.description || "",
      cheapestPrice: String(hotel.cheapestPrice || ""),
      category: hotel.category || "Resort",
      photos: hotel.photos?.length ? hotel.photos : [""],
      lat: hotel.lat ? String(hotel.lat) : "",
      lng: hotel.lng ? String(hotel.lng) : "",
    });
    setTab("hotels");
  };

  const removeHotel = async (hotelId) => {
    if (!window.confirm("Delete this hotel? This will deactivate it.")) return;
    try {
      await hotelsAPI.delete(hotelId);
      await refetchHotels();
      if (selectedHotelId === hotelId) {
        setSelectedHotelId("");
      }
      setToast({ msg: "Hotel deleted", type: "success" });
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    }
  };

  const createOrUpdateRoom = async () => {
    const payload = {
      hotelId: roomForm.hotelId || selectedHotelId,
      title: roomForm.title,
      description: roomForm.description,
      price: Number(roomForm.price),
      maxPeople: Number(roomForm.maxPeople),
      beds: Number(roomForm.beds || 1),
      photos: splitCsv(roomForm.photosText),
      amenities: splitCsv(roomForm.amenitiesText),
      roomNumbers: parseRoomNumbers(roomForm.roomNumbersText),
    };

    if (!payload.hotelId) {
      setToast({ msg: "Select a hotel first", type: "error" });
      return;
    }
    if (!payload.roomNumbers.length) {
      setToast({ msg: "Add at least one room number", type: "error" });
      return;
    }

    setSaving(true);
    try {
      if (editingRoomId) {
        await roomsAPI.update(editingRoomId, payload);
        setToast({ msg: "Room updated!", type: "success" });
      } else {
        await roomsAPI.create(payload);
        setToast({ msg: "Room created!", type: "success" });
      }
      await loadRooms(payload.hotelId);
      await refetchHotels();
      setEditingRoomId(null);
      setRoomForm((prev) => ({
        ...prev,
        title: "",
        description: "",
        price: "",
        maxPeople: "",
        beds: "1",
        photosText: "",
        amenitiesText: "",
        roomNumbersText: "101",
      }));
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const editRoom = (room) => {
    setEditingRoomId(room._id);
    setRoomForm({
      hotelId: room.hotelId?._id || room.hotelId || selectedHotelId,
      title: room.title || "",
      description: room.description || "",
      price: String(room.price || ""),
      maxPeople: String(room.maxPeople || ""),
      beds: String(room.beds || 1),
      photosText: (room.photos || []).join(", "),
      amenitiesText: (room.amenities || []).join(", "),
      roomNumbersText: (room.roomNumbers || []).map((r) => r.number).join(", "),
    });
    setTab("rooms");
  };

  const removeRoom = async (roomId) => {
    if (!window.confirm("Delete this room? This will deactivate it.")) return;
    try {
      await roomsAPI.delete(roomId);
      await loadRooms(selectedHotelId);
      await refetchHotels();
      setToast({ msg: "Room deleted", type: "success" });
    } catch (err) {
      setToast({ msg: err.message, type: "error" });
    }
  };

  const stats = [
    ["Total Bookings", bookings.length, "📋"],
    ["Active", bookings.filter(b=>b.status==="confirmed").length, "✅"],
    ["Revenue", fmt(revenue), "💰"],
    ["Properties", hotels.length, "🏨"],
  ];

  return (
    <div style={{ minHeight:"100vh", paddingTop:80, background:"#0a0806" }}>
      <div style={{ background:"#111009", padding:"56px 64px 0", borderBottom:"1px solid rgba(184,148,63,0.2)" }}>
        <div className="section-tag" style={{ marginBottom:12 }}><span className="gold-line" />Management</div>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"4rem", fontWeight:300, color:"#f5efe6", marginBottom:32 }}>
          {user?.role === "owner" ? "Owner" : "Admin"} <em style={{ fontWeight:600, color:"#d4af6a" }}>Console</em>
        </h1>
        <div style={{ display:"flex", gap:3 }}>
          {["overview","bookings","hotels","rooms","chats"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:"12px 32px", background: tab===t?"#b8943f":"transparent", color: tab===t?"#0a0806":"#9a8e7e", border:"1px solid", borderColor: tab===t?"#b8943f":"rgba(184,148,63,0.2)", cursor:"pointer", fontSize:10, fontWeight:600, letterSpacing:2, textTransform:"uppercase", fontFamily:"'Jost',sans-serif" }}>{t}</button>
          ))}
        </div>
      </div>

      <div className="p-mobile-20" style={{ padding:"48px 64px", maxWidth:1200 }}>
        {tab==="overview" && (
          <>
            <div className="stats-grid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:3, marginBottom:48 }}>
              {stats.map(([label,value,icon]) => (
                <div key={label} className="stat-card">
                  <div style={{ fontSize:28, marginBottom:12 }}>{icon}</div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:34, fontWeight:600, color:"#d4af6a" }}>{loading?"…":value}</div>
                  <div style={{ fontSize:10, letterSpacing:2, color:"#9a8e7e", textTransform:"uppercase", marginTop:4 }}>{label}</div>
                </div>
              ))}
            </div>
            <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, color:"#f5efe6", marginBottom:20 }}>Recent <em style={{ color:"#d4af6a" }}>Bookings</em></h3>
            {loading ? <Spinner /> : bookings.slice(0,8).map(b => (
              <div key={b._id} className="table-row" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 0" }}>
                <div>
                  <div style={{ fontWeight:500, fontSize:14, color:"#f5efe6" }}>{b.hotelId?.name} · {b.roomId?.title}</div>
                  <div style={{ fontSize:11, color:"#9a8e7e", marginTop:2 }}>{b.userId?.email} · {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}</div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:"#d4af6a" }}>{fmt(b.totalPrice)}</span>
                  <Tag label={b.status.toUpperCase()} color={b.status==="cancelled"?"red":"green"} />
                </div>
              </div>
            ))}
          </>
        )}

        {tab==="bookings" && (
          <div style={{ overflowX:"auto" }}>
            {loading ? <Spinner /> : (
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid rgba(184,148,63,0.2)" }}>
                    {["Property","Suite","Guest","Check-in","Check-out","Nights","Total","Status"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:9, letterSpacing:2, color:"#b8943f", textTransform:"uppercase", fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b._id} className="table-row">
                      <td style={{ padding:"14px 16px", color:"#f5efe6", fontWeight:500 }}>{b.hotelId?.name}</td>
                      <td style={{ padding:"14px 16px", color:"#9a8e7e" }}>{b.roomId?.title}</td>
                      <td style={{ padding:"14px 16px", color:"#9a8e7e" }}>{b.userId?.email}</td>
                      <td style={{ padding:"14px 16px" }}>{new Date(b.checkIn).toLocaleDateString()}</td>
                      <td style={{ padding:"14px 16px" }}>{new Date(b.checkOut).toLocaleDateString()}</td>
                      <td style={{ padding:"14px 16px", textAlign:"center" }}>{b.nights}</td>
                      <td style={{ padding:"14px 16px", fontFamily:"'Cormorant Garamond',serif", fontSize:18, color:"#d4af6a" }}>{fmt(b.totalPrice)}</td>
                      <td style={{ padding:"14px 16px" }}><Tag label={b.status.toUpperCase()} color={b.status==="cancelled"?"red":"green"} /></td>
                    </tr>
                  ))}
                  {bookings.length===0 && <tr><td colSpan={8} style={{ padding:"60px", textAlign:"center", color:"#9a8e7e" }}>No bookings yet</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab==="hotels" && (
          <div className="grid-mobile-1" style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:24 }}>
            <div style={{ border:"1px solid rgba(184,148,63,0.2)", background:"#111009" }}>
              <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(184,148,63,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:"#f5efe6" }}>Properties</h3>
                <span style={{ color:"#9a8e7e", fontSize:12 }}>{hotels.length} total</span>
              </div>
              <div style={{ maxHeight:520, overflowY:"auto" }}>
                {hotelsLoading ? <Spinner /> : hotels.map((h) => (
                  <div key={h._id} className="table-row" style={{ padding:"18px 24px", display:"flex", justifyContent:"space-between", gap:16 }}>
                    <div>
                      <div style={{ color:"#f5efe6", fontWeight:600 }}>{h.name}</div>
                      <div style={{ fontSize:12, color:"#9a8e7e", marginTop:3 }}>{h.city}, {h.country} · {fmt(h.cheapestPrice)}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <button className="btn-outline" style={{ padding:"7px 14px", fontSize:9 }} onClick={() => editHotel(h)}>Edit</button>
                      <button onClick={() => removeHotel(h._id)} style={{ background:"transparent", border:"1px solid rgba(192,57,43,0.4)", color:"#ef9a9a", padding:"7px 14px", cursor:"pointer", fontSize:9, letterSpacing:1.2, textTransform:"uppercase" }}>Delete</button>
                    </div>
                  </div>
                ))}
                {!hotelsLoading && hotels.length===0 && <div style={{ padding:32, color:"#9a8e7e" }}>No hotels found</div>}
              </div>
            </div>

            <div style={{ border:"1px solid rgba(184,148,63,0.2)", padding:"26px", background:"#111009" }}>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, color:"#f5efe6", marginBottom:22 }}>
                {editingHotelId ? "Edit Property" : "Add New Property"}
              </h3>
              <div style={{ display:"grid", gap:14 }}>
                {[["Hotel Name","name","text"],["City","city","text"],["Country","country","text"],["Address","address","text"],["Price/Night ($)","cheapestPrice","number"]].map(([label,key,type]) => (
                  <div key={key}>
                    <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
                    <input className="input-dark" type={type} value={hotelForm[key]} onChange={e => setHotelForm(h => ({ ...h, [key]:e.target.value }))} />
                  </div>
                ))}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Latitude (Optional)</div>
                    <input className="input-dark" type="number" step="any" value={hotelForm.lat} onChange={e => setHotelForm(h => ({ ...h, lat:e.target.value }))} placeholder="e.g. 28.6139" />
                  </div>
                  <div>
                    <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Longitude (Optional)</div>
                    <input className="input-dark" type="number" step="any" value={hotelForm.lng} onChange={e => setHotelForm(h => ({ ...h, lng:e.target.value }))} placeholder="e.g. 77.2090" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Category</div>
                  <select className="input-dark" value={hotelForm.category} onChange={e => setHotelForm(h => ({ ...h, category:e.target.value }))}>
                    {["Resort","Urban","Heritage","Eco-Luxury","Other"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Photo URL</div>
                  <input className="input-dark" value={hotelForm.photos[0]} onChange={e => setHotelForm(h => ({ ...h, photos:[e.target.value] }))} placeholder="https://images.unsplash.com/..." />
                </div>
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Description</div>
                  <textarea className="input-dark" rows={4} value={hotelForm.description} onChange={e => setHotelForm(h => ({ ...h, description:e.target.value }))} style={{ resize:"vertical" }} />
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:18 }}>
                <button className="btn-primary" style={{ padding:"12px 24px" }} disabled={saving} onClick={createOrUpdateHotel}>
                  {saving ? "Saving..." : editingHotelId ? "Update Property" : "Create Property"}
                </button>
                {editingHotelId && (
                  <button className="btn-outline" style={{ padding:"12px 24px" }} onClick={() => { setEditingHotelId(null); setHotelForm({ name:"", city:"", country:"", address:"", description:"", cheapestPrice:"", category:"Resort", photos:[""], lat:"", lng:"" }); }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab==="rooms" && (
          <div className="grid-mobile-1" style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:24 }}>
            <div style={{ border:"1px solid rgba(184,148,63,0.2)", background:"#111009" }}>
              <div style={{ padding:"20px 24px", borderBottom:"1px solid rgba(184,148,63,0.15)", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
                <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, color:"#f5efe6" }}>Rooms</h3>
                <select className="input-dark" style={{ maxWidth:360 }} value={selectedHotelId} onChange={async (e) => { const hid = e.target.value; setSelectedHotelId(hid); setRoomForm((prev) => ({ ...prev, hotelId: hid })); await loadRooms(hid); }}>
                  <option value="">Select Hotel</option>
                  {hotels.map((h) => <option key={h._id} value={h._id}>{h.name} · {h.city}</option>)}
                </select>
              </div>
              <div style={{ maxHeight:520, overflowY:"auto" }}>
                {roomsLoading ? <Spinner /> : rooms.map((r) => (
                  <div key={r._id} className="table-row" style={{ padding:"18px 24px", display:"flex", justifyContent:"space-between", gap:16 }}>
                    <div>
                      <div style={{ color:"#f5efe6", fontWeight:600 }}>{r.title}</div>
                      <div style={{ fontSize:12, color:"#9a8e7e", marginTop:3 }}>${r.price} · {r.maxPeople} guests · Beds {r.beds || 1}</div>
                      <div style={{ fontSize:11, color:"#7f7567", marginTop:4 }}>Room Nos: {(r.roomNumbers || []).map((n) => n.number).join(", ") || "-"}</div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <button className="btn-outline" style={{ padding:"7px 14px", fontSize:9 }} onClick={() => editRoom(r)}>Edit</button>
                      <button onClick={() => removeRoom(r._id)} style={{ background:"transparent", border:"1px solid rgba(192,57,43,0.4)", color:"#ef9a9a", padding:"7px 14px", cursor:"pointer", fontSize:9, letterSpacing:1.2, textTransform:"uppercase" }}>Delete</button>
                    </div>
                  </div>
                ))}
                {!roomsLoading && rooms.length===0 && <div style={{ padding:32, color:"#9a8e7e" }}>No rooms for this hotel</div>}
              </div>
            </div>

            <div style={{ border:"1px solid rgba(184,148,63,0.2)", padding:"26px", background:"#111009" }}>
              <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, color:"#f5efe6", marginBottom:22 }}>
                {editingRoomId ? "Edit Room" : "Add New Room"}
              </h3>
              <div style={{ display:"grid", gap:14 }}>
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Hotel</div>
                  <select className="input-dark" value={roomForm.hotelId || selectedHotelId} onChange={async (e) => { const hid = e.target.value; setSelectedHotelId(hid); setRoomForm((prev) => ({ ...prev, hotelId: hid })); await loadRooms(hid); }}>
                    <option value="">Select Hotel</option>
                    {hotels.map((h) => <option key={h._id} value={h._id}>{h.name}</option>)}
                  </select>
                </div>
                {[["Room Title","title","text"],["Price/Night ($)","price","number"],["Max Guests","maxPeople","number"],["Beds","beds","number"]].map(([label,key,type]) => (
                  <div key={key}>
                    <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>{label}</div>
                    <input className="input-dark" type={type} value={roomForm[key]} onChange={e => setRoomForm(r => ({ ...r, [key]:e.target.value }))} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Room Numbers (comma-separated)</div>
                  <input className="input-dark" value={roomForm.roomNumbersText} onChange={e => setRoomForm(r => ({ ...r, roomNumbersText:e.target.value }))} placeholder="101, 102, 103" />
                </div>
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Amenities (comma-separated)</div>
                  <input className="input-dark" value={roomForm.amenitiesText} onChange={e => setRoomForm(r => ({ ...r, amenitiesText:e.target.value }))} placeholder="WiFi, Minibar, Ocean View" />
                </div>
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Photo URLs (comma-separated)</div>
                  <input className="input-dark" value={roomForm.photosText} onChange={e => setRoomForm(r => ({ ...r, photosText:e.target.value }))} placeholder="https://..., https://..." />
                </div>
                <div>
                  <div style={{ fontSize:9, letterSpacing:2.2, color:"#b8943f", textTransform:"uppercase", marginBottom:6 }}>Description</div>
                  <textarea className="input-dark" rows={3} value={roomForm.description} onChange={e => setRoomForm(r => ({ ...r, description:e.target.value }))} style={{ resize:"vertical" }} />
                </div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:18 }}>
                <button className="btn-primary" style={{ padding:"12px 24px" }} disabled={saving} onClick={createOrUpdateRoom}>
                  {saving ? "Saving..." : editingRoomId ? "Update Room" : "Create Room"}
                </button>
                {editingRoomId && (
                  <button className="btn-outline" style={{ padding:"12px 24px" }} onClick={() => { setEditingRoomId(null); setRoomForm((prev) => ({ ...prev, title:"", description:"", price:"", maxPeople:"", beds:"1", photosText:"", amenitiesText:"", roomNumbersText:"101" })); }}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab==="chats" && (
          <AdminChat />
        )}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
