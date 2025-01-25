export interface Station {
  id: number;
  name: string;
  type: DeviceType;
  status: 'available' | 'occupied' | 'maintenance';
  location: string;
  price_per_minute: number;
  current_session?: Session;
  last_session?: Session;
}

export interface Session {
  id: number;
  device_id: number;
  user_id: number;
  game_id?: number;
  game?: Game;
  start_time: string;
  end_time?: string;
  base_price: number;
  discount_rate: number;
  final_price: number;
  total_amount?: number;  
  attached_controllers: Controller[];
  user_membership_type: 'standard' | 'premium';
  created_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface Controller {
  id: number;
  name: string;
  type: DeviceType;
  status: 'available' | 'in_use' | 'maintenance';
  price_per_minute: number;
  color?: string;
  identifier: string;
  last_maintenance: string;
}

export interface Game {
  id: number;
  name: string;
  price_per_minute: number;
  image: string;
  device_types: DeviceType[];
  is_multiplayer: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type DeviceType =
  'PS5' |
  'PS4' |
  'Xbox Series X' |
  'Xbox One' |
  'Nintendo Switch';

export type UserRole = 'admin' | 'staff' | 'customer';
export type MembershipType = 'standard' | 'premium';

export interface User {
    id: number;
    name: string;
    phone: string;
    password_hash?: string;
    role: UserRole;
    membership_type: MembershipType;
    credit: number;
    last_active?: string;
    created_at?: string;
    updated_at?: string;
}

export type DeviceStatus = 'available' | 'occupied' | 'maintenance';

export interface Device {
    id: number;
    name: string;
    type: DeviceType;
    status: DeviceStatus;
    location: string;
    price_per_minute: number;
    created_at?: string;
    updated_at?: string;
}

export type ControllerStatus = 'available' | 'in_use' | 'maintenance';




export interface GameDeviceCompatibility {
    game_id: number;
    device_type: DeviceType;
}



export interface SessionController {
    session_id: number;
    controller_id: number;
}

export type ProductCategory = 'drinks' | 'snacks' | 'sweets';

export interface Product {
    id: number;
    name: string;
    price: number;
    cost: number;
    category: ProductCategory;
    image: string;
    stock: number;
    barcode: string;
    created_at?: string;
    updated_at?: string;
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface Order {
    id: number;
    user_id: number;
    total_amount: number;
    status: OrderStatus;
    created_at?: string;
    updated_at?: string;
}

export interface OrderItem {
    id: number;
    order_id: number;
    product_id: number;
    quantity: number;
    price_per_unit: number;
    total_price: number;
    product_name?: string;
}

export type DiscountType = 'devices' | 'games' | 'controllers' | 'products';

export interface DiscountConfig {
    id: number;
    membership_type: MembershipType;
    discount_type: DiscountType;
    discount_rate: number;
    created_at?: string;
    updated_at?: string;
}

export interface DBResult {
    changes: number;
    lastInsertRowid: number;
}

export interface QueryResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    changes?: number;
    lastInsertId?: number;
}
