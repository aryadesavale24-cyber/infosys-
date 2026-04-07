import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentApi, AssignedProduct, StaffCategoryAssignment } from '../services/assignmentApi';
import { stockApi } from '../services/productApi';
import { approvalApi, OnlineManager } from '../services/approvalApi';
import { useWebSocket } from '../hooks/useWebSocket';
import {
    ArrowLeft, PackageMinus, Tag, AlertCircle, Info,
    ShieldCheck, Clock, User, CheckCircle, Send,
} from 'lucide-react';

const DIRECT_LIMIT = 10;

export default function StaffStockOut() {
    const navigate = useNavigate();
    const { subscribe } = useWebSocket();

    const [products, setProducts] = useState<AssignedProduct[]>([]);
    const [assignments, setAssignments] = useState<StaffCategoryAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [catFilter, setCatFilter] = useState('');

    // Approval flow
    const [onlineManagers, setOnlineManagers] = useState<OnlineManager[]>([]);
    const [loadingManagers, setLoadingManagers] = useState(false);
    const [needsApproval, setNeedsApproval] = useState(false);

    const [formData, setFormData] = useState({
        productId: '',
        quantity: '',
        notes: '',
        referenceNumber: '',
        managerId: '',
        managerNote: '',
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [pr, ar] = await Promise.all([
                assignmentApi.getMyProducts(),
                assignmentApi.getMyStaffAssignments(),
            ]);
            setProducts(pr.data);
            setAssignments(ar.data);
        } catch {
            setError('Failed to load your assigned products.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchManagers = useCallback(async (productId: number) => {
        try {
            setLoadingManagers(true);
            const res = await approvalApi.getOnlineManagers(productId);
            setOnlineManagers(res.data);
        } catch {
            setOnlineManagers([]);
        } finally {
            setLoadingManagers(false);
        }
    }, []);

    // ── Real-time Presence Updates ──────────────────────────────────────────
    useEffect(() => {
        const pid = Number(formData.productId);
        if (!pid) return;

        // When any user logs in/out, re-fetch managers for this product
        const unsub = subscribe('/topic/users', () => {
            console.log('[WS] User status changed - refreshing manager list');
            fetchManagers(pid);
        });
        return unsub;
    }, [formData.productId, subscribe, fetchManagers]);

    useEffect(() => {
        const pid = Number(formData.productId);
        const qty = Number(formData.quantity);
        if (!pid || !qty) {
            setNeedsApproval(false);
            setOnlineManagers([]);
            return;
        }
        if (qty > DIRECT_LIMIT) {
            setNeedsApproval(true);
            fetchManagers(pid);
        } else {
            setNeedsApproval(false);
            setOnlineManagers([]);
        }
    }, [formData.productId, formData.quantity, fetchManagers]);

    const clearForm = () =>
        setFormData({ productId: '', quantity: '', notes: '', referenceNumber: '', managerId: '', managerNote: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.productId || !formData.quantity) return;

        const qty = Number(formData.quantity);
        const product = products.find(p => p.id === Number(formData.productId));
        if (!product) return;

        if (qty > product.currentStock) {
            setError(`Not enough stock. Available: ${product.currentStock} ${product.unit}`);
            return;
        }

        setError('');
        setSuccess('');
        setSubmitting(true);

        try {
            if (needsApproval) {
                if (!formData.managerId) {
                    setError('Please select a manager to approve this request.');
                    setSubmitting(false);
                    return;
                }
                await approvalApi.requestApproval(
                    Number(formData.productId),
                    qty,
                    Number(formData.managerId),
                    formData.notes || undefined,
                    formData.referenceNumber || undefined,
                );
                setSuccess(
                    `✅ Approval request sent! The sale of ${qty} × "${product.name}" is pending manager approval.`
                );
            } else {
                await stockApi.stockOut({
                    productId: Number(formData.productId),
                    quantity: qty,
                    notes: formData.notes || undefined,
                    referenceNumber: formData.referenceNumber || undefined,
                    transactionType: 'SALE' as any,
                } as any);
                setSuccess(`✅ Stock out recorded: ${qty} × "${product.name}"`);
            }

            clearForm();
            setNeedsApproval(false);
            setOnlineManagers([]);
            fetchData();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to process request.');
        } finally {
            setSubmitting(false);
        }
    };

    const uniqueCategories = Array.from(new Set(products.map(p => p.categoryName)));
    const selectedProduct = products.find(p => p.id === Number(formData.productId));
    const filteredProducts = products.filter(p => {
        const matchSearch = !searchTerm ||
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat = !catFilter || p.categoryName === catFilter;
        return matchSearch && matchCat;
    });

    const qty = Number(formData.quantity);
    const isOverLimit = Boolean(formData.quantity) && qty > DIRECT_LIMIT;
    const submitDisabled =
        submitting ||
        !formData.productId ||
        !formData.quantity ||
        (needsApproval && (!formData.managerId || onlineManagers.length === 0));

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* ── Header ─────────────────────────────────────────── */}
                <div>
                    <button onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <PackageMinus className="w-8 h-8 text-red-600" /> Record Stock Out
                            </h1>
                            <p className="text-gray-500 mt-1">
                                You can directly sell up to{' '}
                                <span className="font-semibold text-gray-700">{DIRECT_LIMIT} units</span>{' '}
                                per transaction. Larger quantities need manager approval.
                            </p>
                        </div>
                        <button onClick={() => navigate('/staff/my-requests')}
                            className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 text-sm transition-colors">
                            <Clock className="w-4 h-4" /> My Approval Requests
                        </button>
                    </div>
                </div>

                {/* ── Assigned categories ─────────────────────────────── */}
                {assignments.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
                            <Tag className="w-4 h-4" /> Your Assigned Categories:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {assignments.map(a => (
                                <span key={a.id} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    {a.categoryName}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── No assignments warning ───────────────────────────── */}
                {!loading && assignments.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-amber-800">No Categories Assigned</p>
                            <p className="text-sm text-amber-700 mt-1">
                                Your manager hasn't assigned any product categories to you yet.
                            </p>
                        </div>
                    </div>
                )}

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

                {/* ── Stock Out Form ───────────────────────────────────── */}
                {assignments.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-5">Stock Out Details</h2>

                        {/* Search + category filter */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search Product</label>
                                <input type="text" placeholder="Search by name or SKU…"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setFormData(f => ({ ...f, productId: '' })); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
                                <select value={catFilter}
                                    onChange={e => { setCatFilter(e.target.value); setFormData(f => ({ ...f, productId: '' })); }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm">
                                    <option value="">All My Categories</option>
                                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Product select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Select Product <span className="text-red-500">*</span>
                                </label>
                                <select value={formData.productId}
                                    onChange={e => setFormData(f => ({ ...f, productId: e.target.value, quantity: '', managerId: '' }))}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm">
                                    <option value="">-- Select a product --</option>
                                    {filteredProducts.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.sku}) — Stock: {p.currentStock} {p.unit} | [{p.categoryName}]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selected product info */}
                            {selectedProduct && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <p className="text-gray-500">Category</p>
                                        <p className="font-semibold text-purple-700">{selectedProduct.categoryName}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Current Stock</p>
                                        <p className={`font-semibold ${selectedProduct.currentStock <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                                            {selectedProduct.currentStock} {selectedProduct.unit}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Unit Price</p>
                                        <p className="font-semibold">₹{selectedProduct.sellingPrice?.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">SKU</p>
                                        <p className="font-mono text-xs">{selectedProduct.sku}</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Quantity */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Quantity <span className="text-red-500">*</span>
                                        {selectedProduct && (
                                            <span className="ml-2 text-xs text-gray-400">(max: {selectedProduct.currentStock})</span>
                                        )}
                                    </label>
                                    <input type="number" min="1"
                                        max={selectedProduct?.currentStock ?? undefined}
                                        value={formData.quantity}
                                        onChange={e => setFormData(f => ({ ...f, quantity: e.target.value, managerId: '' }))}
                                        required placeholder="Enter quantity"
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 text-sm ${isOverLimit
                                            ? 'border-amber-400 focus:ring-amber-400 bg-amber-50'
                                            : 'border-gray-300 focus:ring-red-500'
                                            }`} />
                                    {isOverLimit && (
                                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            Quantity exceeds {DIRECT_LIMIT} — manager approval required
                                        </p>
                                    )}
                                </div>
                                {/* Reference */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Invoice No.</label>
                                    <input type="text" value={formData.referenceNumber}
                                        onChange={e => setFormData(f => ({ ...f, referenceNumber: e.target.value }))}
                                        placeholder="Optional"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm" />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea value={formData.notes}
                                    onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                                    rows={2} placeholder="e.g. Sold to customer, store transfer…"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm" />
                            </div>

                            {/* ── APPROVAL SECTION ─────────────────────────────── */}
                            {needsApproval && (
                                <div className="border-2 border-amber-300 bg-amber-50 rounded-xl p-4 space-y-4">
                                    <div className="flex items-center gap-2 text-amber-800 font-semibold">
                                        <ShieldCheck className="w-5 h-5" />
                                        Manager Approval Required
                                    </div>
                                    <p className="text-sm text-amber-700">
                                        Selling <strong>{formData.quantity} units</strong> exceeds the {DIRECT_LIMIT}-unit
                                        direct limit. Select a manager from the product's category to approve this sale.
                                    </p>

                                    {loadingManagers ? (
                                        <div className="flex items-center gap-2 text-amber-600 text-sm">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600" />
                                            Loading managers…
                                        </div>
                                    ) : onlineManagers.length === 0 ? (
                                        <div className="bg-white border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>
                                                No managers are assigned to this product's category yet.
                                                Please contact your admin.
                                            </span>
                                        </div>
                                    ) : (
                                        <div>
                                            <label className="block text-sm font-semibold text-amber-800 mb-2">
                                                <User className="w-4 h-4 inline mr-1" />
                                                Select Manager to Approve <span className="text-red-500">*</span>
                                            </label>
                                            <div className="space-y-2">
                                                {onlineManagers.map(m => (
                                                    <label key={m.id}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${formData.managerId === String(m.id)
                                                            ? 'border-amber-500 bg-amber-100'
                                                            : 'border-amber-200 bg-white hover:border-amber-400'
                                                            }`}>
                                                        <input type="radio" name="managerId" value={m.id}
                                                            checked={formData.managerId === String(m.id)}
                                                            onChange={() => setFormData(f => ({ ...f, managerId: String(m.id) }))}
                                                            className="accent-amber-500" />
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900">{m.fullName}</p>
                                                            <p className="text-xs text-gray-500">@{m.username}</p>
                                                        </div>
                                                        {m.isOnline ? (
                                                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                                                Online
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                                                                Available
                                                            </span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Total estimate */}
                            {selectedProduct && formData.quantity && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm flex justify-between items-center">
                                    <span className="text-gray-700">Estimated Value:</span>
                                    <span className="font-bold text-red-700 text-lg">
                                        ₹{(selectedProduct.sellingPrice * Number(formData.quantity)).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {/* Submit */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={clearForm}
                                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                                    Clear
                                </button>
                                <button type="submit" disabled={submitDisabled}
                                    className={`px-6 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 text-sm ${needsApproval
                                        ? 'bg-amber-500 hover:bg-amber-600'
                                        : 'bg-red-600 hover:bg-red-700'
                                        }`}>
                                    {needsApproval
                                        ? <><Send className="w-4 h-4" />{submitting ? 'Sending…' : 'Send Approval Request'}</>
                                        : <><PackageMinus className="w-4 h-4" />{submitting ? 'Recording…' : 'Record Stock Out'}</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ── Products overview table ──────────────────────────── */}
                {products.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            Your Assigned Products ({products.length})
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 text-left">
                                        <th className="px-4 py-3 font-medium">Product</th>
                                        <th className="px-4 py-3 font-medium">SKU</th>
                                        <th className="px-4 py-3 font-medium">Category</th>
                                        <th className="px-4 py-3 font-medium">Stock</th>
                                        <th className="px-4 py-3 font-medium">Price</th>
                                        <th className="px-4 py-3 font-medium">Sell Limit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {products.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium">{p.name}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs">
                                                    {p.categoryName}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 font-semibold ${p.currentStock <= 5 ? 'text-red-600' : 'text-green-600'}`}>
                                                {p.currentStock} {p.unit}
                                            </td>
                                            <td className="px-4 py-3">₹{p.sellingPrice?.toFixed(2)}</td>
                                            <td className="px-4 py-3">
                                                {p.currentStock <= DIRECT_LIMIT ? (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                        <CheckCircle className="w-3 h-3" /> Direct (≤{DIRECT_LIMIT})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                                        <ShieldCheck className="w-3 h-3" /> Needs Approval (&gt;{DIRECT_LIMIT})
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
