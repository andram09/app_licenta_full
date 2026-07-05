import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/authContext";
import { MapPin, User } from "lucide-react";
import "./LandingNavbar.css";

export default function LandingNavbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profileOpen, setProfileOpen] = useState(false);
    const profileRef = useRef(null);

    const handleLogout = async () => {
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
        if (profileOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [profileOpen]);

    const initials = user
        ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase()
        : "";

    return (
        <nav className="landing-nav">
            {/* Left: icon + brand text */}
            <div className="landing-nav-brand">
                <Link to="/" className="landing-nav-icon-wrap">
                    <MapPin size={18} strokeWidth={2.5} />
                </Link>
                <span className="landing-nav-brand-text">TravelPlanner</span>
            </div>

            {/* Right: actions */}
            <div className="landing-nav-actions">
                {!user && (
                    <>
                        <Link to="/login" className="landing-nav-link">Autentificare</Link>
                        <Link to="/register" className="landing-nav-link landing-nav-link--cta">Înregistrare</Link>
                    </>
                )}

                {user && (
                    <Link to="/" className="landing-nav-link">Acasă</Link>
                )}

                {user && (
                    <div className="landing-nav-profile" ref={profileRef}>
                        <button
                            className="landing-nav-avatar"
                            onClick={() => setProfileOpen(p => !p)}
                            aria-label="Meniu profil"
                        >
                            {initials || <User size={16} />}
                        </button>
                        {profileOpen && (
                            <div className="landing-nav-dropdown">
                                <div className="landing-nav-dropdown-header">
                                    <span className="landing-nav-dropdown-name">{user.first_name} {user.last_name}</span>
                                    <span className="landing-nav-dropdown-email">{user.email}</span>
                                </div>
                                <hr className="landing-nav-dropdown-divider" />
                                <Link to="/profile" className="landing-nav-dropdown-item" onClick={() => setProfileOpen(false)}>
                                    Profilul meu
                                </Link>
                                {user.role === "ADMIN" && (
                                    <Link to="/admin" className="landing-nav-dropdown-item" onClick={() => setProfileOpen(false)}>
                                        Dashboard admin
                                    </Link>
                                )}
                                <button className="landing-nav-dropdown-item landing-nav-dropdown-logout" onClick={handleLogout}>
                                    Deconectare
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
}
