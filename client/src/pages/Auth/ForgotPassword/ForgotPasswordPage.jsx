import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../../api/axios";
import "./ForgotPasswordPage.css";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Backend returneaza mesaj generic indiferent daca email-ul exista sau nu
            await api.post("/auth/forgot-password", { email });
            setSuccess(true);
        } catch (err) {
            // Eroare de retea sau de validare (400)
            const msg = err?.response?.data?.message || "Ceva nu a mers bine. Încearcă din nou.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="forgot-page">
            <div className="forgot-card">
                <h1 className="forgot-title">Recuperare parolă</h1>
                <p className="forgot-subtitle">
                    Introdu adresa de email asociată contului tău și îți vom trimite
                    un link de resetare a parolei.
                </p>

                {success ? (
                    // Mesaj generic la succes - nu revela daca email-ul exista
                    <p className="forgot-success">
                        Dacă adresa de email este înregistrată, vei primi un link de
                        resetare în câteva minute. Verifică și folderul Spam.
                    </p>
                ) : (
                    <form onSubmit={handleSubmit} className="forgot-form" noValidate>
                        <label className="forgot-label">
                            Email
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="forgot-input"
                                placeholder="email@exemplu.ro"
                                required
                                autoComplete="email"
                            />
                        </label>

                        {error && <p className="forgot-error">{error}</p>}

                        <button
                            type="submit"
                            className="forgot-button"
                            disabled={loading}
                        >
                            {loading ? "Se trimite..." : "Trimite link de resetare"}
                        </button>
                    </form>
                )}

                <p className="forgot-footer">
                    <Link to="/login">Înapoi la autentificare</Link>
                </p>
            </div>
        </main>
    );
}
