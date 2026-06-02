import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
    DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable, closestCorners,
} from "@dnd-kit/core";
import {
    SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../../../api/axios";
import EditObjectiveModal from "./EditObjectiveModal";
import { ArrowLeft } from "lucide-react";
import { useRouteOptimizer } from "../../../hooks/useRouteOptimizer";
import TripSubnav from "../../../components/trip-nav/TripSubnav";
import Navbar from "../../../components/layout/Navbar";
import HotelModal from "./HotelModal";
import "./BoardPage.css";

// ── Hook detectare mobile ───────────────────────────────────────────────────
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    return isMobile;
}

// ── Card sortabil DESKTOP — neschimbat fata de original ─────────────────────
function SortableCard({ objective, onEdit, onDelete }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: String(objective.id_objective) });

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
            {objective.address && objective.coord_lat && objective.coord_lng && (
                <a
                    href={`https://www.google.com/maps?q=${objective.coord_lat},${objective.coord_lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="board-card-address"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                >
                    {objective.address}
                </a>
            )}
            {objective.description && (
                <p className="board-card-desc">{objective.description.slice(0, 80)}</p>
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

function Column({ colKey, title, objectives, onEdit, onDelete, onOptimize, isOptimizing, optimizeResults, columnMeta }) {
    const { setNodeRef, isOver } = useDroppable({ id: colKey });
    const ids = objectives.map((o) => String(o.id_objective));

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
                {onOptimize && columnMeta?.[colKey]?.id_day !== null && (
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

                        {optimizeResults?.[colKey] && (
                            <span className="board-optimize-result">
                                {Number(optimizeResults[colKey].totalDistanceKm).toFixed(1)} km
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

// ── Card sortabil MOBILE cu drag handle ─────────────────────────
// listeners sunt aplicati DOAR pe handle — restul cardului ramane scrollabil
function MobileSortableCard({ objective, columnOrder, columnMeta, activeColKey, onEdit, onDelete, onMove }) {
    const [moveOpen, setMoveOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const moveBtnRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!moveOpen) return;
        const handler = (e) => {
            if (
                dropdownRef.current && !dropdownRef.current.contains(e.target) &&
                moveBtnRef.current && !moveBtnRef.current.contains(e.target)
            ) {
                setMoveOpen(false);
            }
        };
        document.addEventListener("pointerdown", handler, true);
        return () => document.removeEventListener("pointerdown", handler, true);
    }, [moveOpen]);

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,   // ref specific pentru handle
        transform,
        transition,
        isDragging,
    } = useSortable({ id: String(objective.id_objective) });

    const destinations = columnOrder.filter((k) => k !== activeColKey);

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.35 : 1,
            }}
            className={`board-card board-card--mobile${isDragging ? " board-card--dragging" : ""}`}
        >
            {/* Handle drag — singurul element care primeste listeners.
                setActivatorNodeRef + listeners sunt separate de restul cardului,
                astfel incat scroll-ul pe continut nu declanseaza drag-ul */}
            <div
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className="board-card-handle"
                aria-label="Trage pentru a reordona"
            >
                ↕
            </div>

            {/* Buton stergere */}
            <button
                className="board-card-delete-btn"
                type="button"
                aria-label="Șterge obiectiv"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDelete(objective.id_objective); }}
            >
                ✕
            </button>

            {/* Continut card — nu participa la drag */}
            <div className="board-card-content">
                <p className="board-card-title">{objective.title}</p>
                {objective.planned_time && (
                    <p className="board-card-time">{objective.planned_time.slice(0, 5)}</p>
                )}
                {objective.address && objective.coord_lat && objective.coord_lng && (
                    <a
                        href={`https://www.google.com/maps?q=${objective.coord_lat},${objective.coord_lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="board-card-address"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {objective.address}
                    </a>
                )}
                {objective.description && (
                    <p className="board-card-desc">{objective.description.slice(0, 80)}</p>
                )}

                <div className="board-card-actions board-card-actions--mobile">
                    <button
                        className="board-card-details-btn"
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onEdit(objective); }}
                    >
                        Adaugă detalii
                    </button>

                    {/* Dropdown mutare intre zile */}
                    <div className="board-move-wrapper">
                        <button
                            ref={moveBtnRef}
                            className="board-card-move-btn"
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!moveOpen && moveBtnRef.current) {
                                    const rect = moveBtnRef.current.getBoundingClientRect();
                                    const dropdownHeight = destinations.length * 42 + 8;
                                    const spaceBelow = window.innerHeight - rect.bottom - 6;
                                    const top = spaceBelow >= dropdownHeight
                                        ? rect.bottom + 6
                                        : rect.top - 6 - dropdownHeight;
                                    setDropdownPos({ top, left: rect.left });
                                }
                                setMoveOpen((prev) => !prev);
                            }}
                        >
                            Mută în altă zi
                        </button>

                        {moveOpen && createPortal(
                            <div
                                ref={dropdownRef}
                                className="board-move-dropdown board-move-dropdown--fixed"
                                style={{ top: dropdownPos.top, left: dropdownPos.left }}
                            >
                                {destinations.map((destKey) => (
                                    <button
                                        key={destKey}
                                        className="board-move-option"
                                        type="button"
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMoveOpen(false);
                                            onMove(objective, destKey);
                                        }}
                                    >
                                        {columnMeta[destKey].title}
                                    </button>
                                ))}
                            </div>,
                            document.body
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── View mobile cu DndContext propriu — izolat de desktop ──────────────────
function MobileBoard({
    trip, columns, columnOrder, columnMeta,
    onEdit, onDelete, onMove, onMobileDragEnd,
    onOptimize, optimizeResults, isOptimizing,
    navigate, id,
}) {
    const [activeTab, setActiveTab] = useState(() => {
        if ((columns["unassigned"] ?? []).length === 0) {
            const firstDayWithObjectives = columnOrder.find(
                (k) => k !== "unassigned" && (columns[k] ?? []).length > 0
            );
            if (firstDayWithObjectives) return firstDayWithObjectives;
        }
        return columnOrder[0] ?? "unassigned";
    });
    const [activeMobileObj, setActiveMobileObj] = useState(null);

    // TouchSensor cu delay 200ms pentru a distinge tap simplu de drag intentionat
    // PointerSensor cu distance 8 pentru mouse/stylus pe tablete
    const mobileSensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
    );

    useEffect(() => {
        if (!columnOrder.includes(activeTab)) {
            setActiveTab(columnOrder[0] ?? "unassigned");
        }
    }, [columnOrder, activeTab]);

    const activeObjectives = columns[activeTab] ?? [];
    const ids = activeObjectives.map((o) => String(o.id_objective));

    const handleDragStart = ({ active }) => {
        const obj = activeObjectives.find((o) => String(o.id_objective) === active.id);
        setActiveMobileObj(obj ?? null);
    };

    const handleDragEnd = (event) => {
        setActiveMobileObj(null);
        onMobileDragEnd(event, activeTab);
    };

    return (
        <div className="board-page">
            {/* Header mobile */}
            <Navbar pageTitle={trip?.destination_name || "Planificare"} />
            <TripSubnav
                tripId={id}
                destinationName={trip?.destination_name || ""}
                numberOfDays={trip?.number_of_days}
                startDate={trip?.start_date}
            />

            {/* Tab-uri zile cu scroll orizontal */}
            <div className="board-mobile-tabs">
                {columnOrder.map((colKey) => (
                    <button
                        key={colKey}
                        className={`board-mobile-tab${activeTab === colKey ? " board-mobile-tab--active" : ""}`}
                        type="button"
                        onClick={() => setActiveTab(colKey)}
                    >
                        {columnMeta[colKey].title}
                        {columns[colKey].length > 0 && (
                            <span className="board-mobile-tab-count">
                                {columns[colKey].length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* DndContext izolat pentru lista zilei active */}
            <DndContext
                sensors={mobileSensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                    <div className="board-mobile-list">
                        {activeObjectives.length === 0 && (
                            <p className="board-column-empty board-mobile-empty">
                                Niciun obiectiv în listă.
                            </p>
                        )}
                        {/* Buton optimizare ruta — vizibil doar daca exista cel putin un obiectiv in ziua activa */}
                        {activeObjectives.length > 0 && columnMeta[activeTab].id_day !== null && (
                            <div className="board-column-optimize">
                                <button
                                    className="board-optimize-btn"
                                    type="button"
                                    onClick={() => onOptimize(activeTab)}
                                    disabled={isOptimizing}
                                >
                                    {isOptimizing ? "..." : "Optimizează ruta"}
                                </button>

                                {optimizeResults?.[activeTab] && (
                                    <span className="board-optimize-result">
                                        {Number(optimizeResults[activeTab].totalDistanceKm).toFixed(1)} km
                                    </span>
                                )}
                            </div>
                        )}
                        {activeObjectives.map((obj) => (
                            <MobileSortableCard
                                key={obj.id_objective}
                                objective={obj}
                                columnOrder={columnOrder}
                                columnMeta={columnMeta}
                                activeColKey={activeTab}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onMove={onMove}
                            />
                        ))}
                    </div>
                </SortableContext>

                <DragOverlay dropAnimation={null}>
                    {activeMobileObj ? (
                        <div className="board-card board-card--overlay">
                            <p className="board-card-title">{activeMobileObj.title}</p>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}

// ── Componenta principala ───────────────────────────────────────────────────
export default function BoardPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isMobile = useIsMobile();

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

    const [hotelModal, setHotelModal] = useState(null);
    const [hotelLoading, setHotelLoading] = useState(false);
    const [hotelError, setHotelError] = useState(null);

    // sensors desktop — neschimbati fata de original
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
                setError(err?.response?.data?.message || "Nu am putut încărca planificarea.");
            } finally {
                setLoading(false);
            }
        };
        fetchBoard();
    }, [id]);

    // reverse geocoding in background pentru obiectivele fara adresa
    useEffect(() => {
        if (!Object.keys(columns).length) return;

        // colectam toate obiectivele din toate coloanele care au coordonate dar nu au adresa
        const toGeocode = Object.values(columns)
            .flat()
            .filter(o => !o.address && o.coord_lat != null && o.coord_lng != null)
            .map(o => ({
                external_place_id: String(o.id_objective),
                lat: o.coord_lat,
                lng: o.coord_lng
            }));

        if (toGeocode.length === 0) return;

        const fetchAddresses = async () => {
            try {
                const res = await api.post("/external/reverse-geocode", { coords: toGeocode });
                const addressMap = res.data.data;

                // actualizam fiecare coloana cu adresele primite
                setColumns(prev => {
                    const next = {};
                    for (const [key, objs] of Object.entries(prev)) {
                        next[key] = objs.map(o => ({
                            ...o,
                            address: addressMap[String(o.id_objective)] ?? o.address ?? null
                        }));
                    }
                    return next;
                });

                // salvam adresele in DB ca sa nu mai fie nevoie de geocodare la urmatoarea vizita
                const toSave = toGeocode
                    .filter(o => addressMap[o.external_place_id])
                    .map(o => ({
                        id_objective: Number(o.external_place_id),
                        address: addressMap[o.external_place_id]
                    }));

                if (toSave.length > 0) {
                    api.patch("/objectives/bulk-addresses", { addresses: toSave })
                        .catch(err => console.error("Save addresses failed:", err.message));
                }
            } catch (err) {
                // eroare silentioasa - cardurile raman fara adresa
                console.error("Board reverse geocode failed:", err.message);
            }
        };

        fetchAddresses();
    }, [Object.keys(columns).length]);

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

    // ── Handler mutare intre zile diferite (mobile) ────────────────────────
    const handleMoveObjective = async (objective, targetKey) => {
        const sourceKey = findColKey(objective.id_objective);
        if (!sourceKey || sourceKey === targetKey) return;

        const objId = objective.id_objective;
        const snap = structuredClone(columns);

        const sourceObjs = columns[sourceKey].filter((o) => o.id_objective !== objId);
        const targetObjs = [...columns[targetKey], objective];

        setColumns((prev) => ({
            ...prev,
            [sourceKey]: sourceObjs,
            [targetKey]: targetObjs,
        }));

        const idDay = columnMeta[targetKey].id_day;
        const newPosition = idDay !== null ? targetObjs.length : null;

        try {
            await api.patch(`/objectives/${objId}/move`, {
                id_trip_day: idDay,
                position_in_day: newPosition,
            });
        } catch {
            setColumns(snap);
            alert("Nu am putut muta obiectivul. Încearcă din nou.");
        }
    };

    // ── Handler drag end MOBILE — reordonare in cadrul zilei active ─────────
    // primit din MobileBoard impreuna cu cheia coloanei active la momentul drag-ului
    const handleMobileDragEnd = async ({ active, over }, activeColKey) => {
        if (!over || active.id === over.id) return;

        const objs = columns[activeColKey];
        const from = objs.findIndex((o) => String(o.id_objective) === active.id);
        const to = objs.findIndex((o) => String(o.id_objective) === over.id);

        if (from === -1 || to === -1 || from === to) return;

        const snap = structuredClone(columns);
        const reordered = arrayMove(objs, from, to);

        // update optimistic — UI se actualizeaza imediat
        setColumns((prev) => ({ ...prev, [activeColKey]: reordered }));

        const idDay = columnMeta[activeColKey].id_day;
        if (idDay === null) return;

        try {
            await api.patch(`/objectives/${Number(active.id)}/move`, {
                id_trip_day: idDay,
                position_in_day: to + 1,
            });
        } catch {
            // rollback la starea anterioara daca API-ul esueaza
            setColumns(snap);
        }
    };

    // ── Desktop drag handlers — neschimbati fata de original ───────────────
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

    const handleOptimize = (colKey) => {
        setHotelError(null);
        setHotelModal({ colKey });
    };
    const runOptimize = async (colKey, hotelName, useHotelAsStart) => {
        const dayId = columnMeta[colKey]?.id_day;
        if (!dayId) return;

        if (useHotelAsStart && hotelName && hotelName !== trip?.hotel_name) {
            setHotelLoading(true);
            setHotelError(null);

            try {
                const res = await api.patch(`/trips/${id}/hotel`, { hotel_name: hotelName });
                setTrip((prev) => ({ ...prev, hotel_name: res.data.hotel_name }));
            } catch (err) {
                const msg = err?.response?.data?.message || "Nu am putut salva hotelul.";
                setHotelError(msg);
                setHotelLoading(false);
                return;
            }

            setHotelLoading(false);
        }

        setHotelModal(null);

        const startPointPayload = useHotelAsStart && trip?.hotel_lat
            ? { lat: trip.hotel_lat, lng: trip.hotel_lng }
            : null;

        const result = await optimize(dayId, startPointPayload);
        if (!result) return;

        setColumns((prev) => {
            const currentObjs = prev[colKey];
            const reordered = result.orderedObjectives
                .map((o) => currentObjs.find((c) => c.id_objective === o.id_objective))
                .filter(Boolean);

            const withoutCoords = currentObjs.filter(
                (o) => o.coord_lat == null || o.coord_lng == null
            );

            return { ...prev, [colKey]: [...reordered, ...withoutCoords] };
        });

        setOptimizeResults((prev) => ({
            ...prev,
            [colKey]: { totalDistanceKm: result.totalDistanceKm },
        }));
    };

    if (loading) {
        return (
            <div className="board-page">
                <p className="board-state-msg">Se încarcă planificarea...</p>
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

    // ── View mobile — randat complet separat cu DndContext propriu ──────────
    if (isMobile) {
        return (
            <>
                <MobileBoard
                    trip={trip}
                    columns={columns}
                    columnOrder={columnOrder}
                    columnMeta={columnMeta}
                    onEdit={setEditingObj}
                    onDelete={handleDeleteObjective}
                    onMove={handleMoveObjective}
                    onMobileDragEnd={handleMobileDragEnd}
                    onOptimize={handleOptimize}
                    optimizeResults={optimizeResults}
                    isOptimizing={isOptimizing}
                    navigate={navigate}
                    id={id}
                />

                {hotelModal && (
                    <HotelModal
                        isLoading={hotelLoading}
                        error={hotelError}
                        initialValue={trip?.hotel_name || null}
                        onConfirm={(hotelName, useHotelAsStart) =>
                            runOptimize(hotelModal.colKey, hotelName, useHotelAsStart)
                        }
                        onClose={() => {
                            setHotelModal(null);
                            setHotelError(null);
                        }}
                    />
                )}

                {editingObj && (
                    <EditObjectiveModal
                        objective={editingObj}
                        onClose={() => setEditingObj(null)}
                        onSaved={handleEditSaved}
                    />
                )}
            </>
        );
    }

    // ── View desktop — neschimbat fata de original ──────────────────────────
    return (
        <>
            <div className="board-page">
                <Navbar pageTitle={trip?.destination_name || "Planificare"} />
                <TripSubnav
                    tripId={id}
                    destinationName={trip?.destination_name || ""}
                    numberOfDays={trip?.number_of_days}
                    startDate={trip?.start_date}
                />
                <div className="board-page-content">
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
                                    optimizeResults={optimizeResults}
                                    columnMeta={columnMeta}
                                />
                            ))}
                        </div>

                        <DragOverlay>
                            {activeObj ? <CardPreview objective={activeObj} /> : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            </div>

            {hotelModal && (
                <HotelModal
                    isLoading={hotelLoading}
                    error={hotelError}
                    initialValue={trip?.hotel_name || null}
                    onConfirm={(hotelName, useHotelAsStart) =>
                        runOptimize(hotelModal.colKey, hotelName, useHotelAsStart)
                    }
                    onClose={() => {
                        setHotelModal(null);
                        setHotelError(null);
                    }}
                />
            )}

            {editingObj && (
                <EditObjectiveModal
                    objective={editingObj}
                    onClose={() => setEditingObj(null)}
                    onSaved={handleEditSaved}
                />
            )}
        </>
    );
}
