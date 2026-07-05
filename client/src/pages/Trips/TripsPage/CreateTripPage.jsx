import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../../api/axios";
import { ArrowLeft } from "lucide-react";
import "./CreateTripPage.css";

export default function CreateTripPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const editId = searchParams.get("id") || null;

    const [destinationName, setDestinationName] = useState(() => searchParams.get("destination") || "");
    const [destinationLat, setDestinationLat] = useState(() => {
        const lat = searchParams.get("lat");
        return lat ? parseFloat(lat) : null;
    });
    const [destinationLng, setDestinationLng] = useState(() => {
        const lng = searchParams.get("lng");
        return lng ? parseFloat(lng) : null;
    });
    const [numberOfDays, setNumberOfDays] = useState(() => searchParams.get("days") || "");
    const [startDate, setStartDate] = useState(() => searchParams.get("start_date") || "");

    const [suggestions, setSuggestions] = useState([]);
    const [autocompleteLoading, setAutocompleteLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const debounceRef = useRef(null);
    const dropdownRef = useRef(null);

    const todayStr = new Date().toLocaleDateString("en-CA");

    useEffect(() => {
        if (destinationLat !== null) return;

        clearTimeout(debounceRef.current);

        if (destinationName.trim().length < 2) {
            setSuggestions([]);
            setShowDropdown(false);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setAutocompleteLoading(true);
            try {
                const res = await api.get(`/external/cities?query=${encodeURIComponent(destinationName.trim())}`);
                setSuggestions(res.data.data || []);
                setShowDropdown(true);
            } catch {
                setSuggestions([]);
                setShowDropdown(false);
            } finally {
                setAutocompleteLoading(false);
            }
        }, 400);

        return () => clearTimeout(debounceRef.current);
    }, [destinationName, destinationLat]);

    useEffect(() => {
        const onClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setShowDropdown(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    const handleSelect = async (city) => {
        // afisam imediat eticheta din Photon, apoi o inlocuim cu varianta in romana
        setDestinationName(city.display_label);
        setDestinationLat(city.lat);
        setDestinationLng(city.lng);
        setSuggestions([]);
        setShowDropdown(false);

        // Photon nu suporta romana → cerem denumirea RO (oras + tara) prin Nominatim
        try {
            const res = await api.get(`/external/localize-city`, {
                params: {
                    lat: city.lat,
                    lng: city.lng,
                    name: city.name,
                    country: city.country
                }
            });
            const label = res.data?.data?.display_label;
            if (label) setDestinationName(label);
        } catch {
            // pastram eticheta initiala din Photon daca traducerea esueaza
        }
    };

    const handleDestinationChange = (e) => {
        setDestinationName(e.target.value);
        setDestinationLat(null);
        setDestinationLng(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (startDate && startDate < todayStr) {
            setError("Data plecării nu poate fi în trecut.");
            return;
        }

        setLoading(true);

        try {
            if (editId) {
                await Promise.all([
                    api.put(`/trips/${editId}`, { start_date: startDate || null }),
                    api.put(`/trips/${editId}/duration`, { number_of_days: Number(numberOfDays) }),
                ]);
                navigate(`/trips/${editId}/explore`, { replace: true });
            } else {
                const body = {
                    destination_name: destinationName.trim(),
                    number_of_days: Number(numberOfDays),
                    ...(destinationLat !== null && { destination_lat: destinationLat }),
                    ...(destinationLng !== null && { destination_lng: destinationLng }),
                    ...(startDate && { start_date: startDate }),
                };
                const response = await api.post("/trips", body);
                const { id_trip } = response.data.data;
                navigate(`/trips/${id_trip}/explore`, { replace: true });
            }
        } catch (err) {
            setError(err?.response?.data?.message || "A apărut o eroare. Încearcă din nou.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="create-trip-page">
            <div className="create-trip-card">

                <div className="create-trip-header">
                    <button className="create-trip-back-btn" onClick={() => navigate("/trips")} type="button">
                        <ArrowLeft size={16} strokeWidth={2} /> Înapoi
                    </button>
                    <h1 className="create-trip-title">
                        {editId ? "Editează călătoria" : "Călătorie nouă"}
                    </h1>
                    <p className="create-trip-subtitle">
                        {editId
                            ? "Modifică data plecării sau numărul de zile."
                            : "Completează detaliile pentru a planifica excursia."}
                    </p>
                </div>

                <form className="create-trip-form" onSubmit={handleSubmit} noValidate>

                    <div className="create-trip-field" ref={dropdownRef}>
                        <label htmlFor="destination" className="create-trip-label">Oraș</label>
                        <div className="autocomplete-wrapper">
                            <input
                                id="destination"
                                type="text"
                                className="create-trip-input"
                                placeholder="ex. Paris"
                                value={destinationName}
                                onChange={handleDestinationChange}
                                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                                required
                                disabled={loading || !!editId}
                                autoComplete="off"
                            />
                            {autocompleteLoading && <span className="autocomplete-loading-indicator" />}
                            {!editId && showDropdown && suggestions.length > 0 && (
                                <ul className="autocomplete-dropdown" role="listbox">
                                    {suggestions.map((city, i) => (
                                        <li key={i} className="autocomplete-option" role="option"
                                            onMouseDown={() => handleSelect(city)}>
                                            {city.display_label}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="create-trip-field create-trip-field--narrow">
                        <label htmlFor="days" className="create-trip-label">Număr zile</label>
                        <input
                            id="days" type="number" className="create-trip-input"
                            placeholder="ex. 5" value={numberOfDays}
                            onChange={(e) => setNumberOfDays(e.target.value)}
                            required disabled={loading} min={1} max={30}
                        />
                    </div>

                    <div className="create-trip-field">
                        <label htmlFor="startDate" className="create-trip-label">
                            Data plecării{" "}
                            <span className="create-trip-optional">(opțional)</span>
                        </label>
                        <input
                            id="startDate"
                            type="date"
                            className="create-trip-input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={todayStr}
                            disabled={loading}
                        />
                    </div>

                    <div className="create-trip-field create-trip-field--action">
                        <label className="create-trip-label create-trip-label--hidden">&nbsp;</label>
                        <button type="submit" className="create-trip-submit-btn" disabled={loading}>
                            {loading
                                ? (editId ? "Se salvează..." : "Se creează...")
                                : (editId ? "Salvează" : "Continuă")}
                        </button>
                    </div>

                </form>

                {error && <p className="create-trip-error">{error}</p>}
            </div>
        </main>
    );
}
