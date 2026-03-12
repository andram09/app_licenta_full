import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/authContext";
import "./Navbar.css";

// Navbar adaptiv: burger menu pe mobile, links normale pe desktop
export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const handleLogout = async () => {
        setMenuOpen(false);
        await logout();
        navigate("/", { replace: true });
    };

    // se inchide meniul la click in afara lui
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        if (menuOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [menuOpen]);

    // inchidem meniul la resize spre desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) setMenuOpen(false);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const handleLinkClick = () => setMenuOpen(false);

    return (
        <nav className="navbar" ref={menuRef}>
            <Link to="/" className="navbar-brand" onClick={handleLinkClick}>
                TripPlanner
            </Link>

            {/* Link-uri desktop — ascunse pe mobile */}
            <ul className="navbar-links">
                <li>
                    <Link to="/" className="navbar-link">
                        Acasă
                    </Link>
                </li>

                {!user ? (
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

            {/* Burger button — vizibil doar pe mobile */}
            <button
                className={`navbar-burger${menuOpen ? " navbar-burger--open" : ""}`}
                aria-label={menuOpen ? "Închide meniu" : "Deschide meniu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
            >
                <span className="navbar-burger-bar" />
                <span className="navbar-burger-bar" />
                <span className="navbar-burger-bar" />
            </button>

            {/* Meniu vertical mobile */}
            <div className={`navbar-mobile-menu${menuOpen ? " navbar-mobile-menu--open" : ""}`}>
                <ul className="navbar-mobile-links">
                    <li>
                        <Link to="/" className="navbar-mobile-link" onClick={handleLinkClick}>
                            Acasă
                        </Link>
                    </li>

                    {!user ? (
                        <>
                            <li>
                                <Link to="/login" className="navbar-mobile-link" onClick={handleLinkClick}>
                                    Autentificare
                                </Link>
                            </li>
                            <li>
                                <Link to="/register" className="navbar-mobile-link" onClick={handleLinkClick}>
                                    Înregistrare
                                </Link>
                            </li>
                        </>
                    ) : user.role === "ADMIN" ? (
                        <>
                            <li>
                                <Link to="/admin" className="navbar-mobile-link" onClick={handleLinkClick}>
                                    Dashboard
                                </Link>
                            </li>
                            <li>
                                <button onClick={handleLogout} className="navbar-mobile-logout-btn">
                                    Deconectare
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li>
                                <Link to="/trips" className="navbar-mobile-link" onClick={handleLinkClick}>
                                    Călătoriile mele
                                </Link>
                            </li>
                            <li>
                                <button onClick={handleLogout} className="navbar-mobile-logout-btn">
                                    Deconectare
                                </button>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
}