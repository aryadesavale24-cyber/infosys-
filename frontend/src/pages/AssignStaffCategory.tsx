import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentApi, StaffUser, StaffCategoryAssignment } from '../services/assignmentApi';
import { ArrowLeft, UserCheck, Trash2, Plus, Users } from 'lucide-react';

export default function AssignStaffCategory() {
    const navigate = useNavigate();

    const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [assignments, setAssignments] = useState<StaffCategoryAssignment[]>([]);

    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [notes, setNotes] = useState('');
    const [filterStaff, setFilterStaff] = useState('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [staffRes, catRes, assignRes] = await Promise.all([
                assignmentApi.getAllStaffUsers(),
                assignmentApi.getAssignableCategories(),
                assignmentApi.getMyAssignments(),
            ]);
            setStaffUsers(staffRes.data);
            setCategories(catRes.data);
            setAssignments(assignRes.data);
        } catch (e) {
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStaff || !selectedCategory) return;
        setError('');
        setSuccess('');
        setSubmitting(true);
        try {
            await assignmentApi.assign(Number(selectedStaff), Number(selectedCategory), notes || undefined);
            setSuccess('Category assigned successfully!');
            setSelectedStaff('');
            setSelectedCategory('');
            setNotes('');
            fetchAll();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to assign category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (assignmentId: number, staffName: string, catName: string) => {
        if (!window.confirm(`Remove ${catName} from ${staffName}?`)) return;
        try {
            await assignmentApi.remove(assignmentId);
            setSuccess('Assignment removed.');
            fetchAll();
        } catch {
            setError('Failed to remove assignment');
        }
    };

    // Filter assignments by selected staff for the table
    const filteredAssignments = filterStaff
        ? assignments.filter(a => a.staffId === Number(filterStaff))
        : assignments;

    // Group assignments by staff
    const byStaff: Record<string, StaffCategoryAssignment[]> = {};
    filteredAssignments.forEach(a => {
        const key = `${a.staffId}-${a.staffFullName}`;
        if (!byStaff[key]) byStaff[key] = [];
        byStaff[key].push(a);
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <button onClick={() => navigate('/dashboard')} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <UserCheck className="w-8 h-8 text-blue-600" />
                        Assign Categories to Staff
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Assign product categories to staff members. Staff can only stock out from their assigned categories.
                    </p>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>
                )}

                {/* Assignment Form */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-600" /> New Assignment
                    </h2>
                    <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Staff picker */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Staff Member <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedStaff}
                                onChange={e => setSelectedStaff(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Select Staff --</option>
                                {staffUsers.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.fullName} ({s.username})
                                    </option>
                                ))}
                            </select>
                            {staffUsers.length === 0 && !loading && (
                                <p className="text-xs text-amber-600 mt-1">No STAFF users found. Create staff users first.</p>
                            )}
                        </div>

                        {/* Category picker */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Select Category --</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="e.g. Handle all mobiles"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Submit */}
                        <div className="md:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !selectedStaff || !selectedCategory}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                <UserCheck className="w-4 h-4" />
                                {submitting ? 'Assigning...' : 'Assign Category'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Current Assignments */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" /> Current Assignments
                        </h2>
                        {/* Filter by staff */}
                        <select
                            value={filterStaff}
                            onChange={e => setFilterStaff(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Staff</option>
                            {staffUsers.map(s => (
                                <option key={s.id} value={s.id}>{s.fullName}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                        </div>
                    ) : Object.keys(byStaff).length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No assignments yet. Use the form above to assign categories to staff.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(byStaff).map(([key, staffAssignments]) => {
                                const first = staffAssignments[0];
                                return (
                                    <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                                        {/* Staff header */}
                                        <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                                            <div>
                                                <span className="font-semibold text-gray-900">{first.staffFullName}</span>
                                                <span className="ml-2 text-sm text-gray-500">@{first.staffUsername}</span>
                                                <span className="ml-2 text-sm text-gray-400">{first.staffEmail}</span>
                                            </div>
                                            <span className="text-sm text-blue-600 font-medium">
                                                {staffAssignments.length} categor{staffAssignments.length === 1 ? 'y' : 'ies'}
                                            </span>
                                        </div>

                                        {/* Category rows */}
                                        <div className="divide-y divide-gray-100">
                                            {staffAssignments.map(a => (
                                                <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                                                    <div className="flex items-center gap-3">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                            {a.categoryName}
                                                        </span>
                                                        {a.notes && (
                                                            <span className="text-sm text-gray-500 italic">{a.notes}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-400">
                                                            {new Date(a.assignedAt).toLocaleDateString()}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemove(a.id, a.staffFullName, a.categoryName)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Remove assignment"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
