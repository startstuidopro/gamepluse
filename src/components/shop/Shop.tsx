import React, { useState } from 'react';
import ProductGrid from './ProductGrid';
import Cart from './Cart';
import { Product } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import InventoryManager from './InventoryManager';
import BarcodeScanner from './BarcodeScanner';
import { Plus, Scan } from 'lucide-react';

export default function Shop() {
  const { isAdmin } = useAuth();
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Demo products with barcodes
  const products: Product[] = [
    { 
      id: 1, 
      name: 'Coca Cola', 
      price: 2.50, 
      cost: 1.20,
      category: 'drinks', 
      image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=150',
      stock: 24,
      barcode: 'PS-DRINK-001'
    },
    { 
      id: 2, 
      name: 'Doritos', 
      price: 3.00, 
      cost: 1.50,
      category: 'snacks', 
      image: 'https://images.unsplash.com/photo-1600952841320-db92ec4047ca?w=150',
      stock: 15,
      barcode: 'PS-SNACK-001'
    }
  ];

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Product out of stock!');
      return;
    }
    
    setCart(current => {
      const existing = current.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert('Not enough stock available!');
          return current;
        }
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

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      setShowScanner(false);
    } else {
      alert('Product not found!');
    }
  };

  return (
    <div>
      {isAdmin && (
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-4">
            <button
              onClick={() => setShowInventory(!showInventory)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition"
            >
              <Plus className="h-5 w-5" />
              {showInventory ? 'Show Shop' : 'Manage Inventory'}
            </button>
          </div>
          <div className="text-sm text-slate-400">
            * You're viewing the shop as an admin
          </div>
        </div>
      )}

      {showInventory && isAdmin ? (
        <InventoryManager />
      ) : (
        <>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition"
            >
              <Scan className="h-5 w-5" />
              Scan Barcode
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ProductGrid onAddToCart={addToCart} showStock={isAdmin} />
            </div>
            <div>
              <Cart items={cart} onUpdateQuantity={updateQuantity} />
            </div>
          </div>

          {showScanner && (
            <BarcodeScanner
              onScan={handleBarcodeScan}
              onClose={() => setShowScanner(false)}
            />
          )}
        </>
      )}
    </div>
  );
}