import { Expense, Trip, Objective, ExpenseCategory } from '../models/index.js';
import { sequelize } from '../models/index.js';

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

            if (!no_of_people || isNaN(no_of_people) || Number(no_of_people) < 1) {
                return res.status(400).json({
                    message: "Number of people must be at least 1."
                });
            }

            if (!date || isNaN(Date.parse(date))) {
                return res.status(400).json({
                    message: "Invalid date format."
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
                no_of_people: Number(no_of_people),
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
                byDay
            });

        } catch (error) {
            console.error("Budget summary error:", error);
            return res.status(500).json({
                message: "Something went wrong."
            });
        }
    }

};