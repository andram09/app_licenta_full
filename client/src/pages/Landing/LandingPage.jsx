import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../store/authContext";
import LandingNavbar from "../../components/layout/LandingNavbar";
import { CalendarDays, Wallet, MapPin, ChevronDown, Search, LayoutGrid } from "lucide-react";
import parisImg from "../../assets/paris.jpg"
import barcelonaImg from "../../assets/barcelona.webp"
import positanoImg from "../../assets/positano.jpg"
import "./LandingPage.css";

export default function LandingPage() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "TravelPlanner";
    }, []);

    // Scroll-reveal: add .is-visible when element enters viewport
    useEffect(() => {
        const els = document.querySelectorAll("[data-reveal]");
        if (!els.length) return;
        const io = new IntersectionObserver(
            (entries) =>
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add("is-visible");
                        io.unobserve(e.target);
                    }
                }),
            { threshold: 0.12 }
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    const handlePrimaryAction = () => {
        if (!user) {
            navigate("/register");
        } else if (user.role === "ADMIN") {
            navigate("/admin");
        } else {
            navigate("/trips");
        }
    };

    const primaryLabel = !user
        ? "Creează-ți itinerariul"
        : user.role === "ADMIN"
        ? "Mergi la Dashboard"
        : "Călătoriile mele";

    return (
        <div className="landing">
            <LandingNavbar />

            <section className="landing-hero">
                {/* Left — text content */}
                <div className="landing-hero-content">
                    <p className="landing-hero-eyebrow">Planificatorul tău de vacanță</p>
                    <h1 className="landing-hero-title">
                        Planifică-ți<br />următoarea călătorie
                    </h1>
                    <p className="landing-hero-subtitle">
                        Creează itinerarii complete, explorează obiective turistice,
                        gestionează bugetul și vizualizează totul pe hartă,
                        într-un singur loc.
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
                </div>

                {/* Right — staggered floating destination cards */}
                <div className="landing-hero-cards" aria-hidden="true">
                    <div className="landing-hero-card landing-hero-card--1">
                        <img
                            src={parisImg}
                            alt="Paris"
                            loading="lazy"
                        />
                    </div>
                    <div className="landing-hero-card landing-hero-card--2">
                        <img
                            src={barcelonaImg}
                            loading="lazy"
                        />
                    </div>
                    <div className="landing-hero-card landing-hero-card--3">
                        <img
                            src={positanoImg}
                            alt="Amalfi"
                            loading="lazy"
                        />
                    </div>
                </div>

                {/* Bouncing scroll indicator */}
                <div className="landing-scroll-hint" aria-hidden="true">
                    <ChevronDown size={22} strokeWidth={2} />
                </div>
            </section>

            <div className="landing-how-section">
                <div className="landing-how-inner">
                    <h2 className="landing-how-title" data-reveal>Cum funcționează</h2>
                    <div className="landing-steps-connected">
                        <div className="landing-step-node" data-reveal data-reveal-delay="1">
                            <div className="landing-step-circle-wrap">
                                <span className="landing-step-badge">01</span>
                                <div className="landing-step-circle landing-step-circle--1">
                                    <MapPin size={26} strokeWidth={1.5} />
                                </div>
                            </div>
                            <h3 className="landing-step-title">Creează călătoria</h3>
                            <p className="landing-step-desc">
                                Adaugă destinația, datele și bugetul estimat pentru excursia ta.
                            </p>
                        </div>
                        <div className="landing-step-connector" aria-hidden="true" />
                        <div className="landing-step-node" data-reveal data-reveal-delay="2">
                            <div className="landing-step-circle-wrap">
                                <span className="landing-step-badge">02</span>
                                <div className="landing-step-circle landing-step-circle--2">
                                    <Search size={26} strokeWidth={1.5} />
                                </div>
                            </div>
                            <h3 className="landing-step-title">Explorează obiective</h3>
                            <p className="landing-step-desc">
                                Caută și adaugă obiective turistice, restaurante sau activități.
                            </p>
                        </div>
                        <div className="landing-step-connector" aria-hidden="true" />
                        <div className="landing-step-node" data-reveal data-reveal-delay="3">
                            <div className="landing-step-circle-wrap">
                                <span className="landing-step-badge">03</span>
                                <div className="landing-step-circle landing-step-circle--3">
                                    <LayoutGrid size={26} strokeWidth={1.5} />
                                </div>
                            </div>
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
                    <h2 className="landing-features-title" data-reveal>Ce oferă aplicația</h2>
                    <div className="landing-features-grid">
                        <div className="landing-feature" data-reveal data-reveal-delay="1">
                            <div className="landing-feature-icon"><CalendarDays size={26} strokeWidth={1.5} /></div>
                            <h3 className="landing-feature-title">Organizare pe zile</h3>
                            <p className="landing-feature-desc">
                                Planificator vizual cu drag & drop pentru fiecare zi a călătoriei.
                            </p>
                        </div>
                        <div className="landing-feature" data-reveal data-reveal-delay="2">
                            <div className="landing-feature-icon"><Wallet size={26} strokeWidth={1.5} /></div>
                            <h3 className="landing-feature-title">Gestionare buget</h3>
                            <p className="landing-feature-desc">
                                Urmărește cheltuielile și rămâi în limita bugetului stabilit.
                            </p>
                        </div>
                        <div className="landing-feature" data-reveal data-reveal-delay="3">
                            <div className="landing-feature-icon"><MapPin size={26} strokeWidth={1.5} /></div>
                            <h3 className="landing-feature-title">Hartă interactivă</h3>
                            <p className="landing-feature-desc">
                                Vizualizează toate obiectivele pe hartă și optimizează ruta zilnică.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="landing-footer">
                {new Date().getFullYear()} TravelPlanner - Aplicație pentru planificarea itinerariilor turistice
            </footer>
        </div>
    );
}
