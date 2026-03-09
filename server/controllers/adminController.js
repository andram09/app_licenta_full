import { User, Trip, Expense, ExpenseCategory, Objective, sequelize } from "../models/index.js";

export const adminController = {

    getDashboardStats: async (req, res) => {
        try {
            //total users unde role='USER'
            const totalUsers = await User.count({ where: { role: 'USER' } });
            //total trips
            const totalTrips = await Trip.count();

            const avgTripsPerUser = totalUsers > 0 ? parseFloat((totalTrips / totalUsers).toFixed(2)) : 0;

            //medie durata trip
            const avgTripDurationRaw = await Trip.findAll({
                attributes: [
                    [sequelize.fn("AVG", sequelize.col("number_of_days")), "avgDuration"]
                ],
                raw: true
            });

            const avgTripDuration = avgTripDurationRaw[0].avgDuration ? parseFloat(parseFloat(avgTripDurationRaw[0].avgDuration).toFixed(1)) : 0;

            // avgObjectivesPerTrip
            const totalObjectives = await Objective.count();
            const avgObjectivesPerTrip = totalTrips > 0 ? parseFloat((totalObjectives / totalTrips).toFixed(1)) : 0;

            //top destinations
            const topDestinationsRaw = await Trip.findAll({
                attributes: [
                    "destination_name",
                    [sequelize.fn("COUNT", sequelize.col("id_trip")), "count"]
                ],
                group: ["destination_name"],
                order: [[sequelize.literal("count"), "DESC"]],
                limit: 5,
                raw: true
            });

            const topDestinations = topDestinationsRaw.map(item => ({
                destination: item.destination_name,
                tripsCount: parseInt(item.count)
            }));

            // tripsPerMonth 
            const tripsPerMonthRaw = await Trip.findAll({
                attributes: [
                    [sequelize.fn("MONTH", sequelize.col("createdAt")), "month"],
                    [sequelize.fn("YEAR", sequelize.col("createdAt")), "year"],
                    [sequelize.fn("COUNT", sequelize.col("id_trip")), "count"]
                ],
                group: ["year", "month"],
                order: [
                    [sequelize.literal("year"), "ASC"],
                    [sequelize.literal("month"), "ASC"]
                ],
                raw: true
            });

            const monthNames = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const tripsPerMonth = tripsPerMonthRaw.map(item => ({
                month: `${monthNames[parseInt(item.month) - 1]} ${item.year}`,
                count: parseInt(item.count)
            }));

            //top expense categories
            const topCategoriesRaw = await Expense.findAll({
                attributes: [
                    "id_expense_category",
                    [sequelize.fn("SUM", sequelize.col("amount")), "total"]
                ],
                group: ["id_expense_category"],
                order: [[sequelize.literal("total"), "DESC"]],
                limit: 5,
                raw: true
            });

            const categories = await ExpenseCategory.findAll({ raw: true });

            const topExpenseCategories = topCategoriesRaw.map(item => {
                const category = categories.find(
                    c => c.id_expense_category === item.id_expense_category
                );

                return {
                    category: category ? category.name : "Uncategorized",
                    total: parseFloat(item.total)
                };
            });

            return res.status(200).json({
                totalUsers,
                totalTrips,
                avgTripsPerUser,
                avgTripDuration,
                avgObjectivesPerTrip,
                topDestinations,
                tripsPerMonth,
                topExpenseCategories
            });

        } catch (error) {
            console.error("Admin dashboard error:", error);
            return res.status(500).json({
                message: "Something went wrong."
            });
        }
    }
};