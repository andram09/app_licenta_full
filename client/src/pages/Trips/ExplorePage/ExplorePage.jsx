import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../api/axios";
import { ArrowLeft, Plus, ArrowRight, CheckCircle, Landmark, TreePine, Utensils, Coffee, Building2, MapPin } from "lucide-react";
import ManualObjectiveModal from "./ManualObjectiveModal";
import "./ExplorePage.css";

// Definitia categoriilor - key-ul corespunde valorii acceptate de GET /external/places?category=
const CATEGORIES = [
    { key: "museums", label: "Muzee & Cultură", icon: Landmark },
    { key: "historic", label: "Monumente și Locuri Istorice", icon: MapPin },
    { key: "architecture", label: "Arhitectură", icon: Building2 },
    { key: "parks", label: "Parcuri & Natură", icon: TreePine },
    { key: "restaurants", label: "Restaurante", icon: Utensils },
    { key: "cafes", label: "Cafenele", icon: Coffee },
];

export default function ExplorePage() {
    const { id } = useParams();
    const navigate = useNavigate();

    // datele calatoriei (destination_name, lat, lng)
    const [trip, setTrip] = useState(null);
    const [tripLoading, setTripLoading] = useState(true);
    const [tripError, setTripError] = useState(null);

    // categoria activa - implicit prima categorie
    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

    // locurile returnate de backend din OpenTripMap
    const [places, setPlaces] = useState([]);
    const [placesLoading, setPlacesLoading] = useState(false);
    const [placesError, setPlacesError] = useState(null);

    // lista cu external_place_id-urile deja adaugate (populata din BD la mount)
    const [addedIds, setAddedIds] = useState([]);

    // lista cu id-urile pentru care se face request de adaugare (loading per card)
    const [addingIds, setAddingIds] = useState([]);

    // stare vizibilitate modala obiectiv manual
    const [showModal, setShowModal] = useState(false);

    // incarca detaliile calatoriei
    useEffect(() => {
        const fetchTrip = async () => {
            try {
                const res = await api.get(`/trips/${id}`);
                setTrip(res.data.data);
            } catch (err) {
                setTripError(err?.response?.data?.message || "Nu am putut încărca călătoria.");
            } finally {
                setTripLoading(false);
            }
        };
        fetchTrip();
    }, [id]);

    // reincarca obiectivele deja adaugate (apelat si dupa adaugare manuala)
    const fetchUnassigned = async () => {
        try {
            const res = await api.get(`/trips/${id}/objectives/unassigned`);
            const ids = (res.data.data || [])
                .filter(o => o.external_place_id)
                .map(o => o.external_place_id);
            setAddedIds(ids);
        } catch {
            // eroare silentioasa - nu blocheaza pagina
        }
    };

    useEffect(() => {
        fetchUnassigned();
    }, [id]);

    // fetch locuri din backend ori de cate ori se schimba categoria sau se incarca trip-ul
    useEffect(() => {
        if (!trip?.destination_lat || !trip?.destination_lng) return;

        const fetchPlaces = async () => {
            setPlacesLoading(true);
            setPlacesError(null);
            setPlaces([]);
            try {
                const res = await api.get("/external/places", {
                    params: {
                        lat: trip.destination_lat,
                        lng: trip.destination_lng,
                        category: activeCategory.key,
                    },
                });
                setPlaces(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                setPlacesError(
                    err?.response?.data?.message ||
                    "Nu am putut încărca locurile. Încearcă din nou."
                );
            } finally {
                setPlacesLoading(false);
            }
        };

        fetchPlaces();
    }, [trip, activeCategory]);

    // handler pentru adaugarea unui obiectiv din card via POST /trips/:id/objectives/from-api
    const handleAddPlace = async (place) => {
        if (addedIds.includes(place.external_place_id)) return;
        if (addingIds.includes(place.external_place_id)) return;

        setAddingIds(prev => [...prev, place.external_place_id]);

        try {
            await api.post(`/trips/${id}/objectives/from-api`, {
                title: place.title,
                coord_lat: place.coord_lat,
                coord_lng: place.coord_lng,
                address: place.address || null,
                description: place.description || null,
                external_place_id: place.external_place_id,
                external_provider: place.external_provider,
            });

            setAddedIds(prev => [...prev, place.external_place_id]);
        } catch (err) {
            // 409 = deja adaugat, il marcam tot ca "Adaugat"
            if (err?.response?.status === 409) {
                setAddedIds(prev => [...prev, place.external_place_id]);
            }
        } finally {
            setAddingIds(prev => prev.filter(pid => pid !== place.external_place_id));
        }
    };

    // eroare la incarcarea trip-ului
    if (tripError) {
        return (
            <main className="explore-page">
                <p className="explore-error-msg">{tripError}</p>
            </main>
        );
    }

    const hasCoords = trip?.destination_lat && trip?.destination_lng;

    return (
        <>
            <div className="explore-page">
                <div className="explore-header">
                    <div className="explore-header-left">
                        <button
                            className="explore-back-btn"
                            onClick={() => navigate("/trips")}
                            type="button"
                        >
                            <ArrowLeft size={14} strokeWidth={1.75} />
                            Călătoriile mele
                        </button>
                        <h1 className="explore-title">
                            Descoperă atracții din{" "}
                            <span className="explore-destination">{trip?.destination_name}</span>
                        </h1>
                    </div>

                    <div className="explore-header-actions">
                        <button
                            className="explore-manual-btn"
                            type="button"
                            onClick={() => setShowModal(true)}
                        >
                            <Plus size={14} strokeWidth={1.75} />
                            Obiectiv manual
                        </button>

                        <button
                            className="explore-board-btn"
                            type="button"
                            onClick={() => navigate(`/trips/${id}/board`)}
                        >
                            Continuă cu planificarea pe zile
                            <ArrowRight size={14} strokeWidth={1.75} />
                        </button>
                    </div>
                </div>

                {!hasCoords && (
                    <div className="explore-no-coords">
                        <p>
                            Această călătorie nu are coordonate salvate. Locurile nu pot fi încărcate.
                            Recreează călătoria selectând un oraș din sugestii.
                        </p>
                    </div>
                )}

                {hasCoords && (
                    <>
                        <div className="explore-categories">
                            {CATEGORIES.map(cat => {
                                const Icon = cat.icon;
                                return (
                                    <button
                                        key={cat.key}
                                        className={`explore-cat-btn ${activeCategory.key === cat.key ? "explore-cat-btn--active" : ""}`}
                                        onClick={() => setActiveCategory(cat)}
                                        type="button"
                                    >
                                        <Icon size={14} strokeWidth={1.75} />
                                        {cat.label}
                                    </button>
                                );
                            })}
                        </div>

                        {placesLoading && (
                            <p className="explore-state-msg">Se încarcă locurile...</p>
                        )}

                        {!placesLoading && placesError && (
                            <div className="explore-error-box">
                                <p>{placesError}</p>
                                <button
                                    className="explore-retry-btn"
                                    onClick={() => setActiveCategory({ ...activeCategory })}
                                >
                                    Reîncearcă
                                </button>
                            </div>
                        )}

                        {!placesLoading && !placesError && places.length === 0 && (
                            <p className="explore-state-msg">
                                Nu am găsit locuri pentru această categorie.
                            </p>
                        )}

                        {!placesLoading && !placesError && places.length > 0 && (
                            <div className="explore-grid">
                                {places.map((place) => {
                                    const isAdded = addedIds.includes(place.external_place_id);
                                    const isAdding = addingIds.includes(place.external_place_id);

                                    return (
                                        <div key={place.external_place_id} className="explore-card">
                                            <div className="explore-card-body">
                                                <h3 className="explore-card-title">{place.title}</h3>
                                                {place.address && (
                                                    <p className="explore-card-address">{place.address}</p>
                                                )}
                                            </div>
                                            <button
                                                className={`explore-card-btn ${isAdded ? "explore-card-btn--added" : ""}`}
                                                onClick={() => handleAddPlace(place)}
                                                disabled={isAdded || isAdding}
                                                type="button"
                                            >
                                                {isAdded
                                                    ? <><CheckCircle size={14} strokeWidth={1.75} /> Adăugat</>
                                                    : isAdding
                                                        ? "Se adaugă..."
                                                        : "Vizitează"
                                                }
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modala obiectiv manual - in afara div-ului principal pentru pozitionare corecta pe overlay */}
            {showModal && (
                <ManualObjectiveModal
                    tripId={id}
                    tripLat={trip?.destination_lat ?? null}
                    tripLng={trip?.destination_lng ?? null}
                    onClose={() => setShowModal(false)}
                    onSaved={() => {
                        setShowModal(false);
                        // reincarcam addedIds fara refresh de pagina
                        fetchUnassigned();
                    }}
                />
            )}
        </>
    );
}
