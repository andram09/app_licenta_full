import { useState, useCallback } from 'react';
import { api } from '../api/axios';

export function useRouteOptimizer(tripId) {
    const [routeData, setRouteData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const optimize = useCallback(async (dayId, startPoint = null) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post(
                `/trips/${tripId}/days/${dayId}/optimize`,
                { start_point: startPoint }
            );
            const data = response.data.data;
            setRouteData(data);
            return data;
        } catch (err) {
            const message = err?.response?.data?.message ?? 'Route optimization failed.';
            setError(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [tripId]);

    const clearRoute = useCallback(() => {
        setRouteData(null);
        setError(null);
    }, []);

    return { optimize, clearRoute, routeData, isLoading, error };
}