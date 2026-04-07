import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { productApi, stockApi } from '../services/productApi';
import { managerAssignmentApi, ManagerProduct } from '../services/managerAssignmentApi';
import { supplierApi } from '../services/supplierApi';
import { Product } from '../types/product';
import { Supplier } from '../types/supplier';
import {
    ArrowLeft, AlertTriangle, AlertOctagon, TrendingUp,
    Package, Search, RefreshCw, X, CheckCircle2,
    Tag, ChevronRight, Building2, Hash, FileText,
    ShoppingCart, Layers,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────────────────── */
type UnifiedProduct = {
    id: number;
    name: string;
    sku: string;
    brand?: string;
    categoryName?: string;
    categoryId?: number;
    currentStock: number;
    reorderLevel: number;
    maxStockLevel?: number;
    costPrice: number;
    sellingPrice: number;
    isLowStock: boolean;
    isOutOfStock: boolean;
    status: string;
    supplierId?: number;
};

function fromProduct(p: Product): UnifiedProduct {
    return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        categoryName: p.categoryName,
        categoryId: p.categoryId,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        maxStockLevel: p.maxStockLevel,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        isLowStock: p.isLowStock,
        isOutOfStock: p.isOutOfStock,
        status: p.status,
    };
}

function fromManagerProduct(p: ManagerProduct): UnifiedProduct {
    return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        categoryName: p.categoryName,
        categoryId: p.categoryId,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        maxStockLevel: p.maxStockLevel,
        costPrice: Number(p.costPrice),
        sellingPrice: Number(p.sellingPrice),
        isLowStock: p.isLowStock,
        isOutOfStock: p.isOutOfStock,
        status: p.status,
    };
}

function stockPercent(p: UnifiedProduct): number {
    if (!p.reorderLevel || p.reorderLevel === 0) return 0;
    // Show how close current stock is to 2x reorder level (= well-stocked threshold)
    return Math.min(100, Math.round((p.currentStock / (p.reorderLevel * 2)) * 100));
}

