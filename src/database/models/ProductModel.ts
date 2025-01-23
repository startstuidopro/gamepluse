import { BaseModel } from './BaseModel';
import { Product, ProductCategory, QueryResult } from '../../types';

export class ProductModel extends BaseModel {
    private static instance: ProductModel;

    private constructor() {
        super('products');
    }

    public static getInstance(): ProductModel {
        if (!ProductModel.instance) {
            ProductModel.instance = new ProductModel();
        }
        return ProductModel.instance;
    }

    // Prepared statements
    private createStmt = this.prepareStatement(`
        INSERT INTO products (name, price, cost, category, image, stock, barcode)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    private updateStmt = this.prepareStatement(`
        UPDATE products 
        SET name = ?, price = ?, cost = ?, category = ?, image = ?, stock = ?, barcode = ?
        WHERE id = ?
    `);

    private updateStockStmt = this.prepareStatement(`
        UPDATE products SET stock = stock + ? WHERE id = ?
    `);

    private findByIdStmt = this.prepareStatement(`
        SELECT * FROM products WHERE id = ?
    `);

    private findByBarcodeStmt = this.prepareStatement(`
        SELECT * FROM products WHERE barcode = ?
    `);

    private findLowStockStmt = this.prepareStatement(`
        SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC
    `);

    create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): QueryResult<number> {
        return this.handleQuery(() => {
            // Check if barcode already exists
            const existing = this.findByBarcodeStmt.get(product.barcode);
            if (existing) throw new Error('Product with this barcode already exists');

            const result = this.createStmt.run(
                product.name,
                product.price,
                product.cost,
                product.category,
                product.image,
                product.stock,
                product.barcode
            );
            return result.lastInsertRowid;
        });
    }

    update(id: number, product: Partial<Product>): QueryResult<void> {
        return this.handleQuery(() => {
            const current = this.findByIdStmt.get(id) as Product;
            if (!current) throw new Error('Product not found');

            // Check barcode uniqueness if it's being updated
            if (product.barcode && product.barcode !== current.barcode) {
                const existing = this.findByBarcodeStmt.get(product.barcode) as Product;
                if (existing) throw new Error('Product with this barcode already exists');
            }

            this.updateStmt.run(
                product.name ?? current.name,
                product.price ?? current.price,
                product.cost ?? current.cost,
                product.category ?? current.category,
                product.image ?? current.image,
                product.stock ?? current.stock,
                product.barcode ?? current.barcode,
                id
            );
        });
    }

    updateStock(id: number, change: number): QueryResult<void> {
        return this.handleQuery(() => {
            const product = this.findByIdStmt.get(id) as Product;
            if (!product) throw new Error('Product not found');

            const newStock = product.stock + change;
            if (newStock < 0) {
                throw new Error('Insufficient stock');
            }

            this.updateStockStmt.run(change, id);
        });
    }

    findById(id: number): QueryResult<Product> {
        return this.handleQuery(() => {
            return this.findByIdStmt.get(id) as Product;
        });
    }

    findByBarcode(barcode: string): QueryResult<Product> {
        return this.handleQuery(() => {
            const product = this.findByBarcodeStmt.get(barcode) as Product;
            if (!product) throw new Error(`Product with barcode ${barcode} not found`);
            return product;
        });
    }

    findByCategory(category: ProductCategory): QueryResult<Product[]> {
        return this.handleQuery(() => {
            return this.prepareStatement(
                'SELECT * FROM products WHERE category = ? ORDER BY name'
            ).all(category);
        });
    }

    findLowStock(threshold: number = 5): QueryResult<Product[]> {
        return this.handleQuery(() => {
            return this.findLowStockStmt.all(threshold);
        });
    }

    searchProducts(query: string): QueryResult<Product[]> {
        return this.handleQuery(() => {
            return this.prepareStatement(`
                SELECT * FROM products 
                WHERE name LIKE ? OR barcode LIKE ?
                ORDER BY name
            `).all(`%${query}%`, `%${query}%`);
        });
    }

    getInventoryStats(): QueryResult<{
        total_products: number;
        total_value: number;
        low_stock: number;
        by_category: { category: ProductCategory; count: number; value: number }[];
        top_selling: { id: number; name: string; total_sold: number }[];
    }> {
        return this.handleQuery(() => {
            const counts = this.prepareStatement(`
                SELECT 
                    COUNT(*) as total_products,
                    SUM(stock * cost) as total_value,
                    SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) as low_stock
                FROM products
            `).get() as { total_products: number; total_value: number; low_stock: number };

            const byCategory = this.prepareStatement(`
                SELECT 
                    category,
                    COUNT(*) as count,
                    SUM(stock * cost) as value
                FROM products
                GROUP BY category
                ORDER BY value DESC
            `).all();

            const topSelling = this.prepareStatement(`
                SELECT p.id, p.name, SUM(oi.quantity) as total_sold
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status = 'completed'
                GROUP BY p.id
                ORDER BY total_sold DESC
                LIMIT 5
            `).all();

            return {
                ...counts,
                by_category: byCategory,
                top_selling: topSelling
            };
        });
    }

    getProductStats(): QueryResult<{
        total_products: number;
        low_stock_products: number;
        total_value: number;
        by_category: { category: string; count: number }[];
    }> {
        return this.handleQuery(() => {
            const stats = this.prepareStatement(`
                SELECT 
                    COUNT(*) as total_products,
                    SUM(CASE WHEN stock < 5 THEN 1 ELSE 0 END) as low_stock_products,
                    SUM(stock * price) as total_value
                FROM products
            `).get() as {
                total_products: number;
                low_stock_products: number;
                total_value: number;
            };

            const byCategory = this.prepareStatement(`
                SELECT category, COUNT(*) as count
                FROM products
                GROUP BY category
                ORDER BY count DESC
            `).all() as { category: string; count: number }[];

            return {
                ...stats,
                by_category: byCategory
            };
        });
    }

    bulkUpdateStock(updates: { id: number; quantity: number }[]): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                for (const update of updates) {
                    this.updateStock(update.id, update.quantity);
                }
            });
        });
    }

    delete(id: number): QueryResult<void> {
        return this.handleQuery(() => {
            // Check if product is referenced in any orders
            const hasOrders = this.prepareStatement(`
                SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1
            `).get(id);

            if (hasOrders) {
                throw new Error('Cannot delete product with existing orders');
            }

            return this.prepareStatement('DELETE FROM products WHERE id = ?').run(id);
        });
    }

    findAll(): QueryResult<Product[]> {
        return this.handleQuery(() => {
            return this.prepareStatement('SELECT * FROM products ORDER BY name').all() as Product[];
        });
    }

   
}
