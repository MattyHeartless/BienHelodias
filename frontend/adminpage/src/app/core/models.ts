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

export enum DeliveryAvailability {
  Unavailable = 0,
  Available = 1,
  Busy = 2
}

export enum PromotionType {
  Percentage = 0,
  BuyXGetY = 1
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
  promotion: PromotionSummaryDto | null;
}

export interface PromotionSummaryDto {
  promotionId: string;
  name: string;
  code: string;
  type: PromotionType;
  percentageValue: number | null;
  buyQuantity: number | null;
  freeQuantity: number | null;
  targetProductId: string | null;
  targetProductName: string | null;
  status: boolean;
  expirationDate: string | null;
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

export interface InventoryAiAnalysisSummaryDto {
  totalDetections: number;
  matchedCount: number;
  needsReviewCount: number;
  missingCount: number;
}

export interface InventoryAiDetectedItemDto {
  rawLabel: string;
  detectedQuantity: number;
  confidence: 'high' | 'medium' | 'low';
  matchStatus: 'matched' | 'needs_review' | 'missing_from_catalog';
  matchedProductId: string | null;
  matchedProductName: string | null;
  suggestedCategory: string | null;
  suggestedDescription: string | null;
  suggestedImageUrl: string | null;
  notes: string | null;
}

export interface InventoryAiAnalysisDto {
  scanId: string;
  detectedItems: InventoryAiDetectedItemDto[];
  summary: InventoryAiAnalysisSummaryDto;
}

export interface InventoryAiStockAdjustmentRequest {
  productId: string;
  increaseBy: number;
  sourceLabel: string;
}

export interface InventoryAiNewProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  sourceLabel: string;
}

export interface InventoryAiCommitRequest {
  scanId: string;
  stockAdjustments: InventoryAiStockAdjustmentRequest[];
  newProducts: InventoryAiNewProductRequest[];
}

export interface InventoryAiCommitResultDto {
  scanId: string;
  adjustedProductsCount: number;
  createdProductsCount: number;
  totalUnitsAdded: number;
  adjustedProductNames: string[];
  createdProductNames: string[];
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

export interface OrderDeliveryAssigneeDto {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  isActive: boolean;
  currentAvailability: DeliveryAvailability;
}

export interface OrderDto {
  id: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  notes: string | null;
  status: OrderStatus;
  deliveryUserId: string | null;
  subtotal: number;
  discountTotal: number;
  appliedPromotionId: string | null;
  appliedPromotionCode: string | null;
  total: number;
  createdAtUtc: string;
  updatedAtUtc: string;
  items: OrderItemDto[];
  deliveryAssignee: OrderDeliveryAssigneeDto | null;
}

export interface DecodedToken {
  email?: string;
  role?: string;
  storeId?: string;
}
