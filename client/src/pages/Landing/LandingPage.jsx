import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../store/authContext";
import Navbar from "../../components/layout/Navbar";
import { CalendarDays, Wallet, MapPin } from "lucide-react";
import "./LandingPage.css";

export default function LandingPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    const handlePrimaryAction = () => {
        if (!user) {
            navigate("/register");
        } else if (user.role === "ADMIN") {
            navigate("/admin");
        } else {
            navigate("/trips");
        }
    };

    const primaryLabel = !user ? "Creează-ți itinerariul" : user.role === "ADMIN" ? "Mergi la Dashboard" : "Călătoriile mele";

    return (
        <div className="landing">
            <Navbar />

            <section className="landing-hero">
                <h1 className="landing-hero-title">
                    Planifică-ți călătoria
                </h1>
                <p className="landing-hero-subtitle">
                    Creează itinerarii complete, explorează obiective turistice,
                    gestionează bugetul și vizualizează totul pe hartă, într-un singur loc.
                </p>

                {!loading && (
                    <div className="landing-hero-actions">
                        <button onClick={handlePrimaryAction} className="landing-cta-primary">
                            {primaryLabel}
                        </button>
                        {!user && (
                            <Link to="/login" className="landing-cta-secondary">
                                Autentificare
                            </Link>
                        )}
                    </div>
                )}
            </section>

            <div className="landing-how-section">
                <div className="landing-how-inner">
                    <h2 className="landing-how-title">Cum funcționează</h2>
                    <div className="landing-steps">
                        <div className="landing-step">
                            <div className="landing-step-number">1</div>
                            <h3 className="landing-step-title">Creează călătoria</h3>
                            <p className="landing-step-desc">
                                Adaugă destinația, datele și bugetul estimat pentru excursia ta.
                            </p>
                        </div>
                        <div className="landing-step">
                            <div className="landing-step-number">2</div>
                            <h3 className="landing-step-title">Explorează obiective</h3>
                            <p className="landing-step-desc">
                                Caută și adaugă obiective turistice, restaurante sau activități.
                            </p>
                        </div>
                        <div className="landing-step">
                            <div className="landing-step-number">3</div>
                            <h3 className="landing-step-title">Planifică pe zile</h3>
                            <p className="landing-step-desc">
                                Organizează obiectivele pe zile cu drag & drop în planificator.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="landing-features">
                <div className="landing-features-inner">
                    <h2 className="landing-features-title">Ce oferă aplicația</h2>
                    <div className="landing-features-grid">
                        <div className="landing-feature">
                            <div className="landing-feature-icon"><CalendarDays size={28} strokeWidth={1.5} /></div>
                            <h3 className="landing-feature-title">Organizare pe zile</h3>
                            <p className="landing-feature-desc">
                                Planificator vizual cu drag & drop pentru fiecare zi a călătoriei.
                            </p>
                        </div>
                        <div className="landing-feature">
                            <div className="landing-feature-icon"><Wallet size={28} strokeWidth={1.5} /></div>
                            <h3 className="landing-feature-title">Gestionare buget</h3>
                            <p className="landing-feature-desc">
                                Urmărește cheltuielile și rămâi în limita bugetului stabilit.
                            </p>
                        </div>
                        <div className="landing-feature">
                            <div className="landing-feature-icon"><MapPin size={28} strokeWidth={1.5} /></div>
                            <h3 className="landing-feature-title">Hartă interactivă</h3>
                            <p className="landing-feature-desc">
                                Vizualizează toate obiectivele pe hartă (Leaflet, extensibil).
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="landing-footer">
                © {new Date().getFullYear()} TripPlanner - Aplicatie informatica pentru
                planificarea itinerariilor turistice
            </footer>
        </div>
    );
}
