import { useState } from "react";
import "./HotelModal.css";

export default function HotelModal({
  onConfirm,
  onClose,
  isLoading,
  error,
  initialValue
}) {
  const [inputValue, setInputValue] = useState(initialValue || "");
  const [editing, setEditing] = useState(!initialValue);

  const handleKeyDown = (e) => {
    if (editing && e.key === "Enter" && inputValue.trim().length >= 3 && !isLoading) {
      onConfirm(inputValue.trim(), true);
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

            {error && (
              <p className="hotel-modal-error">{error}</p>
            )}
          </>
        ) : (
          <div className="hotel-modal-saved">
            <span className="hotel-modal-saved-name">
              🛏 {initialValue}
            </span>

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
            Fără hotel
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
            {isLoading
              ? "Se caută..."
              : initialValue && !editing
                ? "Folosește hotelul salvat"
                : "Confirmă hotel"}
          </button>

        </div>
      </div>
    </div>
  );
}