import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../api/axios";
import { ArrowLeft, Plane } from "lucide-react";
import "./CreateTripPage.css";

export default function CreateTripPage() {
    const navigate = useNavigate();

    // campuri formular
    const [destinationName, setDestinationName] = useState("");
    const [destinationLat, setDestinationLat] = useState(null);
    const [destinationLng, setDestinationLng] = useState(null);
    const [numberOfDays, setNumberOfDays] = useState("");
    const [startDate, setStartDate] = useState("");

    // autocomplete
    const [suggestions, setSuggestions] = useState([]);
    const [autocompleteLoading, setAutocompleteLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // submit
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // ref pentru timerul debounce si pentru containerul dropdown
    const debounceRef = useRef(null);
    const dropdownRef = useRef(null);

    // debounce 400ms: fetch sugestii la schimbarea textului
    useEffect(() => {
        // daca s-a selectat deja o sugestie, nu mai cautam
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

    // inchide dropdown la click in afara
    useEffect(() => {
        const onClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target))
                setShowDropdown(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    // selectare sugestie din dropdown
    const handleSelect = (city) => {
        setDestinationName(city.name);
        setDestinationLat(city.lat);
        setDestinationLng(city.lng);
        setSuggestions([]);
        setShowDropdown(false);
    };

    // schimbare manuala in campul Oras: reseteaza coordonatele
    const handleDestinationChange = (e) => {
        setDestinationName(e.target.value);
        setDestinationLat(null);
        setDestinationLng(null);
    };

    // submit formular
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const body = {
            destination_name: destinationName.trim(),
            number_of_days: Number(numberOfDays),
            ...(destinationLat !== null && { destination_lat: destinationLat }),
            ...(destinationLng !== null && { destination_lng: destinationLng }),
            ...(startDate && { start_date: startDate }),
        };

        try {
            const response = await api.post("/trips", body);
            const { id_trip } = response.data.data;
            // redirectionam catre pagina explore a calatoriei nou create
            navigate(`/trips/${id_trip}/explore`, { replace: true });
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
                        <ArrowLeft size={14} strokeWidth={1.75} />
                        Înapoi
                    </button>
                    <h1 className="create-trip-title">Călătorie nouă</h1>
                    <p className="create-trip-subtitle">Completează detaliile pentru a planifica excursia.</p>
                </div>

                <form className="create-trip-form" onSubmit={handleSubmit} noValidate>

                    {/* Oras cu autocomplete */}
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
                                disabled={loading}
                                autoComplete="off"
                            />
                            {autocompleteLoading && <span className="autocomplete-loading-indicator" />}
                            {showDropdown && suggestions.length > 0 && (
                                <ul className="autocomplete-dropdown" role="listbox">
                                    {suggestions.map((city, i) => (
                                        <li key={i} className="autocomplete-option" role="option"
                                            onMouseDown={() => handleSelect(city)}>
                                            {city.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Numar de zile */}
                    <div className="create-trip-field create-trip-field--narrow">
                        <label htmlFor="days" className="create-trip-label">Număr zile</label>
                        <input
                            id="days" type="number" className="create-trip-input"
                            placeholder="ex. 5" value={numberOfDays}
                            onChange={(e) => setNumberOfDays(e.target.value)}
                            required disabled={loading} min={1} max={30}
                        />
                    </div>

                    {/* Data plecarii - optional */}
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
                            disabled={loading}
                        />
                    </div>

                    {/* Submit */}
                    <div className="create-trip-field create-trip-field--action">
                        <label className="create-trip-label create-trip-label--hidden">&nbsp;</label>
                        <button type="submit" className="create-trip-submit-btn" disabled={loading}>
                            <Plane size={16} strokeWidth={1.75} />
                            {loading ? "Se creează..." : "Continuă"}
                        </button>
                    </div>

                </form>

                {error && <p className="create-trip-error">{error}</p>}
            </div>
        </main>
    );
}
