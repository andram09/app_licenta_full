import { Trip, TripDay, Objective } from '../models/index.js';
import { callTspOptimizer } from '../services/tspService.js';
import sequelize from '../config/db.config.js';

const SUPPORTED_MODES = ['WALKING', 'DRIVING', 'CYCLING'];

export const optimizeRouteController = {

    optimizeDayRoute: async (req, res) => {
        const transaction = await sequelize.transaction();

        try {
            const { id: tripId, dayId } = req.params;
            const mode = req.body?.mode ?? 'WALKING';
            const startPoint = req.body?.start_point ?? null;

            if (!SUPPORTED_MODES.includes(mode)) {
                await transaction.rollback();
                return res.status(400).json({
                    message: `Invalid mode. Supported: ${SUPPORTED_MODES.join(', ')}.`
                });
            }

            // trip-ul apartine user-ului curent
            const trip = await Trip.findOne({
                where: { id_trip: tripId, id_user: req.user.id },
                transaction,
            });
            if (!trip) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Trip not found.' });
            }

            //ziua apartine trip-ului
            const tripDay = await TripDay.findOne({
                where: { id_day: dayId, id_trip: tripId },
                transaction,
            });
            if (!tripDay) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Trip day not found.' });
            }

            // incarc obiectivele cu coordonate valide
            const allObjectives = await Objective.findAll({
                where: { id_trip_day: dayId },
                order: [['position_in_day', 'ASC']],
                transaction,
            });

            const objectives = allObjectives.filter(
                (o) => o.coord_lat != null && o.coord_lng != null
            );

            if (objectives.length < 2) {
                await transaction.rollback();
                return res.status(422).json({
                    message: 'At least 2 objectives with coordinates are required.',
                });
            }

            const points = objectives.map((o) => ({
                id: o.id_objective,
                lat: parseFloat(o.coord_lat),
                lng: parseFloat(o.coord_lng),
            }));

            // apel microserviciu Python
            let optimizationResult;
            try {
                optimizationResult = await callTspOptimizer(points, null, startPoint);
            } catch (tspError) {
                await transaction.rollback();
                return res.status(503).json({
                    message: 'Route optimization service is currently unavailable.',
                });
            }

            // salvarea noii ordini in baza de date
            for (let i = 0; i < optimizationResult.orderedIds.length; i++) {
                const objId = optimizationResult.orderedIds[i];
                await Objective.update(
                    { position_in_day: i + 1 },
                    { where: { id_objective: objId }, transaction }
                );
            }

            await transaction.commit();

            //rasp final
            const orderedObjectives = optimizationResult.orderedIds.map((objId, idx) => {
                const obj = objectives.find((o) => o.id_objective === objId);
                return {
                    id_objective: obj.id_objective,
                    title: obj.title,
                    coord_lat: parseFloat(obj.coord_lat),
                    coord_lng: parseFloat(obj.coord_lng),
                    position_in_day: idx + 1,
                };
            });

            return res.status(200).json({
                message: 'Route optimized successfully.',
                data: {
                    orderedObjectives,
                    totalDistanceKm: optimizationResult.totalDistanceKm,
                    algorithm: optimizationResult.algorithm,
                    executionTimeMs: optimizationResult.executionTimeMs,
                    distanceSource: 'haversine',
                },
            });

        } catch (error) {
            await transaction.rollback();
            console.error('Optimize route error:', error);
            return res.status(500).json({ message: 'Something went wrong.' });
        }
    },
};