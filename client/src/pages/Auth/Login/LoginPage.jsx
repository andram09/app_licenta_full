import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../../store/authContext";
import "./LoginPage.css";

export default function LoginPage() {
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Daca userul e deja logat, redirect direct
    if (user) {
        navigate(user.role === "ADMIN" ? "/admin" : "/trips", { replace: true });
        return null;
    }

    const MESAJE_RO = {
        "Invalid email or password.": "Email sau parolă incorectă.",
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) return setError("Email-ul este obligatoriu.");
        if (!password) return setError("Parola este obligatorie.");

        setLoading(true);

        try {
            await login(email, password);
        } catch (err) {
            const data = err?.response?.data;
            // La erori de validare, mesajul specific e in array-ul errors,
            // nu in message (care e generic: "Validation failed")
            const raw = data?.errors?.[0] || data?.message;
            const msg = MESAJE_RO[raw] || raw || "Ceva nu a mers bine. Încearcă din nou.";
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
                        <div className="password-field">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="login-input"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword((v) => !v)}
                                aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
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
