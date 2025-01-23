import { useState, useEffect } from 'react';
import { Product } from '../../types';
import { Package, Loader2 } from 'lucide-react';
import { productService } from '../../services/productService';

interface ProductGridProps {
  onAddToCart: (product: Product) => void;
  showStock?: boolean;
}

export default function ProductGrid({ onAddToCart, showStock = false }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const result = await productService.getProducts();
      if (result.success && Array.isArray(result.data)) {
        setProducts(result.data);
      } else {
        setError(result.error || 'Failed to load products');
      }
    } catch (err) {
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 bg-red-100 border border-red-300 rounded-lg p-4">
        {error}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Shop</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">{product.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-green-400 font-bold">${product.price.toFixed(2)}</span>
                {showStock && (
                  <span className="text-slate-400">
                    Stock: {product.stock}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{product.category}</span>
                <span className="text-xs text-slate-500">#{product.barcode}</span>
              </div>
              <button
                onClick={() => onAddToCart(product)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Package className="w-4 h-4" />
                Add to Cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}