import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalApi, ApprovalRequest } from '../services/approvalApi';
import {
    ArrowLeft, ShieldCheck, Clock, CheckCircle2, XCircle,
    Package, User, Tag, Calendar, RefreshCw, AlertCircle,
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

const STATUS_META = {
    PENDING: { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-800', icon: Clock },
    APPROVED: { label: 'Approved', bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle2 },
    REJECTED: { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
};

function fmt(dt?: string) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function ManagerApprovals() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'PENDING' | 'ALL'>('PENDING');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [noteMap, setNoteMap] = useState<Record<number, string>>({});
    const [actioningId, setActioningId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = tab === 'PENDING'
                ? await approvalApi.getPending()
                : await approvalApi.getAll();
            setRequests(res.data);
        } catch {
            setError('Failed to load approval requests.');
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Real-time: refresh when approval or stock events arrive
    const { subscribe } = useWebSocket();
    useEffect(() => {
        const unsubA = subscribe('/topic/approvals', fetchData);
        const unsubS = subscribe('/topic/stock', fetchData);
        return () => { unsubA(); unsubS(); };
    }, [subscribe, fetchData]);

    const handleAction = async (id: number, action: 'approve' | 'reject') => {
        setError(''); setSuccess(''); setActioningId(id);
        try {
            const note = noteMap[id] || undefined;
            if (action === 'approve') {
                await approvalApi.approve(id, note);
                setSuccess(`✅ Request #${id} approved — stock-out has been recorded.`);
            } else {
                await approvalApi.reject(id, note);
                setSuccess(`Request #${id} rejected.`);
            }
            await fetchData();
        } catch (e: any) {
            setError(e.response?.data?.message || 'Action failed. Please try again.');
        } finally {
            setActioningId(null);
        }
    };

    const pendingCount = requests.filter(r => r.status === 'PENDING').length;

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
                                <div className="p-2 bg-amber-100 rounded-xl">
                                    <ShieldCheck className="w-7 h-7 text-amber-600" />
                                </div>
                                Approval Requests
                            </h1>
                            <p className="text-gray-500 mt-1 ml-14 text-sm">
                                Approve or reject staff stock-out requests that exceed the 10-unit limit
                            </p>
                        </div>
                        <button onClick={fetchData}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 bg-white rounded-lg hover:bg-gray-50 text-sm transition-colors">
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    </div>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex gap-2 items-center"><AlertCircle className="w-4 h-4" />{error}</div>}
                {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}

                {/* Tabs */}
                <div className="flex gap-2">
                    {(['PENDING', 'ALL'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}>
                            {t === 'PENDING' ? `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` : 'All History'}
                        </button>
                    ))}
                </div>

                {/* List */}
                {loading ? (
                    <div className="flex flex-col items-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        <p className="text-sm text-gray-500 mt-3">Loading requests…</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-16 text-gray-400">
                        <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="font-medium text-gray-600">No {tab === 'PENDING' ? 'pending' : ''} requests</p>
                        <p className="text-sm mt-1">
                            {tab === 'PENDING' ? 'All clear! No stock-out requests waiting for approval.' : 'No approval history yet.'}
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
                                    className={`bg-white rounded-xl shadow-sm border ${isPending ? 'border-amber-200' : 'border-gray-100'
                                        } p-5`}>
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
                                                <span className="text-sm text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">{req.categoryName}</span>
                                            </div>
                                            {/* Staff */}
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                <div>
                                                    <span className="text-sm text-gray-800">{req.staffFullName}</span>
                                                    <span className="text-xs text-gray-400 ml-1">@{req.staffUsername}</span>
                                                </div>
                                            </div>
                                            {/* Requested at */}
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
                                            <span className="text-3xl font-black text-gray-900">{req.quantity}
                                                <span className="text-sm font-normal text-gray-400 ml-1">units</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Notes from staff */}
                                    {req.notes && (
                                        <div className="mt-3 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                                            <span className="font-medium text-gray-700">Staff note: </span>{req.notes}
                                        </div>
                                    )}

                                    {/* Manager note (resolved) */}
                                    {!isPending && req.managerNote && (
                                        <div className={`mt-2 text-sm px-3 py-2 rounded-lg ${req.status === 'APPROVED' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                            <span className="font-medium">Your note: </span>{req.managerNote}
                                        </div>
                                    )}

                                    {/* Approve / Reject controls */}
                                    {isPending && (
                                        <div className="mt-4 border-t border-gray-100 pt-4 flex flex-col sm:flex-row gap-3">
                                            <input
                                                type="text"
                                                placeholder="Optional note to staff…"
                                                value={noteMap[req.id] ?? ''}
                                                onChange={e => setNoteMap(n => ({ ...n, [req.id]: e.target.value }))}
                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
                                            />
                                            <button
                                                onClick={() => handleAction(req.id, 'approve')}
                                                disabled={actioningId === req.id}
                                                className="flex items-center justify-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium">
                                                <CheckCircle2 className="w-4 h-4" />
                                                {actioningId === req.id ? 'Processing…' : 'Approve & Execute'}
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'reject')}
                                                disabled={actioningId === req.id}
                                                className="flex items-center justify-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium">
                                                <XCircle className="w-4 h-4" />
                                                Reject
                                            </button>
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
