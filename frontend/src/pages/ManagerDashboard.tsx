import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    managerAssignmentApi,
    ManagerProduct,
    CoManager,
    ManagerCategoryAssignment,
} from '../services/managerAssignmentApi';
import {
    ArrowLeft, Package, AlertTriangle, Users, Tag,
    Search, Filter, ChevronDown, Mail, Info, TrendingDown,
    CheckCircle2, XCircle, BarChart2, ShieldCheck,
} from 'lucide-react';

type StockFilter = 'ALL' | 'LOW' | 'OUT' | 'OK';

export default function ManagerDashboard() {
    const navigate = useNavigate();

    const [products, setProducts] = useState<ManagerProduct[]>([]);
    const [coManagers, setCoManagers] = useState<CoManager[]>([]);
    const [myCategories, setMyCategories] = useState<ManagerCategoryAssignment[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // filters
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState<string>('ALL');
    const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [prodRes, coMgrRes, myAssignRes] = await Promise.all([
                managerAssignmentApi.getMyProducts(),
                managerAssignmentApi.getCoManagers(),
                managerAssignmentApi.getMyAssignments(),
            ]);
            setProducts(prodRes.data);
            setCoManagers(coMgrRes.data);
            setMyCategories(myAssignRes.data);
        } catch {
            setError('Failed to load manager data. Please refresh or contact admin.');
        } finally {
            setLoading(false);
        }
    };

    // Unique category names from my products
    const myCategoryNames = useMemo(() => {
        const set = new Set(products.map(p => p.categoryName));
        return Array.from(set).sort();
    }, [products]);

    // Filtered products
    const filtered = useMemo(() => {
        return products.filter(p => {
            const matchSearch =
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.sku.toLowerCase().includes(search.toLowerCase()) ||
                (p.brand?.toLowerCase() ?? '').includes(search.toLowerCase());

            const matchCat = catFilter === 'ALL' || p.categoryName === catFilter;

            const matchStock =
                stockFilter === 'ALL' ||
                (stockFilter === 'OUT' && p.isOutOfStock) ||
                (stockFilter === 'LOW' && p.isLowStock && !p.isOutOfStock) ||
                (stockFilter === 'OK' && !p.isLowStock && !p.isOutOfStock);

            return matchSearch && matchCat && matchStock;
        });
    }, [products, search, catFilter, stockFilter]);

    // Co-managers grouped by category
    const coMgrByCategory = useMemo(() => {
        const map: Record<string, CoManager[]> = {};
        coManagers.forEach(cm => {
            if (!map[cm.categoryName]) map[cm.categoryName] = [];
            if (!map[cm.categoryName].find(x => x.managerId === cm.managerId)) {
                map[cm.categoryName].push(cm);
            }
        });
        return map;
    }, [coManagers]);

    // Stats
    const lowCount = products.filter(p => p.isLowStock && !p.isOutOfStock).length;
    const outCount = products.filter(p => p.isOutOfStock).length;
    const okCount = products.filter(p => !p.isLowStock && !p.isOutOfStock).length;

    const stockBadge = (p: ManagerProduct) => {
        if (p.isOutOfStock) return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                <XCircle className="w-3 h-3" /> Out of Stock
            </span>
        );
        if (p.isLowStock) return (
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

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
                            <div className="p-2 bg-blue-100 rounded-xl">
                                <Package className="w-7 h-7 text-blue-600" />
                            </div>
                            My Category Products
                        </h1>
                        <p className="text-gray-500 mt-1 ml-14 text-sm">
                            Showing only products from your assigned categories ·{' '}
                            <span className="font-semibold text-blue-700">{myCategoryNames.join(', ') || '—'}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/manager/assign-staff')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                        <Users className="w-4 h-4" /> Assign Staff
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />{error}
                    </div>
                )}

                {/* Stats row */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Products', value: products.length, icon: Package, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
                            { label: 'In Stock', value: okCount, icon: CheckCircle2, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
                            { label: 'Low Stock', value: lowCount, icon: AlertTriangle, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
                            { label: 'Out of Stock', value: outCount, icon: XCircle, color: 'bg-red-500', light: 'bg-red-50 text-red-700' },
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

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                    {/* ── Main product table (3/4 width) ── */}
                    <div className="xl:col-span-3 space-y-4">

                        {/* Filters */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <div className="flex flex-col md:flex-row gap-3">
                                {/* Search */}
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search by name, SKU or brand…"
                                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                {/* Category filter */}
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select
                                        value={catFilter}
                                        onChange={e => setCatFilter(e.target.value)}
                                        className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                    >
                                        <option value="ALL">All Categories</option>
                                        {myCategoryNames.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                                {/* Stock filter */}
                                <div className="relative">
                                    <BarChart2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <select
                                        value={stockFilter}
                                        onChange={e => setStockFilter(e.target.value as StockFilter)}
                                        className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                                    >
                                        <option value="ALL">All Stock</option>
                                        <option value="OK">In Stock</option>
                                        <option value="LOW">Low Stock</option>
                                        <option value="OUT">Out of Stock</option>
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No products found</p>
                                    <p className="text-sm mt-1">
                                        {products.length === 0
                                            ? 'No categories have been assigned to you yet. Contact your Admin.'
                                            : 'Try adjusting your search or filters.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                {['Product', 'SKU', 'Category', 'Stock', 'Reorder Lvl', 'Sell Price', 'Status'].map(h => (
                                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filtered.map(p => (
                                                <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-900">{p.name}</p>
                                                        {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.sku}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                                                            <Tag className="w-3 h-3" />{p.categoryName}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`font-bold text-base ${p.isOutOfStock ? 'text-red-600'
                                                            : p.isLowStock ? 'text-amber-600'
                                                                : 'text-emerald-600'
                                                            }`}>
                                                            {p.currentStock}
                                                        </span>
                                                        {p.unit && <span className="text-xs text-gray-400 ml-1">{p.unit}</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">{p.reorderLevel}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-800">
                                                        ₹{typeof p.sellingPrice === 'number' ? p.sellingPrice.toFixed(2) : p.sellingPrice}
                                                    </td>
                                                    <td className="px-4 py-3">{stockBadge(p)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
                                        Showing {filtered.length} of {products.length} products
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Co-manager sidebar (1/4 width) ── */}
                    <div className="xl:col-span-1 space-y-4">

                        {/* My Categories card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3 text-sm">
                                <Tag className="w-4 h-4 text-blue-600" /> My Assigned Categories
                            </h3>
                            {myCategories.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-3">No categories assigned yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {myCategories.map(mc => (
                                        <div key={mc.id} className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-lg">
                                            <span className="text-sm font-medium text-blue-800">{mc.categoryName}</span>
                                            <span className="text-xs text-blue-500">Active</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Co-managers card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-1 text-sm">
                                <Users className="w-4 h-4 text-indigo-600" /> Co-Managers
                            </h3>
                            <div className="flex items-start gap-1.5 mb-3 p-2 bg-indigo-50 rounded-lg">
                                <Info className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-indigo-700">
                                    Other managers who also handle one of your categories. Coordinate with them to avoid double-handling.
                                </p>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-6">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                                </div>
                            ) : Object.keys(coMgrByCategory).length === 0 ? (
                                <div className="text-center py-6 text-gray-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs">No co-managers on your categories</p>
                                    <p className="text-xs text-gray-300 mt-1">You have exclusive control</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(coMgrByCategory).map(([catName, mgrs]) => (
                                        <div key={catName}>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <Tag className="w-3 h-3 text-blue-500" />
                                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">{catName}</span>
                                            </div>
                                            <div className="space-y-2 pl-1">
                                                {mgrs.map(cm => (
                                                    <div key={cm.managerId} className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/50">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                                                                {cm.managerFullName.charAt(0)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-gray-900 truncate">{cm.managerFullName}</p>
                                                                <p className="text-xs text-gray-400">@{cm.managerUsername}</p>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={`mailto:${cm.managerEmail}`}
                                                            className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition-colors"
                                                        >
                                                            <Mail className="w-3 h-3" />
                                                            <span className="truncate">{cm.managerEmail}</span>
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick action – Stock out */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white">
                            <TrendingDown className="w-6 h-6 mb-2 opacity-80" />
                            <p className="font-semibold text-sm">Record a Sale</p>
                            <p className="text-xs opacity-70 mt-1 mb-3">
                                Stock out products from your categories.
                            </p>
                            <button
                                onClick={() => navigate('/stock/out')}
                                className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                            >
                                Go to Stock Out →
                            </button>
                        </div>

                        {/* Quick action – Approval requests */}
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white">
                            <ShieldCheck className="w-6 h-6 mb-2 opacity-80" />
                            <p className="font-semibold text-sm">Staff Approval Requests</p>
                            <p className="text-xs opacity-70 mt-1 mb-3">
                                Review pending stock-out requests from your staff.
                            </p>
                            <button
                                onClick={() => navigate('/manager/approvals')}
                                className="w-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                            >
                                View Requests →
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
