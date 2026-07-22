import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CSS } from "./components/UI";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Hotels from "./pages/Hotels";
import HotelDetail from "./pages/HotelDetail";
import { AuthPage } from "./pages/Auth";
import { BookingConfirm, MyBookings, Admin } from "./pages/Other";
import About from "./pages/About";
import CustomCursor from "./components/CustomCursor";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user)   return <Navigate to="/auth" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <CustomCursor />
      <style>{CSS}</style>
      <Navbar />
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/about"           element={<About />} />
        <Route path="/hotels"          element={<Hotels />} />
        <Route path="/hotels/:id"      element={<HotelDetail />} />
        <Route path="/auth"            element={<AuthPage />} />
        <Route path="/booking-confirm" element={<ProtectedRoute><BookingConfirm /></ProtectedRoute>} />
        <Route path="/bookings"        element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        <Route path="/admin"           element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
