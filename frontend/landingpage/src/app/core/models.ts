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

export enum OrderStatus {
  Pending = 0,
  Accepted = 1,
  Preparing = 2,
  Ready = 3,
  OnTheWay = 4,
  Delivered = 5,
  Cancelled = 6
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

export interface StoreDto {
  id: string;
  name: string;
  slug: string;
  welcomePhrase: string | null;
  isActive: boolean;
  subscriptionStatus: number;
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

export interface StorefrontContentDto {
  welcomePhrase: string | null;
  banners: BannerDto[];
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

export interface DeliveryAddressDraft {
  formattedAddress: string;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface CreateOrderRequest {
  storeId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes: string | null;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}
