import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../api/axios";
import ManualObjectiveModal from "./ManualObjectiveModal";
import { ArrowLeft, ArrowRight } from "lucide-react";
import TripSubnav from "../../../components/trip-nav/TripSubnav";
import "./ExplorePage.css";

const CATEGORIES = [
    { key: "museums", label: "Muzee & Cultură" },
    { key: "historic", label: "Monumente și Locuri Istorice" },
    { key: "architecture", label: "Arhitectură" },
    { key: "parks", label: "Parcuri și Natură" },
    { key: "restaurants", label: "Restaurante" },
    { key: "cafes", label: "Cafenele" },
];

export default function ExplorePage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [tripLoading, setTripLoading] = useState(true);
    const [tripError, setTripError] = useState(null);

    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

    const [places, setPlaces] = useState([]);
    const [placesLoading, setPlacesLoading] = useState(false);
    const [placesError, setPlacesError] = useState(null);
    // const [geocodingLoading, setGeocodingLoading] = useState(false);

    const [addedIds, setAddedIds] = useState([]);
    const [addingIds, setAddingIds] = useState([]);

    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const fetchTrip = async () => {
            try {
                const res = await api.get(`/trips/${id}`);
                setTrip(res.data.data);
            } catch (err) {
                setTripError(err?.response?.data?.message || "Nu am putut incarca calatoria.");
            } finally {
                setTripLoading(false);
            }
        };
        fetchTrip();
    }, [id]);

    const fetchUnassigned = async () => {
        const res = await api.get(`/trips/${id}/objectives/unassigned`);
        const ids = (res.data.data || [])
            .filter(o => o.external_place_id)
            .map(o => o.external_place_id);
        setAddedIds(ids);
    };

    const fetchAddedObjectives = async () => {
        try {
            const res = await api.get(`/trips/${id}/board`);
            const { days, unassigned } = res.data.data;

            // toate obiectivele din trip
            const allObjectives = [
                ...unassigned,
                ...days.flatMap(d => d.objectives || [])
            ];

            const ids = allObjectives
                .filter(o => o.external_place_id)
                .map(o => o.external_place_id);

            setAddedIds(ids);
        } catch {
            // silent fail
        }
    };

    useEffect(() => {
        fetchAddedObjectives();
    }, [id]);

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
                    "Nu am putut incarca locurile. Incearca din nou."
                );
            } finally {
                setPlacesLoading(false);
            }
        };

        fetchPlaces();
    }, [trip, activeCategory]);

    // // reverse geocoding in background dupa ce places e populat
    // // cardurile se afiseaza imediat, adresele se actualizeaza pe masura ce vin
    // useEffect(() => {
    //     if (!places || places.length === 0) return;

    //     const needsGeocode = places.some(p => !p.address);
    //     if (!needsGeocode) return;

    //     const fetchAddresses = async () => {
    //         setGeocodingLoading(true);

    //         const coords = places
    //             .filter(p => !p.address && p.coord_lat && p.coord_lng)
    //             .map(p => ({
    //                 external_place_id: p.external_place_id,
    //                 lat: p.coord_lat,
    //                 lng: p.coord_lng
    //             }));

    //         if (coords.length === 0) {
    //             setGeocodingLoading(false);
    //             return;
    //         }

    //         try {
    //             const res = await api.post("/external/reverse-geocode", { coords });
    //             const addressMap = res.data.data;

    //             // actualizam places cu adresele primite fara sa refacem fetch-ul
    //             setPlaces(prev =>
    //                 prev.map(place => ({
    //                     ...place,
    //                     address: addressMap[place.external_place_id] ?? place.address ?? null
    //                 }))
    //             );
    //         } catch (err) {
    //             // eroare silentioasa - cardurile raman fara adresa, nu blocam UX-ul
    //             console.error("Reverse geocode failed:", err.message);
    //         } finally {
    //             setGeocodingLoading(false);
    //         }
    //     };

    //     fetchAddresses();
    // }, [places.length]);

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
            if (err?.response?.status === 409) {
                setAddedIds(prev => [...prev, place.external_place_id]);
            }
        } finally {
            setAddingIds(prev => prev.filter(pid => pid !== place.external_place_id));
        }
    };

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
                <TripSubnav
                    tripId={id}
                    destinationName={trip?.destination_name || ""}
                    showMap={true}
                    showBudget={false}
                    showAddObjective={true}
                    onAddObjective={() => setShowModal(true)}
                />

                <div className="explore-page-container">

                    {!hasCoords && (
                        <div className="explore-no-coords">
                            <p>
                                Această călătorie nu are coordonate salvate. Locurile nu pot fi încărcate.
                                Recreează călătoria selectând un oras din sugestii.
                            </p>
                        </div>
                    )}

                    {hasCoords && (
                        <>
                            <div className="explore-categories">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.key}
                                        className={`explore-cat-btn ${activeCategory.key === cat.key ? "explore-cat-btn--active" : ""}`}
                                        onClick={() => setActiveCategory(cat)}
                                        type="button"
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {placesLoading && (
                                <p className="explore-state-msg">Se încarcă locurile...</p>
                            )}
                            {/* {!placesLoading && geocodingLoading && (
                            <p className="explore-state-msg" style={{ padding: "0.5rem 0", fontSize: "12px" }}>
                                Se încarcă adresele...
                            </p>
                        )} */}

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
                                                    {isAdded ? "Adaugat ✓" : isAdding ? "Se adauga..." : "Viziteaza"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {showModal && (
                <ManualObjectiveModal
                    tripId={id}
                    tripLat={trip?.destination_lat ?? null}
                    tripLng={trip?.destination_lng ?? null}
                    onClose={() => setShowModal(false)}
                    onSaved={() => {
                        setShowModal(false);
                        fetchUnassigned();
                    }}
                />
            )}
        </>
    );
}
