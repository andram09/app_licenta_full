import { Objective, TripDay, Trip } from '../models/index.js';
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

    // GET /trips/:id/objectives/unassigned
    getUnassignedObjectives: async (req, res) => {
        try {
            const { id } = req.params;

            const trip = await Trip.findOne({
                where: { id_trip: id, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Călătoria nu a fost găsită.' });
            }

            const objectives = await Objective.findAll({
                where: {
                    id_trip: id,
                    id_trip_day: null
                },
                order: [['createdAt', 'DESC']]
            });

            return res.status(200).json({ data: objectives });

        } catch (error) {
            console.error('Get unassigned objectives error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    },

    // POST /trips/:id/objectives/manual
    createObjectiveManual: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, description, coord_lat, coord_lng, address, planned_time } = req.body;

            if (!title || title.trim().length < 2) {
                return res.status(400).json({
                    message: "Titlul trebuie să aibă cel puțin 2 caractere."
                });
            }

            if (coord_lat !== undefined) {
                const lat = Number(coord_lat);
                if (isNaN(lat) || lat < -90 || lat > 90) {
                    return res.status(400).json({
                        message: "Valoare invalidă pentru latitudine."
                    });
                }
            }

            if (coord_lng !== undefined) {
                const lng = Number(coord_lng);
                if (isNaN(lng) || lng < -180 || lng > 180) {
                    return res.status(400).json({
                        message: "Valoare invalidă pentru longitudine."
                    });
                }
            }

            const trip = await Trip.findOne({
                where: { id_trip: id, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Călătoria nu a fost găsită.' });
            }

            const objective = await Objective.create({
                id_trip: id,
                id_trip_day: null,
                title: title.trim(),
                description,
                coord_lat: coord_lat ? Number(coord_lat) : null,
                coord_lng: coord_lng ? Number(coord_lng) : null,
                address,
                source_type: "MANUAL",
                external_place_id: null,
                external_provider: null,
                planned_time: planned_time || null,
                position_in_day: null
            });

            return res.status(201).json({
                message: 'Obiectivul a fost creat cu succes.',
                data: objective
            });

        } catch (error) {
            console.error('Create objective error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    },

    // PATCH /objectives/:id/move
    moveObjective: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { id_trip_day: newDayId, position_in_day: newPosition } = req.body;

            const objective = await Objective.findByPk(id, {
                include: { model: Trip },
                transaction
            });

            if (!objective) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Obiectivul nu a fost găsit.' });
            }

            if (objective.Trip?.id_user !== req.user.id) {
                await transaction.rollback();
                return res.status(403).json({ message: 'Acces interzis.' });
            }

            const oldDayId = objective.id_trip_day;
            const oldPosition = objective.position_in_day;

            // mutare intre zile
            if (oldDayId !== newDayId) {
                // rearanjez ziua veche
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
                }, { transaction });
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
                }, { transaction });
            }

            await transaction.commit();

            return res.status(200).json({
                message: 'Obiectivul a fost mutat cu succes.'
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Move objective error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    },

    // PUT /objectives/:id
    updateObjective: async (req, res) => {
        try {
            const { id } = req.params;
            const { planned_time, description } = req.body;

            const objective = await Objective.findByPk(id, {
                include: { model: Trip }
            });

            if (!objective) {
                return res.status(404).json({ message: 'Obiectivul nu a fost găsit.' });
            }

            if (objective.Trip?.id_user !== req.user.id) {
                return res.status(403).json({ message: 'Acces interzis.' });
            }

            await objective.update({ planned_time, description });

            return res.status(200).json({
                message: 'Obiectivul a fost actualizat cu succes.'
            });

        } catch (error) {
            console.error('Update objective error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    },

    // DELETE /objectives/:id
    deleteObjective: async (req, res) => {
        try {
            const { id } = req.params;

            const objective = await Objective.findByPk(id, {
                include: { model: Trip }
            });

            if (!objective) {
                return res.status(404).json({ message: 'Obiectivul nu a fost găsit.' });
            }

            if (objective.Trip?.id_user !== req.user.id) {
                return res.status(403).json({ message: 'Acces interzis.' });
            }

            const dayId = objective.id_trip_day;

            await objective.destroy();

            if (dayId) {
                await reorderObjectives(dayId);
            }

            return res.status(200).json({
                message: 'Obiectivul a fost șters cu succes.'
            });

        } catch (error) {
            console.error('Delete objective error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    },

    // POST /trips/:id/objectives/from-api
    createFromApi: async (req, res) => {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const {
                title,
                description,
                coord_lat,
                coord_lng,
                address,
                planned_time,
                external_place_id,
                external_provider
            } = req.body;

            if (!title || title.trim().length < 2) {
                await transaction.rollback();
                return res.status(400).json({ message: "Titlul trebuie să aibă cel puțin 2 caractere." });
            }

            if (!external_place_id || !external_provider) {
                await transaction.rollback();
                return res.status(400).json({ message: "Missing external_place_id or external_provider." });
            }

            if (coord_lat !== undefined) {
                const lat = Number(coord_lat);
                if (isNaN(lat) || lat < -90 || lat > 90) {
                    await transaction.rollback();
                    return res.status(400).json({ message: "Valoare invalidă pentru latitudine." });
                }
            }

            if (coord_lng !== undefined) {
                const lng = Number(coord_lng);
                if (isNaN(lng) || lng < -180 || lng > 180) {
                    await transaction.rollback();
                    return res.status(400).json({ message: "Valoare invalidă pentru longitudine." });
                }
            }

            const trip = await Trip.findOne({
                where: { id_trip: id, id_user: req.user.id },
                transaction
            });

            if (!trip) {
                await transaction.rollback();
                return res.status(404).json({ message: "Călătoria nu a fost găsită." });
            }

            // verificam sa nu adaugam acelasi obiectiv de 2 ori
            const existing = await Objective.findOne({
                where: {
                    id_trip: id,
                    external_provider,
                    external_place_id
                },
                transaction
            });

            if (existing) {
                await transaction.rollback();
                return res.status(409).json({
                    message: "Acest loc este deja adăugat în călătoria ta.",
                    data: { id_objective: existing.id_objective }
                });
            }

            const created = await Objective.create(
                {
                    id_trip: id,
                    id_trip_day: null,
                    title: title.trim(),
                    description: description ?? null,
                    coord_lat: coord_lat !== undefined && coord_lat !== null ? Number(coord_lat) : null,
                    coord_lng: coord_lng !== undefined && coord_lng !== null ? Number(coord_lng) : null,
                    address: address ?? null,
                    planned_time: planned_time ?? null,
                    position_in_day: null,
                    source_type: "API",
                    external_place_id,
                    external_provider
                },
                { transaction }
            );

            await transaction.commit();

            return res.status(201).json({
                message: "Obiectivul a fost adăugat în călătorie.",
                data: { id_objective: created.id_objective }
            });

        } catch (error) {
            await transaction.rollback();
            console.error("Create objective from API error:", error);
            return res.status(500).json({ message: "A apărut o eroare. Încearcă din nou." });
        }
    },

    // PATCH /objectives/bulk-addresses
    bulkSaveAddresses: async (req, res) => {
        try {
            const { addresses } = req.body; // [{ id_objective, address }]

            if (!Array.isArray(addresses) || addresses.length === 0) {
                return res.status(400).json({ message: "addresses must be a non-empty array." });
            }

            const ids = addresses.map((a) => a.id_objective);

            // verificam ca toate obiectivele apartin utilizatorului curent
            const objectives = await Objective.findAll({
                where: { id_objective: ids },
                include: [{ model: Trip, attributes: ["id_user"] }],
            });

            const forbidden = objectives.some((o) => o.Trip?.id_user !== req.user.id);
            if (forbidden || objectives.length !== ids.length) {
                return res.status(403).json({ message: "Acces interzis." });
            }

            await Promise.all(
                addresses.map(({ id_objective, address }) =>
                    Objective.update({ address }, { where: { id_objective } })
                )
            );

            return res.status(200).json({ message: "Adresele au fost salvate." });
        } catch (error) {
            console.error("Bulk save addresses error:", error);
            return res.status(500).json({ message: "A apărut o eroare. Încearcă din nou." });
        }
    },

    // GET /trips/:id/objectives
    getTripObjectives: async (req, res) => {
        try {
            const { id } = req.params;

            const trip = await Trip.findOne({
                where: { id_trip: id, id_user: req.user.id }
            });

            if (!trip) {
                return res.status(404).json({ message: 'Călătoria nu a fost găsită.' });
            }

            const objectives = await Objective.findAll({
                where: { id_trip: id },
                order: [['createdAt', 'DESC']]
            });

            return res.status(200).json({ data: objectives });

        } catch (error) {
            console.error('Get trip objectives error:', error);
            return res.status(500).json({ message: 'A apărut o eroare. Încearcă din nou.' });
        }
    }

};