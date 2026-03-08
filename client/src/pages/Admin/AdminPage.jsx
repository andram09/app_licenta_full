import { useAuth } from "../../store/authContext";
import { useNavigate } from "react-router-dom";
import "./AdminPage.css";

// Placeholder functional pentru Dashboard-ul Admin
export default function AdminPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    return (
        <main className="admin-page">
            <header className="admin-header">
                <h1 className="admin-header-title">Admin Dashboard</h1>
                <div className="admin-header-user">
                    <span className="admin-username">
                        {user?.first_name} {user?.last_name}
                    </span>
                    <span className="admin-badge">ADMIN</span>
                    <button onClick={handleLogout} className="admin-logout-btn">
                        Deconectare
                    </button>
                </div>
            </header>

            {/* Continut placeholder - va fi implementat in Etapa Admin */}
            <div className="admin-placeholder">
                <p className="admin-placeholder-text">
                    Panoul de administrare va fi implementat într-o etapă ulterioară.
                </p>
            </div>
        </main>
    );
}
