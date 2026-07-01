// ==================== AUTH ====================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token?: string;
  accessToken?: string;
  jwtToken?: string;
  user?: AuthUser;
  data?: LoginResponse;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
}

// ==================== DASHBOARD ====================
export interface DashboardStats {
  totalUsers: number;
  totalProducts?: number;
  totalCategories?: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  paidOrders?: number;
  processingOrders?: number;
  deliveredOrders?: number;
  revenueGrowth?: number;
  ordersGrowth?: number;
  usersGrowth?: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
}

export interface OrderStatusData {
  status: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  revenueOverview: RevenueData[];
  ordersByStatus: OrderStatusData[];
  monthlySales: RevenueData[];
  topSellingProducts?: { name: string; sales: number; revenue?: number }[];
  customerGrowth?: { month: string; customers: number }[];
}

// ==================== PRODUCTS ====================
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stockQuantity?: number;
  imageUrl?: string;
  categoryId: string;
  categoryName?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductPayload {
  name: string;
  description?: string;
  price: number;
  stockQuantity?: number;
  categoryId: string;
  isActive?: boolean;
}

// ==================== CATEGORIES ====================
export interface Category {
  id: string;
  name: string;
  description?: string;
  productCount?: number;
  isActive?: boolean;
  createdAt?: string;
}

export interface CategoryPayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

// ==================== ORDERS ====================
export type OrderStatus =
  | 'PendingPayment'
  | 'Paid'
  | 'Failed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface Order {
  id: string;
  userId: string;
  userFullName?: string;
  userEmail?: string;
  phoneNumber?: string;
  paymentStatus?: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  items?: OrderItem[];
  shippingAddress?: Address;
  statusHistory?: OrderStatusHistory[];
}

export interface OrderStatusHistory {
  status: OrderStatus;
  changedAt: string;
  changedBy?: string;
  note?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

// ==================== USERS ====================
export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  roles: string[];
  createdAt: string;
  isActive: boolean;
  totalOrders?: number;
  totalSpent?: number;
}

// ==================== REVIEWS ====================
export interface Review {
  id: string;
  productId: string;
  productName: string;
  userId: string;
  userFullName: string;
  rating: number;
  comment: string;
  createdAt: string;
  isApproved?: boolean;
}

// ==================== SUPPORT ====================
export interface SupportConversation {
  id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  subject: string;
  status: 'Open' | 'InProgress' | 'Resolved' | 'Closed';
  unreadCount: number;
  lastMessage?: string;
  lastMessageAt: string;
  createdAt: string;
  messages?: SupportMessage[];
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  isAdmin: boolean;
  message: string;
  sentAt: string;
  isRead: boolean;
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
}

// ==================== NOTIFICATIONS ====================
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'Info' | 'Success' | 'Warning' | 'Error';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

// ==================== ANALYTICS ====================
export interface AnalyticsData {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  totalCustomers: number;
  customersGrowth: number;
  conversionRate: number;
  conversionGrowth: number;
  revenueByMonth: { month: string; revenue: number }[];
  ordersByMonth: { month: string; orders: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  topCategories?: { name: string; sales: number; revenue?: number }[];
  topCustomers?: { name: string; orders: number; spending: number }[];
  weeklySales?: { week: string; sales: number; revenue: number }[];
  orderStatusDistribution: { status: string; count: number }[];
}

// ==================== SHARED ====================
export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}
