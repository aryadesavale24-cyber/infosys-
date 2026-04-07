import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalApi, ApprovalRequest } from '../services/approvalApi';
import {
    ArrowLeft, Clock, CheckCircle2, XCircle, Package, User, Calendar, RefreshCw,
} from 'lucide-react';

const STATUS_META = {
    PENDING: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-800', icon: Clock, border: 'border-amber-200' },
    APPROVED: { label: 'Approved', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2, border: 'border-green-200' },
    REJECTED: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle, border: 'border-red-200' },
};

function fmt(dt?: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function StaffApprovalRequests() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await approvalApi.getMyRequests();
            setRequests(res.data);
        } catch {
            setError('Failed to load your approval requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div>
                    <button onClick={() => navigate('/staff/stock-out')}
                        className="flex items-center text-gray-500 hover:text-gray-800 mb-3 text-sm">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Stock Out
                    </button>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="w-7 h-7 text-amber-500" /> My Approval Requests
                        </h1>
                        <button onClick={fetchData}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 bg-white rounded-lg hover:bg-gray-50 text-sm">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                        Track the status of your large stock-out requests awaiting manager approval.
                    </p>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

                {loading ? (
                    <div className="flex flex-col items-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
                        <p className="text-sm text-gray-500 mt-3">Loading…</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16 text-gray-400">
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-gray-600">No approval requests yet</p>
                        <p className="text-sm mt-1">When you sell more than 10 units, your request will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {requests.map(req => {
                            const meta = STATUS_META[req.status];
                            const Icon = meta.icon;
                            return (
                                <div key={req.id} className={`bg-white rounded-xl shadow-sm border ${meta.border} p-5`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Package className="w-4 h-4 text-indigo-500" />
                                                <p className="font-semibold text-gray-900">{req.productName}</p>
                                                <span className="text-xs font-mono text-gray-400">{req.productSku}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <User className="w-4 h-4 text-gray-400" />
                                                Assigned to: <span className="font-medium">{req.managerFullName}</span>
                                                <span className="text-gray-400">@{req.managerUsername}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar className="w-4 h-4" />
                                                Requested: {fmt(req.requestedAt)}
                                            </div>
                                            {req.resolvedAt && (
                                                <div className="text-sm text-gray-500">
                                                    Resolved: {fmt(req.resolvedAt)}
                                                </div>
                                            )}
                                            {req.notes && (
                                                <p className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg mt-2">
                                                    <span className="font-medium">Your note:</span> {req.notes}
                                                </p>
                                            )}
                                            {req.managerNote && (
                                                <p className={`text-sm px-3 py-1.5 rounded-lg mt-1 ${req.status === 'APPROVED' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                                    }`}>
                                                    <span className="font-medium">Manager note:</span> {req.managerNote}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.text}`}>
                                                <Icon className="w-3.5 h-3.5" />{meta.label}
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
            </div>
        </div>
    );
}
