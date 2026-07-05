import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { api } from "../../../api/axios";
import PasswordRequirements from "../../../components/auth/PasswordRequirements";
import "./ResetPasswordPage.css";

export default function ResetPasswordPage() {
    // Preia token-ul din query string: /reset-password?token=abc123
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Validare client-side: parola si confirmare trebuie sa coincida
    const validate = () => {
        if (password !== confirmPassword) {
            setError("Parolele nu coincid.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!validate()) return;

        setLoading(true);

        try {
            // Trimite { token, password, confirmPassword } conform resetPasswordSchema
            await api.post("/auth/reset-password", {
                token,
                password,
                confirmPassword,
            });

            // La succes, redirectionam la login cu un state pentru a afisa mesajul
            navigate("/login", {
                replace: true,
                state: { message: "Parola a fost resetată cu succes. Te poți autentifica." },
            });
        } catch (err) {
            // Erori backend: token expirat, token invalid, parola nu respecta regulile.
            // Mesajul specific de validare e in array-ul errors, nu in message (generic).
            const data = err?.response?.data;
            const msg = data?.errors?.[0] || data?.message || "Ceva nu a mers bine. Încearcă din nou.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    // Token lipsa din URL => link invalid sau accesat direct
    if (!token) {
        return (
            <main className="reset-page">
                <div className="reset-card">
                    <p className="reset-invalid">
                        Link de resetare invalid sau expirat.{" "}
                        <Link to="/forgot-password">Solicită unul nou.</Link>
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="reset-page">
            <div className="reset-card">
                <h1 className="reset-title">Resetare parolă</h1>
                <p className="reset-subtitle">
                    Alege o parolă nouă pentru contul tău.
                </p>

                <form onSubmit={handleSubmit} className="reset-form" noValidate>
                    <label className="reset-label">
                        Parolă nouă
                        <div className="password-field">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="reset-input"
                                placeholder="Cel puțin 8 caractere"
                                required
                                autoComplete="new-password"
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
                        {password ? (
                            <PasswordRequirements password={password} />
                        ) : (
                            <span className="reset-hint">
                                Minim 8 caractere, o majusculă, o cifră și un caracter special (!@#$%^&*)
                            </span>
                        )}
                    </label>

                    <label className="reset-label">
                        Confirmare parolă
                        <div className="password-field">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="reset-input"
                                placeholder="Repetă parola"
                                required
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                aria-label={showConfirmPassword ? "Ascunde parola" : "Arată parola"}
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </label>

                    {error && <p className="reset-error">{error}</p>}

                    <button
                        type="submit"
                        className="reset-button"
                        disabled={loading}
                    >
                        {loading ? "Se procesează..." : "Resetează parola"}
                    </button>
                </form>
            </div>
        </main>
    );
}
