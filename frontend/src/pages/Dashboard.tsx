import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSessionMonitor } from '../hooks/useSessionMonitor';
import { useWebSocket } from '../hooks/useWebSocket';
import { productApi, stockApi, alertApi } from '../services/productApi';
import { managerAssignmentApi } from '../services/managerAssignmentApi';
import { StockAlert } from '../types/product';
import {
    LogOut, Package, Users, BarChart3, Settings,
    ShoppingCart, TrendingUp, AlertTriangle, TrendingDown,
    Plus, Eye, Building2, ShieldCheck, RefreshCw, ChevronDown, History, RotateCcw,
    Bell, AlertOctagon, Zap,
} from 'lucide-react';
import { Role } from '../types';

interface DashboardStats {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockValue: number;
    todayTransactions: number;
}

interface RecentActivity {
    id: number;
    message: string;
    time: string;
    type: 'success' | 'warning' | 'info';
}

const Dashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [stats, setStats] = useState<DashboardStats>({
        totalProducts: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        totalStockValue: 0,
        todayTransactions: 0,
    });
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
    const [pendingAlerts, setPendingAlerts] = useState<StockAlert[]>([]);
    const [acknowledgingId, setAcknowledgingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = React.useRef<HTMLDivElement>(null);

    // Accordion: only one group open at a time
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const toggleGroup = (key: string) =>
        setOpenGroup(prev => (prev === key ? null : key));

    useSessionMonitor(3000);

    useEffect(() => { fetchDashboardData(); }, []);

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Real-time: re-fetch when any domain event arrives
    const { subscribe, connected } = useWebSocket();
    useEffect(() => {
        const unsubs = [
            subscribe('/topic/products', () => fetchDashboardData()),
            subscribe('/topic/stock', () => fetchDashboardData()),
            subscribe('/topic/approvals', () => fetchDashboardData()),
            subscribe('/topic/users', () => fetchDashboardData()),
            subscribe('/topic/suppliers', () => fetchDashboardData()),
            subscribe('/topic/alerts', () => fetchDashboardData()),
        ];
        return () => unsubs.forEach(u => u());
    }, [subscribe]);

    const fetchDashboardData = async (isManualRefresh = false) => {
        try {
            if (isManualRefresh) setRefreshing(true);
            else setLoading(true);

            const isStaff = user?.role === 'STAFF';

            // Fetch all allowed endpoints in parallel; STAFF cannot access /stock/transactions
            const [productsRes, lowStockRes, outOfStockRes, alertsRes, txRes] =
                await Promise.all([
                    productApi.getAll(0, 1000).catch(() => ({ data: { content: [], totalElements: 0, totalPages: 0 } })),
                    productApi.getLowStock().catch(() => ({ data: [] })),
                    productApi.getOutOfStock().catch(() => ({ data: [] })),
                    alertApi.getPending().catch(() => ({ data: [] })),
                    isStaff
                        ? stockApi.getMyTransactions(0, 10).catch(() => ({ data: { content: [], totalElements: 0, totalPages: 0 } }))
                        : stockApi.getAllTransactions(0, 10).catch(() => ({ data: { content: [], totalElements: 0, totalPages: 0 } })),
                ]);

            const products = productsRes.data.content;
            const lowStockProducts = lowStockRes.data;
            const outOfStockProducts = outOfStockRes.data;
            const pendingAlerts: StockAlert[] = alertsRes.data;
            const recentTx = txRes.data.content;

            // Store pending alerts for inline display
            setPendingAlerts(pendingAlerts);

            let scopedStockValue = 0;
            let scopedTotalProducts = products.length;

            if (user?.role === 'MANAGER') {
                try {
                    const myProdsRes = await managerAssignmentApi.getMyProducts();
                    const myProds = myProdsRes.data;
                    scopedStockValue = myProds.reduce(
                        (sum, p) => sum + (p.currentStock ?? 0) * (p.costPrice ?? 0), 0
                    );
                    scopedTotalProducts = myProds.length;
                } catch {
                    scopedStockValue = 0;
                }
            } else {
                scopedStockValue = products.reduce((sum, p) => sum + p.stockValue, 0);
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTransactions = recentTx.filter(
                t => new Date(t.transactionDate) >= today
            );

            setStats({
                totalProducts: scopedTotalProducts,
                lowStockCount: lowStockProducts.length,
                outOfStockCount: outOfStockProducts.length,
                totalStockValue: scopedStockValue,
                todayTransactions: todayTransactions.length,
            });

            const activities: RecentActivity[] = [];
            recentTx.slice(0, 3).forEach((tx, i) =>
                activities.push({
                    id: i,
                    message: `${tx.transactionType}: ${tx.productName} (${tx.quantity} units)`,
                    time: getTimeAgo(new Date(tx.transactionDate)),
                    type: tx.transactionType === 'SALE' ? 'success' : 'info',
                })
            );
            pendingAlerts.slice(0, 2).forEach((al, i) =>
                activities.push({
                    id: 1000 + i,
                    message: `${al.alertType.replace('_', ' ')}: ${al.productName}`,
                    time: getTimeAgo(new Date(al.createdAt)),
                    type: 'warning',
                })
            );

            setRecentActivities(activities.slice(0, 5));
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const getTimeAgo = (date: Date): string => {
        const s = Math.floor((Date.now() - date.getTime()) / 1000);
        if (s < 60) return 'Just now';
        if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
        if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
        return `${Math.floor(s / 86400)} days ago`;
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const getRoleBadgeClass = (role: Role) => {
        switch (role) {
            case Role.ADMIN: return 'badge-admin';
            case Role.MANAGER: return 'badge-manager';
            case Role.STAFF: return 'badge-staff';
            default: return '';
        }
    };

    const productsRoute = user?.role === Role.MANAGER ? '/manager/my-products' : '/products';
    const txRoute = user?.role === Role.STAFF ? '/staff/my-transactions' : '/reports';

    const dashboardStats = [
        {
            label: user?.role === Role.MANAGER ? 'My Category Products' : 'Total Products',
            value: loading ? '…' : stats.totalProducts.toString(),
            icon: Package, color: 'bg-blue-500',
            onClick: () => navigate(productsRoute),
        },
        {
            label: 'Low Stock Items',
            value: loading ? '…' : stats.lowStockCount.toString(),
            icon: AlertTriangle, color: 'bg-red-500',
            onClick: () => navigate('/low-stock'),
        },
        {
            label: 'Transactions Today',
            value: loading ? '…' : stats.todayTransactions.toString(),
            icon: ShoppingCart, color: 'bg-green-500',
            onClick: () => {
                // Pre-fill today's date in Reports page if manager/admin
                navigate(txRoute, {
                    state: {
                        dateFrom: new Date().toISOString().split('T')[0],
                        dateTo: new Date().toISOString().split('T')[0]
                    }
                });
            },
        },
        {
            label: user?.role === Role.MANAGER ? 'My Category Stock Value' : 'Stock Value',
            value: loading ? '…' : `₹${stats.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
            icon: TrendingUp, color: 'bg-purple-500',
            onClick: () => navigate(productsRoute),
        },
    ];

    // ── Accordion group helper ───────────────────────────────────────────────
    const AccordionGroup = ({
        groupKey, label, icon: Icon, accentOpen, accentClosedBg, accentClosedText, accentHoverBg, borderColor, subIconColor, subHoverBg, subHoverText, subActions,
    }: {
        groupKey: string; label: string; icon: React.ElementType;
        accentOpen: string; accentClosedBg: string; accentClosedText: string; accentHoverBg: string;
        borderColor: string; subIconColor: string; subHoverBg: string; subHoverText: string;
        subActions: { label: string; icon: React.ElementType; onClick: () => void }[];
    }) => {
        const isOpen = openGroup === groupKey;
        return (
            <div className={`rounded-xl overflow-hidden border ${borderColor}`}>
                <button
                    onClick={() => toggleGroup(groupKey)}
                    className={`w-full flex items-center justify-between px-4 py-3 font-semibold text-sm transition-colors ${isOpen ? accentOpen : `${accentClosedBg} ${accentClosedText} ${accentHoverBg}`
                        }`}
                >
                    <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {label}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                    <div className="bg-white divide-y divide-gray-50">
                        {subActions.map(a => (
                            <button key={a.label} onClick={a.onClick}
                                className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 ${subHoverBg} ${subHoverText} transition-colors`}>
                                <a.icon className={`w-4 h-4 ${subIconColor} flex-shrink-0`} />
                                {a.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">

            {/* ── Header ──────────────────────────────────────────────── */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Electro-Logix</h1>
                                <p className="text-sm text-gray-500">Inventory Management System</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {lastRefreshed && (
                                <span className="hidden sm:block text-xs text-gray-400">
                                    Updated {getTimeAgo(lastRefreshed)}
                                </span>
                            )}
                            {/* Live WS indicator */}
                            <span
                                title={connected ? 'Live updates connected' : 'Connecting to live updates…'}
                                className="flex items-center gap-1 text-xs font-medium"
                            >
                                <span className={`relative flex h-2.5 w-2.5`}>
                                    {connected && (
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
                                </span>
                                <span className={`hidden sm:inline ${connected ? 'text-green-600' : 'text-gray-400'}`}>
                                    {connected ? 'Live' : 'Connecting…'}
                                </span>
                            </span>
                            <button
                                id="dashboard-refresh-btn"
                                onClick={() => fetchDashboardData(true)}
                                disabled={refreshing || loading}
                                title="Refresh dashboard data"
                                className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors text-sm font-medium"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
                                <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
                            </button>

                            {/* ── Notification Bell ── */}
                            <div className="relative" ref={notifRef}>
                                <button
                                    id="notif-bell-btn"
                                    onClick={() => setNotifOpen(o => !o)}
                                    title="Notifications"
                                    className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all ${notifOpen
                                        ? 'bg-amber-50 border-amber-300 text-amber-600'
                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600'
                                        }`}
                                >
                                    <Bell className="w-4 h-4" />
                                    {pendingAlerts.length > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                                            {pendingAlerts.length > 99 ? '99+' : pendingAlerts.length}
                                        </span>
                                    )}
                                </button>

                                {/* Dropdown panel */}
                                {notifOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50" style={{ maxHeight: '480px' }}>
                                        {/* Panel header */}
                                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                            <div className="flex items-center gap-2">
                                                <Bell className="w-4 h-4" />
                                                <span className="font-semibold text-sm">Notifications</span>
                                                {pendingAlerts.length > 0 && (
                                                    <span className="px-1.5 py-0.5 bg-white/25 text-white text-xs font-bold rounded-full">
                                                        {pendingAlerts.length} pending
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => { setNotifOpen(false); navigate('/alerts'); }}
                                                className="text-xs text-white/90 hover:text-white font-medium underline underline-offset-2"
                                            >
                                                View All
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
                                            {pendingAlerts.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                        <Bell className="w-5 h-5 text-gray-300" />
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-500">All clear!</p>
                                                    <p className="text-xs text-gray-400 mt-1">No pending stock alerts.</p>
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-gray-50">
                                                    {pendingAlerts.map(alert => {
                                                        const isOut = alert.alertType === 'OUT_OF_STOCK';
                                                        const isOver = alert.alertType === 'OVERSTOCK';
                                                        const NIcon = isOut ? AlertOctagon : isOver ? TrendingUp : AlertTriangle;
                                                        const iconColor = isOut ? 'text-red-500' : isOver ? 'text-blue-500' : 'text-amber-500';
                                                        const bgColor = isOut ? 'bg-red-50' : isOver ? 'bg-blue-50' : 'bg-amber-50';
                                                        const label = isOut ? 'Out of Stock' : isOver ? 'Overstock' : 'Low Stock';
                                                        return (
                                                            <li key={alert.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${bgColor}`}>
                                                                <div className="flex items-start gap-3">
                                                                    <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                                                                        <NIcon className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-semibold text-gray-900 truncate">{alert.productName}</p>
                                                                        <p className="text-xs text-gray-500 font-mono truncate">{alert.productSku}</p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className={`text-xs font-medium ${iconColor}`}>{label}</span>
                                                                            <span className="text-gray-300">·</span>
                                                                            <span className="text-xs text-gray-400">
                                                                                {alert.currentStock} / {alert.thresholdValue} units
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                setAcknowledgingId(alert.id);
                                                                                try {
                                                                                    await alertApi.acknowledge(alert.id);
                                                                                    await fetchDashboardData(true);
                                                                                } finally {
                                                                                    setAcknowledgingId(null);
                                                                                }
                                                                            }}
                                                                            disabled={acknowledgingId === alert.id}
                                                                            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all disabled:opacity-50"
                                                                        >
                                                                            {acknowledgingId === alert.id
                                                                                ? <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                                                                : <ShieldCheck className="w-3 h-3" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                                            <button
                                                onClick={() => { setNotifOpen(false); navigate('/low-stock'); }}
                                                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition-colors"
                                            >
                                                <AlertTriangle className="w-3.5 h-3.5" /> View Low Stock Products
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                                <span className={`badge ${getRoleBadgeClass(user?.role!)}`}>{user?.role}</span>
                            </div>
                            <button onClick={handleLogout} className="btn-secondary flex items-center gap-2">
                                <LogOut className="w-4 h-4" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main ────────────────────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Welcome */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Welcome back, {user?.fullName}!
                    </h2>
                    <p className="text-gray-600">Here's what's happening with your inventory today.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {dashboardStats.map((stat, i) => (
                        <div key={i}
                            className="card hover:shadow-md transition-shadow duration-200 cursor-pointer"
                            onClick={stat.onClick}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                </div>
                                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center`}>
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Low Stock Alert Panel ──────────────────────────── */}
                {!loading && pendingAlerts.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                <div className="relative">
                                    <Bell className="w-5 h-5 text-amber-500" />
                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                </div>
                                Stock Alerts
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                                    {pendingAlerts.length} Pending
                                </span>
                            </h3>
                            <button
                                onClick={() => navigate('/alerts')}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
                            >
                                View All <Eye className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                            {pendingAlerts.slice(0, 5).map(alert => {
                                const isOut = alert.alertType === 'OUT_OF_STOCK';
                                const isOver = alert.alertType === 'OVERSTOCK';
                                const AlertIcon = isOut ? AlertOctagon : isOver ? TrendingUp : AlertTriangle;
                                return (
                                    <div
                                        key={alert.id}
                                        className={`rounded-xl border p-3 flex flex-col gap-2 ${isOut
                                            ? 'bg-red-50 border-red-200'
                                            : isOver
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-amber-50 border-amber-200'
                                            }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <AlertIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isOut ? 'text-red-600' : isOver ? 'text-blue-600' : 'text-amber-600'
                                                }`} />
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-gray-900 truncate">{alert.productName}</p>
                                                <p className="text-xs text-gray-500 font-mono">{alert.productSku}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`text-lg font-bold ${isOut ? 'text-red-600' : isOver ? 'text-blue-600' : 'text-amber-600'
                                                }`}>
                                                {alert.currentStock}
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${isOut ? 'bg-red-100 text-red-700' : isOver ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {isOut ? 'Out of Stock' : isOver ? 'Overstock' : 'Low Stock'}
                                            </span>
                                        </div>
                                        {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                                            <button
                                                onClick={async () => {
                                                    setAcknowledgingId(alert.id);
                                                    try {
                                                        await alertApi.acknowledge(alert.id);
                                                        await fetchDashboardData(true);
                                                    } finally {
                                                        setAcknowledgingId(null);
                                                    }
                                                }}
                                                disabled={acknowledgingId === alert.id}
                                                className="w-full flex items-center justify-center gap-1 py-1 px-2 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-all disabled:opacity-50"
                                            >
                                                {acknowledgingId === alert.id ? (
                                                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    <><ShieldCheck className="w-3 h-3" /> Acknowledge</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {pendingAlerts.length > 5 && (
                            <button
                                onClick={() => navigate('/alerts')}
                                className="mt-3 w-full py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors"
                            >
                                +{pendingAlerts.length - 5} more alerts — View All →
                            </button>
                        )}
                    </div>
                )}

                {/* ── All Clear message (no pending alerts) ── */}
                {!loading && pendingAlerts.length === 0 && (
                    <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <Bell className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-emerald-800">All stock levels healthy</p>
                            <p className="text-xs text-emerald-600">No pending alerts at this time.</p>
                        </div>
                        <button
                            onClick={() => navigate('/alerts')}
                            className="flex-shrink-0 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
                        >
                            View History →
                        </button>
                    </div>
                )}

                {/* Role-Based Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* ── Quick Actions (Accordion) ───────────────────── */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Quick Actions
                        </h3>
                        <div className="space-y-2">

                            {/* PRODUCTS — Admin & Manager */}
                            {(user?.role === Role.ADMIN || user?.role === Role.MANAGER) && (
                                <AccordionGroup
                                    groupKey="products" label="Products" icon={Package}
                                    accentOpen="bg-blue-600 text-white"
                                    accentClosedBg="bg-blue-50" accentClosedText="text-blue-800" accentHoverBg="hover:bg-blue-100"
                                    borderColor="border-blue-100"
                                    subIconColor="text-blue-400" subHoverBg="hover:bg-blue-50" subHoverText="hover:text-blue-700"
                                    subActions={[
                                        { label: 'Add Product', icon: Plus, onClick: () => navigate('/products/add') },
                                        { label: 'View Products', icon: Eye, onClick: () => navigate(user?.role === Role.MANAGER ? '/manager/my-products' : '/products') },
                                        { label: 'Stock In', icon: TrendingUp, onClick: () => navigate('/stock/in') },
                                        { label: 'Stock Out', icon: TrendingDown, onClick: () => navigate('/stock/out') },
                                    ]}
                                />
                            )}

                            {/* MANAGE USERS — Admin only */}
                            {user?.role === Role.ADMIN && (
                                <AccordionGroup
                                    groupKey="users" label="Manage Users" icon={Users}
                                    accentOpen="bg-violet-600 text-white"
                                    accentClosedBg="bg-violet-50" accentClosedText="text-violet-800" accentHoverBg="hover:bg-violet-100"
                                    borderColor="border-violet-100"
                                    subIconColor="text-violet-400" subHoverBg="hover:bg-violet-50" subHoverText="hover:text-violet-700"
                                    subActions={[
                                        { label: 'Add Staff', icon: Plus, onClick: () => navigate('/admin/users') },
                                        { label: 'Assign Manager', icon: Users, onClick: () => navigate('/admin/assign-manager') },
                                        { label: 'Assign Staff', icon: Users, onClick: () => navigate('/manager/assign-staff') },
                                    ]}
                                />
                            )}

                            {/* MANAGE SUPPLIERS — Admin & Manager */}
                            {(user?.role === Role.ADMIN || user?.role === Role.MANAGER) && (
                                <AccordionGroup
                                    groupKey="suppliers" label="Manage Suppliers" icon={Building2}
                                    accentOpen="bg-emerald-600 text-white"
                                    accentClosedBg="bg-emerald-50" accentClosedText="text-emerald-800" accentHoverBg="hover:bg-emerald-100"
                                    borderColor="border-emerald-100"
                                    subIconColor="text-emerald-400" subHoverBg="hover:bg-emerald-50" subHoverText="hover:text-emerald-700"
                                    subActions={[
                                        { label: 'Add Supplier', icon: Plus, onClick: () => navigate('/supplier/register') },
                                        { label: 'Review Pending Suppliers', icon: Building2, onClick: () => navigate('/admin/suppliers/pending') },
                                        // Only Admin can see the history
                                        ...(user?.role === Role.ADMIN ? [
                                            { label: 'Supplier History', icon: History, onClick: () => navigate('/admin/suppliers/history') }
                                        ] : [])
                                    ]}
                                />
                            )}

                            {/* Admin: Return History shortcut */}
                            {user?.role === Role.ADMIN && (
                                <button onClick={() => navigate('/admin/returns')}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-200 text-violet-800 rounded-xl hover:bg-violet-100 text-sm font-semibold transition-colors">
                                    <RotateCcw className="w-4 h-4" /> Return History
                                </button>
                            )}

                            {/* Admin & Manager: Analytics Dashboard shortcut */}
                            {(user?.role === Role.ADMIN || user?.role === Role.MANAGER) && (
                                <button onClick={() => navigate('/analytics')}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-violet-50 border border-violet-200 text-violet-800 rounded-xl hover:bg-violet-100 text-sm font-semibold transition-colors">
                                    <Zap className="w-4 h-4" /> Analytics Dashboard
                                </button>
                            )}

                            {/* Admin & Manager: View Alerts shortcut */}
                            {(user?.role === Role.ADMIN || user?.role === Role.MANAGER) && (
                                <button onClick={() => navigate('/alerts')}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl hover:bg-orange-100 text-sm font-semibold transition-colors">
                                    <Bell className="w-4 h-4" /> Stock Alerts
                                    {pendingAlerts.length > 0 && (
                                        <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{pendingAlerts.length}</span>
                                    )}
                                </button>
                            )}

                            {/* Manager-only flat buttons */}
                            {user?.role === Role.MANAGER && (
                                <>
                                    <button onClick={() => navigate('/manager/assign-staff')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl hover:bg-indigo-100 text-sm font-semibold transition-colors">
                                        <Users className="w-4 h-4" /> Assign Staff to Category
                                    </button>
                                    <button onClick={() => navigate('/manager/approvals')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl hover:bg-amber-100 text-sm font-semibold transition-colors">
                                        <ShieldCheck className="w-4 h-4" /> Staff Approval Requests
                                    </button>
                                    <button onClick={() => navigate('/manager/returns')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl hover:bg-teal-100 text-sm font-semibold transition-colors">
                                        <RotateCcw className="w-4 h-4" /> Return Requests
                                    </button>
                                </>
                            )}

                            {/* Staff flat buttons */}
                            {user?.role === Role.STAFF && (
                                <div className="space-y-2">
                                    <button onClick={() => navigate('/staff/my-products')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl hover:bg-blue-100 text-sm font-semibold transition-colors">
                                        <Eye className="w-4 h-4" /> View My Products
                                    </button>
                                    <button onClick={() => navigate('/staff/stock-out')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 text-red-800 rounded-xl hover:bg-red-100 text-sm font-semibold transition-colors">
                                        <TrendingDown className="w-4 h-4" /> Record Sale
                                    </button>
                                    <button onClick={() => navigate('/staff/returns')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl hover:bg-teal-100 text-sm font-semibold transition-colors">
                                        <RotateCcw className="w-4 h-4" /> Process Customer Return
                                    </button>
                                    <button onClick={() => navigate('/staff/my-requests')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl hover:bg-amber-100 text-sm font-semibold transition-colors">
                                        <ShieldCheck className="w-4 h-4" /> My Approval Requests
                                    </button>
                                    <button onClick={() => navigate('/staff/my-transactions')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl hover:bg-emerald-100 text-sm font-semibold transition-colors">
                                        <TrendingDown className="w-4 h-4" /> My Transactions
                                    </button>
                                    <button onClick={() => navigate('/alerts')}
                                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl hover:bg-orange-100 text-sm font-semibold transition-colors">
                                        <Bell className="w-4 h-4" /> Stock Alerts
                                        {pendingAlerts.length > 0 && (
                                            <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">{pendingAlerts.length}</span>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Recent Activity (unchanged) ──────────────────── */}
                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Recent Activity
                        </h3>
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                                <p className="mt-2 text-sm text-gray-600">Loading activities...</p>
                            </div>
                        ) : recentActivities.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No recent activities</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {recentActivities.map(activity => (
                                    <div key={activity.id}
                                        className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                                        <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === 'success' ? 'bg-green-500' :
                                            activity.type === 'warning' ? 'bg-yellow-500' :
                                                'bg-blue-500'
                                            }`} />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                                            <p className="text-xs text-gray-500">{activity.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Role info banner */}
                <div className="mt-6 card bg-primary-50 border-primary-200">
                    <h3 className="text-lg font-semibold text-primary-900 mb-2">
                        Your Access Level: {user?.role}
                    </h3>
                    <p className="text-sm text-primary-800">
                        {user?.role === Role.ADMIN &&
                            'As an Admin, you have full access to all system features including user management, system settings, and all reports.'}
                        {user?.role === Role.MANAGER &&
                            'As a Manager, you can access inventory management, view reports, and manage staff activities.'}
                        {user?.role === Role.STAFF &&
                            'As Staff, you can manage inventory, process orders, and view basic reports.'}
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
