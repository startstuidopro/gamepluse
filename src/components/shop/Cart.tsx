import React from 'react';
import { ShoppingCart, Trash2 } from 'lucide-react';
import { Product } from '../../types';

interface CartProps {
  items: { product: Product; quantity: number }[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
}

export default function Cart({ items, onUpdateQuantity }: CartProps) {
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 sticky top-4">
      <div className="flex items-center gap-2 mb-6">
        <ShoppingCart className="h-6 w-6 text-purple-500" />
        <h2 className="text-xl font-bold text-white">Cart</h2>
      </div>

      {items.length === 0 ? (
        <p className="text-slate-400 text-center py-8">Your cart is empty</p>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-medium">{product.name}</h3>
                  <p className="text-sm text-slate-400">${product.price.toFixed(2)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    -
                  </button>
                  <span className="text-white w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onUpdateQuantity(product.id, 0)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between mb-4">
              <span className="text-slate-400">Total:</span>
              <span className="text-xl font-bold text-white">${total.toFixed(2)}</span>
            </div>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition">
              Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}