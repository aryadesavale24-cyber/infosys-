import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierApi } from '../services/supplierApi';
import { Supplier } from '../types/supplier';
import { ArrowLeft, Building2, User, FileText, CheckCircle2, History, AlertTriangle } from 'lucide-react';

function formatDate(dt?: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

export default function SupplierHistory() {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await supplierApi.getByStatus('APPROVED', 0, 100);
            setSuppliers(res.data.content);
        } catch {
            setError('Failed to load supplier history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                <div>
                    <button onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-500 hover:text-gray-800 mb-3 text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <History className="w-7 h-7 text-emerald-500" /> Approved Supplier History
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        View the complete history of all suppliers that have been approved, including their details and who requested them.
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4" />
                        <p className="text-emerald-700 font-medium">Loading history...</p>
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-20 flex flex-col items-center">
                        <Building2 className="w-16 h-16 text-gray-200 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No approved suppliers found</h3>
                        <p className="text-gray-500 max-w-sm">There are currently no approved suppliers in the history logs.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {suppliers.map(supplier => (
                            <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-gray-100 bg-emerald-50/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-gray-900 truncate" title={supplier.companyName}>
                                            {supplier.companyName}
                                        </h3>
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                                        <User className="w-4 h-4 text-gray-400" />
                                        {supplier.contactPersonName}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Building2 className="w-4 h-4 text-gray-400" />
                                        {supplier.city}, {supplier.state}
                                    </div>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Business Details</p>
                                        <ul className="text-sm text-gray-700 space-y-1">
                                            <li><span className="font-medium">GST:</span> <span className="font-mono text-gray-500">{supplier.gstNumber}</span></li>
                                            <li><span className="font-medium">Products:</span> {supplier.productsSupplied || '—'}</li>
                                            <li><span className="font-medium">Experience:</span> {supplier.yearsInBusiness ? `${supplier.yearsInBusiness} years` : '—'}</li>
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Approval Info</p>
                                        <ul className="text-sm text-gray-700 space-y-1">
                                            <li><span className="font-medium">Requested By:</span> {supplier.requestedByFullName ? `${supplier.requestedByFullName} (@${supplier.requestedByUsername})` : <span className="text-gray-500 italic">Self-Registered / Public</span>}</li>
                                            <li><span className="font-medium">Approved By:</span> <span className="text-gray-500">@{supplier.reviewedByUsername || '—'}</span></li>
                                            <li><span className="font-medium">Approved On:</span> {formatDate(supplier.approvedAt)}</li>
                                        </ul>
                                    </div>

                                    {supplier.adminRemarks && (
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText className="w-3 h-3" /> Admin Remarks</p>
                                            <p className="text-sm text-gray-700 italic">"{supplier.adminRemarks}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
