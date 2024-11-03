import React from 'react';
import { Product } from '../../types';

interface ProductGridProps {
  onAddToCart: (product: Product) => void;
}

export default function ProductGrid({ onAddToCart }: ProductGridProps) {
  const products: Product[] = [
    { id: 1, name: 'Coca Cola', price: 2.50, category: 'drinks', image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=150' },
    { id: 2, name: 'Doritos', price: 3.00, category: 'snacks', image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=150' },
    { id: 3, name: 'M&Ms', price: 2.00, category: 'sweets', image: 'https://images.unsplash.com/photo-1581798459219-318e76aecc7b?w=150' },
    { id: 4, name: 'Red Bull', price: 3.50, category: 'drinks', image: 'https://images.unsplash.com/photo-1613214049841-7fd1ff2d5c2b?w=150' },
    { id: 5, name: 'Pringles', price: 3.50, category: 'snacks', image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=150' },
    { id: 6, name: 'Snickers', price: 1.50, category: 'sweets', image: 'https://images.unsplash.com/photo-1534260164206-2a3a4a72891d?w=150' },
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
              </div>
              <span className="text-lg font-bold text-purple-400">${product.price.toFixed(2)}</span>
            </div>
            <button
              onClick={() => onAddToCart(product)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition"
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}