import { useNavigate, useLocation } from "react-router-dom";
import "./TripSubnav.css";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function TripSubnav({
    tripId,
    destinationName,
    showMap = true,
    showBudget = true,
    showAddObjective = false,
    onAddObjective = null,
}) {

    const navigate = useNavigate();
    const location = useLocation();
    const path = location.pathname;

    const isActive = (path) => location.pathname === path;

    return (
        <header className="trip-subnav">

            <div className="trip-subnav-top">

                {/* LEFT */}
                <button
                    className="trip-subnav-btn trip-subnav-btn--primary"
                    onClick={() => navigate("/trips")}
                >
                    Călătoriile mele
                </button>

                {/* RIGHT */}
                <div className="trip-subnav-right">

                    {/* EXPLORE */}
                    {path.includes("/explore") && (
                        <>
                            <div className="trip-subnav-navbuttons">
                                <button
                                    className="trip-subnav-btn"
                                    onClick={() => navigate(`/trips/${tripId}/board`)}
                                >
                                    Planificare
                                    <ArrowRight size={16} />
                                </button>

                                {showMap && (
                                    <button
                                        className="trip-subnav-btn"
                                        onClick={() => navigate(`/trips/${tripId}/map`)}
                                    >
                                        Hartă
                                        <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* PLANIFICARE */}
                    {path.includes("/board") && (
                        <>
                            <button
                                className="trip-subnav-btn"
                                onClick={() => navigate(`/trips/${tripId}/explore`)}
                            >
                                <ArrowLeft size={16} />
                                Explore
                            </button>

                            {showMap && (
                                <button
                                    className="trip-subnav-btn"
                                    onClick={() => navigate(`/trips/${tripId}/map`)}
                                >
                                    Hartă
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </>
                    )}

                    {/* MAP */}
                    {path.includes("/map") && (
                        <>
                            <button
                                className="trip-subnav-btn"
                                onClick={() => navigate(`/trips/${tripId}/board`)}
                            >
                                <ArrowLeft size={16} />
                                Planificare
                            </button>

                            <button
                                className="trip-subnav-btn"
                                onClick={() => navigate(`/trips/${tripId}/explore`)}
                            >
                                <ArrowLeft size={16} />
                                Explore
                            </button>

                            {showBudget && (
                                <button
                                    className="trip-subnav-btn"
                                    onClick={() => navigate(`/trips/${tripId}/budget`)}
                                >
                                    Bugetare
                                    <ArrowRight size={16} />
                                </button>
                            )}
                        </>
                    )}

                    {/* BUDGET */}
                    {path.includes("/budget") && (
                        <>
                            <button
                                className="trip-subnav-btn"
                                onClick={() => navigate(`/trips/${tripId}/map`)}
                            >
                                <ArrowLeft size={16} />
                                Hartă
                            </button>

                            <button
                                className="trip-subnav-btn"
                                onClick={() => navigate(`/trips/${tripId}/board`)}
                            >
                                <ArrowLeft size={16} />
                                Planificare
                            </button>

                            <button
                                className="trip-subnav-btn"
                                onClick={() => navigate(`/trips/${tripId}/explore`)}
                            >
                                <ArrowLeft size={16} />
                                Explore
                            </button>
                        </>
                    )}

                </div>
            </div>

            {/* <h1 className="trip-subnav-destination">{destinationName}</h1> */}
            <div className="trip-subnav-bottom">
                <h1 className="trip-subnav-destination">
                    {destinationName}
                </h1>

                {showAddObjective && (
                    <button
                        className="trip-subnav-add-btn"
                        onClick={onAddObjective}
                    >
                        + Adaugă obiectiv
                    </button>
                )}
            </div>
        </header>
    );
}