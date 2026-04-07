import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { returnApi, ReturnRequest, ReturnReason, ItemCondition } from '../services/returnApi';
import {
    ArrowLeft, RotateCcw, Package, User, Tag, Calendar,
    RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle,
    Layers, Trash2,
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

// ── Helpers ────────────────────────────────────────────────────────────────────

const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
    DEFECTIVE: 'Defective',
    WRONG_ITEM: 'Wrong Item',
    CUSTOMER_CHANGED_MIND: 'Changed Mind',
    EXPIRED: 'Expired',
    DAMAGED_IN_TRANSIT: 'Damaged in Transit',
    QUALITY_ISSUE: 'Quality Issue',
};

const CONDITION_LABELS: Record<ItemCondition, { label: string; color: string }> = {
    GOOD: { label: 'Good', color: 'text-green-700 bg-green-50 border-green-200' },
    DEFECTIVE: { label: 'Defective', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    DAMAGED: { label: 'Damaged', color: 'text-red-700 bg-red-50 border-red-200' },
};

const STATUS_META: Record<ReturnRequest['status'], {
    label: string; bg: string; text: string; border: string; icon: any;
}> = {
    PENDING: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: Clock },
    APPROVED_RESTOCK: { label: 'Restocked ✓', bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: CheckCircle2 },
    APPROVED_DAMAGE: { label: 'Written Off', bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: AlertCircle },
    REJECTED: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: XCircle },
};

