import type {
  AccountPayment,
  ContractPrice,
  PaymentAllocation,
  AccountApplication,
  AppError,
  GatewayOutcome,
  Payment,
  WaMessage,
  Claim,
  ClaimReason,
  Purchase,
  Customer,
  CustomerAddress,
  CustomerLoginResult,
  JobRun,
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
  /** Purchase cost is stripped (0) unless includeCost: only back-office product pages may see margins. */
  getProducts(opts?: { includeInactive?: boolean; includeCost?: boolean }): Promise<Product[]>;
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
  finishStandingRun(runId: string, patch: { order_id?: string; order_code?: string; error?: string; note?: string | null }): Promise<void>;

  // Protection and operations
  /** Count a hit for `key`; false when `max` hits already happened in the last `windowSeconds` (the hit is then not counted). */
  hitRateLimit(key: string, windowSeconds: number, max: number): Promise<boolean>;
  /** Cancel household orders not paid by their pay_by time (stock, slot and promo use are returned). Returns how many. */
  expireUnpaidOrders(): Promise<number>;
  /** Back-office: move or remove an order's automatic-cancellation deadline. */
  setOrderPayBy(id: string, payBy: string | null): Promise<Result<Order>>;
  /** Record an error, grouped by source + message + path. Returns its occurrence count (1 = new). */
  logError(e: { source: AppError["source"]; message: string; path?: string; digest?: string | null; detail?: string | null }): Promise<number>;
  listErrors(opts?: { includeResolved?: boolean; limit?: number }): Promise<AppError[]>;
  resolveErrors(fingerprints: string[] | "all"): Promise<void>;
  recordJob(job: string, result: string): Promise<void>;
  listJobs(): Promise<JobRun[]>;
  /** Cheap database round-trip for the health check. */
  ping(): Promise<boolean>;

  // QRIS gateway payments
  createPayment(p: Omit<Payment, "created_at" | "paid_at" | "amount_paid" | "status">): Promise<Payment>;
  listPayments(orderId: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | null>;
  /** Record a result the server has verified with the gateway; marks the order paid when the amount matches. */
  recordGatewayPayment(id: string, status: Payment["status"], amount: number | null, raw: unknown): Promise<GatewayOutcome>;

  // WhatsApp outbox
  /** Insert a message; null if this (order, kind, dedupe) was already queued or sent. */
  enqueueWa(m: Pick<WaMessage, "id" | "order_id" | "kind" | "dedupe" | "phone" | "template" | "params" | "body" | "status">): Promise<WaMessage | null>;
  /** Atomically take a queued/failed message (or one stuck in "sending" for 5+ minutes) for sending; false if another process has it. */
  claimWa(id: string, attempts: number): Promise<boolean>;
  updateWa(id: string, patch: Partial<Pick<WaMessage, "status" | "provider_id" | "error" | "attempts" | "sent_at">>): Promise<void>;
  listWa(orderId: string): Promise<WaMessage[]>;
  /** Newest messages across orders, optionally only some statuses (back-office queue). */
  listWaRecent(limit: number, statuses?: WaMessage["status"][]): Promise<WaMessage[]>;
  getWa(id: string): Promise<WaMessage | null>;
  /** Messages to (re)try: queued, failed fewer than 3 times, or stuck sending; created in the last 24 hours. */
  listWaPending(limit: number): Promise<WaMessage[]>;
  /** Unpaid orders whose payment deadline falls within the next `minutes` (for reminders). */
  listOrdersPayBySoon(minutes: number): Promise<Order[]>;
  /** Unpaid orders already past their payment deadline (about to be cancelled automatically). */
  listOrdersPastPayBy(): Promise<Order[]>;
  /** Orders cancelled because their payment deadline passed, within the last `hours` (for the customer message). */
  listOrdersAutoCancelled(hours: number): Promise<Order[]>;

  // Household customer accounts (codes and session tokens arrive already hashed)
  customerRequestCode(phone: string, codeHash: string): Promise<Result<string>>;
  customerLogin(phone: string, codeHash: string, tokenHash: string): Promise<CustomerLoginResult>;
  getCustomerBySession(tokenHash: string): Promise<Customer | null>;
  endCustomerSession(tokenHash: string): Promise<void>;
  updateCustomer(id: string, patch: Partial<Pick<Customer, "name" | "marketing_opt_in">>): Promise<Customer | null>;
  /** Removes the profile, addresses and sessions; orders stay (they are the shop's records). */
  deleteCustomer(id: string): Promise<void>;
  listCustomers(limit: number): Promise<Customer[]>;
  listAddresses(customerId: string): Promise<CustomerAddress[]>;
  saveAddress(customerId: string, a: Pick<CustomerAddress, "label" | "recipient" | "address" | "area_id" | "maps_url" | "is_default"> & { id?: string }): Promise<Result<CustomerAddress>>;
  deleteAddress(customerId: string, id: string): Promise<void>;
  /** Household orders placed with this phone number, newest first. */
  getOrdersByPhone(phone: string, limit: number): Promise<Order[]>;

  // Delivery mode
  /** Completes the order with time, who received it and any cash collected (cash covering the total pays a COD order). */
  markDelivered(id: string, note: string | null, cod: number | null): Promise<Result<Order>>;

  // Freshness-guarantee claims
  createClaim(code: string, phone: string, c: { items: Claim["items"]; reason: ClaimReason; note: string; photos: string[] }, windowHours: number): Promise<Result<string>>;
  resolveClaim(id: string, status: "replace" | "refund" | "declined", note: string, refund: number | null): Promise<Result<string>>;
  listClaims(filter?: { status?: Claim["status"]; orderId?: string; limit?: number }): Promise<Claim[]>;

  // "Kabari saya" back-in-stock alerts
  addStockAlert(productId: string, phone: string): Promise<void>;
  /** Waiting customers for a product, marked as notified in the same step (each is told once). */
  takeStockAlerts(productId: string): Promise<string[]>;
  /** Waiting customers per product (not yet notified). */
  stockAlertCounts(): Promise<Record<string, number>>;

  // Dawn buying log
  addPurchase(p: Omit<Purchase, "id" | "created_at">): Promise<Result<Purchase>>;
  deletePurchase(id: string): Promise<void>;
  listPurchases(filter: { date?: string; from?: string; to?: string }): Promise<Purchase[]>;

  // Restaurant receivables (rules in SQL; summaries computed by src/lib/receivables.ts)
  /** Tempo orders that are not cancelled (no items), payments and their allocations, for one account or all. */
  listReceivables(filter?: { accountId?: string }): Promise<{ orders: Order[]; payments: AccountPayment[]; allocations: PaymentAllocation[] }>;
  /** Records the payment and matches it to open invoices, oldest first. Returns the payment id. */
  recordAccountPayment(accountId: string, p: Pick<AccountPayment, "amount" | "paid_on" | "method" | "reference" | "note">): Promise<Result<string>>;
  /** Removes a payment; invoices it settled reopen unless other payments still cover them. */
  deleteAccountPayment(id: string): Promise<Result<void>>;
  listContractPrices(accountId?: string): Promise<ContractPrice[]>;
  addContractPrice(c: Pick<ContractPrice, "account_id" | "variant_id" | "price" | "starts_on" | "ends_on" | "note">): Promise<Result<ContractPrice>>;
  deleteContractPrice(id: string): Promise<void>;
}
