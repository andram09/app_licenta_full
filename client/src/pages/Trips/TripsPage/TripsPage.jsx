import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../store/authContext";
import { api } from "../../../api/axios";
import { Pencil, FileDown } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import TripPdfDocument from "../../../components/pdf/TripPdfDocument";
import Navbar from "../../../components/layout/Navbar";
import "./TripsPage.css";

export default function TripsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(null); // id_trip în curs de export

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

    const handleExportPdf = async (e, trip) => {
        e.stopPropagation();
        setPdfLoading(trip.id_trip);
        try {
            const res = await api.get(`/trips/${trip.id_trip}/board`);
            const { days, unassigned } = res.data.data;

            // obiective fara adresa dar cu coordonate — le geocodam ca in BoardPage
            const allObjectives = [
                ...(unassigned || []),
                ...days.flatMap((d) => d.objectives || []),
            ];
            const needGeocode = allObjectives.filter(
                (o) => !o.address && o.coord_lat != null && o.coord_lng != null
            );

            let addressMap = {};
            if (needGeocode.length > 0) {
                // endpoint accepta max 20 coordonate per request
                const chunks = [];
                for (let i = 0; i < needGeocode.length; i += 20) {
                    chunks.push(needGeocode.slice(i, i + 20));
                }
                const results = await Promise.all(
                    chunks.map((chunk) =>
                        api.post("/external/reverse-geocode", {
                            coords: chunk.map((o) => ({
                                external_place_id: String(o.id_objective),
                                lat: o.coord_lat,
                                lng: o.coord_lng,
                            })),
                        }).then((r) => r.data.data).catch(() => ({}))
                    )
                );
                addressMap = Object.assign({}, ...results);

                // salvam adresele geocodate in DB
                const toSave = needGeocode
                    .filter((o) => addressMap[String(o.id_objective)])
                    .map((o) => ({
                        id_objective: o.id_objective,
                        address: addressMap[String(o.id_objective)],
                    }));
                if (toSave.length > 0) {
                    api.patch("/objectives/bulk-addresses", { addresses: toSave })
                        .catch(() => {});
                }
            }

            // injectam adresele geocodate in obiective
            const enrichObjectives = (objs) =>
                objs.map((o) => ({
                    ...o,
                    address: o.address || addressMap[String(o.id_objective)] || null,
                }));

            const enrichedDays = days.map((d) => ({
                ...d,
                objectives: enrichObjectives(d.objectives || []),
            }));
            const enrichedUnassigned = enrichObjectives(unassigned || []);

            const budgetTotal = [...enrichedUnassigned, ...enrichedDays.flatMap((d) => d.objectives)]
                .reduce((sum, obj) => sum + (obj.estimated_cost ? parseFloat(obj.estimated_cost) : 0), 0);

            const blob = await pdf(
                <TripPdfDocument
                    trip={trip}
                    days={enrichedDays}
                    unassigned={enrichedUnassigned}
                    budgetTotal={budgetTotal > 0 ? budgetTotal : null}
                />
            ).toBlob();

            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `itinerar-${trip.destination_name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert("Nu am putut genera PDF-ul. Încearcă din nou.");
        } finally {
            setPdfLoading(null);
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
                <button
                    className="trip-card-pdf-btn"
                    style={{ marginTop: 0 }}
                    type="button"
                    disabled={pdfLoading === trip.id_trip}
                    title="Exportă itinerariu PDF"
                    onClick={(e) => handleExportPdf(e, trip)}
                >
                    {pdfLoading === trip.id_trip ? (
                        "..."
                    ) : (
                        <FileDown size={14} strokeWidth={2} />
                    )}
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
