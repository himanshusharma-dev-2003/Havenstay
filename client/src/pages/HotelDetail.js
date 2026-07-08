import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useHotel, useRooms } from "../hooks";
import { bookingsAPI } from "../api";
import { useAuth } from "../context/AuthContext";
import { fmt, Tag, Stars, Spinner, Toast } from "../components/UI";
import { loadScript } from "../utils/loadScript";

export default function HotelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: hotelData, loading: hotelLoading } = useHotel(id);
  const hotel = hotelData?.data;

  const [form,    setForm]    = useState({ checkin:"", checkout:"", guests:"2" });
  const [selRoom, setSelRoom] = useState(null);
  const [booking, setBooking] = useState(false);
  const [toast,   setToast]   = useState(null);

  const { data: roomsData, loading: roomsLoading } = useRooms(id, form.checkin, form.checkout);
  const rooms = roomsData?.data || hotel?.rooms || [];

  const nights = (() => {
    if (!form.checkin || !form.checkout) return 0;
    const d = (new Date(form.checkout) - new Date(form.checkin)) / 86400000;
    return d > 0 ? Math.ceil(d) : 0;
  })();

  const handleBook = async () => {
    if (!user)    return navigate("/auth");
    if (!selRoom) return setToast({ msg:"Please select a room.", type:"error" });
    if (!form.checkin || !form.checkout || nights <= 0)
      return setToast({ msg:"Please select valid dates.", type:"error" });

    setBooking(true);
    try {
      const res = await bookingsAPI.create({
        roomId:   selRoom._id,
        hotelId:  hotel._id,
        checkIn:  form.checkin,
        checkOut: form.checkout,
        guests:   Number(form.guests),
      });

      const { _id, razorpayOrderId, amount, currency } = res.data;

      const scriptLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Are you online?");
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || "",
        amount: amount,
        currency: currency,
        name: "Restrip",
        description: `Booking for ${hotel.name}`,
        image: hotel.photos?.[0],
        order_id: razorpayOrderId,
        handler: async function (response) {
          try {
            await bookingsAPI.verifyPayment(_id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            navigate("/booking-confirm", { state: { booking: res.data } });
          } catch (err) {
            setToast({ msg: err.message || "Payment verification failed", type: "error" });
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#b8943f",
        },
        modal: {
          ondismiss: () => {
            setToast({ msg: "Payment cancelled. Reservation is pending.", type: "error" });
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setToast({ msg: response.error.description || "Payment failed", type: "error" });
      });
      rzp.open();

    } catch (err) {
      setToast({ msg: err.message, type:"error" });
    } finally {
      setBooking(false);
    }
  };

  if (hotelLoading) return <div style={{ paddingTop:80 }}><Spinner /></div>;
  if (!hotel)       return <div style={{ paddingTop:140, textAlign:"center", color:"#9a8e7e" }}>Hotel not found.</div>;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0806" }}>
      {/* Hero */}
      <div style={{ position:"relative", height:520, overflow:"hidden" }}>
        <img src={hotel.photos?.[0]} alt={hotel.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,rgba(5,4,3,0.4) 0%,rgba(5,4,3,0.88) 100%)" }} />
        <button onClick={() => navigate("/hotels")} style={{ position:"absolute", top:100, left:64, background:"rgba(10,8,6,0.7)", backdropFilter:"blur(8px)", border:"1px solid rgba(184,148,63,0.3)", color:"#f5efe6", padding:"8px 20px", cursor:"pointer", fontSize:11, letterSpacing:1.5, textTransform:"uppercase" }}>← Back</button>
        <div style={{ position:"absolute", bottom:60, left:64 }}>
          <Tag label={hotel.tag} />
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"clamp(2.5rem,5vw,5rem)", fontWeight:300, color:"#fff", lineHeight:1, margin:"10px 0 8px" }}>{hotel.name}</h1>
          <div style={{ display:"flex", alignItems:"center", gap:20, color:"#9a8e7e", fontSize:13 }}>
            <span>📍 {hotel.city}, {hotel.country}</span>
            <Stars rating={hotel.rating} />
            <span>{hotel.rating} ({hotel.reviewCount} reviews)</span>
          </div>
        </div>
      </div>

      <div className="detail-layout" style={{ display:"grid", gridTemplateColumns:"1fr 360px" }}>
        {/* Left */}
        <div className="detail-main" style={{ padding:"56px 64px", borderRight:"1px solid rgba(184,148,63,0.2)" }}>
          <p style={{ color:"#9a8e7e", fontSize:15, lineHeight:1.9, marginBottom:36, maxWidth:600 }}>{hotel.description}</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:48 }}>
            {hotel.amenities?.map(a => <span key={a} className="amenity-pill">{a}</span>)}
          </div>
          <div style={{ height:1, background:"linear-gradient(to right,transparent,#b8943f,transparent)", margin:"0 0 40px" }} />

          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300, color:"#f5efe6", marginBottom:24 }}>
            Suite <em style={{ fontWeight:600, color:"#d4af6a" }}>Collection</em>
          </h2>

          {roomsLoading && <Spinner />}
          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
            {rooms.map(room => {
              const unavailable = form.checkin && form.checkout && room.hasAvailableRooms === false;
              return (
                <div key={room._id || room.id}
                  className={`room-card room-item ${selRoom?._id === room._id ? "selected" : ""} ${unavailable ? "disabled" : ""}`}
                  onClick={() => !unavailable && setSelRoom(selRoom?._id===room._id ? null : room)}
                  style={{ display:"flex", gap:0, opacity: unavailable?0.5:1 }}>
                  <img className="room-img" src={room.photos?.[0] || "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&q=80"}
                    alt={room.title} style={{ width:160, height:120, objectFit:"cover", flexShrink:0 }} />
                  <div className="room-info" style={{ padding:"20px 24px", flex:1, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:600, color:"#f5efe6", marginBottom:6 }}>{room.title}</h3>
                      <p style={{ color:"#9a8e7e", fontSize:12, letterSpacing:0.5 }}>Up to {room.maxPeople} guests · {room.beds} bed{room.beds>1?"s":""}</p>
                      {unavailable && <p style={{ color:"#ef9a9a", fontSize:11, marginTop:4 }}>Not available for selected dates</p>}
                    </div>
                    <div className="room-price" style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:600, color:"#d4af6a" }}>{fmt(room.price)}</div>
                      <div style={{ fontSize:10, color:"#9a8e7e", letterSpacing:1 }}>PER NIGHT</div>
                    </div>
                  </div>
                  {selRoom?._id === room._id && <div style={{ width:4, background:"#b8943f", flexShrink:0 }} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Booking panel */}
        <div className="detail-sidebar" style={{ padding:"56px 40px", background:"#111009", position:"sticky", top:80, height:"fit-content" }}>
          <div className="section-tag" style={{ marginBottom:16 }}><span className="gold-line" />Reserve</div>
          <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, color:"#f5efe6", marginBottom:28 }}>Your Stay</h3>

          {[{ label:"Arrival", key:"checkin" },{ label:"Departure", key:"checkout" }].map(({ label,key }) => (
            <div key={key} style={{ marginBottom:20 }}>
              <div style={{ fontSize:9, letterSpacing:2.5, color:"#b8943f", textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>{label}</div>
              <input className="input-dark" type="date" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))} />
            </div>
          ))}
          <div style={{ marginBottom:28 }}>
            <div style={{ fontSize:9, letterSpacing:2.5, color:"#b8943f", textTransform:"uppercase", fontWeight:600, marginBottom:8 }}>Guests</div>
            <select className="input-dark" value={form.guests} onChange={e => setForm(f => ({ ...f, guests:e.target.value }))}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guest{n>1?"s":""}</option>)}
            </select>
          </div>

          {selRoom && nights > 0 && (
            <div style={{ border:"1px solid rgba(184,148,63,0.2)", padding:"20px", marginBottom:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, fontSize:13, color:"#9a8e7e" }}>
                <span>{fmt(selRoom.price)} × {nights} nights</span>
                <span style={{ color:"#f5efe6" }}>{fmt(selRoom.price * nights)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, fontSize:13, color:"#9a8e7e" }}>
                <span>Taxes & service (12%)</span>
                <span style={{ color:"#f5efe6" }}>{fmt(Math.round(selRoom.price * nights * 0.12))}</span>
              </div>
              <div style={{ borderTop:"1px solid rgba(184,148,63,0.2)", paddingTop:12, display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, color:"#f5efe6" }}>Total</span>
                <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:600, color:"#d4af6a" }}>{fmt(Math.round(selRoom.price * nights * 1.12))}</span>
              </div>
            </div>
          )}

          <button className="btn-primary" style={{ width:"100%", padding:16, fontSize:11 }}
            disabled={booking} onClick={handleBook}>
            {booking ? "Processing..." : !user ? "Sign In to Reserve" : selRoom ? "Confirm Reservation" : "Select a Suite"}
          </button>
          <div style={{ marginTop:16, textAlign:"center", fontSize:11, color:"#9a8e7e" }}>Free cancellation within 24 hours</div>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
