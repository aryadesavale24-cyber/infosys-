import api from './api';
import { AnalyticsSummaryDTO, AnalyticsPeriod } from '../types/analytics';

export const analyticsApi = {
    /**
     * Fetch full analytics summary.
     * @param from   ISO date string (YYYY-MM-DD)
     * @param to     ISO date string (YYYY-MM-DD)
     * @param period DAILY | WEEKLY | MONTHLY
     */
    getSummary: (from: string, to: string, period: AnalyticsPeriod = 'DAILY') =>
        api.get<AnalyticsSummaryDTO>('/analytics/summary', {
            params: { from, to, period },
        }),
};
