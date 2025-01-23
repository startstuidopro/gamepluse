import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { Plus, Package, DollarSign, Hash, ShoppingCart, Pencil, Trash2 } from 'lucide-react';
import ProductBarcode from './ProductBarcode';
import { productService } from '../../services/productService';

export default function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    const result = await productService.getProducts();
    if (result.success && result.data) {
      setProducts(result.data);
    } else {
      setError(result.error || 'Failed to load products');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const productData = {
      name: formData.name,
      price: formData.price,
      cost: formData.cost,
      category: formData.category,
      image: formData.image,
      stock: formData.stock,
      barcode: formData.barcode
    };

    if (editingProduct) {
      const result = await productService.updateProduct(editingProduct.id, productData);
      if (result.success) {
        await loadProducts();
        setEditingProduct(null);
      } else {
        setError(result.error || 'Failed to update product');
        return;
      }
    } else {
      const result = await productService.createProduct(productData as any);
      if (result.success) {
        await loadProducts();
      } else {
        setError(result.error || 'Failed to create product');
        return;
      }
    }

    setShowForm(false);
    setFormData({
      name: '',
      price: 0,
      cost: 0,
      category: 'drinks',
      image: '',
      stock: 0,
      barcode: ''
    });
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      cost: product.cost,
      category: product.category,
      image: product.image,
      stock: product.stock,
      barcode: product.barcode
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      setError(null);
      const result = await productService.deleteProduct(id);
      if (result.success) {
        await loadProducts();
      } else {
        setError(result.error || 'Failed to delete product');
      }
    }
  };

  const handleStockChange = async (id: number, change: number) => {
    setError(null);
    const result = await productService.updateStock(id, change);
    if (result.success) {
      await loadProducts();
    } else {
      setError(result.error || 'Failed to update stock');
    }
  };

  const generateBarcode = (category: string) => {
    const prefix = 'PS-';
    const categoryPrefix = category.toUpperCase().slice(0, 5);
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${categoryPrefix}-${randomNum}`;
  };

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
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as Product['category'] })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="drinks">Drinks</option>
                  <option value="snacks">Snacks</option>
                  <option value="sweets">Sweets</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
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