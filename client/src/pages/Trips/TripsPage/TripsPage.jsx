import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../store/authContext";
import { api } from "../../../api/axios";
import "./TripsPage.css";

export default function TripsPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    // sterge o calatorie dupa id, cu confirmare
    const handleDeleteTrip = async (e, tripId) => {
        e.stopPropagation(); // nu activa click-ul cardului
        if (!window.confirm("Sigur vrei să ștergi această călătorie?")) return;
        try {
            await api.delete(`/trips/${tripId}`);
            setTrips(prev => prev.filter(t => t.id_trip !== tripId));
        } catch (err) {
            alert(err?.response?.data?.message || "Nu am putut șterge călătoria.");
        }
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
            <header className="trips-header">
                <h1 className="trips-header-title">Călătoriile mele</h1>
                <div className="trips-header-right">
                    <span className="trips-username">
                        Bun venit, {user?.first_name} {user?.last_name}
                    </span>
                    <button onClick={handleLogout} className="trips-logout-btn">
                        Deconectare
                    </button>
                </div>
            </header>

            <div className="trips-actions-bar">
                <button
                    className="trips-create-btn"
                    onClick={() => navigate("/trips/create")}
                >
                    + Creează călătorie
                </button>
            </div>

            <section className="trips-content">
                {loading && <p className="trips-state-msg">Se încarcă călătoriile...</p>}

                {!loading && error && <p className="trips-error-msg">{error}</p>}

                {!loading && !error && trips.length === 0 && (
                    <p className="trips-state-msg">Nu ai nicio călătorie încă.</p>
                )}

                {!loading && !error && trips.length > 0 && (
                    <div className="trips-grid">
                        {trips.map((trip) => (
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
                                {/* Buton stergere — pozitionat in coltul din dreapta sus al cardului */}
                                <button
                                    className="trip-card-delete-btn"
                                    type="button"
                                    aria-label="Șterge călătoria"
                                    onClick={(e) => handleDeleteTrip(e, trip.id_trip)}
                                >
                                    ✕
                                </button>

                                <h2 className="trip-card-destination">
                                    {trip.destination_name}
                                </h2>
                                <div className="trip-card-details">
                                    <span className="trip-card-days">
                                        {trip.number_of_days}{" "}
                                        {trip.number_of_days === 1 ? "zi" : "zile"}
                                    </span>
                                    {trip.start_date && (
                                        <span className="trip-card-date">
                                            Plecare: {formatDate(trip.start_date)}
                                        </span>
                                    )}
                                </div>
                                {/* afisam hotelul salvat, doar daca exista */}
                                {trip.hotel_name && (
                                    <span className="trip-card-hotel">
                                        🛏 {trip.hotel_name}
                                    </span>
                                )}
                                <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                                    <button
                                        className="trip-card-map-btn"
                                        style={{ marginTop: 0 }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/trips/${trip.id_trip}/budget`);
                                        }}
                                    >
                                        Buget
                                    </button>
                                    <button
                                        className="trip-card-map-btn"
                                        style={{ marginTop: 0 }}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/trips/${trip.id_trip}/map`);
                                        }}
                                    >
                                        Hartă
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}
