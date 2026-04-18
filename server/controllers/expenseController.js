import { Expense, Trip, Objective, ExpenseCategory } from '../models/index.js';
import { sequelize } from '../models/index.js';
import { estimateObjectiveCosts } from '../services/geminiService.js';

const ALLOWED_CURRENCIES = ["EUR", "USD", "RON"];

export const expenseController = {
    // POST /api/trips/:tripId/expenses
    createExpense: async (req, res) => {
        try {
            const { tripId } = req.params;
            const { id_objective, id_expense_category, amount, currency, no_of_people, date, note } = req.body;

            // validari
            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({
                    message: "Amount must be a number greater than 0."
                });
            }

            if (!currency || !ALLOWED_CURRENCIES.includes(currency)) {
                return res.status(400).json({
                    message: "Invalid currency."
                });
            }

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Trip not found.' });
            }

            if (id_objective) {
                const objective = await Objective.findOne({
                    where: { id_objective, id_trip: tripId }
                });

                if (!objective) {
                    return res.status(400).json({
                        message: 'Objective does not belong to this trip.'
                    });
                }
            }

            if (id_expense_category) {
                const category = await ExpenseCategory.findByPk(id_expense_category);

                if (!category) {
                    return res.status(400).json({
                        message: "Invalid expense category."
                    });
                }
            }

            const expense = await Expense.create({
                id_trip: tripId,
                id_objective: id_objective || null,
                id_expense_category,
                amount: Number(amount),
                currency,
                date,
                note
            });

            return res.status(201).json({
                message: 'Expense created successfully.',
                data: expense
            });

        } catch (error) {
            console.error('Create expense error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
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
                return res.status(404).json({ message: 'Trip not found.' });
            }

            const expenses = await Expense.findAll({
                where: { id_trip: tripId },
                include: [{ model: ExpenseCategory, required: false }],
                order: [['date', 'ASC']]
            });

            return res.status(200).json({ data: expenses });

        } catch (error) {
            console.error('Get expenses error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },

    // DELETE /api/expenses/:id
    deleteExpense: async (req, res) => {
        try {
            const { id } = req.params;

            const expense = await Expense.findByPk(id);

            if (!expense) {
                return res.status(404).json({ message: 'Expense not found.' });
            }

            const trip = await Trip.findOne({
                where: { id_trip: expense.id_trip, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(403).json({ message: 'Forbidden.' });
            }

            await expense.destroy();

            return res.status(200).json({
                message: 'Expense deleted successfully.'
            });

        } catch (error) {
            console.error('Delete expense error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
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
                return res.status(404).json({ message: "Trip not found." });
            }

            // Total general
            const total = await Expense.sum("amount", {
                where: { id_trip: tripId }
            });

            // Total per persoana
            const totalPerPersonRaw = await Expense.findAll({
                attributes: [
                    [
                        sequelize.fn("SUM", sequelize.literal("amount / COALESCE(no_of_people,1)")),
                        "totalPerPerson"
                    ]
                ],
                where: { id_trip: tripId },
                raw: true
            });

            const totalPerPerson = totalPerPersonRaw[0].totalPerPerson ? parseFloat(totalPerPersonRaw[0].totalPerPerson) : 0;

            // Total pe categorii
            const byCategoryRaw = await Expense.findAll({
                attributes: [
                    "id_expense_category",
                    [sequelize.fn("SUM", sequelize.col("amount")), "total"]
                ],
                where: { id_trip: tripId },
                group: ["id_expense_category"]
            });

            // iau toate categoriile o singura data
            const categories = await ExpenseCategory.findAll();

            const byCategory = byCategoryRaw.map(item => {
                const category = categories.find(
                    c => c.id_expense_category === item.id_expense_category
                );

                return {
                    category: category ? category.name : "Uncategorized",
                    total: parseFloat(item.get("total"))
                };
            });
            // Total pe zile
            const byDayRaw = await Expense.findAll({
                attributes: [
                    "date",
                    [sequelize.fn("SUM", sequelize.col("amount")), "total"]
                ],
                where: { id_trip: tripId },
                group: ["date"],
                order: [["date", "ASC"]]
            });

            const byDay = byDayRaw.map(item => ({
                date: item.date,
                total: parseFloat(item.get("total"))
            }));

            // Numar total cheltuieli
            const count = await Expense.count({
                where: { id_trip: tripId }
            });

            return res.status(200).json({
                total: total ? parseFloat(total) : 0,
                totalPerPerson: totalPerPerson ? parseFloat(totalPerPerson) : 0,
                expensesCount: count,
                byCategory,
                byDay,
                number_of_people: trip.number_of_people || 1,
                total_estimated: null
            });

        } catch (error) {
            console.error("Budget summary error:", error);
            return res.status(500).json({
                message: "Something went wrong."
            });
        }
    },
    // PATCH /trips/:tripId/people
    updateTripPeople: async (req, res) => {
        try {
            const { tripId } = req.params;
            const { number_of_people } = req.body;

            if (!number_of_people || isNaN(number_of_people) || Number(number_of_people) < 1) {
                return res.status(400).json({ message: "Number of people must be at least 1." });
            }

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: "Trip not found." });
            }

            await trip.update({ number_of_people: Number(number_of_people) });

            return res.status(200).json({
                message: "Trip updated successfully.",
                data: trip
            });

        } catch (error) {
            console.error("Update trip people error:", error);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },

    // PATCH /trips/:tripId/objectives/:objectiveId/cost
    updateObjectiveCost: async (req, res) => {
        try {
            const { tripId, objectiveId } = req.params;
            const { estimated_cost } = req.body;

            if (estimated_cost === undefined || estimated_cost === null || isNaN(estimated_cost) || Number(estimated_cost) < 0) {
                return res.status(400).json({ message: "estimated_cost must be a number >= 0." });
            }

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: "Trip not found." });
            }

            const objective = await Objective.findOne({
                where: { id_objective: objectiveId, id_trip: tripId }
            });

            if (!objective) {
                return res.status(404).json({ message: "Objective not found." });
            }

            await objective.update({ estimated_cost: Number(estimated_cost) });

            return res.status(200).json({
                message: "Objective cost updated.",
                data: objective
            });

        } catch (error) {
            console.error("Update objective cost error:", error);
            return res.status(500).json({ message: "Something went wrong." });
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
                return res.status(404).json({ message: "Trip not found." });
            }

            // luam toate obiectivele calatoriei
            const objectives = await Objective.findAll({
                where: { id_trip: tripId },
                attributes: ['id_objective', 'title', 'estimated_cost']
            });

            if (objectives.length === 0) {
                return res.status(400).json({ message: "No objectives found for this trip." });
            }

            // trimitem la Gemini obiectivele fara estimare sau cu estimare 0 (posibil din eroare anterioara)
            const unestimated = objectives.filter(o => o.estimated_cost === null || o.estimated_cost === undefined || o.estimated_cost === 0);

            if (unestimated.length === 0) {
                const cached = await Objective.findAll({
                    where: { id_trip: tripId },
                    attributes: ['id_objective', 'title', 'estimated_cost']
                });
                return res.status(200).json({
                    message: "AI estimation completed.",
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
                message: "AI estimation completed.",
                data: updated
            });

        } catch (error) {
            console.error("AI estimation error:", error);
            return res.status(500).json({ message: "Something went wrong." });
        }
    },

    // PUT /expenses/:id
    updateExpense: async (req, res) => {
        try {
            const { id } = req.params;
            const { id_expense_category, amount, currency, no_of_people, date, note, id_objective } = req.body;

            if (!amount || isNaN(amount) || Number(amount) <= 0) {
                return res.status(400).json({ message: "Amount must be a number greater than 0." });
            }

            if (!currency || !ALLOWED_CURRENCIES.includes(currency)) {
                return res.status(400).json({ message: "Invalid currency." });
            }

            const expense = await Expense.findByPk(id);

            if (!expense) {
                return res.status(404).json({ message: "Expense not found." });
            }

            // verificam ca expense-ul apartine unui trip al userului autentificat
            const trip = await Trip.findOne({
                where: { id_trip: expense.id_trip, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(403).json({ message: "Forbidden." });
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
                message: "Expense updated successfully.",
                data: expense
            });

        } catch (error) {
            console.error("Update expense error:", error);
            return res.status(500).json({ message: "Something went wrong." });
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
            return res.status(500).json({ message: "Something went wrong." });
        }
    }

};