import { Objective, TripDay, Trip, Category } from '../models/index.js';
import { Op } from 'sequelize';

const reorderObjectives = async (id_trip_day) => {
    if (!id_trip_day) return;

    const objectives = await Objective.findAll({
        where: { id_trip_day },
        order: [['position_in_day', 'ASC']]
    });

    for (let i = 0; i < objectives.length; i++) {
        await objectives[i].update({ position_in_day: i + 1 });
    }
};


export const objectiveController = {

    // GET /api/objectives/trip/:tripId/unassigned - Obiective neatribuite
    getUnassignedObjectives: async (req, res) => {
        try {
            const { tripId } = req.params;

            // Verificam ca trip-ul apartine userului
            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Trip not found.' });
            }

            // Obiectivele neatribuite pentru acest trip
            const objectives = await Objective.findAll({
                where: {
                    id_trip: tripId,
                    id_trip_day: null
                },
                include: [
                    { model: Category, attributes: ['id_category', 'name'] }
                ],
                order: [['createdAt', 'DESC']]
            });

            return res.status(200).json({ data: objectives });

        } catch (error) {
            console.error('Get unassigned objectives error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },

    // CREATE - obiectiv neatribuit
    // POST /api/trips/:tripId/objectives
    createObjective: async (req, res) => {
        try {
            const { tripId } = req.params;
            const {
                id_category,
                title,
                description,
                coord_lat,
                coord_lng,
                address,
                source_type,
                external_place_id,
                external_provider
            } = req.body;

            // verificam ca trip-ul apartine userului
            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Trip not found.' });
            }

            const objective = await Objective.create({
                id_trip: tripId,
                id_trip_day: null, //neatribuit initial
                id_category,
                title,
                description,
                coord_lat,
                coord_lng,
                address,
                source_type: source_type || 'MANUAL',
                external_place_id,
                external_provider,
                position_in_day: null
            });

            return res.status(201).json({
                message: 'Objective created successfully.',
                data: objective
            });

        } catch (error) {
            console.error('Create objective error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },

    // MOVE - drag&drop
    // PATCH /api/objectives/:id/move
    moveObjective: async (req, res) => {
        try {
            const { id } = req.params;
            const { id_trip_day: newDayId, position_in_day: newPosition } = req.body;

            const objective = await Objective.findByPk(id, {
                include: {
                    model: Trip
                }
            });

            if (!objective) {
                return res.status(404).json({ message: 'Objective not found.' });
            }

            if (objective.Trip?.id_user !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden.' });
            }

            const oldDayId = objective.id_trip_day;
            const oldPosition = objective.position_in_day;

            //mutare intre zile
            if (oldDayId !== newDayId) {
                //rearanjez ziua veche
                if (oldDayId && oldPosition) {
                    await Objective.increment(
                        { position_in_day: -1 },
                        {
                            where: {
                                id_trip_day: oldDayId,
                                position_in_day: { [Op.gt]: oldPosition }
                            }
                        }
                    );
                }

                // fac loc in ziua noua
                if (newDayId && newPosition) {
                    await Objective.increment(
                        { position_in_day: 1 },
                        {
                            where: {
                                id_trip_day: newDayId,
                                position_in_day: { [Op.gte]: newPosition }
                            }
                        }
                    );
                }

                await objective.update({
                    id_trip_day: newDayId || null,
                    position_in_day: newDayId ? newPosition : null
                });

            }

            // mutare in aceeasi zi
            else if (oldDayId && oldPosition && newPosition) {
                if (newPosition < oldPosition) {
                    // mutare in sus
                    await Objective.increment(
                        { position_in_day: 1 },
                        {
                            where: {
                                id_trip_day: oldDayId,
                                position_in_day: {
                                    [Op.gte]: newPosition,
                                    [Op.lt]: oldPosition
                                }
                            }
                        }
                    );
                }

                if (newPosition > oldPosition) {
                    // mutare in jos
                    await Objective.increment(
                        { position_in_day: -1 },
                        {
                            where: {
                                id_trip_day: oldDayId,
                                position_in_day: {
                                    [Op.lte]: newPosition,
                                    [Op.gt]: oldPosition
                                }
                            }
                        }
                    );
                }

                await objective.update({
                    position_in_day: newPosition
                });
            }

            return res.status(200).json({
                message: 'Objective moved successfully.'
            });

        } catch (error) {
            console.error('Move objective error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },


    // UPDATE detalii (ora, descriere)
    // PUT /api/objectives/:id
    updateObjective: async (req, res) => {
        try {
            const { id } = req.params;
            const { planned_time, description } = req.body;

            const objective = await Objective.findByPk(id, {
                include: {
                    model: Trip
                }
            });

            if (!objective) {
                return res.status(404).json({ message: 'Objective not found.' });
            }

            if (objective.Trip?.id_user !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden.' });
            }

            await objective.update({
                planned_time,
                description
            });

            return res.status(200).json({
                message: 'Objective updated successfully.'
            });

        } catch (error) {
            console.error('Update objective error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },

    // DELETE /api/objectives/:id
    deleteObjective: async (req, res) => {
        try {
            const { id } = req.params;

            const objective = await Objective.findByPk(id, {
                include: {
                    model: Trip
                }
            });

            if (!objective) {
                return res.status(404).json({ message: 'Objective not found.' });
            }

            if (objective.Trip?.id_user !== req.user.id) {
                return res.status(403).json({ message: 'Forbidden.' });
            }

            const dayId = objective.id_trip_day;

            await objective.destroy();

            if (dayId) {
                await reorderObjectives(dayId);
            }

            return res.status(200).json({
                message: 'Objective deleted successfully.'
            });

        } catch (error) {
            console.error('Delete objective error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    }

};
