import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../store/authContext";
import "./LoginPage.css";

export default function LoginPage() {
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Daca userul e deja logat, redirect direct
    if (user) {
        navigate(user.role === "ADMIN" ? "/admin" : "/trips", { replace: true });
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // login() seteaza cookie-ul si apeleaza fetchMe intern
            await login(email, password);
            // dupa fetchMe, user e populat in context; navigam dupa rol
        } catch (err) {
            // eroare de la backend (401 credentiale invalide, 400 validare etc.)
            const msg =
                err?.response?.data?.message || "Ceva nu a mers bine. Încearcă din nou.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">
            <div className="login-card">
                <h1 className="login-title">Autentificare</h1>
                <p className="login-subtitle">Planifică-ți călătoria</p>

                <form onSubmit={handleSubmit} className="login-form" noValidate>
                    <label className="login-label">
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="login-input"
                            placeholder="email@exemplu.ro"
                            required
                            autoComplete="email"
                        />
                    </label>

                    <label className="login-label">
                        Parolă
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="login-input"
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </label>

                    {/* Mesaj de eroare de la backend */}
                    {error && <p className="login-error">{error}</p>}

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? "Se conectează..." : "Intră în cont"}
                    </button>
                </form>

                {/* Link catre pagina de recuperare parola */}
                <p className="login-forgot">
                    <Link to="/forgot-password">Ai uitat parola?</Link>
                </p>

                <p className="login-footer">
                    Nu ai cont?{" "}
                    <Link to="/register">Înregistrează-te</Link>
                </p>
            </div>
        </main>
    );
}
