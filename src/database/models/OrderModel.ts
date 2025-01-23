import { BaseModel } from './BaseModel';
import { Order, OrderItem, OrderStatus, Product, QueryResult } from '../../types';
import { ProductModel } from './ProductModel';

export class OrderModel extends BaseModel {
    private static instance: OrderModel;
    private productModel: ProductModel;

    private constructor() {
        super('orders');
        this.productModel = ProductModel.getInstance();
    }

    public static getInstance(): OrderModel {
        if (!OrderModel.instance) {
            OrderModel.instance = new OrderModel();
        }
        return OrderModel.instance;
    }

    // Prepared statements
    private createOrderStmt = this.prepareStatement(`
        INSERT INTO orders (user_id, total_amount, status)
        VALUES (?, ?, ?)
    `);

    private createOrderItemStmt = this.prepareStatement(`
        INSERT INTO order_items (order_id, product_id, quantity, price_per_unit, total_price)
        VALUES (?, ?, ?, ?, ?)
    `);

    private updateOrderStatusStmt = this.prepareStatement(`
        UPDATE orders SET status = ? WHERE id = ?
    `);

    private findOrderStmt = this.prepareStatement(`
        SELECT o.*, u.name as user_name
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
    `);

    private findOrderItemsStmt = this.prepareStatement(`
        SELECT oi.*, p.name as product_name, p.category as product_category
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    `);

    create(userId: number, items: { productId: number; quantity: number }[]): QueryResult<number> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                // Validate and calculate totals
                let totalAmount = 0;
                const processedItems: { 
                    product: Product; 
                    quantity: number; 
                    total: number 
                }[] = [];

                // Validate all items first
                for (const item of items) {
                    const productResult = this.productModel.findById(item.productId);
                    if (!productResult.success || !productResult.data) {
                        throw new Error(`Product ${item.productId} not found`);
                    }

                    const product = productResult.data as Product;
                    if (product.stock < item.quantity) {
                        throw new Error(`Insufficient stock for product ${product.name}`);
                    }

                    const itemTotal = product.price * item.quantity;
                    totalAmount += itemTotal;
                    processedItems.push({ 
                        product, 
                        quantity: item.quantity, 
                        total: itemTotal 
                    });
                }

                // Create order
                const orderResult = this.createOrderStmt.run(
                    userId,
                    totalAmount,
                    'pending' as OrderStatus
                );
                const orderId = orderResult.lastInsertRowid;

                // Create order items and update stock
                for (const item of processedItems) {
                    this.createOrderItemStmt.run(
                        orderId,
                        item.product.id,
                        item.quantity,
                        item.product.price,
                        item.total
                    );

                    // Reduce stock
                    this.productModel.updateStock(item.product.id, -item.quantity);
                }

                return orderId;
            });
        });
    }

    completeOrder(id: number): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                const order = this.findOrderStmt.get(id) as Order;
                if (!order) throw new Error('Order not found');
                if (order.status !== 'pending') throw new Error('Order cannot be completed');

                this.updateOrderStatusStmt.run('completed', id);
            });
        });
    }

    cancelOrder(id: number): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                const order = this.findOrderStmt.get(id) as Order;
                if (!order) throw new Error('Order not found');
                if (order.status !== 'pending') throw new Error('Order cannot be cancelled');

                // Return items to stock
                const items = this.findOrderItemsStmt.all(id) as OrderItem[];
                for (const item of items) {
                    this.productModel.updateStock(item.product_id, item.quantity);
                }

                this.updateOrderStatusStmt.run('cancelled', id);
            });
        });
    }

    findById(id: number): QueryResult<Order & { items: OrderItem[] }> {
        return this.handleQuery(() => {
            const order = this.findOrderStmt.get(id) as Order;
            if (!order) return null;

            const items = this.findOrderItemsStmt.all(id) as OrderItem[];
            return { ...order, items };
        });
    }

    findByUser(userId: number): QueryResult<Order[]> {
        return this.handleQuery(() => {
            return this.prepareStatement(`
                SELECT o.*, COUNT(oi.id) as item_count
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.user_id = ?
                GROUP BY o.id
                ORDER BY o.created_at DESC
            `).all(userId) as Order[];
        });
    }

    findPendingOrders(): QueryResult<Order[]> {
        return this.handleQuery(() => {
            return this.prepareStatement(`
                SELECT o.*, u.name as user_name, COUNT(oi.id) as item_count
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                LEFT JOIN order_items oi ON o.id = oi.order_id
                WHERE o.status = 'pending'
                GROUP BY o.id
                ORDER BY o.created_at ASC
            `).all() as Order[];
        });
    }

    getOrderStats(startDate?: string, endDate?: string): QueryResult<{
        total_orders: number;
        completed_orders: number;
        cancelled_orders: number;
        total_revenue: number;
        average_order_value: number;
        top_products: { 
            product_id: number; 
            name: string; 
            total_quantity: number; 
            total_revenue: number 
        }[];
        sales_by_category: { 
            category: string; 
            total_quantity: number; 
            total_revenue: number 
        }[];
    }> {
        return this.handleQuery(() => {
            let dateFilter = '';
            const params: any[] = [];
            if (startDate && endDate) {
                dateFilter = 'WHERE o.created_at BETWEEN ? AND ?';
                params.push(startDate, endDate);
            }

            const orderStats = this.prepareStatement(`
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                    SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
                    AVG(CASE WHEN status = 'completed' THEN total_amount END) as average_order_value
                FROM orders o
                ${dateFilter}
            `).get(...params) as {
                total_orders: number;
                completed_orders: number;
                cancelled_orders: number;
                total_revenue: number;
                average_order_value: number;
            };

            const topProducts = this.prepareStatement(`
                SELECT 
                    p.id as product_id,
                    p.name,
                    SUM(oi.quantity) as total_quantity,
                    SUM(oi.total_price) as total_revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status = 'completed' ${dateFilter ? 'AND ' + dateFilter : ''}
                GROUP BY p.id
                ORDER BY total_revenue DESC
                LIMIT 5
            `).all(...params) as {
                product_id: number;
                name: string;
                total_quantity: number;
                total_revenue: number;
            }[];

            const salesByCategory = this.prepareStatement(`
                SELECT 
                    p.category,
                    SUM(oi.quantity) as total_quantity,
                    SUM(oi.total_price) as total_revenue
                FROM order_items oi
                JOIN products p ON oi.product_id = p.id
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status = 'completed' ${dateFilter ? 'AND ' + dateFilter : ''}
                GROUP BY p.category
                ORDER BY total_revenue DESC
            `).all(...params) as {
                category: string;
                total_quantity: number;
                total_revenue: number;
            }[];

            return {
                ...orderStats,
                top_products: topProducts,
                sales_by_category: salesByCategory
            };
        });
    }

    delete(id: number): QueryResult<void> {
        return this.handleQuery(() => {
            return this.transaction(() => {
                const order = this.findOrderStmt.get(id) as Order;
                if (!order) throw new Error('Order not found');
                if (order.status === 'completed') {
                    throw new Error('Cannot delete completed order');
                }

                // If order is pending, return items to stock
                if (order.status === 'pending') {
                    const items = this.findOrderItemsStmt.all(id) as OrderItem[];
                    for (const item of items) {
                        this.productModel.updateStock(item.product_id, item.quantity);
                    }
                }

                // Delete order items first
                this.prepareStatement('DELETE FROM order_items WHERE order_id = ?').run(id);
                // Then delete the order
                this.prepareStatement('DELETE FROM orders WHERE id = ?').run(id);
            });
        });
    }
}
