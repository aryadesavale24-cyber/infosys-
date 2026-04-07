import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { returnApi, ReturnRequest, ReturnReason, ItemCondition } from '../services/returnApi';
import { approvalApi, OnlineManager } from '../services/approvalApi';
import { stockApi } from '../services/productApi';
import { StockTransaction } from '../types/product';
import {
    ArrowLeft, RotateCcw, Package, User, Calendar,
    RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle,
    ChevronDown, Send, Hash, FileText, ShoppingCart, ChevronRight,
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

// ── Constants ──────────────────────────────────────────────────────────────────

const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
    DEFECTIVE: '🔧 Defective / Not Working',
    WRONG_ITEM: '📦 Wrong Item Delivered',
    CUSTOMER_CHANGED_MIND: '💭 Customer Changed Mind',
    EXPIRED: '⏳ Expired Product',
    DAMAGED_IN_TRANSIT: '🚚 Damaged in Transit',
    QUALITY_ISSUE: '⭐ Quality Issue',
};

const CONDITION_LABELS: Record<ItemCondition, { label: string; color: string }> = {
    GOOD: { label: '✅ Good — Can be Reshelved', color: 'text-green-700 bg-green-50 border-green-200' },
    DEFECTIVE: { label: '⚠️ Defective — Cannot Resell', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    DAMAGED: { label: '💔 Damaged — Write Off', color: 'text-red-700 bg-red-50 border-red-200' },
};

const STATUS_META: Record<ReturnRequest['status'], {
    label: string; bg: string; text: string; border: string; icon: any;
}> = {
    PENDING: { label: 'Pending Review', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', icon: Clock },
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

// A unique sold product derived from the staff's SALE/DAMAGE transactions
interface SoldProduct {
    productId: number;
    productName: string;
    productSku: string;
    totalSold: number;        // total units sold by this staff
    lastSaleRef?: string;     // most recent reference number for pre-fill
    lastSaleDate: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function StaffReturnRequests() {
    const navigate = useNavigate();

    // ── View state: 'pick' → choose which product to return
    //               'form' → fill return form for selected product
    //               'history' → view all my past return requests
    type View = 'pick' | 'form' | 'history';
    const [view, setView] = useState<View>('pick');

    // Stock-out data
    const [myTransactions, setMyTransactions] = useState<StockTransaction[]>([]);
    const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
    const [txLoading, setTxLoading] = useState(true);

    // Selected sale for the return form
    const [selected, setSelected] = useState<SoldProduct | null>(null);

    // Return history
    const [myReturns, setMyReturns] = useState<ReturnRequest[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // Form state
    const [managers, setManagers] = useState<OnlineManager[]>([]);
    const [form, setForm] = useState({
        quantity: '',
        returnReason: '' as ReturnReason | '',
        itemCondition: '' as ItemCondition | '',
        managerId: '',
        originalSaleRef: '',
        customerName: '',
        staffNotes: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // ── Fetch my SALE transactions ────────────────────────────────────────────
    const fetchMyTransactions = useCallback(async () => {
        try {
            setTxLoading(true);
            // Fetch a large batch so we see all products ever sold
            const res = await stockApi.getMyTransactions(0, 500);
            const all: StockTransaction[] = res.data.content;
            setMyTransactions(all);

            // Only SALE transactions count as "eligible for return"
            const sales = all.filter(tx => tx.transactionType === 'SALE');

            // Deduplicate by productId — accumulate total sold and keep latest ref
            const map = new Map<number, SoldProduct>();
            sales.forEach(tx => {
                const existing = map.get(tx.productId);
                if (!existing) {
                    map.set(tx.productId, {
                        productId: tx.productId,
                        productName: tx.productName,
                        productSku: tx.productSku,
                        totalSold: tx.quantity,
                        lastSaleRef: tx.referenceNumber,
                        lastSaleDate: tx.transactionDate,
                    });
                } else {
                    existing.totalSold += tx.quantity;
                    // Keep the most recent transaction's ref
                    if (new Date(tx.transactionDate) > new Date(existing.lastSaleDate)) {
                        existing.lastSaleDate = tx.transactionDate;
                        existing.lastSaleRef = tx.referenceNumber;
                    }
                }
            });

            setSoldProducts(Array.from(map.values()));
        } catch {
            setError('Failed to load your sales history.');
        } finally {
            setTxLoading(false);
        }
    }, []);

    // ── Fetch my return history ────────────────────────────────────────────────
    const fetchMyReturns = useCallback(async () => {
        try {
            setHistoryLoading(true);
            const res = await returnApi.getMyReturns();
            setMyReturns(res.data);
        } catch {
            // non-fatal
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMyTransactions();
        fetchMyReturns();
    }, [fetchMyTransactions, fetchMyReturns]);

    // Real-time: refresh history when return events arrive
    const { subscribe } = useWebSocket();
    useEffect(() => {
        const unsub = subscribe('/topic/returns', fetchMyReturns);
        return () => unsub();
    }, [subscribe, fetchMyReturns]);

    // ── Load managers when a product is selected ──────────────────────────────
    useEffect(() => {
        if (!selected) { setManagers([]); return; }
        approvalApi.getOnlineManagers(selected.productId)
            .then(r => setManagers(r.data))
            .catch(() => setManagers([]));
    }, [selected]);

    // ── Select a product → move to form ──────────────────────────────────────
    const selectProduct = (sp: SoldProduct) => {
        setSelected(sp);
        setError('');
        setSuccess('');
        setForm({
            quantity: '1',
            returnReason: '',
            itemCondition: '',
            managerId: '',
            originalSaleRef: sp.lastSaleRef || '',
            customerName: '',
            staffNotes: '',
        });
        setView('form');
    };

    // ── Submit the return request ─────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        setError(''); setSuccess(''); setSubmitting(true);
        try {
            await returnApi.raiseReturn({
                productId: selected.productId,
                quantity: Number(form.quantity),
                returnReason: form.returnReason as ReturnReason,
                itemCondition: form.itemCondition as ItemCondition,
                managerId: Number(form.managerId),
                originalSaleRef: form.originalSaleRef || undefined,
                customerName: form.customerName || undefined,
                staffNotes: form.staffNotes || undefined,
            });
            setSuccess(`✅ Return request for "${selected.productName}" submitted! Your manager has been notified.`);
            await fetchMyReturns();
            // After 1.5 s go to history so staff can see the new request
            setTimeout(() => setView('history'), 1500);
        } catch (e: any) {
            setError(e.response?.data?.message || 'Failed to submit return request.');
        } finally {
            setSubmitting(false);
        }
    };

    const pendingCount = myReturns.filter(r => r.status === 'PENDING').length;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 p-6">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* ── Header ──────────────────────────────────────────────── */}
                <div>
                    <button onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-500 hover:text-gray-800 mb-3 text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <div className="p-2 bg-teal-100 rounded-xl">
                                    <RotateCcw className="w-6 h-6 text-teal-600" />
                                </div>
                                Process Customer Return
                            </h1>
                            <p className="text-gray-500 text-sm mt-1 ml-12">
                                Returns can only be raised for products you have previously sold
                            </p>
                        </div>
                        <button onClick={() => { fetchMyTransactions(); fetchMyReturns(); }}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition-colors">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-2 items-start">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                        {success}
                    </div>
                )}

                {/* ── Tab bar ─────────────────────────────────────────────── */}
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setView('pick')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'pick'
                            ? 'bg-teal-600 text-white shadow'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                        New Return
                    </button>
                    <button onClick={() => setView('history')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'history'
                            ? 'bg-teal-600 text-white shadow'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                        My Returns
                        {pendingCount > 0 && (
                            <span className="ml-1.5 bg-amber-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    VIEW: PICK a sold product to return
                ══════════════════════════════════════════════════════════ */}
                {view === 'pick' && (
                    <>
                        {txLoading ? (
                            <div className="flex flex-col items-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                                <p className="text-sm text-gray-500 mt-3">Loading your sales history…</p>
                            </div>
                        ) : soldProducts.length === 0 ? (
                            /* ── ZERO SALES: show the friendly blocker message ── */
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16 px-8">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ShoppingCart className="w-8 h-8 text-gray-300" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-700 mb-2">
                                    No Stock-Outs Found
                                </h2>
                                <p className="text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
                                    You haven't performed any stock-out (sale) transactions yet.{' '}
                                    <strong>Returns can only be processed for products you have previously sold.</strong>
                                </p>
                                <button
                                    onClick={() => navigate('/staff/stock-out')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 font-semibold text-sm transition-colors">
                                    <ShoppingCart className="w-4 h-4" />
                                    Go to Record a Sale
                                </button>
                            </div>
                        ) : (
                            /* ── SOLD PRODUCTS LIST ── */
                            <div className="space-y-3">
                                <p className="text-sm text-gray-500 font-medium">
                                    Select the product the customer is returning:
                                </p>
                                {soldProducts.map(sp => (
                                    <button key={sp.productId}
                                        onClick={() => selectProduct(sp)}
                                        className="w-full text-left bg-white rounded-xl border border-gray-200 hover:border-teal-400 hover:shadow-md p-4 flex items-center justify-between gap-4 transition-all group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Package className="w-5 h-5 text-teal-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
                                                    {sp.productName}
                                                </p>
                                                <p className="text-xs font-mono text-gray-400">{sp.productSku}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-gray-400">Total sold by you</p>
                                                <p className="font-bold text-gray-800">
                                                    {sp.totalSold} <span className="text-xs font-normal text-gray-400">units</span>
                                                </p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <p className="text-xs text-gray-400">Last sale</p>
                                                <p className="text-xs text-gray-600">{fmt(sp.lastSaleDate)}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ══════════════════════════════════════════════════════════
                    VIEW: FORM — fill return details for selected product
                ══════════════════════════════════════════════════════════ */}
                {view === 'form' && selected && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

                        {/* Product pill */}
                        <div className="flex items-center gap-3 mb-5 p-3 bg-teal-50 border border-teal-200 rounded-xl">
                            <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                                <p className="font-semibold text-teal-900">{selected.productName}</p>
                                <p className="text-xs font-mono text-teal-500">{selected.productSku}</p>
                            </div>
                            <button onClick={() => setView('pick')}
                                className="ml-auto text-xs text-teal-600 hover:text-teal-800 underline underline-offset-2">
                                Change
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity Being Returned <span className="text-red-500">*</span>
                                    <span className="text-gray-400 font-normal ml-1">
                                        (you sold {selected.totalSold} total)
                                    </span>
                                </label>
                                <input type="number" min="1" max={selected.totalSold} required
                                    value={form.quantity}
                                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none"
                                    placeholder="Units returned by customer"
                                />
                            </div>

                            {/* Return Reason */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Return Reason <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select required
                                        value={form.returnReason}
                                        onChange={e => setForm(f => ({ ...f, returnReason: e.target.value as ReturnReason }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none appearance-none bg-white pr-8">
                                        <option value="">Select a reason…</option>
                                        {(Object.keys(RETURN_REASON_LABELS) as ReturnReason[]).map(r => (
                                            <option key={r} value={r}>{RETURN_REASON_LABELS[r]}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Item Condition */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Item Condition <span className="text-red-500">*</span>
                                    <span className="text-gray-400 font-normal ml-1">(your physical assessment)</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(Object.keys(CONDITION_LABELS) as ItemCondition[]).map(c => (
                                        <button type="button" key={c}
                                            onClick={() => setForm(f => ({ ...f, itemCondition: c }))}
                                            className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-center ${form.itemCondition === c
                                                ? CONDITION_LABELS[c].color + ' ring-2 ring-offset-1 ring-teal-400'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                                                }`}>
                                            {CONDITION_LABELS[c].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Assign Manager */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <User className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
                                    Assign Manager for Review <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select required
                                        value={form.managerId}
                                        onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
                                        disabled={managers.length === 0}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none appearance-none bg-white pr-8 disabled:bg-gray-50 disabled:text-gray-400">
                                        <option value="">
                                            {managers.length === 0
                                                ? 'No managers available for this product\'s category'
                                                : 'Select a manager…'}
                                        </option>
                                        {managers.map(m => (
                                            <option key={m.id} value={m.id}>
                                                {m.fullName} (@{m.username}) {m.isOnline ? '🟢 Online' : '🔴 Offline'}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Optional fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <Hash className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                                        Sale Reference
                                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                                    </label>
                                    <input type="text"
                                        value={form.originalSaleRef}
                                        onChange={e => setForm(f => ({ ...f, originalSaleRef: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none"
                                        placeholder="e.g. INV-2024-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        <User className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                                        Customer Name
                                        <span className="text-gray-400 font-normal ml-1">(optional)</span>
                                    </label>
                                    <input type="text"
                                        value={form.customerName}
                                        onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none"
                                        placeholder="Customer name"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <FileText className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
                                    Your Notes
                                    <span className="text-gray-400 font-normal ml-1">(optional)</span>
                                </label>
                                <textarea rows={2}
                                    value={form.staffNotes}
                                    onChange={e => setForm(f => ({ ...f, staffNotes: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-400 focus:border-teal-400 outline-none resize-none"
                                    placeholder="Describe the issue or any observations…"
                                />
                            </div>

                            {/* Submit */}
                            <button type="submit"
                                disabled={submitting || !form.itemCondition || !form.returnReason || !form.managerId}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors text-sm">
                                <Send className="w-4 h-4" />
                                {submitting ? 'Submitting…' : 'Submit Return Request'}
                            </button>
                        </form>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    VIEW: HISTORY — all my return requests
                ══════════════════════════════════════════════════════════ */}
                {view === 'history' && (
                    <>
                        {historyLoading ? (
                            <div className="flex flex-col items-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
                                <p className="text-sm text-gray-500 mt-3">Loading your return requests…</p>
                            </div>
                        ) : myReturns.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16">
                                <RotateCcw className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                                <p className="font-medium text-gray-600">No return requests yet</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Click "New Return" above to raise your first return request.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {myReturns.map(req => {
                                    const meta = STATUS_META[req.status];
                                    const StatusIcon = meta.icon;
                                    return (
                                        <div key={req.id}
                                            className={`bg-white rounded-xl shadow-sm border ${meta.border} p-5`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 space-y-2">
                                                    {/* Product */}
                                                    <div className="flex items-center gap-2">
                                                        <Package className="w-4 h-4 text-indigo-500" />
                                                        <p className="font-semibold text-gray-900">{req.productName}</p>
                                                        <span className="text-xs font-mono text-gray-400">{req.productSku}</span>
                                                    </div>
                                                    {/* Reason + Condition chips */}
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                                                            {RETURN_REASON_LABELS[req.returnReason]}
                                                        </span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${CONDITION_LABELS[req.itemCondition].color}`}>
                                                            {req.itemCondition}
                                                        </span>
                                                    </div>
                                                    {/* Manager */}
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <User className="w-3.5 h-3.5" />
                                                        Manager: <span className="font-medium text-gray-700">{req.managerFullName}</span>
                                                    </div>
                                                    {/* Timestamps */}
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        Requested: {fmt(req.requestedAt)}
                                                        {req.resolvedAt && <> · Resolved: {fmt(req.resolvedAt)}</>}
                                                    </div>
                                                    {/* Notes */}
                                                    {req.staffNotes && (
                                                        <p className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                            <span className="font-medium">Your note:</span> {req.staffNotes}
                                                        </p>
                                                    )}
                                                    {req.managerNotes && (
                                                        <p className={`text-sm px-3 py-1.5 rounded-lg ${req.status === 'APPROVED_RESTOCK'
                                                            ? 'bg-green-50 text-green-800'
                                                            : req.status === 'APPROVED_DAMAGE'
                                                                ? 'bg-orange-50 text-orange-800'
                                                                : 'bg-red-50 text-red-800'
                                                            }`}>
                                                            <span className="font-medium">Manager note:</span> {req.managerNotes}
                                                        </p>
                                                    )}
                                                    {req.stockTransactionId && (
                                                        <p className="text-xs text-teal-600">
                                                            Transaction #{req.stockTransactionId} created
                                                        </p>
                                                    )}
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
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
