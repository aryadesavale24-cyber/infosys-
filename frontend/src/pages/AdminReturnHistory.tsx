import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { returnApi, ReturnRequest, ReturnStatus, ReturnReason, ItemCondition } from '../services/returnApi';
import {
    ArrowLeft, RotateCcw, Package, User, Tag, Calendar, Building2,
    RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, TrendingDown,
    DollarSign, Search, ChevronDown, ChevronUp,
    ShoppingCart, FileText, Hash,
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

// ── Helpers ────────────────────────────────────────────────────────────────────

const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
    DEFECTIVE: 'Defective / Not Working',
    WRONG_ITEM: 'Wrong Item Delivered',
    CUSTOMER_CHANGED_MIND: 'Customer Changed Mind',
    EXPIRED: 'Expired Product',
    DAMAGED_IN_TRANSIT: 'Damaged in Transit',
    QUALITY_ISSUE: 'Quality Issue',
};

const CONDITION_LABELS: Record<ItemCondition, { label: string; color: string }> = {
    GOOD: { label: 'Good', color: 'text-green-700 bg-green-50 border-green-200' },
    DEFECTIVE: { label: 'Defective', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    DAMAGED: { label: 'Damaged', color: 'text-red-700 bg-red-50 border-red-200' },
};

const STATUS_META: Record<ReturnStatus, {
    label: string; bg: string; text: string; border: string; icon: any; dot: string;
}> = {
    PENDING: { label: 'Pending Review', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: Clock, dot: 'bg-amber-400' },
    APPROVED_RESTOCK: { label: 'Approved — Restocked', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle2, dot: 'bg-green-500' },
    APPROVED_DAMAGE: { label: 'Approved — Damage Write-off', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: AlertCircle, dot: 'bg-orange-500' },
    REJECTED: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: XCircle, dot: 'bg-red-400' },
};

