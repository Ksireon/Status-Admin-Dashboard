import { UserRoleType } from './constants';

export type OrderStatusType = 'PENDING' | 'PROCESSING' | 'DELIVERING' | 'COMPLETED' | 'CANCELED';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRoleType;
  phone: string | null;
  isActive: boolean;
  shopId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRoleType;
  shopId: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LocalizedText {
  ru: string;
  uz: string;
  en: string;
}

export interface Category {
  id: string;
  slug: string;
  name: LocalizedText | string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  sort: number;
  label: string | null;
}

export interface Product {
  id: string;
  categoryId: string;
  type: 'textile' | 'vinyl' | 'bag';
  name: LocalizedText | string;
  description: LocalizedText | string;
  characteristics: Record<string, LocalizedText> | string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  nameSnapshot: LocalizedText | string;  // Название продукта на момент заказа
  descriptionSnapshot?: LocalizedText | string;
  typeSnapshot: string;
  imageSnapshot: string | null;  // Картинка на момент заказа
  colorLabel: string | null;    // Выбранный цвет
  size: string | null;
  unitPrice: number;            // Цена на момент заказа
  quantity: number;
  meters: number | null;
  lineTotal: number;
  createdAt: string;
}

export interface Order {
  id: string;
  shortId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
  shopId: string;
  shop: { id: string; name: LocalizedText };
  status: OrderStatusType;
  deliveryType: 'PICKUP' | 'COURIER' | 'POST';
  deliveryAddress: string | null;
  paymentMethod: 'CASH' | 'CARD' | 'CLICK' | 'PAYME';
  total: number;
  comment: string | null;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Shop {
  id: string;
  key: string;
  name: LocalizedText | string;
  city: string;
  address: string;
  phone: string;
  hours: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  text: string;
  isFromUser: boolean;
  createdAt: string;
}

export interface SupportThread {
  id: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
  isOpen: boolean;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalOrders: number;
  recentOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  recentRevenue: number;
  totalCustomers?: number;
  totalProducts?: number;
  ordersByStatus: { status: OrderStatusType; count: number }[];
  topProducts: {
    productId: string;
    name: LocalizedText | string;
    totalRevenue: number;
    totalQuantity: number;
  }[];
  latestOrders: Order[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
