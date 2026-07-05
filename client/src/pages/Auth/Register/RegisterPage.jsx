import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../../store/authContext";
import PasswordRequirements from "../../../components/auth/PasswordRequirements";
import "./RegisterPage.css";

export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // Actualizeaza un camp din formular fara sa piarda celelalte valori
    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!form.first_name.trim()) return setError("Prenumele este obligatoriu.");
        if (!form.last_name.trim()) return setError("Numele este obligatoriu.");
        if (!form.email.trim()) return setError("Email-ul este obligatoriu.");
        if (!form.password) return setError("Parola este obligatorie.");

        setLoading(true);

        try {
            await register(form.first_name, form.last_name, form.email, form.password);
            setSuccess("Cont creat cu succes!");
            setTimeout(() => navigate("/login"), 1500);
        } catch (err) {
            const data = err?.response?.data;
            const msg = data?.errors?.length
                ? data.errors.join(" ")
                : data?.message || "Ceva nu a mers bine. Încearcă din nou.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="register-page">
            <div className="register-card">
                <h1 className="register-title">Înregistrare</h1>
                <p className="register-subtitle">Creează-ți cont</p>

                <form onSubmit={handleSubmit} className="register-form" noValidate>
                    {/* Rand cu doua campuri: prenume si nume */}
                    <div className="register-row">
                        <label className="register-label">
                            Prenume
                            <input
                                type="text"
                                name="first_name"
                                value={form.first_name}
                                onChange={handleChange}
                                className="register-input"
                                required
                                autoComplete="given-name"
                            />
                        </label>
                        <label className="register-label">
                            Nume
                            <input
                                type="text"
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                                className="register-input"
                                required
                                autoComplete="family-name"
                            />
                        </label>
                    </div>

                    <label className="register-label">
                        Email
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="register-input"
                            placeholder="email@exemplu.ro"
                            required
                            autoComplete="email"
                        />
                    </label>

                    <label className="register-label">
                        Parolă
                        <div className="password-field">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                className="register-input"
                                placeholder="Min. 8 car., majusculă, cifră, simbol (!@#$%^&*)"
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
                        {form.password && <PasswordRequirements password={form.password} />}
                    </label>

                    {/* Mesaje de eroare sau succes */}
                    {error && <p className="register-error">{error}</p>}
                    {success && <p className="register-success">{success}</p>}

                    <button type="submit" className="register-button" disabled={loading}>
                        {loading ? "Se creează contul..." : "Creează cont"}
                    </button>
                </form>

                <p className="register-footer">
                    Ai deja cont?{" "}
                    <Link to="/login">Autentifică-te</Link>
                </p>
            </div>
        </main>
    );
}