function fmt(dt?: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function fmtDate(dt?: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
}

function fmtCurrency(v?: number | null) {
    if (v === undefined || v === null) return '—';
    return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AdminReturnHistory() {
    const navigate = useNavigate();
    const [returns, setReturns] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'ALL'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [sortField, setSortField] = useState<'requestedAt' | 'resolvedAt' | 'estimatedLoss'>('requestedAt');
    const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await returnApi.adminGetAll();
            setReturns(res.data);
        } catch {
            setError('Failed to load return history. Check your admin privileges.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time refresh
    const { subscribe } = useWebSocket();
    useEffect(() => {
        const unsub = subscribe('/topic/returns', fetchData);
        return () => unsub();
    }, [subscribe, fetchData]);

    // ── Derived: filter + sort ─────────────────────────────────────────────────
    const filtered = returns
        .filter(r => statusFilter === 'ALL' || r.status === statusFilter)
        .filter(r => {
            if (!searchTerm.trim()) return true;
            const q = searchTerm.toLowerCase();
            return (
                r.productName?.toLowerCase().includes(q) ||
                r.productSku?.toLowerCase().includes(q) ||
                r.staffFullName?.toLowerCase().includes(q) ||
                r.staffUsername?.toLowerCase().includes(q) ||
                r.managerFullName?.toLowerCase().includes(q) ||
                r.supplierName?.toLowerCase().includes(q) ||
                r.originalSaleRef?.toLowerCase().includes(q) ||
                r.customerName?.toLowerCase().includes(q)
            );
        })
        .sort((a, b) => {
            let av: number, bv: number;
            if (sortField === 'requestedAt') {
                av = new Date(a.requestedAt).getTime();
                bv = new Date(b.requestedAt).getTime();
            } else if (sortField === 'resolvedAt') {
                av = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
                bv = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
            } else {
                av = a.estimatedLoss ?? 0;
                bv = b.estimatedLoss ?? 0;
            }
            return sortDir === 'desc' ? bv - av : av - bv;
        });

    // ── Summary stats ─────────────────────────────────────────────────────────
    const totalDamageWriteOff = returns
        .filter(r => r.status === 'APPROVED_DAMAGE')
        .reduce((s, r) => s + (r.estimatedLoss ?? 0), 0);

    const totalRestocked = returns.filter(r => r.status === 'APPROVED_RESTOCK').length;
    const totalPending = returns.filter(r => r.status === 'PENDING').length;
    const totalDamage = returns.filter(r => r.status === 'APPROVED_DAMAGE').length;

    // ── Sort toggle helper ────────────────────────────────────────────────────
    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const SortIcon = ({ field }: { field: typeof sortField }) =>
        sortField === field
            ? sortDir === 'desc' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />
            : <ChevronDown className="w-3.5 h-3.5 opacity-30" />;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <button onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-500 hover:text-gray-800 mb-3 text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-violet-100 rounded-xl">
                                    <RotateCcw className="w-7 h-7 text-violet-600" />
                                </div>
                                Return History
                                <span className="text-base font-normal text-gray-400 ml-1">Admin View</span>
                            </h1>
                            <p className="text-gray-500 mt-1 ml-14 text-sm">
                                Complete audit of all customer return requests across all staff and categories
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={fetchData}
                                className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 bg-white rounded-lg hover:bg-gray-50 text-sm transition-colors">
                                <RefreshCw className="w-4 h-4" /> Refresh
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4" />{error}
                    </div>
                )}

                {/* ── KPI cards ──────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Returns', value: returns.length, icon: RotateCcw, color: 'bg-violet-500', sub: 'all time' },
                        { label: 'Pending Review', value: totalPending, icon: Clock, color: 'bg-amber-500', sub: 'needs action' },
                        { label: 'Restocked Items', value: totalRestocked, icon: CheckCircle2, color: 'bg-green-500', sub: 'returned to shelf' },
                        { label: 'Damage Write-Offs', value: totalDamage, icon: TrendingDown, color: 'bg-red-500', sub: fmtCurrency(totalDamageWriteOff) + ' lost' },
                    ].map((card, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                            <div className={`w-10 h-10 ${card.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                <card.icon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-gray-900">{card.value}</p>
                                <p className="text-xs font-semibold text-gray-600">{card.label}</p>
                                <p className="text-xs text-gray-400">{card.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Financial Summary banner ──────────────────────────────── */}
                {totalDamageWriteOff > 0 && (
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="font-bold text-red-900 text-lg">
                                Total Loss from Damage Write-Offs: {fmtCurrency(totalDamageWriteOff)}
                            </p>
                            <p className="text-red-700 text-sm">
                                {totalDamage} defective items written off — cost price deducted from inventory value
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Filters ────────────────────────────────────────────────── */}
                <div className="flex flex-wrap gap-3 items-center">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by product, staff, manager, supplier, ref…"
                            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none bg-white"
                        />
                    </div>
                    {/* Status filter chips */}
                    <div className="flex gap-2 flex-wrap">
                        {(['ALL', 'PENDING', 'APPROVED_RESTOCK', 'APPROVED_DAMAGE', 'REJECTED'] as const).map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s
                                    ? 'bg-violet-600 text-white shadow'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}>
                                {s === 'ALL' ? `All (${returns.length})`
                                    : s === 'PENDING' ? `Pending (${totalPending})`
                                        : s === 'APPROVED_RESTOCK' ? `Restocked (${totalRestocked})`
                                            : s === 'APPROVED_DAMAGE' ? `Damage (${totalDamage})`
                                                : `Rejected (${returns.filter(r => r.status === 'REJECTED').length})`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Table ─────────────────────────────────────────────────── */}
                {loading ? (
                    <div className="flex flex-col items-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
                        <p className="text-sm text-gray-500 mt-3">Loading all return data…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16 text-gray-400">
                        <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium text-gray-600">No returns found</p>
                        <p className="text-sm mt-1">Try adjusting your search or filter.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Table header */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-600 min-w-[1000px]">
                                <thead className="bg-gray-50 text-gray-800 text-xs font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="px-5 py-3.5">ID</th>
                                        <th className="px-5 py-3.5">Product / SKU</th>
                                        <th className="px-5 py-3.5">Category / Supplier</th>
                                        <th className="px-5 py-3.5">Raised By (Staff)</th>
                                        <th className="px-5 py-3.5">Approved By (Manager)</th>
                                        <th className="px-5 py-3.5">Reason / Condition</th>
                                        <th className="px-5 py-3.5 text-right">Qty</th>
                                        <th className="px-5 py-3.5 cursor-pointer hover:text-gray-900 select-none"
                                            onClick={() => toggleSort('requestedAt')}>
                                            <span className="flex items-center gap-1">
                                                Requested <SortIcon field="requestedAt" />
                                            </span>
                                        </th>
                                        <th className="px-5 py-3.5 cursor-pointer hover:text-gray-900 select-none"
                                            onClick={() => toggleSort('resolvedAt')}>
                                            <span className="flex items-center gap-1">
                                                Resolved <SortIcon field="resolvedAt" />
                                            </span>
                                        </th>
                                        <th className="px-5 py-3.5 cursor-pointer hover:text-gray-900 select-none"
                                            onClick={() => toggleSort('estimatedLoss')}>
                                            <span className="flex items-center gap-1">
                                                Loss / Impact <SortIcon field="estimatedLoss" />
                                            </span>
                                        </th>
                                        <th className="px-5 py-3.5">Status</th>
                                        <th className="px-5 py-3.5"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map(req => {
                                        const meta = STATUS_META[req.status];
                                        const StatusIcon = meta.icon;
                                        const isExpanded = expandedId === req.id;
                                        return (
                                            <>
                                                <tr key={req.id}
                                                    className={`hover:bg-violet-50/40 transition-colors ${isExpanded ? 'bg-violet-50/40' : ''}`}>
                                                    {/* ID */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className="font-mono text-xs text-gray-400">#{req.id}</span>
                                                    </td>
                                                    {/* Product */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-semibold text-gray-900 max-w-[160px] truncate"
                                                                    title={req.productName}>{req.productName}</p>
                                                                <p className="text-xs font-mono text-gray-400">{req.productSku}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Category / Supplier */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                                                                <Tag className="w-3 h-3" />{req.categoryName || '—'}
                                                            </span>
                                                            {req.supplierName && (
                                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                    <Building2 className="w-3 h-3" />{req.supplierName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    {/* Staff */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                                                                {req.staffFullName?.charAt(0) || 'S'}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-800 text-xs">{req.staffFullName}</p>
                                                                <p className="text-gray-400 text-xs">@{req.staffUsername}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Manager */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-bold text-xs flex-shrink-0">
                                                                {req.managerFullName?.charAt(0) || 'M'}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-gray-800 text-xs">{req.managerFullName}</p>
                                                                <p className="text-gray-400 text-xs">@{req.managerUsername}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Reason + Condition */}
                                                    <td className="px-5 py-3.5">
                                                        <div className="space-y-1">
                                                            <p className="text-xs text-gray-600 max-w-[130px] leading-snug">
                                                                {RETURN_REASON_LABELS[req.returnReason]}
                                                            </p>
                                                            <span className={`text-xs px-1.5 py-0.5 rounded border ${CONDITION_LABELS[req.itemCondition].color}`}>
                                                                {CONDITION_LABELS[req.itemCondition].label}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {/* Qty */}
                                                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                        <span className="font-black text-gray-900 text-lg">{req.quantity}</span>
                                                        <span className="text-xs text-gray-400 ml-1">units</span>
                                                    </td>
                                                    {/* Requested At */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                            {fmtDate(req.requestedAt)}
                                                        </div>
                                                    </td>
                                                    {/* Resolved At */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        <span className="text-xs text-gray-600">{fmtDate(req.resolvedAt)}</span>
                                                    </td>
                                                    {/* Financial Impact */}
                                                    <td className="px-5 py-3.5 whitespace-nowrap">
                                                        {req.status === 'APPROVED_DAMAGE' ? (
                                                            <div className="text-right">
                                                                <p className="font-bold text-red-700 text-sm">
                                                                    {fmtCurrency(req.estimatedLoss)}
                                                                </p>
                                                                <p className="text-xs text-red-400">written off</p>
                                                            </div>
                                                        ) : req.status === 'APPROVED_RESTOCK' ? (
                                                            <span className="text-xs text-green-600 font-medium">No loss</span>
                                                        ) : req.status === 'PENDING' ? (
                                                            <span className="text-xs text-gray-400 italic">Pending</span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>
                                                    {/* Status badge */}
                                                    <td className="px-5 py-3.5">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.text}`}>
                                                            <StatusIcon className="w-3.5 h-3.5" />
                                                            {meta.label}
                                                        </span>
                                                    </td>
                                                    {/* Expand toggle */}
                                                    <td className="px-5 py-3.5">
                                                        <button onClick={() => setExpandedId(isExpanded ? null : req.id)}
                                                            className="text-xs text-violet-600 hover:text-violet-800 font-medium whitespace-nowrap">
                                                            {isExpanded ? 'Less ▲' : 'Details ▼'}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {/* ── Expanded detail row ───────────────────────────────── */}
                                                {isExpanded && (
                                                    <tr key={`${req.id}-expanded`} className="bg-violet-50/60 border-t border-violet-100">
                                                        <td colSpan={13} className="px-6 py-5">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                                                                {/* Product pricing */}
                                                                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                                        <DollarSign className="w-3.5 h-3.5" /> Pricing & Financial Impact
                                                                    </p>
                                                                    <div className="space-y-1 text-sm">
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-500">Cost Price</span>
                                                                            <span className="font-medium text-gray-900">{fmtCurrency(req.productCostPrice)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-500">Selling Price</span>
                                                                            <span className="font-medium text-gray-900">{fmtCurrency(req.productSellingPrice)}</span>
                                                                        </div>
                                                                        <div className="flex justify-between">
                                                                            <span className="text-gray-500">Units Returned</span>
                                                                            <span className="font-bold text-gray-900">{req.quantity}</span>
                                                                        </div>
                                                                        <div className={`flex justify-between pt-2 border-t border-gray-100 ${req.status === 'APPROVED_DAMAGE' ? 'text-red-700' : 'text-green-700'}`}>
                                                                            <span className="font-semibold">
                                                                                {req.status === 'APPROVED_DAMAGE' ? 'Amount Deducted' : 'Financial Impact'}
                                                                            </span>
                                                                            <span className="font-black text-base">
                                                                                {req.status === 'APPROVED_DAMAGE'
                                                                                    ? fmtCurrency(req.estimatedLoss)
                                                                                    : req.status === 'PENDING' ? 'TBD'
                                                                                        : 'None'}
                                                                            </span>
                                                                        </div>
                                                                        {req.status === 'APPROVED_DAMAGE' && (
                                                                            <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
                                                                                💔 Defective item written off. Cost price × quantity deducted from inventory valuation.
                                                                            </p>
                                                                        )}
                                                                        {req.status === 'APPROVED_RESTOCK' && (
                                                                            <p className="text-xs text-green-600 bg-green-50 p-2 rounded-lg">
                                                                                ✅ Item returned to stock. No financial loss — stock count increased by {req.quantity}.
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Supplier info */}
                                                                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                                        <Building2 className="w-3.5 h-3.5" /> Supplier Information
                                                                    </p>
                                                                    {req.supplierName ? (
                                                                        <div className="space-y-2 text-sm">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold text-xs">
                                                                                    {req.supplierName.charAt(0)}
                                                                                </div>
                                                                                <span className="font-semibold text-gray-900">{req.supplierName}</span>
                                                                            </div>
                                                                            {req.supplierEmail && (
                                                                                <p className="text-xs text-gray-500">📧 {req.supplierEmail}</p>
                                                                            )}
                                                                            {req.supplierId && (
                                                                                <p className="text-xs text-gray-400 font-mono">Supplier ID: {req.supplierId}</p>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-gray-400 italic">No supplier linked to this product</p>
                                                                    )}
                                                                </div>

                                                                {/* Timeline + notes */}
                                                                <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                                        <FileText className="w-3.5 h-3.5" /> Notes & Timeline
                                                                    </p>
                                                                    <div className="space-y-2 text-xs text-gray-600">
                                                                        {req.originalSaleRef && (
                                                                            <div className="flex items-center gap-2">
                                                                                <Hash className="w-3.5 h-3.5 text-blue-400" />
                                                                                <span>Sale ref: <span className="font-mono font-semibold">{req.originalSaleRef}</span></span>
                                                                            </div>
                                                                        )}
                                                                        {req.customerName && (
                                                                            <div className="flex items-center gap-2">
                                                                                <User className="w-3.5 h-3.5 text-indigo-400" />
                                                                                <span>Customer: <span className="font-medium">{req.customerName}</span></span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                            <span>Requested: {fmt(req.requestedAt)}</span>
                                                                        </div>
                                                                        {req.resolvedAt && (
                                                                            <div className="flex items-center gap-2">
                                                                                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                                                                                <span>Resolved: {fmt(req.resolvedAt)}</span>
                                                                            </div>
                                                                        )}
                                                                        {req.stockTransactionId && (
                                                                            <div className="flex items-center gap-2">
                                                                                <ShoppingCart className="w-3.5 h-3.5 text-teal-400" />
                                                                                <span>Transaction: <span className="font-mono font-semibold">#{req.stockTransactionId}</span></span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-2 text-xs pt-1 border-t border-gray-100">
                                                                        {req.staffNotes && (
                                                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                                                <span className="font-semibold text-gray-700">Staff note: </span>
                                                                                <span className="text-gray-600">{req.staffNotes}</span>
                                                                            </div>
                                                                        )}
                                                                        {req.managerNotes && (
                                                                            <div className={`p-2 rounded-lg ${req.status === 'APPROVED_RESTOCK'
                                                                                ? 'bg-green-50 text-green-800'
                                                                                : req.status === 'APPROVED_DAMAGE'
                                                                                    ? 'bg-orange-50 text-orange-800'
                                                                                    : 'bg-red-50 text-red-800'
                                                                                }`}>
                                                                                <span className="font-semibold">Manager note: </span>
                                                                                {req.managerNotes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                            Showing {filtered.length} of {returns.length} return records
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
