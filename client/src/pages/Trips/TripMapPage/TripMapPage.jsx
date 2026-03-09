import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../api/axios";
import TripMap from "./TripMap";
import "./TripMapPage.css";

export default function TripMapPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    // columns: { unassigned: [], "day-{id}": [] }
    const [columns, setColumns] = useState({});
    // columnOrder + meta pentru tab-uri de filtrare
    const [columnOrder, setColumnOrder] = useState([]);
    const [columnMeta, setColumnMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State UI
    const [selectedDayKey, setSelectedDayKey] = useState(null); // null = toate
    const [highlightedObjId, setHighlightedObjId] = useState(null);

    // ── Fetch ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchBoard = async () => {
            try {
                const res = await api.get(`/trips/${id}/board`);
                const { trip: t, days, unassigned } = res.data.data;
                setTrip(t);

                const cols = { unassigned };
                const order = ["unassigned"];
                const meta = { unassigned: { title: "Neatribuite" } };

                for (const day of days) {
                    const key = `day-${day.id_day}`;
                    cols[key] = day.objectives;
                    order.push(key);
                    const label = day.calendar_date
                        ? new Date(day.calendar_date).toLocaleDateString("ro-RO", {
                            day: "numeric",
                            month: "short",
                        })
                        : null;
                    meta[key] = {
                        title: `Ziua ${day.day_index}${label ? ` · ${label}` : ""}`,
                    };
                }

                setColumns(cols);
                setColumnOrder(order);
                setColumnMeta(meta);
            } catch (err) {
                setError(err?.response?.data?.message || "Nu am putut încărca harta.");
            } finally {
                setLoading(false);
            }
        };
        fetchBoard();
    }, [id]);

    // ── Obiective vizibile (filtrate pe zi selectată) ──────────────────────
    const visibleObjectives = useMemo(() => {
        if (!Object.keys(columns).length) return [];
        const source =
            selectedDayKey !== null
                ? columns[selectedDayKey] ?? []
                : Object.values(columns).flat();
        return source;
    }, [columns, selectedDayKey]);

    // ── Handlers ───────────────────────────────────────────────────────────
    const handleItemClick = (objId) => {
        setHighlightedObjId(objId === highlightedObjId ? null : objId);
    };

    const handleMarkerClick = (objId) => {
        setHighlightedObjId(objId);
    };

    // ── Render ─────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="map-page">
                <p className="map-state-msg">Se încarcă harta...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="map-page">
                <p className="map-state-msg map-state-msg--error">{error}</p>
            </div>
        );
    }

    return (
        <div className="map-page">
            {/* Header */}
            <header className="map-header">
                <div className="map-header-left">
                    <button
                        className="map-nav-btn"
                        type="button"
                        onClick={() => navigate(`/trips/${id}/board`)}
                    >
                        Planificare
                    </button>
                    <button
                        className="map-nav-btn"
                        type="button"
                        onClick={() => navigate(`/trips/${id}/explore`)}
                    >
                        Explorare
                    </button>
                </div>
                <h1 className="map-title">
                    Harta:
                    <span className="map-destination"> {trip?.destination_name}</span>
                </h1>
                <button
                    className="map-nav-btn map-nav-btn--right"
                    type="button"
                    onClick={() => navigate("/trips")}
                >
                    Călătoriile mele
                </button>
            </header>

            {/* Tab-uri filtrare zi */}
            <nav className="map-day-tabs">
                <button
                    className={`map-day-tab${selectedDayKey === null ? " map-day-tab--active" : ""}`}
                    type="button"
                    onClick={() => setSelectedDayKey(null)}
                >
                    Toate
                </button>
                {columnOrder.map((key) => (
                    <button
                        key={key}
                        className={`map-day-tab${selectedDayKey === key ? " map-day-tab--active" : ""}`}
                        type="button"
                        onClick={() => setSelectedDayKey(key)}
                    >
                        {columnMeta[key].title}
                    </button>
                ))}
            </nav>

            {/* Layout principal: sidebar stânga + hartă dreapta */}
            <div className="map-layout">
                {/* Sidebar - lista obiective */}
                <aside className="map-sidebar">
                    {visibleObjectives.length === 0 && (
                        <p className="map-sidebar-empty">
                            Niciun obiectiv{selectedDayKey ? " în această zi" : ""}.
                        </p>
                    )}
                    {visibleObjectives.map((obj) => {
                        const hasCoords = obj.coord_lat != null && obj.coord_lng != null;
                        const isHighlighted = obj.id_objective === highlightedObjId;
                        return (
                            <button
                                key={obj.id_objective}
                                type="button"
                                className={`map-obj-item${isHighlighted ? " map-obj-item--active" : ""}${!hasCoords ? " map-obj-item--no-coords" : ""}`}
                                onClick={() => hasCoords && handleItemClick(obj.id_objective)}
                                title={!hasCoords ? "Fara coordonate - nu apare pe harta" : ""}
                            >
                                <span className="map-obj-title">{obj.title}</span>
                                {obj.planned_time && (
                                    <span className="map-obj-time">
                                        {obj.planned_time.slice(0, 5)}
                                    </span>
                                )}
                                {!hasCoords && (
                                    <span className="map-obj-no-coords">fără coordonate</span>
                                )}
                            </button>
                        );
                    })}
                </aside>

                {/* Hartă */}
                <main className="map-main">
                    <TripMap
                        objectives={visibleObjectives}
                        highlightedObjId={highlightedObjId}
                        onMarkerClick={handleMarkerClick}
                        hotel={trip?.hotel_name ? {
                            name: trip.hotel_name,
                            lat: trip.hotel_lat,
                            lng: trip.hotel_lng
                        } : null}
                    />
                </main>
            </div>
        </div>
    );
}
