import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../store/authContext";
import { api } from "../../../api/axios";
import { Pencil } from "lucide-react";
import Navbar from "../../../components/layout/Navbar";
import "./TripsPage.css";

export default function TripsPage() {
    const { user } = useAuth();
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

        document.title = "Călătoriile mele";
    }, []);

    const handleDeleteTrip = async (e, tripId) => {
        e.stopPropagation();
        if (!window.confirm("Sigur vrei să ștergi această călătorie?")) return;
        try {
            await api.delete(`/trips/${tripId}`);
            setTrips(prev => prev.filter(t => t.id_trip !== tripId));
        } catch (err) {
            alert(err?.response?.data?.message || "Nu am putut șterge călătoria.");
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return null;
        const date = new Date(dateStr);
        return date.toLocaleDateString("ro-RO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    // împărțim călătoriile în 3 categorii
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const future = trips
        .filter(t => t.start_date && new Date(t.start_date) >= today)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

    const noDate = trips.filter(t => !t.start_date);

    const past = trips
        .filter(t => t.start_date && new Date(t.start_date) < today)
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    const renderCard = (trip) => (
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
            <button
                className="trip-card-delete-btn"
                type="button"
                aria-label="Șterge călătoria"
                onClick={(e) => handleDeleteTrip(e, trip.id_trip)}
            >
                ✕
            </button>
            <div className="trip-card-destination-row">
                <h2 className="trip-card-destination">
                    {trip.destination_name}
                </h2>
                <button
                    className="trip-card-edit-btn"
                    type="button"
                    aria-label="Editează călătoria"
                    title="Modifică data și numărul de zile"
                    onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams();
                        params.set("id", trip.id_trip);
                        params.set("destination", trip.destination_name);
                        params.set("days", trip.number_of_days);
                        if (trip.start_date) {
                            const d = new Date(trip.start_date);
                            params.set("start_date", d.toISOString().split("T")[0]);
                        }
                        navigate(`/trips/create?${params.toString()}`);
                    }}
                >
                    <Pencil size={13} strokeWidth={2} />
                </button>
            </div>
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
    );

    const renderSection = (label, list) => {
        if (list.length === 0) return null;
        return (
            <div className="trips-section">
                <h3 className="trips-section-title">{label}</h3>
                <div className="trips-grid">
                    {list.map(renderCard)}
                </div>
            </div>
        );
    };

    return (
        <div className="trips-page">
            <Navbar pageTitle="Călătoriile mele" />

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
                    <>
                        {renderSection("Viitoare", future)}
                        {renderSection("Fără dată", noDate)}
                        {renderSection("Trecute", past)}
                    </>
                )}
            </section>
        </div>
    );
}
