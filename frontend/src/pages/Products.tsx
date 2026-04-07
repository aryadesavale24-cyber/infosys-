import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi, categoryApi } from '../services/productApi';
import { Product, Category } from '../types/product';
import {
    Package, Plus, Search, AlertTriangle, X,
    Tag, Calendar, RefreshCw, Layers, Barcode,
    TrendingUp, TrendingDown, Boxes,
    Star, CheckCircle2, Building2, Phone, Mail
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

/* ─── Product Detail Modal ─────────────────────────────────────────────── */
function ProductDetailModal({
    product,
    onClose,
}: {
    product: Product;
    onClose: () => void;
}) {
    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const fmt = (n: number) =>
        `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const fmtDate = (s?: string) => {
        if (!s) return '—';
        return new Date(s).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    };

    const stockBg =
        product.isOutOfStock ? 'from-red-500 to-red-600' :
            product.isLowStock ? 'from-amber-500 to-orange-500' :
                'from-emerald-500 to-green-600';

    const statusColor =
        product.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 ring-emerald-300' :
            product.status === 'DISCONTINUED' ? 'bg-red-100 text-red-800 ring-red-300' :
                'bg-gray-100 text-gray-700 ring-gray-300';

    return (
        /* ── Backdrop ── */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', background: 'rgba(15,23,42,0.55)' }}
            onClick={onClose}
        >
            {/* ── Modal card ── */}
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 animate-modal-in"
                style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.15)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header banner ── */}
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-2xl px-6 pt-6 pb-8 text-white overflow-hidden">
                    {/* decorative circles */}
                    <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                    <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />

                    {/* Close */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="relative flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 ring-2 ring-white/20">
                            <Package className="w-7 h-7 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl font-bold leading-tight truncate">{product.name}</h2>
                            <p className="text-slate-300 text-sm mt-0.5">{product.brand || '—'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-xs font-mono">
                                    <Barcode className="w-3 h-3" /> {product.sku}
                                </span>
                                <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${statusColor}`}>
                                    <CheckCircle2 className="w-3 h-3" /> {product.status}
                                </span>
                                {product.categoryName && (
                                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full text-xs">
                                        <Layers className="w-3 h-3" /> {product.categoryName}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="px-6 py-5 space-y-5">

                    {/* Pricing + Stock cards */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 uppercase tracking-wide">
                                <TrendingDown className="w-3.5 h-3.5" /> Cost Price
                            </div>
                            <p className="text-lg font-bold text-blue-900">{fmt(product.costPrice)}</p>
                        </div>
                        <div className="rounded-xl bg-violet-50 border border-violet-100 p-3.5 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-500 uppercase tracking-wide">
                                <TrendingUp className="w-3.5 h-3.5" /> Selling Price
                            </div>
                            <p className="text-lg font-bold text-violet-900">{fmt(product.sellingPrice)}</p>
                        </div>
                        <div className={`rounded-xl bg-gradient-to-br ${stockBg} p-3.5 flex flex-col gap-1 text-white`}>
                            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-80">
                                <Boxes className="w-3.5 h-3.5" /> In Stock
                            </div>
                            <p className="text-lg font-bold">
                                {product.currentStock} <span className="text-sm font-medium opacity-80">{product.unitOfMeasure || 'PCS'}</span>
                            </p>
                        </div>
                    </div>

                    {/* Profit margin */}
                    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Star className="w-4 h-4 text-amber-400" />
                            <span>Profit Margin</span>
                        </div>
                        <span className="font-bold text-emerald-600">{product.profitMargin?.toFixed(1) ?? '—'}%</span>
                    </div>

                    {/* Info grid */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Details</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <InfoRow icon={Calendar} label="Date Added" value={fmtDate(product.createdAt)} />
                            <InfoRow icon={RefreshCw} label="Last Updated" value={fmtDate(product.updatedAt)} />
                            <InfoRow icon={Tag} label="Category" value={product.categoryName || '—'} />
                            {product.subCategoryName && (
                                <InfoRow icon={Layers} label="Sub-Category" value={product.subCategoryName} />
                            )}
                            <InfoRow icon={Package} label="Manufacturer" value={product.manufacturer || '—'} />
                            {product.barcode && (
                                <InfoRow icon={Barcode} label="Barcode" value={product.barcode} mono />
                            )}
                        </div>
                    </div>

                    {/* Stock thresholds */}
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Stock Levels</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <InfoRow icon={AlertTriangle} label="Reorder Level" value={`${product.reorderLevel} ${product.unitOfMeasure || 'PCS'}`} />
                            {product.maxStockLevel != null && (
                                <InfoRow icon={Boxes} label="Max Stock" value={`${product.maxStockLevel} ${product.unitOfMeasure || 'PCS'}`} />
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Description</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
                        </div>
                    )}

                    {/* Created / updated by */}
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-3 flex items-center justify-between text-xs text-gray-500">
                        <span>Added by <strong className="text-gray-700">{product.createdByUsername || '—'}</strong></span>
                        <span>Updated by <strong className="text-gray-700">{product.updatedByUsername || '—'}</strong></span>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Keyframe style */}
            <style>{`
                @keyframes modal-in {
                    from { opacity: 0; transform: scale(0.95) translateY(8px); }
                    to   { opacity: 1; transform: scale(1)    translateY(0); }
                }
                .animate-modal-in { animation: modal-in 0.2s cubic-bezier(.16,1,.3,1) both; }
            `}</style>
        </div>
    );
}

/* tiny reusable info-row */
function InfoRow({ icon: Icon, label, value, mono = false }: {
    icon: React.ElementType; label: string; value: string; mono?: boolean;
}) {
    return (
        <div className="rounded-lg border border-gray-100 bg-white px-3.5 py-3 flex gap-2.5 items-start">
            <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                <p className={`text-sm font-medium text-gray-800 truncate mt-0.5 ${mono ? 'font-mono' : ''}`}>{value}</p>
            </div>
        </div>
    );
}

/* ─── Products Page ─────────────────────────────────────────────────────── */
export default function Products() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [showLowStock, setShowLowStock] = useState(false);
    const [viewProduct, setViewProduct] = useState<Product | null>(null);

    const { subscribe } = useWebSocket();

    useEffect(() => { fetchCategories(); fetchProducts(); }, [currentPage, selectedCategory, showLowStock]);

    // Real-time: re-fetch whenever the backend reports a product or stock change
    useEffect(() => {
        const unsubP = subscribe('/topic/products', fetchProducts);
        const unsubS = subscribe('/topic/stock', fetchProducts);
        return () => { unsubP(); unsubS(); };
    }, [subscribe]);

    const fetchCategories = async () => {
        try { setCategories((await categoryApi.getAll()).data); }
        catch (e) { console.error(e); }
    };

    const fetchProducts = async () => {
        try {
            setLoading(true);
            let res;
            if (showLowStock) {
                res = await productApi.getLowStock();
                setProducts(res.data);
                setTotalPages(1);
            } else if (selectedCategory) {
                res = await productApi.getByCategory(selectedCategory, currentPage, 10);
                setProducts(res.data.content);
                setTotalPages(res.data.totalPages);
            } else {
                res = await productApi.getAll(currentPage, 10);
                setProducts(res.data.content);
                setTotalPages(res.data.totalPages);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) { fetchProducts(); return; }
        try {
            setLoading(true);
            const res = await productApi.search(searchTerm, currentPage, 10);
            setProducts(res.data.content);
            setTotalPages(res.data.totalPages);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const getStockBadge = (p: Product) =>
        p.isOutOfStock ? 'bg-red-100 text-red-800'
            : p.isLowStock ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800';

    const getStatusBadge = (s: string) =>
        s === 'ACTIVE' ? 'bg-green-100 text-green-800'
            : s === 'INACTIVE' ? 'bg-gray-100 text-gray-800'
                : 'bg-red-100 text-red-800';

    const closeModal = useCallback(() => setViewProduct(null), []);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            {/* Product detail modal */}
            {viewProduct && <ProductDetailModal product={viewProduct} onClose={closeModal} />}

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            <Package className="w-8 h-8" /> Products
                        </h1>
                        <p className="text-gray-600 mt-1">Manage your inventory products</p>
                    </div>
                    <button
                        onClick={() => navigate('/products/add')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Add Product
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name, SKU, or barcode..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            value={selectedCategory || ''}
                            onChange={e => { setSelectedCategory(e.target.value ? Number(e.target.value) : null); setCurrentPage(0); }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button
                            onClick={() => { setShowLowStock(!showLowStock); setCurrentPage(0); }}
                            className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${showLowStock ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            <AlertTriangle className="w-5 h-5" /> Low Stock
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                        <p className="mt-4 text-gray-600">Loading products...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">No products found</p>
                        <button
                            onClick={() => navigate('/products/add')}
                            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Add Your First Product
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="bg-white rounded-lg shadow-md overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Product', 'SKU', 'Category', 'Stock', 'Price', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {products.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                                <div className="text-sm text-gray-500">{p.brand}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{p.sku}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.categoryName || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStockBadge(p)}`}>
                                                    {p.currentStock} {p.unitOfMeasure || 'units'}
                                                </span>
                                                {p.isLowStock && (
                                                    <div className="text-xs text-yellow-600 mt-1">Reorder at: {p.reorderLevel}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">₹{p.sellingPrice.toFixed(2)}</div>
                                                <div className="text-xs text-gray-500">Cost: ₹{p.costPrice.toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(p.status)}`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => setViewProduct(p)}
                                                    className="text-blue-600 hover:text-blue-900 mr-3"
                                                >
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/products/${p.id}/edit`)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/stock/out?productId=${p.id}`)}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    Sell
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-md">
                                <p className="text-sm text-gray-700 hidden sm:block">
                                    Page <span className="font-medium">{currentPage + 1}</span> of{' '}
                                    <span className="font-medium">{totalPages}</span>
                                </p>
                                <nav className="inline-flex rounded-md shadow-sm -space-x-px">
                                    <button
                                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                                        disabled={currentPage === 0}
                                        className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                                        disabled={currentPage === totalPages - 1}
                                        className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </nav>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
