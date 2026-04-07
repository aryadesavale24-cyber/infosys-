import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockApi } from '../services/productApi';
import { StockTransaction } from '../types/product';
import { ArrowLeft, Clock, RefreshCw, ShoppingCart, TrendingDown } from 'lucide-react';

function formatDateTime(dt?: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatCurrency(amount?: number) {
    if (amount === undefined || amount === null) return '—';
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function StaffTransactions() {
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await stockApi.getMyTransactions(0, 100);
            setTransactions(res.data.content);
        } catch {
            setError('Failed to load your transactions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <button onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-500 hover:text-gray-800 mb-3 text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </button>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <TrendingDown className="w-7 h-7 text-emerald-500" /> My Transactions
                        </h1>
                        <button onClick={fetchData}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 bg-white rounded-lg hover:bg-gray-50 text-sm transition-colors shadow-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                        View the history of all stock-out transactions performed by you.
                    </p>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4" />
                        <p className="text-emerald-700 font-medium">Loading transactions...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-20 flex flex-col items-center">
                        <ShoppingCart className="w-16 h-16 text-gray-200 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No transactions found</h3>
                        <p className="text-gray-500 max-w-sm">
                            You haven't recorded any sales or stock-out transactions yet.
                        </p>
                        <button onClick={() => navigate('/staff/stock-out')}
                            className="mt-6 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors">
                            Record a Sale
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-900 uppercase text-xs font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4">Transaction</th>
                                        <th className="px-6 py-4">Product</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4 text-right">Quantity</th>
                                        <th className="px-6 py-4 text-right">Total Amount</th>
                                        <th className="px-6 py-4">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {transactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-medium text-gray-900 text-xs">{tx.referenceNumber || `#${tx.id}`}</div>
                                                <div className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDateTime(tx.transactionDate?.toString())}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 line-clamp-1" title={tx.productName}>{tx.productName}</div>
                                                <div className="text-gray-500 text-xs font-mono">{tx.productSku}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200`}>
                                                    {tx.transactionType.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <span className="font-semibold text-gray-900">{tx.quantity}</span>
                                                <span className="text-gray-500 text-xs ml-1">units</span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap font-medium text-emerald-600">
                                                {formatCurrency(tx.totalAmount)}
                                            </td>
                                            <td className="px-6 py-4 max-w-[200px]">
                                                <p className="text-xs text-gray-600 truncate" title={tx.notes || tx.reason || '—'}>
                                                    {tx.notes || tx.reason || <span className="text-gray-400 italic">No notes</span>}
                                                </p>
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
