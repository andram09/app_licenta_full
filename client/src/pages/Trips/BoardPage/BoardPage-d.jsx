import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, closestCorners, } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../../api/axios";
import EditObjectiveModal from "./EditObjectiveModal";
import { ArrowLeft } from "lucide-react";
import { useRouteOptimizer } from "../../../hooks/useRouteOptimizer";
import "./BoardPage.css";

// ── Modal hotel — punct de plecare pentru optimizare ────────────────────────
function HotelModal({ onConfirm, onSkip, onClose, isLoading, error, initialValue }) {
    const [inputValue, setInputValue] = useState(initialValue || "");
    // mod de editare — false inseamna ca afisam hotelul salvat, true ca userul scrie un hotel nou
    const [editing, setEditing] = useState(!initialValue);

    // submit la tasta Enter doar in modul de editare
    const handleKeyDown = (e) => {
        if (editing && e.key === "Enter" && inputValue.trim().length >= 3 && !isLoading) {
            onConfirm(inputValue.trim());
        }
    };

    return (
        <div className="hotel-modal-overlay" onClick={onClose}>
            <div className="hotel-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="hotel-modal-title">Punct de plecare</h2>
                <p className="hotel-modal-desc">
                    {initialValue && !editing
                        ? "Ai un hotel salvat pentru această călătorie. Vrei să optimizezi traseul pornind de la el?"
                        : "Introdu adresa hotelului pentru a calcula traseul optim pornind de acolo. Acest pas este opțional."
                    }
                </p>

                {/* afisam inputul doar cand userul editeaza sau nu are hotel salvat */}
                {editing ? (
                    <>
                        <input
                            className="hotel-modal-input"
                            type="text"
                            placeholder="ex: Hotel Marriott, Barcelona"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                        />
                        {/* afisam eroarea daca exista */}
                        {error && <p className="hotel-modal-error">{error}</p>}
                    </>
                ) : (
                    /* afisam hotelul salvat ca text, cu optiunea de a-l schimba */
                    <div className="hotel-modal-saved">
                        <span className="hotel-modal-saved-name">🛏 {initialValue}</span>
                        <button
                            className="hotel-modal-change-btn"
                            type="button"
                            onClick={() => setEditing(true)}
                            disabled={isLoading}
                        >
                            Schimbă
                        </button>
                    </div>
                )}

                <div className="hotel-modal-actions">
                    <button
                        className="hotel-modal-skip-btn"
                        type="button"
                        onClick={() => onConfirm(null, false)}
                        disabled={isLoading}
                    >
                        Fara hotel. Porneste optimizarea de la primul obiectiv din zi.
                    </button>
                    <button
                        className="hotel-modal-confirm-btn"
                        type="button"
                        onClick={() => {
                            const val = editing ? inputValue.trim() : initialValue;
                            onConfirm(val, true);
                        }}
                        disabled={(editing && inputValue.trim().length < 3) || isLoading}
                    >
                        {isLoading ? "Se caută..." : initialValue && !editing ? "Folosește hotelul salvat" : "Confirmă hotel"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Card sortabil ───────────────────────────────────────────────────────────
function SortableCard({ objective, onEdit, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(objective.id_objective) });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.35 : 1,
            }}
            {...attributes}
            {...listeners}
            className="board-card"
        >
            <button
                className="board-card-delete-btn"
                type="button"
                aria-label="Șterge obiectiv"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDelete(objective.id_objective); }}
            >
                ✕
            </button>

            <p className="board-card-title">{objective.title}</p>
            {objective.planned_time && (
                <p className="board-card-time">{objective.planned_time.slice(0, 5)}</p>
            )}
            {(objective.description || objective.address) && (
                <p className="board-card-desc">
                    {(objective.description || objective.address || "").slice(0, 80)}
                </p>
            )}
            <div className="board-card-actions">
                <button
                    className="board-card-details-btn"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEdit(objective); }}
                >
                    Adaugă detalii
                </button>
            </div>
        </div>
    );
}

