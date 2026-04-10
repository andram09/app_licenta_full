import { useState } from "react";
import { useAuth } from "../../store/authContext";
import { api } from "../../api/axios";
import Navbar from "../../components/layout/Navbar";
import "./ProfilePage.css";

export default function ProfilePage() {
    const { user, updateUser } = useAuth();

    // ── stare sectiunea date personale ──
    const [profileForm, setProfileForm] = useState({
        first_name: user?.first_name ?? "",
        last_name: user?.last_name ?? "",
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSuccess, setProfileSuccess] = useState("");
    const [profileError, setProfileError] = useState("");

    // ── stare sectiunea schimbare parola ──
    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_new_password: "",
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [passwordError, setPasswordError] = useState("");

    // ── handler date personale ──
    const handleProfileChange = (e) => {
        setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setProfileSuccess("");
        setProfileError("");
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        setProfileSuccess("");
        setProfileError("");

        try {
            const response = await api.put("/auth/profile", profileForm);
            // actualizam contextul local fara re-fetch
            updateUser({
                first_name: response.data.data.first_name,
                last_name: response.data.data.last_name,
            });
            setProfileSuccess("Datele au fost actualizate cu succes.");
        } catch (err) {
            const msg =
                err?.response?.data?.message || "A apărut o eroare. Încearcă din nou.";
            setProfileError(msg);
        } finally {
            setProfileLoading(false);
        }
    };

    // ── handler schimbare parola ──
    const handlePasswordChange = (e) => {
        setPasswordForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setPasswordSuccess("");
        setPasswordError("");
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        // validare client-side inainte de request
        if (passwordForm.new_password !== passwordForm.confirm_new_password) {
            setPasswordError("Parolele noi nu coincid.");
            return;
        }

        setPasswordLoading(true);
        setPasswordSuccess("");
        setPasswordError("");

        try {
            await api.put("/auth/profile/password", {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
                confirm_new_password: passwordForm.confirm_new_password,
            });
            setPasswordSuccess("Parola a fost schimbată cu succes.");
            // golim formularul dupa succes
            setPasswordForm({
                current_password: "",
                new_password: "",
                confirm_new_password: "",
            });
        } catch (err) {
            const msg =
                err?.response?.data?.message || "A apărut o eroare. Încearcă din nou.";
            setPasswordError(msg);
        } finally {
            setPasswordLoading(false);
        }
    };

    return (
        <div className="profile-page">
            <Navbar pageTitle="Profilul meu" />

            <main className="profile-main">
                <h1 className="profile-title">Profilul meu</h1>

                {/* ── Sectiunea date personale ── */}
                <section className="profile-card">
                    <h2 className="profile-card-title">Date personale</h2>
                    <p className="profile-card-subtitle">
                        Modifică prenumele și numele afișat în aplicație.
                    </p>

                    <form onSubmit={handleProfileSubmit} className="profile-form" noValidate>
                        <div className="profile-form-row">
                            <label className="profile-label">
                                Prenume
                                <input
                                    type="text"
                                    name="first_name"
                                    value={profileForm.first_name}
                                    onChange={handleProfileChange}
                                    className="profile-input"
                                    required
                                />
                            </label>

                            <label className="profile-label">
                                Nume
                                <input
                                    type="text"
                                    name="last_name"
                                    value={profileForm.last_name}
                                    onChange={handleProfileChange}
                                    className="profile-input"
                                    required
                                />
                            </label>
                        </div>

                        {/* Emailul e readonly - schimbarea lui necesita un flux separat de verificare */}
                        <label className="profile-label">
                            Email
                            <input
                                type="email"
                                value={user?.email ?? ""}
                                className="profile-input profile-input--readonly"
                                readOnly
                                disabled
                            />
                            <span className="profile-input-hint">
                                Adresa de email nu poate fi modificată din această secțiune.
                            </span>
                        </label>

                        {profileSuccess && (
                            <p className="profile-feedback profile-feedback--success">{profileSuccess}</p>
                        )}
                        {profileError && (
                            <p className="profile-feedback profile-feedback--error">{profileError}</p>
                        )}

                        <button
                            type="submit"
                            className="profile-btn"
                            disabled={profileLoading}
                        >
                            {profileLoading ? "Se salvează..." : "Salvează modificările"}
                        </button>
                    </form>
                </section>

                {/* ── Sectiunea schimbare parola ── */}
                <section className="profile-card">
                    <h2 className="profile-card-title">Schimbare parolă</h2>
                    <p className="profile-card-subtitle">
                        Parola trebuie să conțină cel puțin 8 caractere, o literă mare,
                        o literă mică, un număr și un caracter special.
                    </p>

                    <form onSubmit={handlePasswordSubmit} className="profile-form" noValidate>
                        <label className="profile-label">
                            Parola curentă
                            <input
                                type="password"
                                name="current_password"
                                value={passwordForm.current_password}
                                onChange={handlePasswordChange}
                                className="profile-input"
                                placeholder="Introdu parola curentă"
                                required
                                autoComplete="current-password"
                            />
                        </label>

                        <label className="profile-label">
                            Parola nouă
                            <input
                                type="password"
                                name="new_password"
                                value={passwordForm.new_password}
                                onChange={handlePasswordChange}
                                className="profile-input"
                                placeholder="Introdu parola nouă"
                                required
                                autoComplete="new-password"
                            />
                        </label>

                        <label className="profile-label">
                            Confirmare parolă nouă
                            <input
                                type="password"
                                name="confirm_new_password"
                                value={passwordForm.confirm_new_password}
                                onChange={handlePasswordChange}
                                className="profile-input"
                                placeholder="Repetă parola nouă"
                                required
                                autoComplete="new-password"
                            />
                        </label>

                        {passwordSuccess && (
                            <p className="profile-feedback profile-feedback--success">{passwordSuccess}</p>
                        )}
                        {passwordError && (
                            <p className="profile-feedback profile-feedback--error">{passwordError}</p>
                        )}

                        <button
                            type="submit"
                            className="profile-btn"
                            disabled={passwordLoading}
                        >
                            {passwordLoading ? "Se schimbă..." : "Schimbă parola"}
                        </button>
                    </form>
                </section>
            </main>
        </div>
    );
}
