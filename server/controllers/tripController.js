import { Trip, TripDay, Objective, Category } from '../models/index.js'

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
        try {
            const { destination_name, destination_lat, destination_lng, number_of_days, start_date } = req.body;

            // Cream calatoria
            const trip = await Trip.create({
                id_user: req.user.id,
                destination_name,
                destination_lat,
                destination_lng,
                number_of_days,
                start_date
            });

            // Generam zilele automat
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

            await TripDay.bulkCreate(days); // Creez mai multe randuri de query catre BD

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
    }

};