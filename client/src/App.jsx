import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/Landing/LandingPage";
import LoginPage from "./pages/Auth/Login/LoginPage";
import RegisterPage from "./pages/Auth/Register/RegisterPage";
import ForgotPasswordPage from "./pages/Auth/ForgotPassword/ForgotPasswordPage";
import ResetPasswordPage from "./pages/Auth/ResetPassword/ResetPasswordPage";
import TripsPage from "./pages/Trips/TripsPage/TripsPage";
import CreateTripPage from "./pages/Trips/TripsPage/CreateTripPage";
import ExplorePage from "./pages/Trips/ExplorePage/ExplorePage";
import AdminPage from "./pages/Admin/AdminPage";
import BoardPage from "./pages/Trips/BoardPage/BoardPage";
import TripMapPage from "./pages/Trips/TripMapPage/TripMapPage";
import BudgetPage from "./pages/Trips/BudgetPage/BudgetPage";
import ProfilePage from "./pages/ProfilePage/ProfilePage";

function App() {
  return (
    <Routes>
      {/* Landing Page - accesibila pentru toti */}
      <Route path="/" element={<LandingPage />} />

      {/* Rute publice */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Rute protejate - doar USER */}
      <Route element={<ProtectedRoute requiredRole="USER" />}>
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/create" element={<CreateTripPage />} />
        <Route path="/trips/:id/explore" element={<ExplorePage />} />
        <Route path="/trips/:id/board" element={<BoardPage />} />
        <Route path="/trips/:id/map" element={<TripMapPage />} />
        <Route path="/trips/:id/budget" element={<BudgetPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Rute protejate - doar ADMIN */}
      <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Orice ruta necunoscuta => landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
