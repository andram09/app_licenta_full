import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/authContext";
import "./Navbar.css";

// Navbar adaptiv: link-uri diferite in functie de starea de autentificare si rol
export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/", { replace: true });
    };

    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">
                TripPlanner
            </Link>

            <ul className="navbar-links">
                {/* Link Acasa permanent */}
                <li>
                    <Link to="/" className="navbar-link">
                        Acasă
                    </Link>
                </li>

                {!user ? (
                    // Utilizator neautentificat
                    <>
                        <li>
                            <Link to="/login" className="navbar-link">
                                Autentificare
                            </Link>
                        </li>
                        <li>
                            <Link to="/register" className="navbar-link">
                                Înregistrare
                            </Link>
                        </li>
                    </>
                ) : user.role === "ADMIN" ? (
                    // Utilizator logat cu rol ADMIN
                    <>
                        <li>
                            <Link to="/admin" className="navbar-link">
                                Dashboard
                            </Link>
                        </li>
                        <li>
                            <button onClick={handleLogout} className="navbar-logout-btn">
                                Deconectare
                            </button>
                        </li>
                    </>
                ) : (
                    // Utilizator logat cu rol USER
                    <>
                        <li>
                            <Link to="/trips" className="navbar-link">
                                Călătoriile mele
                            </Link>
                        </li>
                        <li>
                            <button onClick={handleLogout} className="navbar-logout-btn">
                                Deconectare
                            </button>
                        </li>
                    </>
                )}
            </ul>
        </nav>
    );
}
