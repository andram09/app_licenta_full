import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "../../../api/axios";
import "./ManualObjectiveModal.css";

// Debounce simplu: apeleaza fn dupa `delay` ms de la ultima apelare
function useDebounce(fn, delay) {
    const timerRef = useRef(null);
    return useCallback((...args) => {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => fn(...args), delay);
    }, [fn, delay]);
}

// Modal pentru adaugarea unui obiectiv: cu autocomplete din OpenTripMap sau manual.
export default function ManualObjectiveModal({ tripId, tripLat, tripLng, onClose, onSaved }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [plannedTime, setPlannedTime] = useState("");

    // Autocomplete
    const [suggestions, setSuggestions] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState(null);

    // Submit
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const dropdownRef = useRef(null);

    // Inchidem dropdown-ul la click in afara
    useEffect(() => {
        const handleClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // ── Cautare cu debounce 450 ms ─────────────────────────────────
    const doSearch = useCallback(async (query) => {
        if (!query || query.trim().length < 3) {
            setSuggestions([]);
            setShowDropdown(false);
            setSearchError(null);
            return;
        }
        if (!tripLat || !tripLng) {
            setSuggestions([]);
            return;
        }
        setSearchLoading(true);
        setSearchError(null);
        try {
            const res = await api.get("/external/search", {
                params: {
                    name: query.trim(),
                    lat: tripLat,
                    lng: tripLng,
                    radius: 5000,
                },
            });
            const results = Array.isArray(res.data) ? res.data : [];
            setSuggestions(results);
            setShowDropdown(true);
        } catch (err) {
            setSuggestions([]);
            setSearchError(err?.response?.data?.message || "Eroare la căutare.");
            setShowDropdown(false);
        } finally {
            setSearchLoading(false);
        }
    }, [tripLat, tripLng]);

    const debouncedSearch = useDebounce(doSearch, 450);

    const handleTitleChange = (e) => {
        const val = e.target.value;
        setTitle(val);
        if (selectedPlace) setSelectedPlace(null);
        setSearchError(null);
        debouncedSearch(val);
    };

    // ── Selectare sugestie din dropdown ───────────────────────────
    const handleSelectSuggestion = (place) => {
        setSelectedPlace(place);
        setTitle(place.title);
        setSuggestions([]);
        setShowDropdown(false);
    };

    // ── Submit ─────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (selectedPlace) {
                await api.post(`/trips/${tripId}/objectives/from-api`, {
                    title: selectedPlace.title,
                    description: description.trim() || null,
                    planned_time: plannedTime || null,
                    coord_lat: selectedPlace.coord_lat,
                    coord_lng: selectedPlace.coord_lng,
                    address: selectedPlace.address || null,
                    external_place_id: selectedPlace.external_place_id,
                    external_provider: selectedPlace.external_provider,
                });
            } else {
                await api.post(`/trips/${tripId}/objectives/manual`, {
                    title: title.trim(),
                    description: description.trim() || null,
                    planned_time: plannedTime || null,
                });
            }

            onSaved();
        } catch (err) {
            if (err?.response?.status === 409) {
                setError("Acest obiectiv a fost deja adăugat la această călătorie.");
            } else {
                setError(err?.response?.data?.message || "A apărut o eroare. Încearcă din nou.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    const isFromApi = !!selectedPlace;

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-box" role="dialog" aria-modal="true" aria-label="Adaugă obiectiv">

                <div className="modal-header">
                    <h2 className="modal-title">Adaugă obiectiv</h2>
                    <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Închide">
                        ✕
                    </button>
                </div>

                <form className="modal-form" onSubmit={handleSubmit} noValidate>

                    {/* Câmp locație cu autocomplete */}
                    <div className="modal-field" ref={dropdownRef} style={{ position: "relative" }}>
                        <label htmlFor="obj-title" className="modal-label">
                            Locație <span className="modal-required">*</span>
                        </label>

                        <div className="modal-search-wrap">
                            <input
                                id="obj-title"
                                type="text"
                                className={`modal-input${isFromApi ? " modal-input--selected" : ""}`}
                                placeholder="Caută un loc sau scrie manual..."
                                value={title}
                                onChange={handleTitleChange}
                                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                                required
                                disabled={loading}
                                autoFocus
                                autoComplete="off"
                            />
                        </div>

                        {/* Dropdown sugestii sau mesaj gol */}
                        {showDropdown && (
                            <ul className="modal-suggestions">
                                {suggestions.length === 0 && (
                                    <li className="modal-suggestion-empty">Niciun loc găsit.</li>
                                )}
                                {suggestions.map((place) => (
                                    <li
                                        key={place.external_place_id}
                                        className="modal-suggestion-item"
                                        onMouseDown={() => handleSelectSuggestion(place)}
                                    >
                                        <span className="modal-suggestion-title">{place.title}</span>
                                        {place.kinds && (
                                            <span className="modal-suggestion-kinds">
                                                {place.kinds.split(",")[0].replace(/_/g, " ")}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {searchError && (
                            <p className="modal-hint modal-hint--error">{searchError}</p>
                        )}

                        {!tripLat && (
                            <p className="modal-hint">
                                Coordonatele destinației lipsesc, autocomplete-ul nu este disponibil.
                                Poți adăuga manual un titlu.
                            </p>
                        )}
                    </div>

                    {/* Detalii */}
                    <div className="modal-field">
                        <label htmlFor="obj-desc" className="modal-label">
                            Detalii <span className="modal-optional">(opțional)</span>
                        </label>
                        <textarea
                            id="obj-desc"
                            className="modal-textarea"
                            placeholder="Note, observații..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            rows={3}
                        />
                    </div>

                    {/* Oră planificată */}
                    <div className="modal-field">
                        <label htmlFor="obj-time" className="modal-label">
                            Oră planificată <span className="modal-optional">(opțional)</span>
                        </label>
                        <input
                            id="obj-time"
                            type="time"
                            className="modal-input modal-input--narrow"
                            value={plannedTime}
                            onChange={(e) => setPlannedTime(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    {error && <p className="modal-error">{error}</p>}

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="modal-btn modal-btn--secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Anulează
                        </button>
                        <button
                            type="submit"
                            className="modal-btn modal-btn--primary"
                            disabled={loading || title.trim().length < 2}
                        >
                            {loading ? "Se salvează..." : "Salvează"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
