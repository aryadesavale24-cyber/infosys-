import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supplierApi } from '../services/supplierApi';
import { Supplier } from '../types/supplier';
import { Building2, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

export default function PendingSuppliers() {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [remarks, setRemarks] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchPendingSuppliers();
    }, []);

    const fetchPendingSuppliers = async () => {
        try {
            setLoading(true);
            const response = await supplierApi.getPending();
            setSuppliers(response.data);
        } catch (error) {
            console.error('Error fetching pending suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedSupplier) return;

        try {
            setProcessing(true);
            await supplierApi.approve(selectedSupplier.id, remarks);
            setShowApproveModal(false);
            setRemarks('');
            setSelectedSupplier(null);
            fetchPendingSuppliers();
        } catch (error) {
            console.error('Error approving supplier:', error);
            alert('Failed to approve supplier');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedSupplier || !rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        try {
            setProcessing(true);
            await supplierApi.reject(selectedSupplier.id, rejectionReason);
            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedSupplier(null);
            fetchPendingSuppliers();
        } catch (error) {
            console.error('Error rejecting supplier:', error);
            alert('Failed to reject supplier');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-8 h-8" />
                        Pending Supplier Approvals
                    </h1>
                    <p className="text-gray-600 mt-1">
                        {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} awaiting approval
                    </p>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading pending suppliers...</p>
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">No pending suppliers</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {suppliers.map((supplier) => (
                            <div key={supplier.id} className="bg-white rounded-lg shadow-md p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-semibold text-gray-900">{supplier.companyName}</h3>
                                        <p className="text-gray-600 mt-1">{supplier.contactPersonName}</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Email</p>
                                                <p className="text-gray-900">{supplier.email}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Phone</p>
                                                <p className="text-gray-900">{supplier.phoneNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">GST Number</p>
                                                <p className="text-gray-900 font-mono">{supplier.gstNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Trade License</p>
                                                <p className="text-gray-900 font-mono">{supplier.tradeLicenseNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Location</p>
                                                <p className="text-gray-900">{supplier.city}, {supplier.state}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500">Registered On</p>
                                                <p className="text-gray-900">{new Date(supplier.createdAt).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        {supplier.businessDescription && (
                                            <div className="mt-4">
                                                <p className="text-sm text-gray-500">Business Description</p>
                                                <p className="text-gray-900">{supplier.businessDescription}</p>
                                            </div>
                                        )}

                                        {supplier.productsSupplied && (
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500">Products Supplied</p>
                                                <p className="text-gray-900">{supplier.productsSupplied}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-4 flex flex-col gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedSupplier(supplier);
                                                setShowApproveModal(true);
                                            }}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedSupplier(supplier);
                                                setShowRejectModal(true);
                                            }}
                                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Approve Modal */}
                {showApproveModal && selectedSupplier && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Approve Supplier</h3>
                            <p className="text-gray-600 mb-4">
                                Are you sure you want to approve <strong>{selectedSupplier.companyName}</strong>?
                            </p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Remarks (Optional)
                                </label>
                                <textarea
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                    rows={3}
                                    placeholder="Add any remarks..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowApproveModal(false);
                                        setRemarks('');
                                        setSelectedSupplier(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApprove}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    disabled={processing}
                                >
                                    {processing ? 'Approving...' : 'Approve'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && selectedSupplier && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                            <h3 className="text-xl font-semibold text-gray-900 mb-4">Reject Supplier</h3>
                            <p className="text-gray-600 mb-4">
                                Are you sure you want to reject <strong>{selectedSupplier.companyName}</strong>?
                            </p>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Rejection Reason <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    rows={3}
                                    placeholder="Provide reason for rejection..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowRejectModal(false);
                                        setRejectionReason('');
                                        setSelectedSupplier(null);
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    disabled={processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    disabled={processing}
                                >
                                    {processing ? 'Rejecting...' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
