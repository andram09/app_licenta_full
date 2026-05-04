import axios from 'axios';

const TSP_SERVICE_URL = process.env.TSP_SERVICE_URL || 'http://localhost:5001';

export async function callTspOptimizer(objectives, startPoint = null) {
    const payload = {
        objectives: objectives.map((o) => ({
            id: o.id,
            lat: Number(o.lat),
            lng: Number(o.lng),
        })),
    };

    if (startPoint) {
        payload.start_point = {
            lat: Number(startPoint.lat),
            lng: Number(startPoint.lng)
        };
    }

    try {
        const response = await axios.post(`${TSP_SERVICE_URL}/optimize`, payload, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' },
        });

        const data = response.data;
        return {
            orderedIds: data.ordered_ids,
            totalDistanceKm: data.total_distance_km,
            algorithm: data.algorithm,
            executionTimeMs: data.execution_time_ms,
        };

    } catch (error) {
        console.error('TSP microservice error:', error.message);
        throw new Error('TSP optimization service unavailable');
    }
}

export async function checkTspServiceHealth() {
    try {
        const response = await axios.get(`${TSP_SERVICE_URL}/health`, { timeout: 3000 });
        if (response.data?.status === 'ok') {
            console.info('TSP service is healthy and reachable.');
            return true;
        }
        return false;
    } catch {
        console.warn('TSP service is not reachable. Route optimization will be unavailable.');
        return false;
    }
}