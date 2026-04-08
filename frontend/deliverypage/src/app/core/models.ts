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

export enum DeliveryAvailability {
  Unavailable = 0,
  Available = 1,
  Busy = 2
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

export interface DeliveryUserDto {
  id: string;
  userId: string;
  storeId: string;
  fullName: string;
  phone: string;
  email: string;
  isActive: boolean;
  currentAvailability: DeliveryAvailability;
}

export interface DecodedToken {
  email?: string;
  role?: string;
  storeId?: string;
}
