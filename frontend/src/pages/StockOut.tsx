import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { stockApi, productApi } from '../services/productApi';
import { Product } from '../types/product';
import { TrendingDown, ArrowLeft, Package } from 'lucide-react';

export default function StockOut() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const productIdParam = searchParams.get('productId');

    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        productId: productIdParam || '',
        quantity: '',
        referenceNumber: '',
        notes: '',
    });

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        if (productIdParam) {
            fetchProductById(Number(productIdParam));
        }
    }, [productIdParam]);

    const fetchProducts = async () => {
        try {
            const response = await productApi.getAll(0, 100);
            setProducts(response.data.content);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchProductById = async (id: number) => {
        try {
            const response = await productApi.getById(id);
            setSelectedProduct(response.data);
            setFormData(prev => ({ ...prev, productId: id.toString() }));
        } catch (error) {
            console.error('Error fetching product:', error);
        }
    };

    const handleProductChange = async (productId: string) => {
        setFormData({ ...formData, productId });
        if (productId) {
            const product = products.find(p => p.id === Number(productId));
            setSelectedProduct(product || null);
        } else {
            setSelectedProduct(null);
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
        setSuccess('');
        setLoading(true);

        try {
            const quantity = Number(formData.quantity);

            if (!selectedProduct) {
                throw new Error('Please select a product');
            }

            if (quantity > selectedProduct.currentStock) {
                throw new Error(`Insufficient stock. Available: ${selectedProduct.currentStock}`);
            }

            const transactionData = {
                productId: Number(formData.productId),
                transactionType: 'SALE' as const,
                quantity,
                referenceNumber: formData.referenceNumber || undefined,
                notes: formData.notes || undefined,
            };

            await stockApi.stockOut(transactionData);
            setSuccess(`Successfully sold ${quantity} units of ${selectedProduct.name}`);

            // Reset form
            setFormData({
                productId: '',
                quantity: '',
                referenceNumber: '',
                notes: '',
            });
            setSelectedProduct(null);

            // Refresh products
            fetchProducts();

            // Redirect after 2 seconds
            setTimeout(() => {
                navigate('/products');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to process stock out');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/products')}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Products
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingDown className="w-8 h-8 text-red-600" />
                        Stock Out (Sale)
                    </h1>
                    <p className="text-gray-600 mt-1">Record a product sale</p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Product Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Product <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="productId"
                                value={formData.productId}
                                onChange={(e) => handleProductChange(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Choose a product...</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name} ({product.sku}) - Stock: {product.currentStock}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Product Details */}
                        {selectedProduct && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-start gap-4">
                                    <Package className="w-12 h-12 text-blue-600" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                            <div>
                                                <span className="text-gray-600">SKU:</span>
                                                <span className="ml-2 font-mono">{selectedProduct.sku}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Current Stock:</span>
                                                <span className={`ml-2 font-semibold ${selectedProduct.isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
                                                    {selectedProduct.currentStock} {selectedProduct.unitOfMeasure}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Selling Price:</span>
                                                <span className="ml-2 font-semibold">₹{selectedProduct.sellingPrice.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Category:</span>
                                                <span className="ml-2">{selectedProduct.categoryName || 'N/A'}</span>
                                            </div>
                                        </div>
                                        {selectedProduct.isLowStock && (
                                            <div className="mt-2 text-yellow-700 text-sm">
                                                ⚠️ Low stock warning! Reorder level: {selectedProduct.reorderLevel}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                required
                                min="1"
                                max={selectedProduct?.currentStock || undefined}
                                placeholder="Enter quantity"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {selectedProduct && formData.quantity && (
                                <p className="mt-1 text-sm text-gray-600">
                                    Total Amount: ₹{(Number(formData.quantity) * selectedProduct.sellingPrice).toFixed(2)}
                                </p>
                            )}
                        </div>

                        {/* Reference Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Invoice/Reference Number
                            </label>
                            <input
                                type="text"
                                name="referenceNumber"
                                value={formData.referenceNumber}
                                onChange={handleChange}
                                placeholder="e.g., INV-2026-001"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={3}
                                placeholder="Additional notes..."
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
                                disabled={loading || !selectedProduct}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <TrendingDown className="w-5 h-5" />
                                {loading ? 'Processing...' : 'Record Sale'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
