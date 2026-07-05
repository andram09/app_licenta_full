import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../../api/axios";
import ManualObjectiveModal from "./ManualObjectiveModal";
import TripSubnav from "../../../components/trip-nav/TripSubnav";
import Navbar from "../../../components/layout/Navbar";
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

    const [trip, setTrip] = useState(null);
    const [tripLoading, setTripLoading] = useState(true);
    const [tripError, setTripError] = useState(null);

    const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

    const [places, setPlaces] = useState([]);
    const [placesLoading, setPlacesLoading] = useState(false);
    const [placesError, setPlacesError] = useState(null);

    const [addedIds, setAddedIds] = useState([]);
    const [addingIds, setAddingIds] = useState([]);

    const [showModal, setShowModal] = useState(false);

    const placesCache = useRef({});
    const prefetchPromises = useRef({});

    const CACHE_TTL_MS = 45 * 60 * 1000;

    const lsKey = (lat, lng, cat) =>
        `explore_${cat}_${Number(lat).toFixed(3)}_${Number(lng).toFixed(3)}`;

    const readFromStorage = (key) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const { data, expiresAt } = JSON.parse(raw);
            if (Date.now() > expiresAt) { localStorage.removeItem(key); return null; }
            return data;
        } catch { return null; }
    };

    const writeToStorage = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + CACHE_TTL_MS }));
        } catch { /* silent fail daca storage e plin */ }
    };

    const fetchCategoryPlaces = (lat, lng, categoryKey) => {
        if (placesCache.current[categoryKey] !== undefined) return;
        if (prefetchPromises.current[categoryKey]) return;

        // const key = lsKey(lat, lng, categoryKey);
        // const stored = readFromStorage(key);
        // if (stored) {
        //     placesCache.current[categoryKey] = stored;
        //     prefetchPromises.current[categoryKey] = Promise.resolve(stored);
        //     return;
        // }

        prefetchPromises.current[categoryKey] = api
            .get("/external/places", { params: { lat, lng, category: categoryKey } })
            .then(res => {
                const result = Array.isArray(res.data) ? res.data : [];
                placesCache.current[categoryKey] = result;
                // writeToStorage(key, result);
                return result;
            })
            .catch(() => {
                delete prefetchPromises.current[categoryKey];
                return null;
            });
    };

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

    const fetchAddedObjectives = async () => {
        try {
            const res = await api.get(`/trips/${id}/board`);
            const { days, unassigned } = res.data.data;

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

        const lat = trip.destination_lat;
        const lng = trip.destination_lng;


        const fetchPlaces = async () => {
            // Daca e deja in cache, afisam instant
            if (placesCache.current[activeCategory.key] !== undefined) {
                setPlaces(placesCache.current[activeCategory.key]);
                setPlacesLoading(false);
                setPlacesError(null);
                return;
            }

            setPlacesLoading(true);
            setPlacesError(null);
            setPlaces([]);

            // Daca exista un prefetch in curs pentru aceasta categorie, il asteptam
            if (prefetchPromises.current[activeCategory.key]) {
                try {
                    const result = await prefetchPromises.current[activeCategory.key];
                    if (result !== null) {
                        setPlaces(result);
                        setPlacesLoading(false);
                        return;
                    }
                } catch {
                    // prefetch-ul a esuat, continuam cu fetch propriu
                }
            }

            // Fetch direct
            fetchCategoryPlaces(lat, lng, activeCategory.key);
            try {
                const result = await prefetchPromises.current[activeCategory.key];
                if (result !== null) {
                    setPlaces(result ?? []);
                } else {
                    setPlacesError("Nu am putut încărca locurile. Încearcă din nou.");
                }
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

    // Prefetch celelalte 3 categorii Wikidata in fundal, secvential cu delay de 1.5s intre cereri
    useEffect(() => {
        if (!trip?.destination_lat || !trip?.destination_lng) return;

        const lat = trip.destination_lat;
        const lng = trip.destination_lng;
        const WIKIDATA_CATS = ["museums", "historic", "architecture", "parks"];

        let cancelled = false;

        const prefetch = async () => {
            for (const catKey of WIKIDATA_CATS) {
                if (cancelled) break;
                fetchCategoryPlaces(lat, lng, catKey);
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        };

        prefetch();
        return () => { cancelled = true; };
    }, [trip?.destination_lat, trip?.destination_lng]); // eslint-disable-line react-hooks/exhaustive-deps

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
                <Navbar pageTitle={trip?.destination_name || "Explorare"} />
                <TripSubnav
                    tripId={id}
                    destinationName={trip?.destination_name || ""}
                    numberOfDays={trip?.number_of_days}
                    startDate={trip?.start_date}
                />

                <div className="explore-page-container">

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
                            <div className="explore-categories-bar">
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

                                <button
                                    className="explore-add-objective-btn"
                                    onClick={() => setShowModal(true)}
                                    type="button"
                                >
                                    +<span className="explore-add-objective-btn-text"> Adaugă obiectiv</span>
                                </button>
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
                                                {place.image_url && (
                                                    <div className="explore-card-img-wrap">
                                                        <img
                                                            className="explore-card-img"
                                                            src={place.image_url}
                                                            alt=""
                                                            loading="lazy"
                                                            onError={e => {
                                                                e.currentTarget.parentElement.style.display = "none";
                                                            }}
                                                        />
                                                    </div>
                                                )}
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
                                                    {isAdded ? "Adăugat ✓" : isAdding ? "Se adaugă..." : "Vizitează"}
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
                        fetchAddedObjectives();
                    }}
                />
            )}
        </>
    );
}
