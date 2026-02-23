import { Objective, TripDay, Trip, Category } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from "../config/db.config.js"

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

    // GET /objectives/trip/:tripId/unassigned - Obiective neatribuite
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
    // POST /trips/:tripId/objectives
    createObjective: async (req, res) => {
        try {
            const { tripId } = req.params;
            const { id_category, title, description, coord_lat, coord_lng, address, source_type, external_place_id, external_provider } = req.body;

            //validations
            if (!title || title.trim().length < 2) {
                return res.status(400).json({
                    message: "Title must contain at least 2 characters."
                });
            }

            const ALLOWED_SOURCES = ["MANUAL", "API"];
            if (source_type && !ALLOWED_SOURCES.includes(source_type)) {
                return res.status(400).json({
                    message: "Invalid source type."
                });
            }

            if (source_type === "API" && !external_place_id) {
                return res.status(400).json({
                    message: "External place id is required for API objectives."
                });
            }

            if (coord_lat !== undefined) {
                const lat = Number(coord_lat);
                if (isNaN(lat) || lat < -90 || lat > 90) {
                    return res.status(400).json({
                        message: "Invalid latitude value."
                    });
                }
            }

            if (coord_lng !== undefined) {
                const lng = Number(coord_lng);
                if (isNaN(lng) || lng < -180 || lng > 180) {
                    return res.status(400).json({
                        message: "Invalid longitude value."
                    });
                }
            }

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
                title: title.trim(),
                description,
                coord_lat: coord_lat ? Number(coord_lat):null,
                coord_lng: coord_lng ? Number(coord_lng):null,
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
    // PATCH /objectives/:id/move
    moveObjective: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { id_trip_day: newDayId, position_in_day: newPosition } = req.body;

            const objective = await Objective.findByPk(id, {
                include: {
                    model: Trip
                },
                transaction
            });

            if (!objective) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Objective not found.' });
            }

            if (objective.Trip?.id_user !== req.user.id) {
                await transaction.rollback();
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
                            },
                            transaction
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
                            },
                            transaction
                        }
                    );
                }

                await objective.update({
                    id_trip_day: newDayId || null,
                    position_in_day: newDayId ? newPosition : null
                }, {transaction});

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
                            },
                            transaction
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
                            },
                            transaction
                        }
                    );
                }

                await objective.update({
                    position_in_day: newPosition
                }, {transaction});
            }
            await transaction.commit();

            return res.status(200).json({
                message: 'Objective moved successfully.'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Move objective error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },


    // UPDATE detalii (ora, descriere)
    // PUT /objectives/:id
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

    // DELETE /objectives/:id
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
