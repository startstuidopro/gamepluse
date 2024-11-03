import React, { useState } from 'react';
import ProductGrid from './ProductGrid';
import Cart from './Cart';
import { Product } from '../../types';

export default function Shop() {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);

  const addToCart = (product: Product) => {
    setCart(current => {
      const existing = current.find(item => item.product.id === product.id);
      if (existing) {
        return current.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...current, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    setCart(current =>
      current.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(0, quantity) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <ProductGrid onAddToCart={addToCart} />
      </div>
      <div>
        <Cart items={cart} onUpdateQuantity={updateQuantity} />
      </div>
    </div>
  );
}