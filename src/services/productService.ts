import { ProductModel } from '../database/models/ProductModel';
import { Product, QueryResult } from '../types';

export const productService = {
    getProducts: (): QueryResult<Product[]> => {
        return ProductModel.getInstance().findAll();
    },

    getProductById: (id: number): QueryResult<Product> => {
        return ProductModel.getInstance().findById(id);
    },

    getProductByBarcode: (barcode: string): QueryResult<Product> => {
        return ProductModel.getInstance().findByBarcode(barcode);
    },

    createProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): QueryResult<number> => {
        return ProductModel.getInstance().create(product);
    },

    updateProduct: (id: number, product: Partial<Product>): QueryResult<void> => {
        return ProductModel.getInstance().update(id, product);
    },

    updateStock: (id: number, change: number): QueryResult<void> => {
        return ProductModel.getInstance().updateStock(id, change);
    },

    deleteProduct: (id: number): QueryResult<void> => {
        return ProductModel.getInstance().delete(id);
    },

    getLowStockProducts: (threshold: number = 5): QueryResult<Product[]> => {
        return ProductModel.getInstance().findLowStock(threshold);
    },

    getInventoryStats: () => {
        return ProductModel.getInstance().getInventoryStats();
    }
};