function Column({ colKey, title, objectives, onEdit, onDelete, onOptimize, isOptimizing, optimizeResult }) {
    const { setNodeRef, isOver } = useDroppable({ id: colKey });
    const ids = objectives.map((o) => String(o.id_objective));

    // numaram doar obiectivele cu coordonate — cele fara nu pot fi optimizate
    const optimizableCount = objectives.filter(
        (o) => o.coord_lat != null && o.coord_lng != null
    ).length;

    const canOptimize = optimizableCount >= 2 && !isOptimizing;

    return (
        <div className={`board-column${isOver ? " board-column--over" : ""}`}>
            <div className="board-column-header">
                <div className="board-column-header-top">
                    <h2 className="board-column-title">{title}</h2>
                    <span className="board-column-count">{objectives.length}</span>
                </div>

                {/* butonul de optimizare — apare doar la coloanele de zile, nu la Neatribuite */}
                {onOptimize && (
                    <div className="board-column-optimize">
                        <button
                            type="button"
                            className="board-optimize-btn"
                            onClick={() => onOptimize(colKey)}
                            disabled={!canOptimize}
                            title={
                                optimizableCount < 2
                                    ? "Adaugă cel puțin 2 obiective cu locație"
                                    : "Optimizează traseul zilei"
                            }
                        >
                            {isOptimizing ? "..." : "Optimizează ruta"}
                        </button>

                        {optimizeResult && (
                            <span className="board-optimize-result">
                                {Number(optimizeResult.totalDistanceKm).toFixed(1)} km
                            </span>
                        )}
                    </div>
                )}
            </div>

            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className="board-column-body">
                    {objectives.length === 0 && (
                        <p className="board-column-empty">Trage obiective aici</p>
                    )}
                    {objectives.map((obj) => (
                        <SortableCard
                            key={obj.id_objective}
                            objective={obj}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}

function CardPreview({ objective }) {
    return (
        <div className="board-card board-card--overlay">
            <p className="board-card-title">{objective.title}</p>
        </div>
    );
}

export default function BoardPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [columns, setColumns] = useState({});
    const [columnOrder, setColumnOrder] = useState([]);
    const [columnMeta, setColumnMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeObj, setActiveObj] = useState(null);
    const [editingObj, setEditingObj] = useState(null);

    const [optimizeResults, setOptimizeResults] = useState({});
    const { optimize, isLoading: isOptimizing, error: optimizeError } = useRouteOptimizer(id);

    // stare pentru modalul de hotel
    const [hotelModal, setHotelModal] = useState(null); // { colKey } sau null
    const [hotelLoading, setHotelLoading] = useState(false);
    const [hotelError, setHotelError] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const collisionDetection = useCallback(
        (args) =>
            closestCorners({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                    (c) => c.id !== args.active?.id
                ),
            }),
        []
    );

    useEffect(() => {
        const fetchBoard = async () => {
            try {
                const res = await api.get(`/trips/${id}/board`);
                const { trip: t, days, unassigned } = res.data.data;
                setTrip(t);

                const cols = { unassigned };
                const order = ["unassigned"];
                const meta = { unassigned: { title: "Neatribuite", id_day: null } };

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
                        title: `Ziua ${day.day_index}${label ? ` - ${label}` : ""}`,
                        id_day: day.id_day,
                    };
                }

                setColumns(cols);
                setColumnOrder(order);
                setColumnMeta(meta);
            } catch (err) {
                setError(err?.response?.data?.message || "Nu am putut incarca planificarea.");
            } finally {
                setLoading(false);
            }
        };
        fetchBoard();
    }, [id]);

    function findColKey(objId) {
        for (const [key, objs] of Object.entries(columns)) {
            if (objs.some((o) => String(o.id_objective) === String(objId))) return key;
        }
        return null;
    }

    function findObjective(objId) {
        for (const objs of Object.values(columns)) {
            const found = objs.find((o) => String(o.id_objective) === String(objId));
            if (found) return found;
        }
        return null;
    }

    const handleEditSaved = (updatedFields) => {
        const objId = editingObj.id_objective;
        setColumns((prev) => {
            const next = {};
            for (const [key, objs] of Object.entries(prev)) {
                next[key] = objs.map((o) =>
                    o.id_objective === objId ? { ...o, ...updatedFields } : o
                );
            }
            return next;
        });
        setEditingObj(null);
    };

    // ── Handler stergere obiectiv ──────────────────────────────────────────
    const handleDeleteObjective = async (objId) => {
        if (!window.confirm("Sigur vrei să ștergi acest obiectiv?")) return;
        try {
            await api.delete(`/objectives/${objId}`);
            // Eliminam obiectivul din toate coloanele fara reload
            setColumns((prev) => {
                const next = {};
                for (const [key, objs] of Object.entries(prev)) {
                    next[key] = objs.filter((o) => o.id_objective !== objId);
                }
                return next;
            });
        } catch (err) {
            alert(err?.response?.data?.message || "Nu am putut șterge obiectivul.");
        }
    };

    // ── Handler optimizare ruta — deschide mai intai modalul de hotel ──────
    const handleOptimize = (colKey) => {
        setHotelError(null);
        setHotelModal({ colKey });
    };

    // executa optimizarea efectiva dupa ce userul a ales ce face cu hotelul
    const runOptimize = async (colKey, hotelName, useHotelAsStart) => {
        const dayId = columnMeta[colKey]?.id_day;
        if (!dayId) return;

        // salvam hotelul pe trip doar daca e un hotel nou (diferit de cel deja salvat) și vrem să-l folosim
        if (useHotelAsStart && hotelName && hotelName !== trip?.hotel_name) {
            setHotelLoading(true);
            setHotelError(null);
            try {
                const res = await api.patch(`/trips/${id}/hotel`, { hotel_name: hotelName });
                // actualizam starea locala cu noul hotel_name returnat
                setTrip((prev) => ({ ...prev, hotel_name: res.data.hotel_name }));
            } catch (err) {
                const msg = err?.response?.data?.message || "Nu am putut salva hotelul.";
                setHotelError(msg);
                setHotelLoading(false);
                return; // ramane deschis modalul
            }
            setHotelLoading(false);
        }

        setHotelModal(null);

        // Pasam datele hotelului curent catre optimizator daca user-ul a ales asta
        const currentHotel = useHotelAsStart ? (
            hotelName && hotelName !== trip?.hotel_name
                ? null // Va fi citit de pe backend din baza de date in optimizeController (sau pasat explicit daca vrem sa fim defensivi, dar optimize route il citeste de pe Trip.findOne)
                : trip // folosim hotelul din starea locala daca exista
        ) : null;

        const startPointPayload = useHotelAsStart && trip?.hotel_lat ? {
            lat: trip.hotel_lat,
            lng: trip.hotel_lng
        } : null;

        const result = await optimize(dayId, startPointPayload);
        if (!result) return;

        // reordonam cardurile in coloana conform ordinii returnate de Held-Karp
        setColumns((prev) => {
            const currentObjs = prev[colKey];
            const reordered = result.orderedObjectives
                .map((o) => currentObjs.find((c) => c.id_objective === o.id_objective))
                .filter(Boolean);

            // obiectivele fara coordonate le lasam la sfarsit, neatinse
            const withoutCoords = currentObjs.filter(
                (o) => o.coord_lat == null || o.coord_lng == null
            );

            return { ...prev, [colKey]: [...reordered, ...withoutCoords] };
        });

        // salvam distanta pentru aceasta coloana
        setOptimizeResults((prev) => ({
            ...prev,
            [colKey]: { totalDistanceKm: result.totalDistanceKm },
        }));
    };

    const handleDragStart = ({ active }) => {
        setActiveObj(findObjective(active.id));
    };

    const handleDragEnd = async ({ active, over }) => {
        setActiveObj(null);
        if (!over || active.id === over.id) return;

        const sourceKey = findColKey(active.id);
        const targetKey =
            columns[over.id] !== undefined ? over.id : findColKey(over.id);

        if (!sourceKey || !targetKey) return;

        const obj = findObjective(active.id);
        if (!obj) return;

        const objId = Number(active.id);
        const snap = structuredClone(columns);

        if (sourceKey === targetKey) {
            const objs = columns[sourceKey];
            const from = objs.findIndex((o) => String(o.id_objective) === active.id);
            const to = objs.findIndex((o) => String(o.id_objective) === over.id);
            if (from === -1 || to === -1 || from === to) return;

            setColumns((prev) => ({ ...prev, [sourceKey]: arrayMove(objs, from, to) }));

            const idDay = columnMeta[sourceKey].id_day;
            if (idDay === null) return;

            try {
                await api.patch(`/objectives/${objId}/move`, {
                    id_trip_day: idDay,
                    position_in_day: to + 1,
                });
            } catch {
                setColumns(snap);
            }
            return;
        }

        const sourceObjs = columns[sourceKey].filter(
            (o) => String(o.id_objective) !== active.id
        );
        const targetObjs = [...columns[targetKey]];
        const overIndex = targetObjs.findIndex((o) => String(o.id_objective) === over.id);
        if (overIndex >= 0) {
            targetObjs.splice(overIndex, 0, obj);
        } else {
            targetObjs.push(obj);
        }

        setColumns((prev) => ({
            ...prev,
            [sourceKey]: sourceObjs,
            [targetKey]: targetObjs,
        }));

        const idDay = columnMeta[targetKey].id_day;
        const newPosition =
            idDay !== null ? (overIndex >= 0 ? overIndex + 1 : targetObjs.length) : null;

        try {
            await api.patch(`/objectives/${objId}/move`, {
                id_trip_day: idDay,
                position_in_day: newPosition,
            });
        } catch {
            setColumns(snap);
        }
    };

    if (loading) {
        return (
            <div className="board-page">
                <p className="board-state-msg">Se incarca planificarea...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="board-page">
                <p className="board-state-msg board-state-msg--error">{error}</p>
            </div>
        );
    }

    return (
        <>
            <div className="board-page">
                <div className="board-header">
                    <div className="board-header-left">
                        <button
                            className="board-back-btn"
                            type="button"
                            onClick={() => navigate(`/trips/${id}/explore`)}
                        >
                            <ArrowLeft size={16} strokeWidth={2} /> Explorare
                        </button>
                        <h1 className="board-title">
                            Planificare pe zile:{" "}
                            <span className="board-destination">{trip?.destination_name}</span>
                        </h1>
                    </div>
                    <div className="board-header-right">
                        <button
                            className="board-map-btn"
                            type="button"
                            onClick={() => navigate(`/trips/${id}/budget`)}
                        >
                            Buget
                        </button>
                        <button
                            className="board-map-btn"
                            type="button"
                            onClick={() => navigate(`/trips/${id}/map`)}
                        >
                            Hartă
                        </button>
                        <button
                            className="board-trips-btn"
                            type="button"
                            onClick={() => navigate("/trips")}
                        >
                            Călătoriile mele
                        </button>
                    </div>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={collisionDetection}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                >
                    <div className="board-columns">
                        {columnOrder.map((colKey) => (
                            <Column
                                key={colKey}
                                colKey={colKey}
                                title={columnMeta[colKey].title}
                                objectives={columns[colKey]}
                                onEdit={setEditingObj}
                                onDelete={handleDeleteObjective}
                                onOptimize={colKey !== "unassigned" ? handleOptimize : null}
                                isOptimizing={isOptimizing}
                                optimizeResult={optimizeResults[colKey] ?? null}
                            />
                        ))}
                    </div>

                    <DragOverlay>
                        {activeObj ? <CardPreview objective={activeObj} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {editingObj && (
                <EditObjectiveModal
                    objective={editingObj}
                    onClose={() => setEditingObj(null)}
                    onSaved={handleEditSaved}
                />
            )}

            {/* modal hotel — apare cand userul apasa Optimizeaza ruta */}
            {hotelModal && (
                <HotelModal
                    isLoading={hotelLoading}
                    error={hotelError}
                    initialValue={trip?.hotel_name || null}
                    onConfirm={(hotelName, useHotelAsStart) => runOptimize(hotelModal.colKey, hotelName, useHotelAsStart)}
                    onClose={() => { setHotelModal(null); setHotelError(null); }}
                />
            )}
        </>
    );
}
