import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../store/authContext";
import { api } from "../../../api/axios";
import { Plus, MapPin, Calendar, Clock, LogOut } from "lucide-react";
import "./TripsPage.css";

// Pagina principala cu lista de calatorii a utilizatorului
export default function TripsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // stare pentru calatorii, loading si erori
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // incarca lista de calatorii la montarea componentei
    useEffect(() => {
        const fetchTrips = async () => {
            try {
                const response = await api.get("/trips");
                setTrips(response.data.data);
            } catch (err) {
                const msg =
                    err?.response?.data?.message || "Nu am putut încărca călătoriile.";
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        fetchTrips();
    }, []);

    // deconectare si redirect catre login
    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    // formatam data in format romanesc: ZZ.LL.AAAA
    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString("ro-RO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    return (
        <main className="trips-page">
            {/* Header cu titlu, salut si buton deconectare */}
            <header className="trips-header">
                <h1 className="trips-header-title">Călătoriile mele</h1>
                <div className="trips-header-right">
                    <span className="trips-username">
                        Bun venit, {user?.first_name} {user?.last_name}
                    </span>
                    <button onClick={handleLogout} className="trips-logout-btn">
                        <LogOut size={14} strokeWidth={1.75} />
                        Deconectare
                    </button>
                </div>
            </header>

            {/* Bara de actiuni cu butonul de creare */}
            <div className="trips-actions-bar">
                <button
                    className="trips-create-btn"
                    onClick={() => navigate("/trips/create")}
                >
                    <Plus size={18} strokeWidth={1.75} />
                    Creează călătorie
                </button>
            </div>

            {/* Continut principal: loading, eroare sau lista de carduri */}
            <section className="trips-content">
                {loading && <p className="trips-state-msg">Se încarcă călătoriile...</p>}

                {!loading && error && <p className="trips-error-msg">{error}</p>}

                {!loading && !error && trips.length === 0 && (
                    <p className="trips-state-msg">Nu ai nicio călătorie încă.</p>
                )}

                {!loading && !error && trips.length > 0 && (
                    <div className="trips-grid">
                        {trips.map((trip) => (
                            // fiecare card redirectioneaza catre pagina de explore a calatoriei
                            <div
                                key={trip.id_trip}
                                className="trip-card"
                                onClick={() => navigate(`/trips/${trip.id_trip}/explore`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) =>
                                    e.key === "Enter" && navigate(`/trips/${trip.id_trip}/explore`)
                                }
                            >
                                <h2 className="trip-card-destination">
                                    {trip.destination_name}
                                </h2>
                                <div className="trip-card-details">
                                    <span className="trip-card-days">
                                        <Clock size={14} strokeWidth={1.75} />
                                        {trip.number_of_days}{" "}
                                        {trip.number_of_days === 1 ? "zi" : "zile"}
                                    </span>
                                    {trip.start_date && (
                                        <span className="trip-card-date">
                                            Plecare: {formatDate(trip.start_date)}
                                        </span>
                                    )}
                                </div>
                                {/* Buton harta - stopPropagation pentru a nu activa navigarea cardului */}
                                <button
                                    className="trip-card-map-btn"
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/trips/${trip.id_trip}/map`);
                                    }}
                                >
                                    <MapPin size={14} strokeWidth={1.75} />
                                    Hartă
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
