import { useNavigate, useLocation } from "react-router-dom";
import "./TripSubnav.css";
import { ArrowLeft, CalendarDays } from "lucide-react";

export default function TripSubnav({
    tripId,
    destinationName,
    numberOfDays,
    startDate,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        { label: "Explorare", path: `/trips/${tripId}/explore` },
        { label: "Planificare", path: `/trips/${tripId}/board` },
        { label: "Hartă", path: `/trips/${tripId}/map` },
        { label: "Buget", path: `/trips/${tripId}/budget` },
    ];

    const formattedDate = startDate
        ? new Date(startDate).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })
        : null;

    return (
        <header className="trip-subnav">
            {/* Row 1: breadcrumb + trip meta */}
            <div className="trip-subnav-top">
                <button
                    className="trip-subnav-breadcrumb"
                    onClick={() => navigate("/trips")}
                    type="button"
                >
                    <ArrowLeft size={14} strokeWidth={2} />
                    <span>Călătoriile mele</span>
                    <span className="trip-subnav-sep">/</span>
                    <span className="trip-subnav-dest">{destinationName}</span>
                </button>

                <div className="trip-subnav-meta">
                    {numberOfDays != null && (
                        <span className="trip-subnav-meta-chip">
                            <CalendarDays size={13} />
                            {numberOfDays} {numberOfDays === 1 ? "zi" : "zile"}
                        </span>
                    )}
                    {formattedDate && (
                        <span className="trip-subnav-meta-chip">
                            - {formattedDate}
                        </span>
                    )}
                </div>
            </div>

            {/* Row 2: navigation tabs */}
            <nav className="trip-subnav-tabs">
                {tabs.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <button
                            key={tab.path}
                            className={`trip-subnav-tab${isActive ? " trip-subnav-tab--active" : ""}`}
                            onClick={() => navigate(tab.path)}
                            type="button"
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </nav>
        </header>
    );
}
