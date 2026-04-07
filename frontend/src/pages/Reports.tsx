import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { stockApi } from '../services/productApi';
import { StockTransaction } from '../types/product';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import {
    ArrowLeft, BarChart3, TrendingDown, TrendingUp,
    Search, Filter, ChevronDown, Calendar, User,
    Package, Tag, Receipt, AlertTriangle, Download,
} from 'lucide-react';

type TxType = 'ALL' | 'SALE' | 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE' | 'TRANSFER';

const TYPE_META: Record<string, { label: string; color: string; bg: string; icon: typeof TrendingDown }> = {
    SALE: { label: 'Sale', color: 'text-red-700', bg: 'bg-red-100', icon: TrendingDown },
    PURCHASE: { label: 'Purchase', color: 'text-emerald-700', bg: 'bg-emerald-100', icon: TrendingUp },
    RETURN: { label: 'Return', color: 'text-blue-700', bg: 'bg-blue-100', icon: TrendingUp },
    ADJUSTMENT: { label: 'Adjustment', color: 'text-amber-700', bg: 'bg-amber-100', icon: BarChart3 },
    DAMAGE: { label: 'Damage', color: 'text-orange-700', bg: 'bg-orange-100', icon: AlertTriangle },
    TRANSFER: { label: 'Transfer', color: 'text-purple-700', bg: 'bg-purple-100', icon: Package },
};

