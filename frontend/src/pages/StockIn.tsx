import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockApi, productApi } from '../services/productApi';
import { supplierApi } from '../services/supplierApi';
import { Product } from '../types/product';
import { Supplier } from '../types/supplier';
import { TrendingUp, ArrowLeft, Package } from 'lucide-react';

export default function StockIn() {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        productId: '',
        supplierId: '',
        quantity: '',
        unitPrice: '',
        referenceNumber: '',
        notes: '',
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [productsRes, suppliersRes] = await Promise.all([
                productApi.getAll(0, 1000),
                supplierApi.getVerified(),
            ]);
            setProducts(productsRes.data.content);
            setSuppliers(suppliersRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === Number(productId));
        setSelectedProduct(product || null);
        setFormData({ ...formData, productId });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.productId || !formData.supplierId || !formData.quantity || !formData.unitPrice) {
            alert('Please fill all required fields');
            return;
        }

        try {
            setLoading(true);
            await stockApi.stockIn({
                productId: Number(formData.productId),
                transactionType: 'PURCHASE',          // required by backend @NotNull
                quantity: Number(formData.quantity),
                unitPrice: Number(formData.unitPrice),
                supplierId: Number(formData.supplierId),
                referenceNumber: formData.referenceNumber || undefined,
                notes: formData.notes || undefined,
            });

            alert('Stock added successfully!');
            navigate('/products');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to add stock');
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = formData.quantity && formData.unitPrice
        ? (Number(formData.quantity) * Number(formData.unitPrice)).toFixed(2)
        : '0.00';

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto">
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
                        <TrendingUp className="w-8 h-8 text-green-600" />
                        Stock In (Purchase)
                    </h1>
                    <p className="text-gray-600 mt-1">Add stock from verified suppliers</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Product Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Product <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.productId}
                                onChange={(e) => handleProductChange(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Select Product --</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} (SKU: {product.sku}) - Current Stock: {product.currentStock}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Product Details */}
                        {selectedProduct && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Product Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-600">Current Stock</p>
                                        <p className="font-semibold text-gray-900">{selectedProduct.currentStock} units</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Reorder Level</p>
                                        <p className="font-semibold text-gray-900">{selectedProduct.reorderLevel} units</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Cost Price</p>
                                        <p className="font-semibold text-gray-900">₹{selectedProduct.costPrice}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600">Selling Price</p>
                                        <p className="font-semibold text-gray-900">₹{selectedProduct.sellingPrice}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Supplier Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Supplier <span className="text-red-500">*</span>
                                <span className="text-xs text-gray-500 ml-2">(Verified suppliers only)</span>
                            </label>
                            <select
                                value={formData.supplierId}
                                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Select Supplier --</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier.id} value={supplier.id}>
                                        {supplier.companyName} - {supplier.city}, {supplier.state}
                                    </option>
                                ))}
                            </select>
                            {suppliers.length === 0 && (
                                <p className="text-sm text-amber-600 mt-1">
                                    No verified suppliers available. Please contact admin to approve suppliers.
                                </p>
                            )}
                        </div>

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                required
                                min="1"
                                placeholder="Enter quantity"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Unit Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit Price (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.unitPrice}
                                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                required
                                min="0.01"
                                step="0.01"
                                placeholder="Enter unit price"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Total Amount Display */}
                        {formData.quantity && formData.unitPrice && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 font-medium">Total Amount:</span>
                                    <span className="text-2xl font-bold text-green-600">₹{totalAmount}</span>
                                </div>
                            </div>
                        )}

                        {/* Reference Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Invoice/PO Number
                            </label>
                            <input
                                type="text"
                                value={formData.referenceNumber}
                                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                placeholder="e.g., INV-2024-001 or PO-2024-001"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                placeholder="Add any additional notes..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
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
                                disabled={loading || suppliers.length === 0}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <TrendingUp className="w-5 h-5" />
                                {loading ? 'Adding Stock...' : 'Add Stock'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
