import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { alertApi } from '../services/productApi';
import { StockAlert } from '../types/product';
import {
    ArrowLeft, AlertTriangle, AlertOctagon, TrendingUp,
    CheckCircle2, Clock, ShieldCheck, RefreshCw, Filter,
    ChevronLeft, ChevronRight, Bell, Search,
    XCircle, Eye
} from 'lucide-react';

type AlertStatusFilter = 'ALL' | 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
type AlertTypeFilter = 'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';

const PAGE_SIZE = 12;

const alertTypeConfig = {
    LOW_STOCK: {
        label: 'Low Stock',
        icon: AlertTriangle,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-800',
        dot: 'bg-amber-500',
    },
    OUT_OF_STOCK: {
        label: 'Out of Stock',
        icon: AlertOctagon,
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        badge: 'bg-red-100 text-red-800',
        dot: 'bg-red-500',
    },
    OVERSTOCK: {
        label: 'Overstock',
        icon: TrendingUp,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        badge: 'bg-blue-100 text-blue-800',
        dot: 'bg-blue-500',
    },
};

const alertStatusConfig = {
    PENDING: { label: 'Pending', badge: 'bg-orange-100 text-orange-800 border border-orange-200', icon: Clock },
    ACKNOWLEDGED: { label: 'Acknowledged', badge: 'bg-blue-100 text-blue-800 border border-blue-200', icon: Eye },
    RESOLVED: { label: 'Resolved', badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200', icon: CheckCircle2 },
};

function timeAgo(dateStr: string): string {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export default function StockAlerts() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { subscribe } = useWebSocket();

    const [alerts, setAlerts] = useState<StockAlert[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [acknowledging, setAcknowledging] = useState<number | null>(null);

    const [statusFilter, setStatusFilter] = useState<AlertStatusFilter>('ALL');
    const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>('ALL');
    const [search, setSearch] = useState('');

    // Summary counts
    const [summary, setSummary] = useState({ pending: 0, lowStock: 0, outOfStock: 0, overstock: 0 });

    const canAcknowledge = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const fetchAlerts = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            let res;
            if (statusFilter !== 'ALL') {
                res = await alertApi.getByStatus(statusFilter, page, PAGE_SIZE);
                setAlerts(res.data.content);
                setTotalPages(res.data.totalPages);
                setTotalElements(res.data.totalElements);
            } else if (typeFilter !== 'ALL') {
                res = await alertApi.getByType(typeFilter, page, PAGE_SIZE);
                setAlerts(res.data.content);
                setTotalPages(res.data.totalPages);
                setTotalElements(res.data.totalElements);
            } else {
                res = await alertApi.getAll(page, PAGE_SIZE);
                setAlerts(res.data.content);
                setTotalPages(res.data.totalPages);
                setTotalElements(res.data.totalElements);
            }

            // Also refresh summary
            const sumRes = await alertApi.getSummary();
            setSummary({
                pending: sumRes.data.pendingCount,
                lowStock: sumRes.data.lowStockCount,
                outOfStock: sumRes.data.outOfStockCount,
                overstock: sumRes.data.overstockCount,
            });
        } catch (err) {
            console.error('Failed to fetch alerts', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [statusFilter, typeFilter, page]);

    useEffect(() => {
        setPage(0);
    }, [statusFilter, typeFilter]);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // Real-time: refresh on any alert event
    useEffect(() => {
        const unsub = subscribe('/topic/alerts', () => fetchAlerts(true));
        return unsub;
    }, [subscribe, fetchAlerts]);

    const handleAcknowledge = async (id: number) => {
        setAcknowledging(id);
        try {
            await alertApi.acknowledge(id);
            await fetchAlerts(true);
        } catch (err) {
            console.error('Failed to acknowledge', err);
        } finally {
            setAcknowledging(null);
        }
    };

    // Client-side search filter
    const displayed = alerts.filter(a =>
        !search ||
        a.productName.toLowerCase().includes(search.toLowerCase()) ||
        a.productSku.toLowerCase().includes(search.toLowerCase())
    );

    const StatusTab = ({ value, label, count }: { value: AlertStatusFilter; label: string; count?: number }) => (
        <button
            onClick={() => setStatusFilter(value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${statusFilter === value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-700'
                }`}
        >
            {label}
            {count !== undefined && count > 0 && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${statusFilter === value ? 'bg-white/20' : 'bg-indigo-100 text-indigo-700'}`}>
                    {count}
                </span>
            )}
        </button>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* ── Header ── */}
                <div className="flex items-start justify-between">
                    <div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md">
                                <Bell className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Stock Alerts</h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    Real-time low stock, out-of-stock &amp; overstock notifications
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchAlerts(true)}
                        disabled={refreshing || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all shadow-sm text-sm font-medium"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>

                {/* ── Summary chips ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: 'Pending', value: summary.pending, icon: Clock, color: 'from-orange-400 to-amber-500', text: 'text-orange-600', light: 'bg-orange-50 border-orange-200' },
                        { label: 'Low Stock', value: summary.lowStock, icon: AlertTriangle, color: 'from-amber-400 to-yellow-500', text: 'text-amber-600', light: 'bg-amber-50 border-amber-200' },
                        { label: 'Out of Stock', value: summary.outOfStock, icon: XCircle, color: 'from-red-500 to-rose-600', text: 'text-red-600', light: 'bg-red-50 border-red-200' },
                        { label: 'Overstock', value: summary.overstock, icon: TrendingUp, color: 'from-blue-500 to-indigo-600', text: 'text-blue-600', light: 'bg-blue-50 border-blue-200' },
                    ].map(stat => (
                        <div key={stat.label} className={`bg-white border ${stat.light} rounded-2xl p-4 flex items-center gap-4 shadow-sm`}>
                            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center flex-shrink-0 shadow`}>
                                <stat.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
                                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Filters bar ── */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3">
                    {/* Status tabs */}
                    <div className="flex flex-wrap gap-2">
                        <StatusTab value="ALL" label="All Alerts" />
                        <StatusTab value="PENDING" label="Pending" count={summary.pending} />
                        <StatusTab value="ACKNOWLEDGED" label="Acknowledged" />
                        <StatusTab value="RESOLVED" label="Resolved" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by product name or SKU…"
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Type filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={typeFilter}
                                onChange={e => setTypeFilter(e.target.value as AlertTypeFilter)}
                                className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white appearance-none"
                            >
                                <option value="ALL">All Types</option>
                                <option value="LOW_STOCK">Low Stock</option>
                                <option value="OUT_OF_STOCK">Out of Stock</option>
                                <option value="OVERSTOCK">Overstock</option>
                            </select>
                        </div>

                        <span className="self-center text-xs text-gray-400 whitespace-nowrap">
                            {totalElements} total alerts
                        </span>
                    </div>
                </div>

                {/* ── Alert Cards Grid ── */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4" />
                            <p className="text-sm text-gray-500">Loading alerts…</p>
                        </div>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">All Clear!</h3>
                        <p className="text-sm text-gray-400 mt-1">
                            {search ? 'No alerts match your search.' : 'No alerts found for the selected filters.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {displayed.map(alert => {
                            const typeConf = alertTypeConfig[alert.alertType];
                            const statusConf = alertStatusConfig[alert.alertStatus];
                            const TypeIcon = typeConf.icon;
                            const StatusIcon = statusConf.icon;
                            const isPending = alert.alertStatus === 'PENDING';

                            return (
                                <div
                                    key={alert.id}
                                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${isPending ? `border-l-4 ${alert.alertType === 'OUT_OF_STOCK' ? 'border-l-red-500 border-red-200' : alert.alertType === 'LOW_STOCK' ? 'border-l-amber-500 border-amber-200' : 'border-l-blue-500 border-blue-200'}` : 'border-gray-200'}`}
                                >
                                    {/* Card header */}
                                    <div className={`px-4 pt-4 pb-3 ${typeConf.bg}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={`p-1.5 rounded-lg bg-white shadow-sm flex-shrink-0`}>
                                                    <TypeIcon className={`w-4 h-4 ${typeConf.color}`} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate text-sm">{alert.productName}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{alert.productSku}</p>
                                                </div>
                                            </div>
                                            {/* Alert type badge */}
                                            <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${typeConf.badge} ${typeConf.border}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${typeConf.dot}`} />
                                                {typeConf.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card body */}
                                    <div className="px-4 py-3 space-y-3">
                                        {/* Stock info */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <p className={`text-2xl font-bold ${alert.alertType === 'OUT_OF_STOCK' ? 'text-red-600' : alert.alertType === 'LOW_STOCK' ? 'text-amber-600' : 'text-blue-600'}`}>
                                                        {alert.currentStock}
                                                    </p>
                                                    <p className="text-xs text-gray-400">Current</p>
                                                </div>
                                                <div className="text-gray-300 text-lg font-light">/</div>
                                                <div className="text-center">
                                                    <p className="text-xl font-semibold text-gray-600">{alert.thresholdValue}</p>
                                                    <p className="text-xs text-gray-400">Threshold</p>
                                                </div>
                                            </div>

                                            {/* Status badge */}
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold ${statusConf.badge}`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {statusConf.label}
                                            </span>
                                        </div>

                                        {/* Progress bar: currentStock vs threshold */}
                                        {alert.alertType !== 'OVERSTOCK' && alert.thresholdValue > 0 && (
                                            <div>
                                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${alert.alertType === 'OUT_OF_STOCK' ? 'bg-red-500' : 'bg-amber-500'}`}
                                                        style={{ width: `${Math.min(100, (alert.currentStock / (alert.thresholdValue * 2)) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Meta row */}
                                        <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {timeAgo(alert.createdAt)}
                                            </span>
                                            {alert.acknowledgedByUsername && (
                                                <span className="flex items-center gap-1 text-blue-500">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    @{alert.acknowledgedByUsername}
                                                </span>
                                            )}
                                        </div>

                                        {/* Resolved timestamp banner */}
                                        {alert.alertStatus === 'RESOLVED' && alert.resolvedAt && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
                                                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                                                <span>Restocked &amp; resolved <strong>{timeAgo(alert.resolvedAt)}</strong></span>
                                                <span className="ml-auto text-emerald-400 font-normal">
                                                    {new Date(alert.resolvedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card footer — action */}
                                    {canAcknowledge && isPending && (
                                        <div className="px-4 pb-4">
                                            <button
                                                onClick={() => handleAcknowledge(alert.id)}
                                                disabled={acknowledging === alert.id}
                                                id={`ack-alert-${alert.id}`}
                                                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-60 shadow-sm hover:shadow"
                                            >
                                                {acknowledging === alert.id ? (
                                                    <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Acknowledging…</>
                                                ) : (
                                                    <><ShieldCheck className="w-3.5 h-3.5" /> Acknowledge Alert</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                    {!canAcknowledge && isPending && (
                                        <div className="px-4 pb-4">
                                            <div className="flex items-center gap-2 py-2 px-3 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-600">
                                                <Clock className="w-3.5 h-3.5" />
                                                Awaiting manager/admin acknowledgement
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Pagination ── */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
                        <p className="text-sm text-gray-500">
                            Page <span className="font-semibold text-gray-800">{page + 1}</span> of{' '}
                            <span className="font-semibold text-gray-800">{totalPages}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" /> Prev
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Role hint for Staff ── */}
                {user?.role === 'STAFF' && !loading && summary.pending > 0 && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">Action Required by Your Manager</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                There {summary.pending === 1 ? 'is' : 'are'} <strong>{summary.pending}</strong> pending alert{summary.pending !== 1 ? 's' : ''}.
                                Please notify your manager so they can acknowledge and reorder stock.
                            </p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
