import { useState, useEffect } from "react";
import { useAuth } from "../../store/authContext";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/axios";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import "./AdminPage.css";

const PIE_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)"
];

const TOOLTIP_STYLE = {
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface-elevated)",
    boxShadow: "var(--shadow-sm)"
};

const TOOLTIP_LABEL_STYLE = { color: "var(--color-text-primary)" };
const TOOLTIP_ITEM_STYLE = { color: "var(--color-text-secondary)" };

export default function AdminPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get("/admin/dashboard");
                setStats(res.data);
            } catch (err) {
                console.error("Failed to load admin stats", err);
                setError("Nu am putut incărca datele pentru dashboard.");
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate("/login", { replace: true });
    };

    return (
        <main className="admin-page">
            <header className="admin-header">
                <h1 className="admin-header-title">Dashboard Admin</h1>
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

            <div className="admin-container">
                {loading ? (
                    <p className="admin-message">Se încarcă datele...</p>
                ) : error ? (
                    <p className="admin-message admin-error">{error}</p>
                ) : stats ? (
                    <>
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card">
                                <span className="admin-stat-label">Utilizatori</span>
                                <span className="admin-stat-value">{stats.totalUsers}</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-label">Călătorii</span>
                                <span className="admin-stat-value">{stats.totalTrips}</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-label">Durată medie (zile)</span>
                                <span className="admin-stat-value">{stats.avgTripDuration}</span>
                            </div>
                            <div className="admin-stat-card">
                                <span className="admin-stat-label">Obiective / Călătorie</span>
                                <span className="admin-stat-value">{stats.avgObjectivesPerTrip}</span>
                            </div>
                        </div>

                        <div className="admin-charts-grid">
                            <div className="admin-chart-card">
                                <h2 className="admin-chart-title">Călătorii pe luni</h2>
                                <div className="admin-chart-wrapper">
                                    {stats.tripsPerMonth && stats.tripsPerMonth.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.tripsPerMonth}>
                                                <XAxis
                                                    dataKey="month"
                                                    stroke="var(--color-text-secondary)"
                                                    tick={{ fill: "var(--color-text-secondary)" }}
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis
                                                    allowDecimals={false}
                                                    stroke="var(--color-text-secondary)"
                                                    tick={{ fill: "var(--color-text-secondary)" }}
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: "var(--color-interactive-hover)" }}
                                                    contentStyle={TOOLTIP_STYLE}
                                                    labelStyle={TOOLTIP_LABEL_STYLE}
                                                    itemStyle={TOOLTIP_ITEM_STYLE}
                                                />
                                                <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="admin-message" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Nu există date suficiente.</p>
                                    )}
                                </div>
                            </div>

                            <div className="admin-chart-card">
                                <h2 className="admin-chart-title">Top 5 Destinații</h2>
                                <div className="admin-chart-wrapper">
                                    {stats.topDestinations && stats.topDestinations.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.topDestinations}
                                                    dataKey="tripsCount"
                                                    nameKey="destination"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={3}
                                                >
                                                    {stats.topDestinations.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={TOOLTIP_STYLE}
                                                    labelStyle={TOOLTIP_LABEL_STYLE}
                                                    itemStyle={TOOLTIP_ITEM_STYLE}
                                                />
                                                <Legend
                                                    wrapperStyle={{
                                                        fontSize: "13px",
                                                        paddingTop: "10px",
                                                        color: "var(--color-text-secondary)"
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="admin-message" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Nu există destinații.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </div>
        </main>
    );
}
