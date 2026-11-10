import type {
  AccountApplication,
  BuyingLine,
  BusinessAccount,
  Category,
  DailySummary,
  DeliveryArea,
  DeliverySlot,
  Order,
  OrderStatus,
  PaymentStatus,
  PlaceOrderInput,
  Product,
  Promo,
  Settings,
  StandingOrder,
  StandingOrderInput,
  StandingOrderRun,
  Variant,
} from "../types";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface OrderFilter {
  date?: string;
  status?: OrderStatus | "open";
  segment?: "retail" | "business";
  q?: string;
  limit?: number;
}

export interface SalesRow {
  date: string;
  orders: number;
  sales: number;
  gross_profit: number;
  non_seafood_sales: number;
}

/** Data access contract implemented by the Supabase adapter (production) and the in-memory adapter (demo). */
export interface Repo {
  readonly mode: "supabase" | "memory";

  // Catalogue (public)
  getSettings(): Promise<Settings>;
  getCategories(): Promise<Category[]>;
  getProducts(opts?: { includeInactive?: boolean }): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | null>;
  getAreas(opts?: { includeInactive?: boolean }): Promise<DeliveryArea[]>;
  getSlots(opts?: { includeInactive?: boolean }): Promise<DeliverySlot[]>;
  getPromoByCode(code: string): Promise<Promo | null>;
  /** Booked orders per date|slot for capacity display. */
  getSlotUsage(dates: string[]): Promise<Record<string, number>>;

  // Customer
  hasOrderedBefore(phone: string): Promise<boolean>;
  placeOrder(input: PlaceOrderInput, account: BusinessAccount | null): Promise<Result<Order>>;
  lookupOrder(code: string, phone: string): Promise<Order | null>;
  customerConfirmPayment(code: string, phone: string): Promise<Result<Order>>;
  getOrdersForAccount(accountId: string, limit?: number): Promise<Order[]>;

  // Business accounts
  applyAccount(input: AccountApplication): Promise<Result<BusinessAccount>>;
  businessLogin(phone: string, code: string): Promise<{ token: string; account: BusinessAccount } | null>;
  getAccountBySession(token: string): Promise<BusinessAccount | null>;
  endSession(token: string): Promise<void>;

  // Back-office
  listOrders(filter: OrderFilter): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<Result<Order>>;
  weighOrder(id: string, items: Array<{ item_id: string; qty_final: number }>): Promise<Result<Order>>;
  setPaymentStatus(id: string, status: PaymentStatus): Promise<Result<Order>>;
  updateOrderInternalNote(id: string, note: string): Promise<Result<Order>>;
  dailySummary(date: string): Promise<DailySummary>;
  buyingList(date: string): Promise<BuyingLine[]>;
  salesReport(from: string, to: string): Promise<SalesRow[]>;

  listAccounts(): Promise<BusinessAccount[]>;
  getAccount(id: string): Promise<BusinessAccount | null>;
  approveAccount(id: string, patch: { discount_pct: number; payment_terms: BusinessAccount["payment_terms"]; allow_cod: boolean; preferred_slot_id?: string | null }): Promise<Result<BusinessAccount>>;
  updateAccount(id: string, patch: Partial<BusinessAccount>): Promise<Result<BusinessAccount>>;
  regenerateAccessCode(id: string): Promise<Result<BusinessAccount>>;

  upsertProduct(p: Omit<Product, "variants" | "prep_options">): Promise<Result<Product>>;
  updateVariant(id: string, patch: Partial<Variant>): Promise<Result<Variant>>;
  createVariant(v: Omit<Variant, "id">): Promise<Result<Variant>>;
  setProductAvailability(productId: string, available: boolean): Promise<Result<void>>;
  upsertPrepOption(p: Product["prep_options"][number]): Promise<Result<void>>;
  deletePrepOption(id: string): Promise<Result<void>>;

  listPromos(): Promise<Promo[]>;
  upsertPromo(p: Promo): Promise<Result<Promo>>;
  deletePromo(id: string): Promise<Result<void>>;

  updateSettings(patch: Partial<Settings>): Promise<Result<Settings>>;
  upsertArea(a: DeliveryArea): Promise<Result<DeliveryArea>>;
  upsertSlot(s: DeliverySlot): Promise<Result<DeliverySlot>>;

  // Standing orders (restaurant recurring orders). Validation lives in src/lib/standing.ts.
  listStandingOrders(filter?: { accountId?: string }): Promise<StandingOrder[]>;
  saveStandingOrder(accountId: string, input: StandingOrderInput): Promise<Result<StandingOrder>>;
  setStandingOrderStatus(id: string, status: StandingOrder["status"]): Promise<Result<StandingOrder>>;
  setStandingSkip(id: string, date: string, skip: boolean): Promise<Result<StandingOrder>>;
  deleteStandingOrder(id: string): Promise<Result<void>>;
  listStandingRuns(filter?: { date?: string; standingOrderId?: string; limit?: number }): Promise<StandingOrderRun[]>;
  /** Claim the (standing order, date) run; returns null if it was already claimed. */
  claimStandingRun(standingOrderId: string, date: string): Promise<StandingOrderRun | null>;
  finishStandingRun(runId: string, patch: { order_id?: string; order_code?: string; error?: string }): Promise<void>;
}
