import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { managerAssignmentApi, ManagerUser, ManagerCategoryAssignment } from '../services/managerAssignmentApi';
import { categoryApi } from '../services/productApi';
import { Category } from '../types/product';
import { ArrowLeft, ShieldCheck, Trash2, Plus, Users, AlertCircle, CheckCircle2 } from 'lucide-react';

const MAX_CATEGORIES = 3;

export default function AssignManagerCategory() {
    const navigate = useNavigate();

    const [managers, setManagers] = useState<ManagerUser[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [assignments, setAssignments] = useState<ManagerCategoryAssignment[]>([]);

    const [selectedManager, setSelectedManager] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [notes, setNotes] = useState('');
    const [filterManager, setFilterManager] = useState('');

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            setLoading(true);
            const [mgrRes, catRes, assignRes] = await Promise.all([
                managerAssignmentApi.getAllManagerUsers(),
                categoryApi.getAll(),
                managerAssignmentApi.getAll(),
            ]);
            setManagers(mgrRes.data);
            setCategories(catRes.data);
            setAssignments(assignRes.data);
        } catch {
            setError('Failed to load data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedManager || !selectedCategory) return;
        setError('');
        setSuccess('');
        setSubmitting(true);
        try {
            await managerAssignmentApi.assign(Number(selectedManager), Number(selectedCategory), notes || undefined);
            setSuccess('Category assigned to manager successfully!');
            setSelectedManager('');
            setSelectedCategory('');
            setNotes('');
            fetchAll();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to assign category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemove = async (assignmentId: number, managerName: string, catName: string) => {
        if (!window.confirm(`Remove "${catName}" from manager ${managerName}?`)) return;
        try {
            await managerAssignmentApi.remove(assignmentId);
            setSuccess('Assignment removed.');
            fetchAll();
        } catch {
            setError('Failed to remove assignment');
        }
    };

    // Get count for selected manager
    const selectedManagerData = managers.find(m => m.id === Number(selectedManager));
    const atLimit = selectedManagerData ? !selectedManagerData.canAssignMore : false;

    // Filter assignments
    const filtered = filterManager
        ? assignments.filter(a => a.managerId === Number(filterManager))
        : assignments;

    // Group by manager
    const byManager: Record<string, ManagerCategoryAssignment[]> = {};
    filtered.forEach(a => {
        const key = `${a.managerId}-${a.managerFullName}`;
        if (!byManager[key]) byManager[key] = [];
        byManager[key].push(a);
    });

    // Already assigned category IDs for selected manager (to disable those in dropdown)
    const assignedForSelected = assignments
        .filter(a => a.managerId === Number(selectedManager))
        .map(a => a.categoryId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
                    </button>
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-xl">
                                    <ShieldCheck className="w-7 h-7 text-indigo-600" />
                                </div>
                                Assign Categories to Managers
                            </h1>
                            <p className="text-gray-500 mt-2 ml-14">
                                Control which product categories each manager can oversee. Each manager is limited to{' '}
                                <strong className="text-indigo-700">{MAX_CATEGORIES} categories</strong> maximum.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Rule banner */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-800">
                        <strong>Access Rule:</strong> Managers can only assign product categories to staff from within their
                        own assigned categories. A manager assigned to "Mobiles" can only give staff the "Mobiles" category —
                        not "Laptops". This enforces a clean chain of custody over inventory.
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        {success}
                    </div>
                )}

                {/* Manager Overview Cards */}
                {!loading && managers.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {managers.map(m => {
                            const pct = (m.assignedCategoryCount / MAX_CATEGORIES) * 100;
                            const color = m.assignedCategoryCount >= MAX_CATEGORIES
                                ? 'bg-red-500'
                                : m.assignedCategoryCount >= 2
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500';
                            return (
                                <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{m.fullName}</p>
                                            <p className="text-sm text-gray-400">@{m.username}</p>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${m.assignedCategoryCount >= MAX_CATEGORIES
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {m.assignedCategoryCount}/{MAX_CATEGORIES}
                                        </span>
                                    </div>
                                    {/* capacity bar */}
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div
                                            className={`${color} h-1.5 rounded-full transition-all duration-500`}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {m.canAssignMore
                                            ? `${MAX_CATEGORIES - m.assignedCategoryCount} slot(s) available`
                                            : '⛔ Limit reached'}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Assignment Form */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-indigo-600" /> New Assignment
                    </h2>
                    <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Manager picker */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Manager <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={selectedManager}
                                onChange={e => setSelectedManager(e.target.value)}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">-- Select Manager --</option>
                                {managers.map(m => (
                                    <option key={m.id} value={m.id} disabled={!m.canAssignMore}>
                                        {m.fullName} ({m.assignedCategoryCount}/{MAX_CATEGORIES}){!m.canAssignMore ? ' — FULL' : ''}
                                    </option>
                                ))}
                            </select>
                            {/* Limit warning */}
                            {atLimit && (
                                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    This manager has reached the {MAX_CATEGORIES}-category limit. Remove one first.
                                </p>
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
                                disabled={atLimit}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
                            >
                                <option value="">-- Select Category --</option>
                                {categories.map(c => (
                                    <option
                                        key={c.id}
                                        value={c.id}
                                        disabled={assignedForSelected.includes(c.id)}
                                    >
                                        {c.name}{assignedForSelected.includes(c.id) ? ' ✓ Already assigned' : ''}
                                    </option>
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
                                placeholder="e.g. Handles all mobile products"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>

                        {/* Submit */}
                        <div className="md:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting || !selectedManager || !selectedCategory || atLimit}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                {submitting ? 'Assigning...' : 'Assign Category to Manager'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Current Assignments Table */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" /> Manager Category Assignments
                        </h2>
                        <select
                            value={filterManager}
                            onChange={e => setFilterManager(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All Managers</option>
                            {managers.map(m => (
                                <option key={m.id} value={m.id}>{m.fullName}</option>
                            ))}
                        </select>
                    </div>

                    {loading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
                        </div>
                    ) : Object.keys(byManager).length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No assignments yet. Use the form above to grant categories to managers.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(byManager).map(([key, mgrAssignments]) => {
                                const first = mgrAssignments[0];
                                const mgrData = managers.find(m => m.id === first.managerId);
                                const full = (mgrData?.assignedCategoryCount ?? 0) >= MAX_CATEGORIES;
                                return (
                                    <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                                        {/* Manager header */}
                                        <div className={`px-4 py-3 flex items-center justify-between ${full ? 'bg-red-50' : 'bg-indigo-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                    {first.managerFullName.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-900">{first.managerFullName}</span>
                                                    <span className="ml-2 text-sm text-gray-500">@{first.managerUsername}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${full
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-indigo-100 text-indigo-700'
                                                    }`}>
                                                    {mgrAssignments.length}/{MAX_CATEGORIES} categories
                                                    {full && ' — FULL'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Category rows */}
                                        <div className="divide-y divide-gray-100">
                                            {mgrAssignments.map(a => (
                                                <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                            {a.categoryName}
                                                        </span>
                                                        {a.notes && (
                                                            <span className="text-sm text-gray-400 italic">{a.notes}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-gray-400">
                                                            Assigned {new Date(a.assignedAt).toLocaleDateString()}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemove(a.id, a.managerFullName, a.categoryName)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Remove this assignment"
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
