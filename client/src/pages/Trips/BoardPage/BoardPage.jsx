import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
    closestCorners,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowLeft, Map, List } from "lucide-react";
import { api } from "../../../api/axios";
import EditObjectiveModal from "./EditObjectiveModal";
import "./BoardPage.css";

// ── Card sortabil ───────────────────────────────────────────────────────────
function SortableCard({ objective, onEdit }) {
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
            <p className="board-card-title">{objective.title}</p>
            {objective.planned_time && (
                <p className="board-card-time">{objective.planned_time.slice(0, 5)}</p>
            )}
            {(objective.description || objective.address) && (
                <p className="board-card-desc">
                    {(objective.description || objective.address || "").slice(0, 80)}
                </p>
            )}
            <button
                className="board-card-details-btn"
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(objective); }}
            >
                Adaugă detalii
            </button>
        </div>
    );
}

// ── Coloană droppable ───────────────────────────────────────────────────────
function Column({ colKey, title, objectives, onEdit }) {
    const { setNodeRef, isOver } = useDroppable({ id: colKey });
    const ids = objectives.map((o) => String(o.id_objective));

    return (
        <div className={`board-column${isOver ? " board-column--over" : ""}`}>
            <div className="board-column-header">
                <h2 className="board-column-title">{title}</h2>
                <span className="board-column-count">{objectives.length}</span>
            </div>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef} className="board-column-body">
                    {objectives.length === 0 && (
                        <p className="board-column-empty">Trage obiective aici</p>
                    )}
                    {objectives.map((obj) => (
                        <SortableCard key={obj.id_objective} objective={obj} onEdit={onEdit} />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}

// Card in DragOverlay
function CardPreview({ objective }) {
    return (
        <div className="board-card board-card--overlay">
            <p className="board-card-title">{objective.title}</p>
        </div>
    );
}

//Pagina principala
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

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // Excludem cardul activ din candidatii de coliziune (closestCorners e mai bun
    // decat closestCenter pentru kanban: evita preferinta gresita pentru coloana vecina)
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

    // ── Fetch board ───────────────────────────────────────────────────────
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
                        title: `Ziua ${day.day_index}${label ? ` · ${label}` : ""}`,
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

    // ── Helpers ───────────────────────────────────────────────────────────

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

    // ── Handler edit modal ────────────────────────────────────────────────
    // updatedFields = { description, planned_time } - valorile din modal dupa salvare
    const handleEditSaved = (updatedFields) => {
        const objId = editingObj.id_objective;
        // Actualizăm obiectivul în toate coloanele fără refetch
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

    const handleDragStart = ({ active }) => {
        setActiveObj(findObjective(active.id));
    };

    const handleDragEnd = async ({ active, over }) => {
        setActiveObj(null);
        if (!over || active.id === over.id) return;

        const sourceKey = findColKey(active.id);

        const targetKey =
            columns[over.id] !== undefined
                ? over.id
                : findColKey(over.id);

        if (!sourceKey || !targetKey) return;

        const obj = findObjective(active.id);
        if (!obj) return;

        const objId = Number(active.id);
        const snap = structuredClone(columns);

        // Reordonare in aceeasi coloana
        if (sourceKey === targetKey) {
            const objs = columns[sourceKey];
            const from = objs.findIndex((o) => String(o.id_objective) === active.id);
            const to = objs.findIndex((o) => String(o.id_objective) === over.id);
            if (from === -1 || to === -1 || from === to) return;

            setColumns((prev) => ({ ...prev, [sourceKey]: arrayMove(objs, from, to) }));

            const idDay = columnMeta[sourceKey].id_day;
            if (idDay === null) return; // Neatribuite nu are poziție

            try {
                await api.patch(`/objectives/${objId}/move`, {
                    id_trip_day: idDay,
                    position_in_day: to + 1, // 1-based
                });
            } catch {
                setColumns(snap);
            }
            return;
        }

        // Mutare intre coloane diferite
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

    // ── Render ────────────────────────────────────────────────────────────
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
                            <ArrowLeft size={14} strokeWidth={1.75} />
                            Explorare
                        </button>
                        <h1 className="board-title">
                            Planificare pe zile:
                            <span className="board-destination">{trip?.destination_name}</span>
                        </h1>
                    </div>
                    <div className="board-header-right">
                        <button
                            className="board-map-btn"
                            type="button"
                            onClick={() => navigate(`/trips/${id}/map`)}
                        >
                            <Map size={14} strokeWidth={1.75} />
                            Hartă
                        </button>
                        <button
                            className="board-trips-btn"
                            type="button"
                            onClick={() => navigate("/trips")}
                        >
                            <List size={14} strokeWidth={1.75} />
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
                            />
                        ))}
                    </div>

                    <DragOverlay>
                        {activeObj ? <CardPreview objective={activeObj} /> : null}
                    </DragOverlay>
                </DndContext>
            </div>

            {
                editingObj && (
                    <EditObjectiveModal
                        objective={editingObj}
                        onClose={() => setEditingObj(null)}
                        onSaved={handleEditSaved}
                    />
                )
            }
        </>
    );
}
