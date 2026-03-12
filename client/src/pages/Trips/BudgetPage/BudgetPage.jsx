import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../../api/axios";
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from "recharts";
import TripSubnav from "../../../components/trip-nav/TripSubnav";
import "./BudgetPage.css";

// culori pentru pie chart
const PIE_COLORS = [
    "#4E8EA2", "#3a7a8f", "#7BBDE8", "#FFC64F",
    "#49769F", "#BDD8E9", "#001D39", "#8A9BB0"
];

// formateaza suma cu 2 zecimale si moneda
const formatAmount = (amount, currency = "EUR") => {
    if (amount === null || amount === undefined) return "—";
    return `${parseFloat(amount).toFixed(2)} ${currency}`;
};

export default function BudgetPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [objectives, setObjectives] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [summary, setSummary] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState(null);
    const [numberOfPeople, setNumberOfPeople] = useState(1);
    const [peopleInputValue, setPeopleInputValue] = useState(1);

    const [addForm, setAddForm] = useState({
        amount: "",
        currency: "EUR",
        id_expense_category: "",
        date: "",
        id_objective: "",
        note: ""
    });
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState(null);

    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [editLoading, setEditLoading] = useState(false);

    const fetchTrip = useCallback(async () => {
        const res = await api.get(`/trips/${id}`);
        const t = res.data.data;
        setTrip(t);
        setNumberOfPeople(t.number_of_people || 1);
        setPeopleInputValue(t.number_of_people || 1);
    }, [id]);

    const fetchObjectives = useCallback(async () => {
        const res = await api.get(`/trips/${id}/objectives`);
        setObjectives(res.data.data || []);
    }, [id]);

    const fetchExpenses = useCallback(async () => {
        const res = await api.get(`/trips/${id}/expenses`);
        setExpenses(res.data.data || []);
    }, [id]);

    const fetchSummary = useCallback(async () => {
        const res = await api.get(`/trips/${id}/budget-summary`);
        setSummary(res.data);
    }, [id]);

    const fetchCategories = useCallback(async () => {
        const res = await api.get(`/expense-categories`);
        setCategories(res.data.data || []);
    }, []);

    // ── Fetch initial ──────────────────────────────────────────────────────
    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchTrip(),
                    fetchObjectives(),
                    fetchExpenses(),
                    fetchSummary(),
                    fetchCategories()
                ]);
            } catch (err) {
                setError(err?.response?.data?.message || "Nu am putut incarca datele.");
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, [fetchTrip, fetchObjectives, fetchExpenses, fetchSummary, fetchCategories]);

    // ── Calcul total estimat din obiective ─────────────────────────────────
    const totalEstimated = objectives.reduce((sum, o) => {
        if (o.estimated_cost !== null && o.estimated_cost !== undefined) {
            return sum + parseFloat(o.estimated_cost);
        }
        return sum;
    }, 0) * numberOfPeople;

    const totalSpent = summary?.total || 0;
    const difference = totalEstimated - totalSpent;

    // ── Handler update numar persoane ─────────────────────────────────────
    const handlePeopleBlur = async () => {
        const val = Number(peopleInputValue);
        if (isNaN(val) || val < 1) {
            setPeopleInputValue(numberOfPeople);
            return;
        }
        if (val === numberOfPeople) return;

        try {
            await api.patch(`/trips/${id}/people`, { number_of_people: val });
            setNumberOfPeople(val);
        } catch (err) {
            console.error("Update people error:", err.message);
            setPeopleInputValue(numberOfPeople);
        }
    };

    // ── Handler estimare AI ────────────────────────────────────────────────
    const handleEstimateAI = async () => {
        setAiLoading(true);
        setAiError(null);
        try {
            const res = await api.post(`/trips/${id}/budget/estimate-ai`);
            setObjectives(res.data.data || []);
        } catch (err) {
            setAiError(err?.response?.data?.message || "Estimarea AI a esuat. Incearca din nou.");
        } finally {
            setAiLoading(false);
        }
    };

    // ── Handler update cost obiectiv ───────────────────────────────────────
    const handleObjectiveCostBlur = async (objectiveId, value) => {
        const val = parseFloat(value);
        if (isNaN(val) || val < 0) return;

        try {
            await api.patch(`/trips/${id}/objectives/${objectiveId}/cost`, {
                estimated_cost: val
            });
            // actualizam local fara refetch
            setObjectives(prev =>
                prev.map(o =>
                    o.id_objective === objectiveId
                        ? { ...o, estimated_cost: val }
                        : o
                )
            );
        } catch (err) {
            console.error("Update objective cost error:", err.message);
        }
    };

    const handleObjectiveCostChange = (objectiveId, value) => {
        setObjectives(prev =>
            prev.map(o =>
                o.id_objective === objectiveId
                    ? { ...o, estimated_cost: value }
                    : o
            )
        );
    };

    // ── Handler adaugare cheltuiala ────────────────────────────────────────
    const handleAddExpense = async () => {
        setAddError(null);
        if (!addForm.amount || !addForm.currency) {
            setAddError("Suma si moneda sunt obligatorii.");
            return;
        }
        setAddLoading(true);
        setAddError(null);
        try {
            await api.post(`/trips/${id}/expenses`, {
                amount: parseFloat(addForm.amount),
                currency: addForm.currency,
                id_expense_category: addForm.id_expense_category || null,
                date: addForm.date || null,
                id_objective: addForm.id_objective || null,
                note: addForm.note || null
            });
            // resetam formularul
            setAddForm({
                amount: "", currency: "EUR",
                id_expense_category: "", date: "",
                id_objective: "", note: ""
            });
            // reincarcam cheltuielile si sumarul
            await Promise.all([fetchExpenses(), fetchSummary()]);
        } catch (err) {
            setAddError(err?.response?.data?.message || "Nu am putut adauga cheltuiala.");
        } finally {
            setAddLoading(false);
        }
    };

    // ── Handler stergere cheltuiala ────────────────────────────────────────
    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm("Sigur vrei sa stergi aceasta cheltuiala?")) return;
        try {
            await api.delete(`/expenses/${expenseId}`);
            await Promise.all([fetchExpenses(), fetchSummary()]);
        } catch (err) {
            console.error("Delete expense error:", err.message);
        }
    };

    // ── Handler deschidere editare cheltuiala ──────────────────────────────
    const handleEditOpen = (expense) => {
        setEditingExpenseId(expense.id_expense);
        setEditForm({
            amount: expense.amount,
            currency: expense.currency,
            id_expense_category: expense.id_expense_category || "",
            date: expense.date ? expense.date.slice(0, 10) : "",
            id_objective: expense.id_objective || "",
            note: expense.note || ""
        });
    };

    // ── Handler salvare editare cheltuiala ─────────────────────────────────
    const handleEditSave = async (expenseId) => {
        if (!editForm.amount || !editForm.currency) return;
        setEditLoading(true);
        try {
            await api.put(`/expenses/${expenseId}`, {
                amount: parseFloat(editForm.amount),
                currency: editForm.currency,
                id_expense_category: editForm.id_expense_category || null,
                date: editForm.date || null,
                id_objective: editForm.id_objective || null,
                note: editForm.note || null
            });
            setEditingExpenseId(null);
            await Promise.all([fetchExpenses(), fetchSummary()]);
        } catch (err) {
            console.error("Edit expense error:", err.message);
        } finally {
            setEditLoading(false);
        }
    };

    // ── Pregatire date pentru pie chart ────────────────────────────────────
    const pieData = (summary?.byCategory || [])
        .filter(item => item.total > 0)
        .map(item => ({
            name: item.category,
            value: parseFloat(item.total)
        }));

    // ── Loading / Error state ──────────────────────────────────────────────
    if (loading) {
        return (
            <div className="budget-page">
                <p className="budget-state-msg">Se incarca...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="budget-page">
                <p className="budget-state-msg budget-state-msg--error">{error}</p>
            </div>
        );
    }

    return (
        <div className="budget-page">
            {/* Header */}
            <TripSubnav
                tripId={id}
                destinationName={trip?.destination_name || ""}
                showMap={true}
                showBudget={false}
            />

            <div className="budget-content">

                {/* ── Sectiunea 1: Sumar ───────────────────────────────── */}
                <section className="budget-section">
                    <div className="budget-summary-row">

                        {/* Selector persoane */}
                        <div className="budget-people-card">
                            <span className="budget-people-label">Numar persoane</span>
                            <input
                                type="number"
                                className="budget-people-input"
                                min={1}
                                max={20}
                                value={peopleInputValue}
                                onChange={(e) => setPeopleInputValue(e.target.value)}
                                onBlur={handlePeopleBlur}
                            />
                        </div>

                        {/* Card total estimat */}
                        <div className="budget-stat-card">
                            <span className="budget-stat-label">Total estimat</span>
                            <span className="budget-stat-value">
                                {formatAmount(totalEstimated)}
                            </span>
                            <span className="budget-stat-sub">
                                pentru {numberOfPeople} {numberOfPeople === 1 ? "persoana" : "persoane"}
                            </span>
                        </div>

                        {/* Card total cheltuit */}
                        <div className="budget-stat-card">
                            <span className="budget-stat-label">Total cheltuit</span>
                            <span className="budget-stat-value">
                                {formatAmount(totalSpent)}
                            </span>
                            <span className="budget-stat-sub">
                                {summary?.expensesCount || 0} cheltuieli
                            </span>
                        </div>

                        {/* Card diferenta */}
                        <div className={`budget-stat-card ${difference >= 0 ? "budget-stat-card--positive" : "budget-stat-card--negative"}`}>
                            <span className="budget-stat-label">Diferenta</span>
                            <span className="budget-stat-value">
                                {difference >= 0 ? "+" : ""}{formatAmount(difference)}
                            </span>
                            <span className="budget-stat-sub">
                                {difference >= 0 ? "in buget" : "depasit"}
                            </span>
                        </div>
                    </div>
                </section>

                {/* ── Sectiunea 2: Obiective si costuri estimate ───────── */}
                <section className="budget-section">
                    <div className="budget-section-header">
                        <h2 className="budget-section-title">Costuri estimate per obiectiv</h2>
                        <button
                            className="budget-ai-btn"
                            type="button"
                            onClick={handleEstimateAI}
                            disabled={aiLoading || objectives.length === 0}
                        >
                            {aiLoading ? "Se estimeaza..." : "✦ Estimeaza cu AI"}
                        </button>
                    </div>

                    {aiError && (
                        <p className="budget-inline-error">{aiError}</p>
                    )}

                    {objectives.length === 0 ? (
                        <p className="budget-empty-msg">
                            Nu ai obiective adaugate in aceasta calatorie.
                        </p>
                    ) : (
                        <div className="budget-objectives-card">
                            <div className="budget-objectives-list">
                                {objectives.map((obj) => (
                                    <div key={obj.id_objective} className="budget-objective-row">
                                        <span className="budget-objective-title">{obj.title}</span>
                                        <div className="budget-objective-cost-wrap">
                                            <input
                                                type="number"
                                                className="budget-cost-input"
                                                min={0}
                                                step={0.5}
                                                placeholder="—"
                                                value={
                                                    obj.estimated_cost !== null && obj.estimated_cost !== undefined
                                                        ? obj.estimated_cost
                                                        : ""
                                                }
                                                onChange={(e) =>
                                                    handleObjectiveCostChange(obj.id_objective, e.target.value)
                                                }
                                                onBlur={(e) =>
                                                    handleObjectiveCostBlur(obj.id_objective, e.target.value)
                                                }
                                            />
                                            <span className="budget-cost-currency">EUR / pers.</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Total estimat */}
                            <div className="budget-objectives-total">
                                <span>Total estimat ({numberOfPeople} {numberOfPeople === 1 ? "persoana" : "persoane"})</span>
                                <span className="budget-objectives-total-value">
                                    {formatAmount(totalEstimated)}
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                {/* ── Sectiunea 3: Cheltuieli reale ───────────────────── */}
                <section className="budget-section">
                    <h2 className="budget-section-title">Cheltuieli reale</h2>

                    {/* Formular adaugare */}
                    <div className="budget-add-form">
                        <div className="budget-add-form-fields">
                            <input
                                type="number"
                                className="budget-input"
                                placeholder="Suma"
                                min={0}
                                step={0.01}
                                value={addForm.amount}
                                onChange={(e) => setAddForm(prev => ({ ...prev, amount: e.target.value }))}
                            />
                            <select
                                className="budget-select"
                                value={addForm.currency}
                                onChange={(e) => setAddForm(prev => ({ ...prev, currency: e.target.value }))}
                            >
                                <option value="EUR">EUR</option>
                                <option value="USD">USD</option>
                                <option value="RON">RON</option>
                            </select>
                            <select
                                className="budget-select"
                                value={addForm.id_expense_category}
                                onChange={(e) => setAddForm(prev => ({ ...prev, id_expense_category: e.target.value }))}
                            >
                                <option value="">Categorie</option>
                                {categories.map(cat => (
                                    <option key={cat.id_expense_category} value={cat.id_expense_category}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="date"
                                className="budget-input"
                                value={addForm.date}
                                onChange={(e) => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                            />
                            <select
                                className="budget-select"
                                value={addForm.id_objective}
                                onChange={(e) => setAddForm(prev => ({ ...prev, id_objective: e.target.value }))}
                            >
                                <option value="">Obiectiv (optional)</option>
                                {objectives.map(obj => (
                                    <option key={obj.id_objective} value={obj.id_objective}>
                                        {obj.title}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                className="budget-input budget-input--note"
                                placeholder="Nota (optional)"
                                value={addForm.note}
                                onChange={(e) => setAddForm(prev => ({ ...prev, note: e.target.value }))}
                            />
                        </div>

                        {addError && <p className="budget-inline-error">{addError}</p>}

                        <button
                            className="budget-add-btn"
                            type="button"
                            onClick={handleAddExpense}
                            disabled={addLoading}
                        >
                            {addLoading ? "Se adauga..." : "+ Adauga cheltuiala"}
                        </button>
                    </div>

                    {/* Lista cheltuieli */}
                    {expenses.length === 0 ? (
                        <p className="budget-empty-msg">Nu ai cheltuieli inregistrate inca.</p>
                    ) : (
                        <div className="budget-expenses-card">
                            <div className="budget-expenses-list">
                                {expenses.map((exp) => (
                                    <div key={exp.id_expense} className="budget-expense-row">
                                        {editingExpenseId === exp.id_expense ? (
                                            /* ── Form editare inline ── */
                                            <div className="budget-edit-form">
                                                <input
                                                    type="number"
                                                    className="budget-input"
                                                    value={editForm.amount}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                                                />
                                                <select
                                                    className="budget-select"
                                                    value={editForm.currency}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, currency: e.target.value }))}
                                                >
                                                    <option value="EUR">EUR</option>
                                                    <option value="USD">USD</option>
                                                    <option value="RON">RON</option>
                                                </select>
                                                <select
                                                    className="budget-select"
                                                    value={editForm.id_expense_category}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, id_expense_category: e.target.value }))}
                                                >
                                                    <option value="">Categorie</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.id_expense_category} value={cat.id_expense_category}>
                                                            {cat.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="date"
                                                    className="budget-input"
                                                    value={editForm.date}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                                />
                                                <input
                                                    type="text"
                                                    className="budget-input"
                                                    placeholder="Nota"
                                                    value={editForm.note}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                                                />
                                                <div className="budget-edit-actions">
                                                    <button
                                                        className="budget-save-btn"
                                                        type="button"
                                                        onClick={() => handleEditSave(exp.id_expense)}
                                                        disabled={editLoading}
                                                    >
                                                        Salveaza
                                                    </button>
                                                    <button
                                                        className="budget-cancel-btn"
                                                        type="button"
                                                        onClick={() => setEditingExpenseId(null)}
                                                    >
                                                        Anuleaza
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* ── Afisare cheltuiala ── */
                                            <>
                                                <div className="budget-expense-info">
                                                    <span className="budget-expense-amount">
                                                        {formatAmount(exp.amount, exp.currency)}
                                                    </span>
                                                    <span className="budget-expense-cat">
                                                        {exp.ExpenseCategory?.name || "Fara categorie"}
                                                    </span>
                                                    {exp.date && (
                                                        <span className="budget-expense-date">
                                                            {new Date(exp.date).toLocaleDateString("ro-RO", {
                                                                day: "2-digit", month: "2-digit", year: "numeric"
                                                            })}
                                                        </span>
                                                    )}
                                                    {exp.note && (
                                                        <span className="budget-expense-note">{exp.note}</span>
                                                    )}
                                                </div>
                                                <div className="budget-expense-actions">
                                                    <button
                                                        className="budget-edit-btn"
                                                        type="button"
                                                        onClick={() => handleEditOpen(exp)}
                                                    >
                                                        Editeaza
                                                    </button>
                                                    <button
                                                        className="budget-delete-btn"
                                                        type="button"
                                                        onClick={() => handleDeleteExpense(exp.id_expense)}
                                                    >
                                                        Sterge
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Total cheltuieli */}
                            <div className="budget-expenses-total">
                                <span>Total cheltuit</span>
                                <span className="budget-expenses-total-value">
                                    {formatAmount(totalSpent)}
                                </span>
                            </div>
                        </div>
                    )}
                </section>

                {/* ── Sectiunea 4: Grafic si defalcare pe categorii ───── */}
                <section className="budget-section">
                    <h2 className="budget-section-title">Defalcare pe categorii</h2>

                    {pieData.length === 0 ? (
                        <p className="budget-empty-msg">Nu exista cheltuieli inregistrate inca.</p>
                    ) : (
                        <div className="budget-chart-row">

                            {/* Lista categorii */}
                            <div className="budget-categories-list">
                                {pieData.map((item, index) => {
                                    const percent = totalSpent > 0
                                        ? ((item.value / totalSpent) * 100).toFixed(1)
                                        : 0;
                                    return (
                                        <div key={item.name} className="budget-category-row">
                                            <span
                                                className="budget-category-dot"
                                                style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                                            />
                                            <span className="budget-category-name">{item.name}</span>
                                            <span className="budget-category-amount">
                                                {formatAmount(item.value)}
                                            </span>
                                            <span className="budget-category-percent">{percent}%</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pie chart */}
                            <div className="budget-pie-wrap">
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) => formatAmount(value)}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
}
