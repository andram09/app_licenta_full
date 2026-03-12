import { useNavigate, useLocation } from "react-router-dom";
import "./TripSubnav.css";

export default function TripSubnav({
    tripId,
    destinationName,
    showMap = true,
    showBudget = true,
}) {

    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;

    const isActive = (path) => location.pathname === path;

    return (
        <header className="trip-subnav">
            <div className="trip-subnav-top">
                <div className="trip-subnav-left">
                    {!path.includes("/board") && (
                        <button
                            className="trip-subnav-btn"
                            onClick={() => navigate(`/trips/${tripId}/board`)}
                        >
                            Planificare
                        </button>
                    )}

                    {!path.includes("/explore") && (
                        <button
                            className="trip-subnav-btn"
                            onClick={() => navigate(`/trips/${tripId}/explore`)}
                        >
                            Explore
                        </button>
                    )}

                    {showBudget && !path.includes("/budget") && (
                        <button
                            className="trip-subnav-btn"
                            onClick={() => navigate(`/trips/${tripId}/budget`)}
                        >
                            Buget
                        </button>
                    )}

                    {showMap && !path.includes("/map") && (
                        <button
                            className="trip-subnav-btn"
                            onClick={() => navigate(`/trips/${tripId}/map`)}
                        >
                            Hartă
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    className="trip-subnav-btn trip-subnav-btn--primary"
                    onClick={() => navigate("/trips")}
                >
                    Călătoriile mele
                </button>
            </div>

            <h1 className="trip-subnav-destination">{destinationName}</h1>
        </header>
    );
}