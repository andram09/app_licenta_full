import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/authContext";
import { User, MapPin } from "lucide-react";
import "./Navbar.css";

export default function Navbar({ pageTitle = null, hideNavLinks = false, navLink = null, hideDropdownLinks = false }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const navRef = useRef(null);
    const profileRef = useRef(null);

    const handleLogout = async () => {
        setMobileOpen(false);
        setProfileOpen(false);
        await logout();
        navigate("/", { replace: true });
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setProfileOpen(false);
            }
        };
        if (profileOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (navRef.current && !navRef.current.contains(e.target)) {
                setMobileOpen(false);
            }
        };
        if (mobileOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [mobileOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) setMobileOpen(false);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const initials = user
        ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
        : "";

    return (
        <nav className="navbar" ref={navRef}>
            {/* Left: brand icon */}
            <div className="navbar-brand-group">
                <Link to="/" className="navbar-icon-wrap">
                    <MapPin size={18} strokeWidth={2.5} />
                </Link>
            </div>

            {/* Center: page title */}
            <div className="navbar-center">
                <span className="navbar-title">{pageTitle ?? "TripPlanner"}</span>
            </div>

            {/* Right: actions */}
            <div className="navbar-actions">
                {!user && !hideNavLinks && (
                    <>
                        <Link to="/login" className="navbar-link">Autentificare</Link>
                        <Link to="/register" className="navbar-link">Înregistrare</Link>
                    </>
                )}

                {user?.role === "USER" && (
                    <Link
                        to={navLink?.to ?? "/"}
                        className="navbar-link"
                    >
                        {navLink?.label ?? "Acasă"}
                    </Link>
                )}

                {user && (
                    <div className="navbar-profile-wrapper" ref={profileRef}>
                        <button
                            className="navbar-avatar-btn"
                            onClick={() => setProfileOpen((p) => !p)}
                            aria-label="Meniu profil"
                        >
                            {initials || <User size={16} />}
                        </button>
                        {profileOpen && (
                            <div className="navbar-profile-dropdown">
                                <div className="navbar-profile-dropdown-header">
                                    <span className="navbar-profile-dropdown-name">
                                        {user.first_name} {user.last_name}
                                    </span>
                                    <span className="navbar-profile-dropdown-email">
                                        {user.email}
                                    </span>
                                </div>
                                <hr className="navbar-profile-dropdown-divider" />
                                <Link
                                    to="/profile"
                                    className="navbar-profile-dropdown-item"
                                    onClick={() => setProfileOpen(false)}
                                >
                                    Profilul meu
                                </Link>
                                {user.role === "ADMIN" && !hideDropdownLinks && (
                                    <Link
                                        to="/admin"
                                        className="navbar-profile-dropdown-item"
                                        onClick={() => setProfileOpen(false)}
                                    >
                                        Dashboard admin
                                    </Link>
                                )}
                                <button
                                    className="navbar-profile-dropdown-item navbar-profile-dropdown-logout"
                                    onClick={handleLogout}
                                >
                                    Deconectare
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Burger — mobile only */}
                <button
                    className={`navbar-burger${mobileOpen ? " navbar-burger--open" : ""}`}
                    aria-label={mobileOpen ? "Închide meniu" : "Deschide meniu"}
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen((p) => !p)}
                >
                    <span className="navbar-burger-bar" />
                    <span className="navbar-burger-bar" />
                    <span className="navbar-burger-bar" />
                </button>
            </div>

            {/* Mobile dropdown */}
            <div className={`navbar-mobile-menu${mobileOpen ? " navbar-mobile-menu--open" : ""}`}>
                <ul className="navbar-mobile-links">
                    {user?.role === "USER" && (
                        <li>
                            <Link
                                to="/trips/create"
                                className="navbar-mobile-link"
                                onClick={() => setMobileOpen(false)}
                            >
                                + Călătorie nouă
                            </Link>
                        </li>
                    )}
                    {user ? (
                        <>
                            <li>
                                <Link
                                    to="/profile"
                                    className="navbar-mobile-link"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    Profilul meu
                                </Link>
                            </li>
                            <li>
                                <button onClick={handleLogout} className="navbar-mobile-logout-btn">
                                    Deconectare
                                </button>
                            </li>
                        </>
                    ) : !hideNavLinks ? (
                        <>
                            <li>
                                <Link to="/login" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>
                                    Autentificare
                                </Link>
                            </li>
                            <li>
                                <Link to="/register" className="navbar-mobile-link" onClick={() => setMobileOpen(false)}>
                                    Înregistrare
                                </Link>
                            </li>
                        </>
                    ) : null}
                </ul>
            </div>
        </nav>
    );
}
