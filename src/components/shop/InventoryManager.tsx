import React, { useState } from 'react';
import { Product } from '../../types';
import { Plus, Package, DollarSign, Hash, ShoppingCart, Pencil, Trash2, Barcode } from 'lucide-react';
import ProductBarcode from './ProductBarcode';

export default function InventoryManager() {
    const [products, setProducts] = useState<Product[]>([
        {
            id: 1,
            name: 'Coca Cola',
            price: 2.50,
            cost: 1.20,
            category: 'drinks',
            image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=150',
            stock: 24,
            barcode: 'PS-DRINK-001'
        }
    ]);

    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        price: 0,
        cost: 0,
        category: 'drinks' as Product['category'],
        image: '',
        stock: 0,
        barcode: ''
    });

    const generateBarcode = (category: string) => {
        const prefix = 'PS-';
        const categoryPrefix = category.toUpperCase().slice(0, 5);
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${categoryPrefix}-${randomNum}`;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const barcode = formData.barcode || generateBarcode(formData.category);

        if (editingProduct) {
            setProducts(products.map(p =>
                p.id === editingProduct.id
                    ? { ...formData, id: editingProduct.id, barcode }
                    : p
            ));
        } else {
            setProducts([...products, { ...formData, id: Date.now(), barcode }]);
        }
        setShowForm(false);
        setEditingProduct(null);
        setFormData({ name: '', price: 0, cost: 0, category: 'drinks', image: '', stock: 0, barcode: '' });
    };

    // Rest of the component remains the same until the product list rendering

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Inventory Management</h2>
                <button
                    onClick={() => {
                        setShowForm(true);
                        setEditingProduct(null);
                        setFormData({ name: '', price: 0, cost: 0, category: 'drinks', image: '', stock: 0, barcode: '' });
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition"
                >
                    <Plus className="h-5 w-5" />
                    Add Product
                </button>
            </div>

            {showForm && (
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Previous form fields remain the same */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">
                                    Barcode (Optional - will be generated if empty)
                                </label>
                                <input
                                    type="text"
                                    value={formData.barcode}
                                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button
                                type="submit"
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition"
                            >
                                {editingProduct ? 'Update Product' : 'Add Product'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingProduct(null);
                                }}
                                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {products.map(product => (
                    <div
                        key={product.id}
                        className="bg-slate-800 rounded-xl p-6 border border-slate-700"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-6">
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-16 h-16 object-cover rounded-lg"
                                />
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 mt-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Package className="h-4 w-4" />
                                            Stock: {product.stock}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <DollarSign className="h-4 w-4" />
                                            Price: ${product.price.toFixed(2)}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Hash className="h-4 w-4" />
                                            Cost: ${product.cost.toFixed(2)}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <ShoppingCart className="h-4 w-4" />
                                            Category: {product.category}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(product)}
                                    className="p-2 text-slate-400 hover:text-white transition"
                                >
                                    <Pencil className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => handleDelete(product.id)}
                                    className="p-2 text-red-400 hover:text-red-300 transition"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 p-4 bg-white rounded-lg">
                            <ProductBarcode barcode={product.barcode} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}