import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentApi, AssignedProduct, StaffCategoryAssignment } from '../services/assignmentApi';
import {
    Package, Search, Filter, ChevronDown, Tag, ArrowLeft,
    CheckCircle2, AlertTriangle, XCircle, TrendingDown, Info, ShoppingCart,
} from 'lucide-react';

type StockFilter = 'ALL' | 'IN_STOCK' | 'LOW' | 'OUT';

export default function StaffProducts() {
    const navigate = useNavigate();

    const [products, setProducts] = useState<AssignedProduct[]>([]);
    const [myAssignments, setMyAssignments] = useState<StaffCategoryAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('ALL');
    const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [prodRes, assignRes] = await Promise.all([
                assignmentApi.getMyProducts(),
                assignmentApi.getMyStaffAssignments(),
            ]);
            setProducts(prodRes.data);
            setMyAssignments(assignRes.data);
        } catch {
            setError('Failed to load your products. Please refresh or contact your manager.');
        } finally {
            setLoading(false);
        }
    };

    // Derived helpers — AssignedProduct has no isLowStock/isOutOfStock flags,
    // so we infer them from stock vs reorder (backend doesn't return reorderLevel
    // in this lightweight endpoint, so we fall back to currentStock === 0)
    const isOut = (p: AssignedProduct) => p.currentStock === 0;
    const isLow = (p: AssignedProduct) => !isOut(p) && p.currentStock <= 10; // simple heuristic

    const categoryNames = useMemo(() => {
        return Array.from(new Set(products.map(p => p.categoryName))).sort();
    }, [products]);

    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchSearch =
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.sku.toLowerCase().includes(search.toLowerCase());
            const matchCat = catFilter === 'ALL' || p.categoryName === catFilter;
            const matchStock =
                stockFilter === 'ALL' ? true :
                    stockFilter === 'OUT' ? isOut(p) :
                        stockFilter === 'LOW' ? isLow(p) :
                            !isLow(p) && !isOut(p);
            return matchSearch && matchCat && matchStock;
        });
    }, [products, search, catFilter, stockFilter]);

    const totalOut = products.filter(isOut).length;
    const totalLow = products.filter(isLow).length;
    const totalOk = products.length - totalOut - totalLow;

    const stockBadge = (p: AssignedProduct) => {
        if (isOut(p)) return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <XCircle className="w-3 h-3" /> Out of Stock
            </span>
        );
        if (isLow(p)) return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <AlertTriangle className="w-3 h-3" /> Low Stock
            </span>
        );
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-3 h-3" /> In Stock
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="flex items-center text-gray-500 hover:text-gray-800 mb-3 transition-colors text-sm"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-xl">
                                <Package className="w-7 h-7 text-green-600" />
                            </div>
                            My Assigned Products
                        </h1>
                        <p className="text-gray-500 mt-1 ml-14 text-sm">
                            Products in your assigned categories ·{' '}
                            <span className="font-semibold text-green-700">
                                {myAssignments.map(a => a.categoryName).join(', ') || '—'}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/staff/stock-out')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                        <TrendingDown className="w-4 h-4" /> Record Sale
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
                    </div>
                )}

                {/* No-assignment banner */}
                {!loading && myAssignments.length === 0 && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-4 rounded-xl">
                        <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">No categories assigned yet</p>
                            <p className="text-sm mt-0.5">
                                Your manager hasn't assigned any product categories to you yet.
                                Please contact your manager to get access.
                            </p>
                        </div>
                    </div>
                )}

                {/* Stats */}
                {!loading && products.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Products', value: products.length, icon: Package, color: 'bg-green-500' },
                            { label: 'In Stock', value: totalOk, icon: CheckCircle2, color: 'bg-emerald-500' },
                            { label: 'Low Stock', value: totalLow, icon: AlertTriangle, color: 'bg-amber-500' },
                            { label: 'Out of Stock', value: totalOut, icon: XCircle, color: 'bg-red-500' },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                                <div className={`${s.color} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <s.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                                    <p className="text-xs text-gray-500">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                {!loading && products.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search by name or SKU…"
                                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={catFilter}
                                    onChange={e => setCatFilter(e.target.value)}
                                    className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 appearance-none bg-white"
                                >
                                    <option value="ALL">All Categories</option>
                                    {categoryNames.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                            <div className="relative">
                                <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <select
                                    value={stockFilter}
                                    onChange={e => setStockFilter(e.target.value as StockFilter)}
                                    className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 appearance-none bg-white"
                                >
                                    <option value="ALL">All Stock</option>
                                    <option value="IN_STOCK">In Stock</option>
                                    <option value="LOW">Low Stock</option>
                                    <option value="OUT">Out of Stock</option>
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                            <p className="text-sm text-gray-500">Loading your products…</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium text-gray-600">No products found</p>
                            <p className="text-sm mt-1">
                                {products.length === 0
                                    ? 'Your manager has not assigned any categories to you yet.'
                                    : 'Try adjusting your search or filters.'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            {['Product', 'SKU', 'Category', 'Stock', 'Selling Price', 'Status', 'Action'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {filtered.map(p => (
                                            <tr key={p.id} className="hover:bg-green-50/40 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
                                                        <Tag className="w-3 h-3" />{p.categoryName}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`font-bold text-base ${isOut(p) ? 'text-red-600'
                                                            : isLow(p) ? 'text-amber-600'
                                                                : 'text-emerald-600'
                                                        }`}>
                                                        {p.currentStock}
                                                    </span>
                                                    {p.unit && <span className="text-xs text-gray-400 ml-1">{p.unit}</span>}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-800">
                                                    ₹{typeof p.sellingPrice === 'number' ? p.sellingPrice.toLocaleString('en-IN') : p.sellingPrice}
                                                </td>
                                                <td className="px-4 py-3">{stockBadge(p)}</td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        disabled={isOut(p)}
                                                        onClick={() => navigate('/staff/stock-out')}
                                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <TrendingDown className="w-3 h-3" /> Sell
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                                Showing {filtered.length} of {products.length} products
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
