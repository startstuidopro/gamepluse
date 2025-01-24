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

    // Prepared statement templates
    private createStmtSql = `
        INSERT INTO products (name, price, cost, category, image, stock, barcode)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    private updateStmtSql = `
        UPDATE products 
        SET name = ?, price = ?, cost = ?, category = ?, image = ?, stock = ?, barcode = ?
        WHERE id = ?
    `;

    private updateStockStmtSql = `
        UPDATE products SET stock = stock + ? WHERE id = ?
    `;

    private findByIdStmtSql = `
        SELECT * FROM products WHERE id = ?
    `;

    private findByBarcodeStmtSql = `
        SELECT * FROM products WHERE barcode = ?
    `;

    private findLowStockStmtSql = `
        SELECT * FROM products WHERE stock <= ? ORDER BY stock ASC
    `;

    async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<QueryResult<number>> {
        return await this.handleQuery(async () => {
            // Validate required fields
            const requiredFields = ['name', 'price', 'cost', 'category', 'image', 'stock', 'barcode'];
            const missingFields = requiredFields.filter(field => {
                const value = product[field as keyof typeof product];
                return value === undefined || value === null || value === '';
            });

            if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
            }

            // Check for existing barcode
            const stmt = await this.prepareStatement(this.findByBarcodeStmtSql);
            const existing = await stmt.get([product.barcode]);            
            if (existing && Object.keys(existing).length > 0) throw new Error('Product with this barcode already exists');

            const createStmt = await this.prepareStatement(this.createStmtSql);
            const result = await createStmt.run([
                product.name,
                product.price,
                product.cost,
                product.category,
                product.image,
                product.stock,
                product.barcode
            ]);
            return result.lastInsertRowid;
        });
    }

    async update(id: number, product: Partial<Product>): Promise<QueryResult<void>> {
        return await this.handleQuery(async () => {
            const stmt = await this.prepareStatement(this.findByIdStmtSql);
            const current = await stmt.get([id]) as Product;
            if (!current) throw new Error('Product not found');

            // Check barcode uniqueness if it's being updated
            if (product.barcode && product.barcode !== current.barcode) {
                const barcodeStmt = await this.prepareStatement(this.findByBarcodeStmtSql);
                const existing = await barcodeStmt.get([product.barcode]) as Product;
                if (existing) throw new Error('Product with this barcode already exists');
            }

            const updateStmt = await this.prepareStatement(this.updateStmtSql);
            await updateStmt.run([
                product.name ?? current.name,
                product.price ?? current.price,
                product.cost ?? current.cost,
                product.category ?? current.category,
                product.image ?? current.image,
                product.stock ?? current.stock,
                product.barcode ?? current.barcode,
                id
            ]);
        });
    }

    async updateStock(id: number, change: number): Promise<QueryResult<void>> {
        return await this.handleQuery(async () => {
            const stmt = await this.prepareStatement(this.findByIdStmtSql);
            const product = await stmt.get([id]) as Product;
            if (!product) throw new Error('Product not found');

            const newStock = product.stock + change;
            if (newStock < 0) {
                throw new Error('Insufficient stock');
            }

            const updateStmt = await this.prepareStatement(this.updateStockStmtSql);
            await updateStmt.run([change, id]);
        });
    }

    async findById(id: number): Promise<QueryResult<Product>> {
        return await this.handleQuery(async () => {
            const stmt = await this.prepareStatement(this.findByIdStmtSql);
            return await stmt.get([id]) as Product;
        });
    }

    async findByBarcode(barcode: string): Promise<QueryResult<Product>> {
        return await this.handleQuery(async () => {
            const stmt = await this.prepareStatement(this.findByBarcodeStmtSql);
            const product = await stmt.get([barcode]) as Product;
            if (!product) throw new Error(`Product with barcode ${barcode} not found`);
            return product;
        });
    }

    async findByCategory(category: ProductCategory): Promise<QueryResult<Product[]>> {
        return await this.handleQuery(async () => {
            const stmt = await this.prepareStatement(
                'SELECT * FROM products WHERE category = ? ORDER BY name'
            );
            return await stmt.all([category]);
        });
    }

    async findLowStock(threshold: number = 5): Promise<QueryResult<Product[]>> {
        return await this.handleQuery(async () => {
            const stmt = await this.prepareStatement(this.findLowStockStmtSql);
            return await stmt.all([threshold]);
        });
    }

    async searchProducts(query: string): Promise<QueryResult<Product[]>> {
        return await this.handleQuery(async () => {
            const stmt = await this.prepareStatement(`
                SELECT * FROM products 
                WHERE name LIKE ? OR barcode LIKE ?
                ORDER BY name
            `);
            return await stmt.all([`%${query}%`, `%${query}%`]);
        });
    }

    async getInventoryStats(): Promise<QueryResult<{
        total_products: number;
        total_value: number;
        low_stock: number;
        by_category: { category: ProductCategory; count: number; value: number }[];
        top_selling: { id: number; name: string; total_sold: number }[];
    }>> {
        return await this.handleQuery(async () => {
            const countsStmt = await this.prepareStatement(`
                SELECT 
                    COUNT(*) as total_products,
                    SUM(stock * cost) as total_value,
                    SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) as low_stock
                FROM products
            `);
            const counts = await countsStmt.get() as { total_products: number; total_value: number; low_stock: number };

            const byCategoryStmt = await this.prepareStatement(`
                SELECT 
                    category,
                    COUNT(*) as count,
                    SUM(stock * cost) as value
                FROM products
                GROUP BY category
                ORDER BY value DESC
            `);
            const byCategory = await byCategoryStmt.all();

            const topSellingStmt = await this.prepareStatement(`
                SELECT p.id, p.name, SUM(oi.quantity) as total_sold
                FROM products p
                JOIN order_items oi ON p.id = oi.product_id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status = 'completed'
                GROUP BY p.id
                ORDER BY total_sold DESC
                LIMIT 5
            `);
            const topSelling = await topSellingStmt.all();

            return {
                ...counts,
                by_category: byCategory,
                top_selling: topSelling
            };
        });
    }

    async getProductStats(): Promise<QueryResult<{
        total_products: number;
        low_stock_products: number;
        total_value: number;
        by_category: { category: string; count: number }[];
    }>> {
        return await this.handleQuery(async () => {
            const statsStmt = await this.prepareStatement(`
                SELECT 
                    COUNT(*) as total_products,
                    SUM(CASE WHEN stock < 5 THEN 1 ELSE 0 END) as low_stock_products,
                    SUM(stock * price) as total_value
                FROM products
            `);
            const stats = await statsStmt.get() as {
                total_products: number;
                low_stock_products: number;
                total_value: number;
            };

            const byCategoryStmt = await this.prepareStatement(`
                SELECT category, COUNT(*) as count
                FROM products
                GROUP BY category
                ORDER BY count DESC
            `);
            const byCategory = await byCategoryStmt.all() as { category: string; count: number }[];

            return {
                ...stats,
                by_category: byCategory
            };
        });
    }

    async bulkUpdateStock(updates: { id: number; quantity: number }[]): Promise<QueryResult<void>> {
        return await this.handleQuery(async () => {
            return this.transaction(async () => {
                for (const update of updates) {
                    await this.updateStock(update.id, update.quantity);
                }
            });
        });
    }

    async delete(id: number): Promise<QueryResult<boolean>> {
        return await this.handleQuery(async () => {
            // Check if product is referenced in any orders
            const stmt = await this.prepareStatement(`
                SELECT 1 FROM order_items WHERE product_id = ? LIMIT 1
            `);
            const hasOrders = await stmt.get([id]);

            if (hasOrders) {
                throw new Error('Cannot delete product with existing orders');
            }

            const deleteStmt = await this.prepareStatement('DELETE FROM products WHERE id = ?');
            await deleteStmt.run([id]);
            return true;
        });
    }
}