function formatDate(dt: string | undefined) {
    if (!dt) return '—';
    const d = new Date(dt);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatTime(dt: string | undefined) {
    if (!dt) return '';
    const d = new Date(dt);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function Reports() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isManager = user?.role === Role.MANAGER;

    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const location = useLocation();
    const state = location.state as { dateFrom?: string; dateTo?: string } | null;

    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<TxType>('ALL');
    const [empFilter, setEmpFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState(state?.dateFrom || '');
    const [dateTo, setDateTo] = useState(state?.dateTo || '');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Both ADMIN and MANAGER use the same scoped endpoint;
            // for ADMIN the service returns everything.
            const res = await stockApi.getMyCategoryTransactions();
            setTransactions(res.data);
        } catch {
            setError('Failed to load transaction data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Unique employees for filter dropdown
    const employees = useMemo(() =>
        Array.from(new Set(transactions.map(t => t.performedByUsername).filter(Boolean))).sort()
        , [transactions]);

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            const txt = `${t.productName ?? ''} ${t.productSku ?? ''} ${t.referenceNumber ?? ''}`.toLowerCase();
            const matchSearch = !search || txt.includes(search.toLowerCase());
            const matchType = typeFilter === 'ALL' || t.transactionType === typeFilter;
            const matchEmp = empFilter === 'ALL' || t.performedByUsername === empFilter;
            let matchDate = true;
            if (dateFrom) matchDate = matchDate && new Date(t.transactionDate ?? '') >= new Date(dateFrom);
            if (dateTo) matchDate = matchDate && new Date(t.transactionDate ?? '') <= new Date(dateTo + 'T23:59:59');
            return matchSearch && matchType && matchEmp && matchDate;
        });
    }, [transactions, search, typeFilter, empFilter, dateFrom, dateTo]);

    // Summary stats
    const stats = useMemo(() => {
        const sales = filtered.filter(t => t.transactionType === 'SALE');
        const purchases = filtered.filter(t => t.transactionType === 'PURCHASE');
        const totalSaleQty = sales.reduce((s, t) => s + (t.quantity ?? 0), 0);
        const totalSaleAmt = sales.reduce((s, t) => s + (Number(t.totalAmount) || 0), 0);
        const totalPurchaseQty = purchases.reduce((s, t) => s + (t.quantity ?? 0), 0);
        return { totalTx: filtered.length, totalSaleQty, totalSaleAmt, totalPurchaseQty };
    }, [filtered]);

    const exportCSV = () => {
        const headers = ['Date', 'Time', 'Type', 'Product', 'SKU', 'Qty', 'Stock Before', 'Stock After', 'Unit Price', 'Total', 'Employee', 'Reference', 'Notes'];
        const rows = filtered.map(t => [
            formatDate(t.transactionDate), formatTime(t.transactionDate),
            t.transactionType, t.productName ?? '', t.productSku ?? '',
            t.quantity, t.stockBefore, t.stockAfter,
            t.unitPrice ?? '', t.totalAmount ?? '',
            t.performedByUsername ?? '', t.referenceNumber ?? '', t.notes ?? '',
        ]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `stock-report-${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center text-gray-500 hover:text-gray-800 mb-3 transition-colors text-sm"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-xl">
                                <BarChart3 className="w-7 h-7 text-indigo-600" />
                            </div>
                            Stock Transaction Reports
                        </h1>
                        <p className="text-gray-500 mt-1 ml-14 text-sm">
                            {isManager
                                ? 'Detailed stock movement history for your assigned categories'
                                : 'Full inventory transaction history'}
                        </p>
                    </div>
                    <button
                        onClick={exportCSV}
                        disabled={filtered.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-2 items-center">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
                    </div>
                )}

                {/* Summary cards */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Transactions', value: stats.totalTx, icon: Receipt, color: 'bg-indigo-500' },
                            { label: 'Units Sold', value: stats.totalSaleQty, icon: TrendingDown, color: 'bg-red-500' },
                            { label: 'Units Purchased', value: stats.totalPurchaseQty, icon: TrendingUp, color: 'bg-emerald-500' },
                            { label: 'Total Sale Value', value: `₹${stats.totalSaleAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: BarChart3, color: 'bg-purple-500' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                                <div className={`${s.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <s.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xl font-bold text-gray-900">{s.value}</p>
                                    <p className="text-xs text-gray-500">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</p>
                    <div className="flex flex-wrap gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text" value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search product, SKU, reference…"
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        {/* Type */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TxType)}
                                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 appearance-none bg-white">
                                <option value="ALL">All Types</option>
                                {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {/* Employee */}
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select value={empFilter} onChange={e => setEmpFilter(e.target.value)}
                                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 appearance-none bg-white">
                                <option value="ALL">All Employees</option>
                                {employees.map(e => <option key={e} value={e}>{e}</option>)}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {/* Date From */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" />
                        </div>
                        {/* Date To */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white" />
                        </div>
                        {(search || typeFilter !== 'ALL' || empFilter !== 'ALL' || dateFrom || dateTo) && (
                            <button onClick={() => { setSearch(''); setTypeFilter('ALL'); setEmpFilter('ALL'); setDateFrom(''); setDateTo(''); }}
                                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                Clear all
                            </button>
                        )}
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                            <p className="text-sm text-gray-500">Loading transactions…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-gray-600">No transactions found</p>
                            <p className="text-sm mt-1">Try adjusting your filters or date range.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            {['Date & Time', 'Type', 'Product', 'Category', 'Qty', 'Stock Before → After', 'Total Amount', 'Employee', 'Reference', 'Notes'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filtered.map(t => {
                                            const meta = TYPE_META[t.transactionType ?? ''] ?? { label: t.transactionType, color: 'text-gray-700', bg: 'bg-gray-100', icon: Package };
                                            const Icon = meta.icon;
                                            const isOut = t.transactionType === 'SALE' || t.transactionType === 'DAMAGE';
                                            return (
                                                <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors">
                                                    {/* Date/Time */}
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <p className="font-medium text-gray-800">{formatDate(t.transactionDate)}</p>
                                                        <p className="text-xs text-gray-400">{formatTime(t.transactionDate)}</p>
                                                    </td>
                                                    {/* Type badge */}
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.color}`}>
                                                            <Icon className="w-3 h-3" />{meta.label}
                                                        </span>
                                                    </td>
                                                    {/* Product */}
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-900 max-w-[180px] truncate">{t.productName}</p>
                                                        <p className="text-xs font-mono text-gray-400">{t.productSku}</p>
                                                    </td>
                                                    {/* Category */}
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700 font-medium">
                                                            <Tag className="w-3 h-3" />
                                                            {t.categoryName ?? '—'}
                                                        </span>
                                                    </td>
                                                    {/* Qty */}
                                                    <td className="px-4 py-3">
                                                        <span className={`font-bold text-base ${isOut ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {isOut ? '-' : '+'}{t.quantity}
                                                        </span>
                                                    </td>
                                                    {/* Stock change */}
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                                                        <span className="font-mono">{t.stockBefore ?? '—'}</span>
                                                        <span className="mx-1 text-gray-400">→</span>
                                                        <span className="font-mono">{t.stockAfter ?? '—'}</span>
                                                    </td>
                                                    {/* Total */}
                                                    <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">
                                                        {t.totalAmount
                                                            ? `₹${Number(t.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                                                            : '—'}
                                                    </td>
                                                    {/* Employee */}
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                                <User className="w-3.5 h-3.5 text-indigo-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-700 font-medium text-xs">{t.performedByFullName ?? t.performedByUsername ?? '—'}</p>
                                                                <p className="text-gray-400 text-xs">@{t.performedByUsername}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Reference */}
                                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                        {t.referenceNumber || '—'}
                                                    </td>
                                                    {/* Notes */}
                                                    <td className="px-4 py-3 text-gray-500 max-w-[150px] truncate" title={t.notes ?? ''}>
                                                        {t.notes || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                                Showing {filtered.length} of {transactions.length} transactions
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
