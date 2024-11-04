import React from 'react';
import { Product } from '../../types';
import { Package } from 'lucide-react';

interface ProductGridProps {
  onAddToCart: (product: Product) => void;
  showStock?: boolean;
}

export default function ProductGrid({ onAddToCart, showStock = false }: ProductGridProps) {
  const products: Product[] = [
    { 
      id: 1, 
      name: 'Coca Cola', 
      price: 2.50, 
      cost: 1.20,
      category: 'drinks', 
      image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=150',
      stock: 24
    },
    { 
      id: 2, 
      name: 'Doritos', 
      price: 3.00, 
      cost: 1.50,
      category: 'snacks', 
      image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=150',
      stock: 15
    },
    { 
      id: 3, 
      name: 'M&Ms', 
      price: 2.00, 
      cost: 1.00,
      category: 'sweets', 
      image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=150',
      stock: 30
    },
    // ... other products
  ];

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
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                <span className="text-sm text-slate-400 capitalize">{product.category}</span>
                {showStock && (
                  <div className="flex items-center gap-1 mt-1 text-sm">
                    <Package className="h-4 w-4 text-slate-400" />
                    <span className={`${
                      product.stock > 10 
                        ? 'text-green-400' 
                        : product.stock > 0 
                        ? 'text-yellow-400' 
                        : 'text-red-400'
                    }`}>
                      {product.stock} in stock
                    </span>
                  </div>
                )}
              </div>
              <span className="text-lg font-bold text-purple-400">${product.price.toFixed(2)}</span>
            </div>
            <button
              onClick={() => onAddToCart(product)}
              disabled={product.stock === 0}
              className={`w-full py-2 px-4 rounded-lg transition ${
                product.stock === 0
                  ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}