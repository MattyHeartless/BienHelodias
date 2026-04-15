export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors: string[];
}

export interface PagedResult<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}

export enum AppRole {
  Customer = 0,
  StoreAdmin = 1,
  DeliveryUser = 2,
  SuperAdmin = 3
}

export enum OrderStatus {
  Pending = 0,
  Accepted = 1,
  Preparing = 2,
  Ready = 3,
  OnTheWay = 4,
  Delivered = 5,
  Cancelled = 6
}

export enum SubscriptionStatus {
  Trial = 0,
  Active = 1,
  Suspended = 2,
  Cancelled = 3
}

export interface AuthTokenDto {
  accessToken: string;
  expiresAtUtc: string;
  userId: string;
  email: string;
  role: AppRole;
  storeId: string | null;
  deliveryUserId: string | null;
}

export interface StoreDto {
  id: string;
  name: string;
  slug: string;
  welcomePhrase: string | null;
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  createdAtUtc: string;
}

export interface StoreAdminDto {
  id: string;
  storeId: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface BannerDto {
  bannerId: string;
  storeId: string;
  header: string;
  title: string;
  description: string;
  wildcard: string | null;
  expirationDate: string | null;
  status: boolean;
  created: string;
}

export interface ProductDto {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface DashboardDto {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  readyOrders: number;
  onTheWayOrders: number;
  revenueInOrders: number;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productNameSnapshot: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface OrderDto {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes: string | null;
  status: OrderStatus;
  deliveryUserId: string | null;
  total: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  items: OrderItemDto[];
}

export interface DecodedToken {
  email?: string;
  role?: string;
  storeId?: string;
}