/* ─── component ───────────────────────────────────────────────────────── */
export default function LowStockProducts() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const isManager = user?.role === 'MANAGER';
    const canStockIn = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    const [products, setProducts] = useState<UnifiedProduct[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    // Stock-In slide-over state
    const [stockInProduct, setStockInProduct] = useState<UnifiedProduct | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [form, setForm] = useState({
        supplierId: '',
        quantity: '',
        unitPrice: '',
        referenceNumber: '',
        notes: '',
    });

    /* ── fetch ── */
    const fetchData = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const suppliersRes = supplierApi.getVerified();

            let prods: UnifiedProduct[] = [];
            if (isManager) {
                const myProdsRes = await managerAssignmentApi.getMyProducts();
                prods = myProdsRes.data
                    .filter(p => p.isLowStock || p.isOutOfStock)
                    .map(fromManagerProduct);
            } else {
                const [lowRes, outRes] = await Promise.all([
                    productApi.getLowStock(),
                    productApi.getOutOfStock(),
                ]);
                const all = new Map<number, UnifiedProduct>();
                outRes.data.forEach(p => all.set(p.id, fromProduct(p)));
                lowRes.data.forEach(p => { if (!all.has(p.id)) all.set(p.id, fromProduct(p)); });
                prods = Array.from(all.values());
            }

            // Sort: out-of-stock first, then lowest stock %
            prods.sort((a, b) => {
                if (a.isOutOfStock !== b.isOutOfStock) return a.isOutOfStock ? -1 : 1;
                return stockPercent(a) - stockPercent(b);
            });

            setProducts(prods);
            const suppRes = await suppliersRes;
            setSuppliers(suppRes.data);
        } catch (err) {
            console.error('Failed to load low-stock data', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    /* ── search filter ── */
    const displayed = useMemo(() =>
        products.filter(p =>
            !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            (p.categoryName?.toLowerCase() ?? '').includes(search.toLowerCase())
        ), [products, search]);

    /* ── open stock-in panel ── */
    const openStockIn = (product: UnifiedProduct) => {
        setStockInProduct(product);
        setSuccessMsg('');
        setErrorMsg('');
        setForm({
            supplierId: '',
            quantity: '',
            unitPrice: product.costPrice.toString(),
            referenceNumber: '',
            notes: '',
        });
    };

    const closePanel = () => {
        setStockInProduct(null);
        setSuccessMsg('');
        setErrorMsg('');
    };

    /* ── submit stock-in ── */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.supplierId || !form.quantity || !form.unitPrice) {
            setErrorMsg('Please fill all required fields.');
            return;
        }
        setSubmitting(true);
        setErrorMsg('');
        try {
            await stockApi.stockIn({
                productId: stockInProduct!.id,
                transactionType: 'PURCHASE',
                quantity: Number(form.quantity),
                unitPrice: Number(form.unitPrice),
                supplierId: Number(form.supplierId),
                referenceNumber: form.referenceNumber || undefined,
                notes: form.notes || undefined,
            });
            setSuccessMsg(`✓ ${Number(form.quantity)} units added to "${stockInProduct!.name}" successfully!`);
            // Refresh list after 1.5 s delay then close panel
            setTimeout(async () => {
                await fetchData(true);
                closePanel();
            }, 1500);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Failed to add stock. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const totalAmount =
        form.quantity && form.unitPrice
            ? (Number(form.quantity) * Number(form.unitPrice)).toFixed(2)
            : null;

    /* ── Stats ── */
    const outOfStockCount = products.filter(p => p.isOutOfStock).length;
    const lowStockCount = products.filter(p => p.isLowStock && !p.isOutOfStock).length;

    /* ─────────────────────────────────────────── RENDER ─────────────────── */
    return (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50">

            {/* ── backdrop for slide-over ── */}
            {stockInProduct && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                    onClick={closePanel}
                />
            )}

            {/* ── Stock-In Slide-Over Panel ─────────────────────────────── */}
            <div className={`fixed top-0 right-0 h-full w-full sm:w-[480px] z-50 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${stockInProduct ? 'translate-x-0' : 'translate-x-full'}`}>
                {stockInProduct && (
                    <>
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg leading-tight">Stock In</p>
                                    <p className="text-emerald-100 text-xs">Record a purchase / restock</p>
                                </div>
                            </div>
                            <button
                                onClick={closePanel}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Product info strip */}
                        <div className={`px-6 py-4 border-b ${stockInProduct.isOutOfStock ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} flex-shrink-0`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${stockInProduct.isOutOfStock ? 'bg-red-100' : 'bg-amber-100'}`}>
                                    <Package className={`w-5 h-5 ${stockInProduct.isOutOfStock ? 'text-red-600' : 'text-amber-600'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{stockInProduct.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{stockInProduct.sku}</p>
                                    {stockInProduct.categoryName && (
                                        <span className="inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                            <Tag className="w-3 h-3" />{stockInProduct.categoryName}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className={`text-2xl font-bold ${stockInProduct.isOutOfStock ? 'text-red-600' : 'text-amber-600'}`}>
                                        {stockInProduct.currentStock}
                                    </p>
                                    <p className="text-xs text-gray-400">current stock</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Reorder: <span className="font-medium">{stockInProduct.reorderLevel}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Success / Error feedback */}
                        {successMsg && (
                            <div className="mx-6 mt-4 flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{successMsg}</span>
                            </div>
                        )}
                        {errorMsg && (
                            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                {errorMsg}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                            {/* Supplier */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    <Building2 className="w-3.5 h-3.5 inline mr-1" />
                                    Supplier <span className="text-red-500">*</span>
                                    <span className="text-xs text-gray-400 font-normal ml-1">(verified only)</span>
                                </label>
                                <select
                                    id="stockin-supplier"
                                    value={form.supplierId}
                                    onChange={e => setForm({ ...form, supplierId: e.target.value })}
                                    required
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                                >
                                    <option value="">— Select Supplier —</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.companyName} · {s.city}
                                        </option>
                                    ))}
                                </select>
                                {suppliers.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1">No verified suppliers found. Ask admin to approve suppliers.</p>
                                )}
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    <Layers className="w-3.5 h-3.5 inline mr-1" />
                                    Quantity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="stockin-quantity"
                                    type="number"
                                    value={form.quantity}
                                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                                    required
                                    min="1"
                                    placeholder={`e.g. ${Math.max(10, (stockInProduct.reorderLevel * 2) - stockInProduct.currentStock)}`}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                {stockInProduct.reorderLevel > stockInProduct.currentStock && (
                                    <p className="text-xs text-amber-600 mt-1">
                                        Suggested minimum: <strong>{stockInProduct.reorderLevel - stockInProduct.currentStock + 1}</strong> units to reach reorder level
                                    </p>
                                )}
                            </div>

                            {/* Unit Price */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Unit Price (₹) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="stockin-price"
                                    type="number"
                                    value={form.unitPrice}
                                    onChange={e => setForm({ ...form, unitPrice: e.target.value })}
                                    required
                                    min="0.01"
                                    step="0.01"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            {/* Total amount preview */}
                            {totalAmount && (
                                <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                    <span className="text-sm text-gray-600 font-medium">Total Amount</span>
                                    <span className="text-xl font-bold text-emerald-700">₹{totalAmount}</span>
                                </div>
                            )}

                            {/* Reference Number */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    <Hash className="w-3.5 h-3.5 inline mr-1" />
                                    Invoice / PO Number
                                </label>
                                <input
                                    type="text"
                                    value={form.referenceNumber}
                                    onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
                                    placeholder="e.g. INV-2026-001"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                                    Notes
                                </label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm({ ...form, notes: e.target.value })}
                                    rows={2}
                                    placeholder="Batch number, expiry, remarks…"
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </form>

                        {/* Footer buttons */}
                        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
                            <button
                                type="button"
                                onClick={closePanel}
                                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || !!successMsg || suppliers.length === 0}
                                id="submit-stock-in"
                                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding…</>
                                ) : successMsg ? (
                                    <><CheckCircle2 className="w-4 h-4" /> Done!</>
                                ) : (
                                    <><TrendingUp className="w-4 h-4" /> Add Stock</>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* ── Main Content ──────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-amber-400 to-red-500 rounded-xl shadow-md">
                                <AlertTriangle className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Low Stock Items</h1>
                                <p className="text-sm text-gray-500 mt-0.5">
                                    {isManager
                                        ? 'Products in your assigned categories that need restocking'
                                        : 'All products across all categories that need restocking'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing || loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm text-sm font-medium self-end"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
                        {refreshing ? 'Refreshing…' : 'Refresh'}
                    </button>
                </div>

                {/* Summary chips */}
                {!loading && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div className="bg-white border border-red-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow">
                                <AlertOctagon className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                                <p className="text-xs text-gray-500 font-medium">Out of Stock</p>
                            </div>
                        </div>
                        <div className="bg-white border border-amber-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow">
                                <AlertTriangle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
                                <p className="text-xs text-gray-500 font-medium">Low Stock</p>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm col-span-2 sm:col-span-1">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center flex-shrink-0 shadow">
                                <Package className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-800">{products.length}</p>
                                <p className="text-xs text-gray-500 font-medium">Total Needing Restock</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search bar */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by product name, SKU or category…"
                        className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <span className="text-xs text-gray-400 whitespace-nowrap">{displayed.length} items</span>
                </div>

                {/* Product Cards */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-4" />
                            <p className="text-sm text-gray-400">Loading low stock products…</p>
                        </div>
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm py-20 text-center">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">
                            {search ? 'No matches found' : (isManager ? 'All your products are well-stocked!' : 'All products are well-stocked!')}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                            {search ? 'Try a different search term.' : 'No items are below the reorder level right now.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {displayed.map(product => {
                            const pct = stockPercent(product);
                            const isOut = product.isOutOfStock;
                            return (
                                <div
                                    key={product.id}
                                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all ${isOut
                                        ? 'border-l-4 border-l-red-500 border-red-200'
                                        : 'border-l-4 border-l-amber-500 border-amber-200'
                                        }`}
                                >
                                    {/* Card header */}
                                    <div className={`px-4 pt-4 pb-3 ${isOut ? 'bg-red-50' : 'bg-amber-50'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                                                {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                                                <p className="text-xs font-mono text-gray-500 mt-0.5">{product.sku}</p>
                                            </div>
                                            <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isOut
                                                ? 'bg-red-100 text-red-800 border border-red-200'
                                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                                                }`}>
                                                {isOut ? (
                                                    <><AlertOctagon className="w-3 h-3" /> Out of Stock</>
                                                ) : (
                                                    <><AlertTriangle className="w-3 h-3" /> Low Stock</>
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="px-4 py-3 space-y-3">
                                        {/* Category */}
                                        {product.categoryName && (
                                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                                <Tag className="w-3 h-3" />{product.categoryName}
                                            </span>
                                        )}

                                        {/* Stock numbers */}
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className={`text-3xl font-bold ${isOut ? 'text-red-600' : 'text-amber-600'}`}>
                                                    {product.currentStock}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-0.5">current units</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-semibold text-gray-500">{product.reorderLevel}</p>
                                                <p className="text-xs text-gray-400">reorder level</p>
                                            </div>
                                        </div>

                                        {/* Progress bar */}
                                        <div>
                                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                                <span>Stock level</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${isOut ? 'bg-red-500' : pct < 25 ? 'bg-orange-500' : 'bg-amber-400'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Prices */}
                                        <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-50">
                                            <span>Cost: <span className="font-semibold text-gray-700">₹{Number(product.costPrice).toFixed(2)}</span></span>
                                            <span>Sell: <span className="font-semibold text-gray-700">₹{Number(product.sellingPrice).toFixed(2)}</span></span>
                                        </div>
                                    </div>

                                    {/* Footer — action */}
                                    <div className="px-4 pb-4 flex gap-2">
                                        {canStockIn ? (
                                            <button
                                                onClick={() => openStockIn(product)}
                                                id={`stock-in-btn-${product.id}`}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm hover:shadow"
                                            >
                                                <TrendingUp className="w-4 h-4" />
                                                Stock In
                                            </button>
                                        ) : (
                                            <div className="flex-1 flex items-center gap-2 py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500">
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                                Notify your manager to restock
                                            </div>
                                        )}
                                        <button
                                            onClick={() => navigate('/stock/in')}
                                            title="Go to full Stock In form"
                                            className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors flex-shrink-0"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Info banner for Staff */}
                {!loading && user?.role === 'STAFF' && products.length > 0 && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                        <ShoppingCart className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">Action Required</p>
                            <p className="text-xs text-amber-700 mt-0.5">
                                These items are below reorder level. Please notify your manager so they can initiate a purchase order.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
