import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productApi, categoryApi } from '../services/productApi';
import { assignmentApi } from '../services/assignmentApi';
import { useAuth } from '../context/AuthContext';
import { Category } from '../types/product';
import { Package, ArrowLeft, Info } from 'lucide-react';
import { Role } from '../types';

export default function AddProduct() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const isManager = user?.role === Role.MANAGER;
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        sku: '',
        barcode: '',
        name: '',
        description: '',
        categoryId: '',
        costPrice: '',
        sellingPrice: '',
        currentStock: '0',
        reorderLevel: '',
        maxStockLevel: '',
        manufacturer: '',
        brand: '',
        unitOfMeasure: 'PCS',
    });

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            if (isManager) {
                // Manager: only their assigned categories
                const response = await assignmentApi.getAssignableCategories();
                // getAssignableCategories returns {id, name} objects — cast to Category shape
                setCategories(response.data as unknown as Category[]);
            } else {
                // Admin: all categories
                const response = await categoryApi.getAll();
                setCategories(response.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const productData = {
                ...formData,
                categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
                costPrice: Number(formData.costPrice),
                sellingPrice: Number(formData.sellingPrice),
                currentStock: Number(formData.currentStock),
                reorderLevel: Number(formData.reorderLevel),
                maxStockLevel: formData.maxStockLevel ? Number(formData.maxStockLevel) : undefined,
                status: 'ACTIVE' as const,
            };

            await productApi.create(productData);
            navigate('/products');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
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
                        <Package className="w-8 h-8" />
                        Add New Product
                    </h1>
                </div>

                {/* Form */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Manager restriction banner */}
                    {isManager && (
                        <div className="mb-4 flex items-start gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
                            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">
                                <strong>Manager restriction:</strong> You can only add products to categories assigned to you by an Admin.
                                {categories.length === 0 && ' You currently have no assigned categories — please contact your Admin.'}
                            </span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Information */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        SKU <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="sku"
                                        value={formData.sku}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g., ELEC-APPLE-IPHONE15"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Barcode
                                    </label>
                                    <input
                                        type="text"
                                        name="barcode"
                                        value={formData.barcode}
                                        onChange={handleChange}
                                        placeholder="e.g., 1234567890123"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Product Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g., iPhone 15 Pro 128GB Black"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={3}
                                        placeholder="Product description..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        name="categoryId"
                                        value={formData.categoryId}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unit of Measure
                                    </label>
                                    <select
                                        name="unitOfMeasure"
                                        value={formData.unitOfMeasure}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="PCS">Pieces (PCS)</option>
                                        <option value="KG">Kilograms (KG)</option>
                                        <option value="LITER">Liters (LITER)</option>
                                        <option value="BOX">Box</option>
                                        <option value="PACK">Pack</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cost Price (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="costPrice"
                                        value={formData.costPrice}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Selling Price (₹) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="sellingPrice"
                                        value={formData.sellingPrice}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stock Management */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Management</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Initial Stock <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="currentStock"
                                        value={formData.currentStock}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        placeholder="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Reorder Level <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="reorderLevel"
                                        value={formData.reorderLevel}
                                        onChange={handleChange}
                                        required
                                        min="0"
                                        placeholder="10"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Stock Level
                                    </label>
                                    <input
                                        type="number"
                                        name="maxStockLevel"
                                        value={formData.maxStockLevel}
                                        onChange={handleChange}
                                        min="0"
                                        placeholder="100"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Details */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Manufacturer
                                    </label>
                                    <input
                                        type="text"
                                        name="manufacturer"
                                        value={formData.manufacturer}
                                        onChange={handleChange}
                                        placeholder="e.g., Apple Inc."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Brand
                                    </label>
                                    <input
                                        type="text"
                                        name="brand"
                                        value={formData.brand}
                                        onChange={handleChange}
                                        placeholder="e.g., Apple"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Buttons */}
                        <div className="flex justify-end gap-4 pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => navigate('/products')}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Product'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
