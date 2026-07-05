import { User, Trip, Expense, ExpenseCategory, Objective, sequelize } from "../models/index.js";

export const adminController = {

    getDashboardStats: async (req, res) => {
        try {
            //total users unde role='USER'
            const totalUsers = await User.count({ where: { role: 'USER' } });
            //total trips — include TOATE calatoriile (active + sterse), cate s-au creat in aplicatie
            const totalTrips = await Trip.count({ paranoid: false });

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
            // numaram doar obiectivele care apartin unui trip ne-sters (Trip e paranoid,
            // deci INNER JOIN cu required:true exclude automat trip-urile soft-deleted)
            const totalObjectives = await Objective.count({
                include: [{ model: Trip, required: true, attributes: [] }]
            });
            // media se raporteaza doar la calatoriile active, pentru ca obiectivele numarate
            // sunt doar ale acestora (totalTrips include si calatoriile sterse)
            const activeTrips = await Trip.count();
            const avgObjectivesPerTrip = activeTrips > 0 ? parseFloat((totalObjectives / activeTrips).toFixed(1)) : 0;

            // top destinations — grupam dupa oras (partea dinaintea virgulei), normalizat,
            // ca sa nu separam "Barcelona, Spania" de "Barcelona, Spain" (tara difera ca limba)
            const allDestinations = await Trip.findAll({
                attributes: ["destination_name"],
                raw: true
            });

            const destMap = new Map(); // cheie normalizata -> { destination, tripsCount }
            for (const { destination_name } of allDestinations) {
                if (!destination_name) continue;
                const city = destination_name.split(",")[0].trim();
                const key = city.toLowerCase();
                if (destMap.has(key)) {
                    destMap.get(key).tripsCount += 1;
                } else {
                    destMap.set(key, { destination: city, tripsCount: 1 });
                }
            }

            const topDestinations = [...destMap.values()]
                .sort((a, b) => b.tripsCount - a.tripsCount)
                .slice(0, 5);

            // tripsPerMonth — statistica include TOATE calatoriile (active + sterse),
            // fiindca reprezinta cate calatorii s-au creat in aplicatie pe luni
            const tripsPerMonthRaw = await Trip.findAll({
                paranoid: false,
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
            // doar cheltuielile trip-urilor ne-sterse (acelasi principiu ca la obiective)
            const topCategoriesRaw = await Expense.findAll({
                attributes: [
                    "id_expense_category",
                    [sequelize.fn("SUM", sequelize.col("amount")), "total"]
                ],
                include: [{ model: Trip, required: true, attributes: [] }],
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
                    category: category ? category.name : "Fără categorie",
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
                message: "A apărut o eroare. Încearcă din nou."
            });
        }
    }
};