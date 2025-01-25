import  { useState, useEffect } from 'react';
import ProductGrid from './ProductGrid';
import Cart from './Cart';
import { Product } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import InventoryManager from './InventoryManager';
import type { QueryResult } from '../../types';
import BarcodeScanner from './BarcodeScanner';
import { Plus } from 'lucide-react';
import { productService } from '../../services/productService';

export default function Shop() {
  const { isAdmin } = useAuth();
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [showInventory, setShowInventory] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
 
const [error, setError] = useState<string | null>(null);

   useEffect(() => {
    const fetchProducts = async () => {
      try {
        const result = await productService.getProducts();
        if (result.success && result.data) {
          setProducts(result.data);
        } else if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch products');
      }
      setLoading(false);
    };

    fetchProducts();
  }, []) ;

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
        } else {
      alert('Product not found!');
    }
  };

  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error loading products: {error}</div>;
  if (!products.length) return <div>No products available</div>;

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
          <div className="w-full mb-6">
          <BarcodeScanner
              onScan={handleBarcodeScan}             
            />     
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ProductGrid onAddToCart={addToCart} showStock={isAdmin} />
            </div>
            <div className="lg:col-span-1 mt-14 "> 
              <Cart items={cart} onUpdateQuantity={updateQuantity} />
            </div>
          </div>               
        </>
      )}
    </div>
  );
}