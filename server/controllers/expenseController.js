import { Expense, Trip, Objective, ExpenseCategory } from '../models/index.js';
import { estimateObjectiveCosts } from '../services/geminiService.js';

const ALLOWED_CURRENCIES = ["EUR", "USD", "RON"];

// Cursuri de schimb orientative catre EUR (1 unitate valuta = X EUR).
// Sunt aproximative, folosite doar pentru agregarile din sumar/grafic.
const EUR_RATES = {
    EUR: 1,
    USD: 0.92,
    RON: 0.20
};

// Converteste o suma dintr-o valuta in EUR folosind cursurile orientative.
const toEur = (amount, currency) => {
    const rate = EUR_RATES[currency] ?? 1;
    return parseFloat(amount) * rate;
};

// Cheltuielile reale nu pot fi inregistrate cu o data din viitor.
const isFutureDate = (date) => {
    if (!date) return false;
    const today = new Date().toISOString().slice(0, 10);
    return String(date).slice(0, 10) > today;
};

export const expenseController = {
    // POST /api/trips/:tripId/expenses
    createExpense: async (req, res) => {
        try {
            const { tripId } = req.params;
            const { id_objective, id_expense_category, amount, currency, no_of_people, date, note } = req.body;

            // validari
            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({
                    message: "Suma trebuie să fie un număr mai mare decât 0."
                });
            }

            if (!currency || !ALLOWED_CURRENCIES.includes(currency)) {
                return res.status(400).json({
                    message: "Valută invalidă."
                });
            }

            if (isFutureDate(date)) {
                return res.status(400).json({
                    message: "Data cheltuielii nu poate fi în viitor."
                });
            }

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Călătoria nu a fost găsită.' });
            }

            if (id_objective) {
                const objective = await Objective.findOne({
                    where: { id_objective, id_trip: tripId }
                });

                if (!objective) {
                    return res.status(400).json({
                        message: 'Obiectivul nu aparține acestei călătorii.'
                    });
                }
            }

            if (id_expense_category) {
                const category = await ExpenseCategory.findByPk(id_expense_category);

                if (!category) {
                    return res.status(400).json({
                        message: "Categorie de cheltuială invalidă."
                    });
                }
            }

            const expense = await Expense.create({
                id_trip: tripId,
                id_objective: id_objective || null,
                id_expense_category,
                amount: Number(amount),
                currency,
                no_of_people: no_of_people ? Number(no_of_people) : 1,
                date,
                note
            });

            return res.status(201).json({
                message: 'Cheltuiala a fost adăugată cu succes.',
                data: expense
            });

        } catch (error) {
            console.error('Create expense error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    },

    // GET /api/trips/:tripId/expenses
    getTripExpenses: async (req, res) => {
        try {
            const { tripId } = req.params;

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Călătoria nu a fost găsită.' });
            }

            const expenses = await Expense.findAll({
                where: { id_trip: tripId },
                include: [{ model: ExpenseCategory, required: false }],
                order: [['date', 'ASC']]
            });

            return res.status(200).json({ data: expenses });

        } catch (error) {
            console.error('Get expenses error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    },

    // DELETE /api/expenses/:id
    deleteExpense: async (req, res) => {
        try {
            const { id } = req.params;

            const expense = await Expense.findByPk(id);

            if (!expense) {
                return res.status(404).json({ message: 'Cheltuiala nu a fost găsită.' });
            }

            const trip = await Trip.findOne({
                where: { id_trip: expense.id_trip, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(403).json({ message: 'Acces interzis.' });
            }

            await expense.destroy();

            return res.status(200).json({
                message: 'Cheltuiala a fost ștearsă cu succes.'
            });

        } catch (error) {
            console.error('Delete expense error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    },

    // GET /trips/:tripId/budget-summary
    getBudgetSummary: async (req, res) => {
        try {
            const { tripId } = req.params;

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: "Călătoria nu a fost găsită." });
            }

            // Luam toate cheltuielile si categoriile; agregarile se fac in JS
            // pentru a putea converti fiecare cheltuiala in EUR (valute mixte).
            const expenses = await Expense.findAll({
                where: { id_trip: tripId },
                attributes: ["amount", "currency", "no_of_people", "date", "id_expense_category"],
                raw: true
            });

            const categories = await ExpenseCategory.findAll();

            let total = 0;
            let totalPerPerson = 0;
            const categoryTotals = new Map(); // id_expense_category -> total EUR
            const dayTotals = new Map();      // date -> total EUR

            for (const exp of expenses) {
                const eur = toEur(exp.amount, exp.currency);
                total += eur;
                totalPerPerson += eur / (exp.no_of_people || 1);

                const catKey = exp.id_expense_category ?? null;
                categoryTotals.set(catKey, (categoryTotals.get(catKey) || 0) + eur);

                const dayKey = exp.date;
                dayTotals.set(dayKey, (dayTotals.get(dayKey) || 0) + eur);
            }

            const byCategory = Array.from(categoryTotals.entries()).map(([catId, sum]) => {
                const category = categories.find(c => c.id_expense_category === catId);
                return {
                    category: category ? category.name : "Fără categorie",
                    total: parseFloat(sum.toFixed(2))
                };
            });

            const byDay = Array.from(dayTotals.entries())
                .sort((a, b) => (a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0))
                .map(([date, sum]) => ({
                    date,
                    total: parseFloat(sum.toFixed(2))
                }));

            const count = expenses.length;

            return res.status(200).json({
                total: parseFloat(total.toFixed(2)),
                totalPerPerson: parseFloat(totalPerPerson.toFixed(2)),
                expensesCount: count,
                byCategory,
                byDay,
                currency: "EUR", // toate agregarile sunt convertite in EUR
                number_of_people: trip.number_of_people || 1,
                total_estimated: null
            });

        } catch (error) {
            console.error("Budget summary error:", error);
            return res.status(500).json({
                message: "A apărut o eroare. Încearcă din nou."
            });
        }
    },
    // PATCH /trips/:tripId/people
    updateTripPeople: async (req, res) => {
        try {
            const { tripId } = req.params;
            const { number_of_people } = req.body;

            if (!number_of_people || isNaN(number_of_people) || Number(number_of_people) < 1) {
                return res.status(400).json({ message: "Numărul de persoane trebuie să fie cel puțin 1." });
            }

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: "Călătoria nu a fost găsită." });
            }

            await trip.update({ number_of_people: Number(number_of_people) });

            return res.status(200).json({
                message: "Călătoria a fost actualizată cu succes.",
                data: trip
            });

        } catch (error) {
            console.error("Update trip people error:", error);
            return res.status(500).json({ message: "A apărut o eroare. Încearcă din nou." });
        }
    },

    // PATCH /trips/:tripId/objectives/:objectiveId/cost
    updateObjectiveCost: async (req, res) => {
        try {
            const { tripId, objectiveId } = req.params;
            const { estimated_cost } = req.body;

            if (estimated_cost === undefined || estimated_cost === null || isNaN(estimated_cost) || Number(estimated_cost) < 0) {
                return res.status(400).json({ message: "Costul estimat trebuie să fie un număr mai mare sau egal cu 0." });
            }

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: "Călătoria nu a fost găsită." });
            }

            const objective = await Objective.findOne({
                where: { id_objective: objectiveId, id_trip: tripId }
            });

            if (!objective) {
                return res.status(404).json({ message: "Obiectivul nu a fost găsit." });
            }

            await objective.update({ estimated_cost: Number(estimated_cost) });

            return res.status(200).json({
                message: "Costul obiectivului a fost actualizat.",
                data: objective
            });

        } catch (error) {
            console.error("Update objective cost error:", error);
            return res.status(500).json({ message: "A apărut o eroare. Încearcă din nou." });
        }
    },

    // POST /trips/:tripId/budget/estimate-ai
    estimateCostsWithAI: async (req, res) => {
        try {
            const { tripId } = req.params;

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: "Călătoria nu a fost găsită." });
            }

            // luam toate obiectivele calatoriei
            const objectives = await Objective.findAll({
                where: { id_trip: tripId },
                attributes: ['id_objective', 'title', 'estimated_cost']
            });

            if (objectives.length === 0) {
                return res.status(400).json({ message: "Nu există obiective pentru această călătorie." });
            }

            // trimitem la Gemini obiectivele fara estimare sau cu estimare 0 (posibil din eroare anterioara)
            const unestimated = objectives.filter(o => o.estimated_cost === null || o.estimated_cost === undefined || o.estimated_cost === 0);

            if (unestimated.length === 0) {
                const cached = await Objective.findAll({
                    where: { id_trip: tripId },
                    attributes: ['id_objective', 'title', 'estimated_cost']
                });
                return res.status(200).json({
                    message: "Estimarea AI a fost finalizată.",
                    data: cached
                });
            }

            const estimates = await estimateObjectiveCosts(unestimated, trip.destination_name);

            // salvam fiecare estimare in baza de date
            for (const estimate of estimates) {
                if (estimate.estimated_cost !== null) {
                    await Objective.update(
                        { estimated_cost: estimate.estimated_cost },
                        { where: { id_objective: estimate.id_objective, id_trip: tripId } }
                    );
                }
            }

            // returnam obiectivele actualizate
            const updated = await Objective.findAll({
                where: { id_trip: tripId },
                attributes: ['id_objective', 'title', 'estimated_cost']
            });

            return res.status(200).json({
                message: "Estimarea AI a fost finalizată.",
                data: updated
            });

        } catch (error) {
            console.error("AI estimation error:", error);
            return res.status(500).json({ message: "A apărut o eroare. Încearcă din nou." });
        }
    },

    // PUT /expenses/:id
    updateExpense: async (req, res) => {
        try {
            const { id } = req.params;
            const { id_expense_category, amount, currency, no_of_people, date, note, id_objective } = req.body;

            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({ message: "Suma trebuie să fie un număr mai mare decât 0." });
            }

            if (!currency || !ALLOWED_CURRENCIES.includes(currency)) {
                return res.status(400).json({ message: "Valută invalidă." });
            }

            if (isFutureDate(date)) {
                return res.status(400).json({ message: "Data cheltuielii nu poate fi în viitor." });
            }

            const expense = await Expense.findByPk(id);

            if (!expense) {
                return res.status(404).json({ message: "Cheltuiala nu a fost găsită." });
            }

            // verificam ca expense-ul apartine unui trip al userului autentificat
            const trip = await Trip.findOne({
                where: { id_trip: expense.id_trip, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(403).json({ message: "Acces interzis." });
            }

            await expense.update({
                id_expense_category: id_expense_category || null,
                amount: Number(amount),
                currency,
                no_of_people: no_of_people ? Number(no_of_people) : 1,
                date: date || null,
                note: note || null,
                id_objective: id_objective || null
            });

            return res.status(200).json({
                message: "Cheltuiala a fost actualizată cu succes.",
                data: expense
            });

        } catch (error) {
            console.error("Update expense error:", error);
            return res.status(500).json({ message: "A apărut o eroare. Încearcă din nou." });
        }
    },

    // GET /expense-categories
    getCategories: async (req, res) => {
        try {
            const categories = await ExpenseCategory.findAll({
                order: [['name', 'ASC']]
            });
            return res.status(200).json({ data: categories });
        } catch (error) {
            console.error("Get categories error:", error);
            return res.status(500).json({ message: "A apărut o eroare. Încearcă din nou." });
        }
    }

};