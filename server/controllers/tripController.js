import { Trip, TripDay, Objective, Category } from '../models/index.js'
import sequelize from "../config/db.config.js";
import { Op } from 'sequelize';

export const tripController = {

    // GET /api/trips - Lista calatoriilor user-ului autentificat
    getAllTrips: async (req, res) => {
        try {
            // req.user.id vine din authMiddleware
            const trips = await Trip.findAll({
                where: { id_user: req.user.id },
                attributes: ['id_trip', 'destination_name', 'number_of_days', 'start_date', 'createdAt'],
                order: [['createdAt', 'DESC']]
            });

            return res.status(200).json({
                data: trips
            });

        } catch (error) {
            console.error('GetAll trips error:', error);
            return res.status(500).json({
                message: 'Something went wrong.'
            });
        }
    },

    // GET /api/trips/:id - Detalii calatorie cu zile si obiective
    getTripById: async (req, res) => {
        try {
            const { id } = req.params;

            const trip = await Trip.findOne({
                where: { id_trip: id, id_user: req.user.id },
                include: [
                    {
                        model: TripDay,
                        as: 'TripDays',
                        include: [
                            {
                                model: Objective,
                                as: 'Objectives',
                                include: [
                                    {
                                        model: Category,
                                        as: 'Category',
                                        attributes: ['id_category', 'name']
                                    }],
                                order: [['position_in_day', 'ASC']]
                            }
                        ],
                        order: [['day_index', 'ASC']]
                    }
                ]
            });

            if (!trip) {
                return res.status(404).json({ message: 'Trip not found.' });
            }

            return res.status(200).json({ data: trip });

        } catch (error) {
            console.error('GetTripById error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },

    // POST /api/trips - Creare calatorie + generare zile automat
    createTrip: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { destination_name, destination_lat, destination_lng, number_of_days, start_date } = req.body;

            //validations
            if (!destination_name || destination_name.trim().length < 2) {
                await transaction.rollback();
                return res.status(400).json({
                    message: "Destination name must contain at least 2 characters."
                });
            }

            const daysNumber = Number(number_of_days);
            if (!daysNumber || isNaN(daysNumber) || daysNumber < 1 || daysNumber > 30) {
                await transaction.rollback();
                return res.status(400).json({
                    message: "Number of days must be between 1 and 30."
                });
            }

            if (start_date && isNaN(Date.parse(start_date))) {
                await transaction.rollback();
                return res.status(400).json({
                    message: "Invalid start date format."
                });
            }

            if (destination_lat !== undefined) {
                const lat = Number(destination_lat);
                if (isNaN(lat) || lat < -90 || lat > 90) {
                    await transaction.rollback();
                    return res.status(400).json({
                        message: "Invalid latitude value."
                    });
                }
            }

            if (destination_lng !== undefined) {
                const lng = Number(destination_lng);
                if (isNaN(lng) || lng < -180 || lng > 180) {
                    await transaction.rollback();
                    return res.status(400).json({
                        message: "Invalid longitude value."
                    });
                }
            }

            // creez calatoria
            const trip = await Trip.create({
                id_user: req.user.id,
                destination_name,
                destination_lat,
                destination_lng,
                number_of_days,
                start_date
            }, { transaction });

            // generare zile automat
            const days = [];
            for (let i = 1; i <= number_of_days; i++) {
                let calendar_date = null;

                // Calculam calendar_date daca exista start_date
                if (start_date) {
                    const startDateObj = new Date(start_date);
                    startDateObj.setDate(startDateObj.getDate() + (i - 1));
                    calendar_date = startDateObj.toISOString().split('T')[0]; // YYYY-MM-DD
                }

                days.push({
                    id_trip: trip.id_trip,
                    day_index: i,
                    calendar_date
                });
            }

            await TripDay.bulkCreate(days, { transaction }); // Creez mai multe randuri de query catre BD

            await transaction.commit();

            return res.status(201).json({
                message: 'Trip created successfully.',
                data: { id_trip: trip.id_trip }
            });

        } catch (error) {
            console.error('Create trip error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },

    // PUT /api/trips/:id - Modificare doar start_date
    updateTripStartDate: async (req, res) => {
        try {
            const { id } = req.params;
            const { start_date } = req.body;

            const trip = await Trip.findOne({
                where: { id_trip: id, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Trip not found.' });
            }
            if (start_date && isNaN(Date.parse(start_date))) {
                return res.status(400).json({
                    message: "Invalid start date format."
                });
            }

            // Actualizam doar data de plecare
            await trip.update({ start_date });

            // Recalculam calendar_date pentru toate zilele
            if (start_date) {
                const days = await TripDay.findAll({
                    where: { id_trip: trip.id_trip },
                    order: [['day_index', 'ASC']]
                });

                for (const day of days) {
                    const startDateObj = new Date(start_date);
                    startDateObj.setDate(startDateObj.getDate() + (day.day_index - 1));
                    const calendar_date = startDateObj.toISOString().split('T')[0]; // YYYY-MM-DD

                    await day.update({ calendar_date });
                }
            }

            return res.status(200).json({ message: 'Trip updated successfully.' });

        } catch (error) {
            console.error('Update trip error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },

    // DELETE /api/trips/:id - Soft delete calatorie
    deleteTrip: async (req, res) => {
        try {
            const { id } = req.params;

            const trip = await Trip.findOne({
                where: { id_trip: id, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Trip not found.' });
            }

            // Soft delete (seteaza deleted_at)
            await trip.destroy();
            return res.status(200).json({ message: 'Trip deleted successfully.' });

        } catch (error) {
            console.error('Delete trip error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },

    // PUT /api/trips/:id/duration
    updateTripDuration: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { id } = req.params;
            const { number_of_days } = req.body;

            const trip = await Trip.findOne({
                where: { id_trip: id, id_user: req.user.id },
                transaction
            });

            if (!trip) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Trip not found.' });
            }

            const currentDays = trip.number_of_days;
            const newDays = parseInt(number_of_days);

            if (newDays === currentDays) {
                await transaction.commit();
                return res.status(200).json({ message: 'No changes needed.' });
            }

            if (newDays > currentDays) {
                const daysToCreate = [];

                for (let i = currentDays + 1; i <= newDays; i++) {
                    let calendar_date = null;

                    if (trip.start_date) {
                        const startDateObj = new Date(trip.start_date);
                        startDateObj.setDate(startDateObj.getDate() + (i - 1));
                        calendar_date = startDateObj.toISOString().split('T')[0];
                    }

                    daysToCreate.push({
                        id_trip: trip.id_trip,
                        day_index: i,
                        calendar_date
                    });
                }

                await TripDay.bulkCreate(daysToCreate, { transaction });
            }

            if (newDays < currentDays) {

                const daysToRemove = await TripDay.findAll({
                    where: {
                        id_trip: trip.id_trip,
                        day_index: {
                            [Op.gt]: newDays
                        }
                    },
                    transaction
                });

                const dayIdsToRemove = daysToRemove.map(day => day.id_day);

                await Objective.update(
                    {
                        id_trip_day: null,
                        position_in_day: null
                    },
                    {
                        where: {
                            id_trip_day: dayIdsToRemove
                        },
                        transaction
                    }
                );

                await TripDay.destroy({
                    where: {
                        id_trip: trip.id_trip,
                        day_index: {
                            [Op.gt]: newDays
                        }
                    },
                    transaction
                });
            }

            await trip.update(
                { number_of_days: newDays },
                { transaction }
            );

            await transaction.commit();

            return res.status(200).json({
                message: 'Trip duration updated successfully.'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Update duration error:', error);
            return res.status(500).json({
                message: 'Something went wrong.'
            });
        }
    },


    // GET /trips/:tripId/board
    getTripBoard: async (req, res) => {
        try {
            const { id } = req.params;
            const tripId = Number(id);

            if (!tripId || isNaN(tripId)) {
                return res.status(400).json({ message: "Invalid trip id." });
            }

            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: "Trip not found." });
            }

            // toate zilele tripului
            const days = await TripDay.findAll({
                where: { id_trip: tripId },
                order: [["day_index", "ASC"]]
            });

            const dayIds = days.map(d => d.id_day);

            // toate obiectivele pentru zilele acestui trip (atribuite)
            const assigned = dayIds.length ? await Objective.findAll({
                    where: { id_trip_day: dayIds },
                    include: [{ model: Category, attributes: ["id_category", "name"] }],
                    order: [
                        ["id_trip_day", "ASC"],
                        ["position_in_day", "ASC"]
                    ]
                })
                : [];

            // obiectivele neatribuite
            const unassigned = await Objective.findAll({
                where: { id_trip: tripId, id_trip_day: null },
                include: [{ model: Category, attributes: ["id_category", "name"] }],
                order: [["createdAt", "DESC"]]
            });

            // group objective atribuite dupa zi
            const assignedByDay = new Map();
            for (const obj of assigned) {
                const key = obj.id_trip_day;
                if (!assignedByDay.has(key)) //daca nu am lista pt ziua asta, o fac
                    assignedByDay.set(key, []);
                assignedByDay.get(key).push(obj); //adaug obiectivul in lista zilei corespunzatoare
            }

            const daysWithObjectives = days.map(day => ({
                id_day: day.id_day,
                day_index: day.day_index,
                calendar_date: day.calendar_date,
                objectives: assignedByDay.get(day.id_day) || []
            }));

            return res.status(200).json({
                data: {
                    trip,
                    days: daysWithObjectives,
                    unassigned
                }
            });

        } catch (error) {
            console.error("Get trip board error:", error);
            return res.status(500).json({ message: "Something went wrong." });
        }
    }

};