function fmt(dt?: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ManagerReturnApprovals() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ReturnRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [noteMap, setNoteMap] = useState<Record<number, string>>({});
    const [actioningId, setActioningId] = useState<number | null>(null);

    // ── Data fetching ────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = tab === 'PENDING'
                ? await returnApi.getPending()
                : await returnApi.getAll();
            setRequests(res.data);
        } catch {
            setError('Failed to load return requests.');
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time: refresh when return or stock events arrive
    const { subscribe } = useWebSocket();
    useEffect(() => {
        const unsubR = subscribe('/topic/returns', fetchData);
        const unsubS = subscribe('/topic/stock', fetchData);
        return () => { unsubR(); unsubS(); };
    }, [subscribe, fetchData]);

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleAction = async (
        id: number,
        action: 'restock' | 'damage' | 'reject'
    ) => {
        setError(''); setSuccess(''); setActioningId(id);
        const note = noteMap[id] || undefined;
        try {
            if (action === 'restock') {
                await returnApi.approveRestock(id, note);
                setSuccess(`✅ Request #${id} approved — item restocked. Stock increased.`);
            } else if (action === 'damage') {
                await returnApi.approveDamage(id, note);
                setSuccess(`Request #${id} marked as Damaged — item written off. No stock change.`);
            } else {
                await returnApi.reject(id, note);
                setSuccess(`Request #${id} rejected — stock unchanged, staff notified.`);
            }
            await fetchData();
        } catch (e: any) {
            setError(e.response?.data?.message || 'Action failed. Please try again.');
        } finally {
            setActioningId(null);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <button onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-500 hover:text-gray-800 mb-3 text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-teal-100 rounded-xl">
                                    <RotateCcw className="w-7 h-7 text-teal-600" />
                                </div>
                                Return Requests
                            </h1>
                            <p className="text-gray-500 mt-1 ml-14 text-sm">
                                Review customer returns — approve to restock, mark as damaged, or reject
                            </p>
                        </div>
                        <button onClick={fetchData}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 bg-white rounded-lg hover:bg-gray-50 text-sm transition-colors">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4" />{error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                        {success}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2">
                    {(['PENDING', 'ALL'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t
                                ? 'bg-teal-600 text-white shadow'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}>
                            {t === 'PENDING'
                                ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}`
                                : 'All History'}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                        <p className="text-sm text-gray-500 mt-3">Loading return requests…</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16 text-gray-400">
                        <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-gray-600">
                            No {tab === 'PENDING' ? 'pending' : ''} return requests
                        </p>
                        <p className="text-sm mt-1">
                            {tab === 'PENDING'
                                ? 'All clear! No customer returns waiting for your review.'
                                : 'No return history yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map(req => {
                            const meta = STATUS_META[req.status];
                            const StatusIcon = meta.icon;
                            const isPending = req.status === 'PENDING';
                            return (
                                <div key={req.id}
                                    className={`bg-white rounded-xl shadow-sm border ${isPending ? 'border-teal-200' : 'border-gray-100'} p-5`}>

                                    {/* Top row: product + status */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                                            {/* Product */}
                                            <div className="flex items-start gap-2">
                                                <Package className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-semibold text-gray-900">{req.productName}</p>
                                                    <p className="text-xs font-mono text-gray-400">{req.productSku}</p>
                                                </div>
                                            </div>
                                            {/* Category */}
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                <span className="text-sm text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                                                    {req.categoryName}
                                                </span>
                                            </div>
                                            {/* Staff */}
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <div>
                                                    <span className="text-sm text-gray-800">{req.staffFullName}</span>
                                                    <span className="text-xs text-gray-400 ml-1">@{req.staffUsername}</span>
                                                </div>
                                            </div>
                                            {/* Date */}
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <span className="text-sm text-gray-600">{fmt(req.requestedAt)}</span>
                                            </div>
                                        </div>

                                        {/* Status + qty badge */}
                                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.text}`}>
                                                <StatusIcon className="w-3.5 h-3.5" />{meta.label}
                                            </span>
                                            <span className="text-3xl font-black text-gray-900">
                                                {req.quantity}
                                                <span className="text-sm font-normal text-gray-400 ml-1">units</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Return details chips */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                            Reason: {RETURN_REASON_LABELS[req.returnReason]}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${CONDITION_LABELS[req.itemCondition].color}`}>
                                            Condition: {CONDITION_LABELS[req.itemCondition].label}
                                        </span>
                                        {req.originalSaleRef && (
                                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                                                Ref: {req.originalSaleRef}
                                            </span>
                                        )}
                                        {req.customerName && (
                                            <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                                                Customer: {req.customerName}
                                            </span>
                                        )}
                                        {req.stockTransactionId && (
                                            <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
                                                Tx #{req.stockTransactionId}
                                            </span>
                                        )}
                                    </div>

                                    {/* Staff notes */}
                                    {req.staffNotes && (
                                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                                            <span className="font-medium text-gray-700">Staff note: </span>{req.staffNotes}
                                        </div>
                                    )}

                                    {/* Manager note (resolved) */}
                                    {!isPending && req.managerNotes && (
                                        <div className={`mt-2 text-sm px-3 py-2 rounded-lg ${req.status === 'APPROVED_RESTOCK'
                                            ? 'bg-green-50 text-green-800'
                                            : req.status === 'APPROVED_DAMAGE'
                                                ? 'bg-orange-50 text-orange-800'
                                                : 'bg-red-50 text-red-800'
                                            }`}>
                                            <span className="font-medium">Your note: </span>{req.managerNotes}
                                        </div>
                                    )}
                                    {!isPending && req.resolvedAt && (
                                        <p className="mt-1 text-xs text-gray-400">
                                            Resolved: {fmt(req.resolvedAt)}
                                        </p>
                                    )}

                                    {/* Approve / Damage / Reject controls — PENDING only */}
                                    {isPending && (
                                        <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                                            {/* Note input */}
                                            <input
                                                type="text"
                                                placeholder="Optional note to staff… (visible after decision)"
                                                value={noteMap[req.id] ?? ''}
                                                onChange={e => setNoteMap(n => ({ ...n, [req.id]: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none"
                                            />
                                            {/* Action buttons */}
                                            <div className="flex flex-col sm:flex-row gap-2">
                                                {/* APPROVE RESTOCK */}
                                                <button
                                                    onClick={() => handleAction(req.id, 'restock')}
                                                    disabled={actioningId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium transition-colors">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {actioningId === req.id ? 'Processing…' : '✓ Approve — Restock'}
                                                </button>
                                                {/* APPROVE DAMAGE */}
                                                <button
                                                    onClick={() => handleAction(req.id, 'damage')}
                                                    disabled={actioningId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm font-medium transition-colors">
                                                    <Layers className="w-4 h-4" />
                                                    ⚠ Approve — Write Off
                                                </button>
                                                {/* REJECT */}
                                                <button
                                                    onClick={() => handleAction(req.id, 'reject')}
                                                    disabled={actioningId === req.id}
                                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                    ✕ Reject Return
                                                </button>
                                            </div>
                                            {/* Decision legend */}
                                            <p className="text-xs text-gray-400 text-center">
                                                <strong>Restock</strong> — item is good → stock increases &nbsp;|&nbsp;
                                                <strong>Write Off</strong> — item defective → audit record, no stock change &nbsp;|&nbsp;
                                                <strong>Reject</strong> — return refused → no change
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
