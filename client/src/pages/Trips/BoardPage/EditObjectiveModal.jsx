import { useState } from "react";
import { api } from "../../../api/axios";
import "../ExplorePage/ManualObjectiveModal.css"; // refolosim acelasi CSS

// Modalã pentru editarea detaliilor unui obiectiv existent (description + planned_time)
// Foloseste PUT /objectives/:id cu payload { description, planned_time }
export default function EditObjectiveModal({ objective, onClose, onSaved }) {
    const [description, setDescription] = useState(objective.description || "");
    const [plannedTime, setPlannedTime] = useState(
        // planned_time vine ca "HH:MM:SS" din DB — input type="time" necesita "HH:MM"
        objective.planned_time ? objective.planned_time.slice(0, 5) : ""
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await api.put(`/objectives/${objective.id_objective}`, {
                description: description.trim() || null,
                planned_time: plannedTime || null,
            });

            // Transmitem valorile actualizate înapoi în BoardPage pentru sync local
            onSaved({
                description: description.trim() || null,
                planned_time: plannedTime || null,
            });
        } catch (err) {
            setError(err?.response?.data?.message || "A apărut o eroare. Încearcă din nou.");
        } finally {
            setLoading(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-box" role="dialog" aria-modal="true" aria-label="Editează obiectiv">

                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Editează obiectiv</h2>
                        <p className="modal-subtitle">{objective.title}</p>
                    </div>
                    <button className="modal-close-btn" onClick={onClose} type="button" aria-label="Închide">
                        ✕
                    </button>
                </div>

                <form className="modal-form" onSubmit={handleSubmit} noValidate>

                    {/* Detalii / note */}
                    <div className="modal-field">
                        <label htmlFor="edit-desc" className="modal-label">
                            Detalii <span className="modal-optional">(opțional)</span>
                        </label>
                        <textarea
                            id="edit-desc"
                            className="modal-textarea"
                            placeholder="Note, observații..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={loading}
                            rows={4}
                            autoFocus
                        />
                    </div>

                    {/* Oră planificată */}
                    <div className="modal-field">
                        <label htmlFor="edit-time" className="modal-label">
                            Oră planificată <span className="modal-optional">(opțional)</span>
                        </label>
                        <input
                            id="edit-time"
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
                            disabled={loading}
                        >
                            {loading ? "Se salvează..." : "Salvează"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
