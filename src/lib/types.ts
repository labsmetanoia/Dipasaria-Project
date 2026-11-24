// Domain types shared by the storefront, the back-office and both data adapters.

export type StorageClass = "chilled" | "frozen" | "ambient";
export type Unit = "kg" | "pack" | "tray" | "pcs" | "bottle" | "crate" | "box";
export type Segment = "retail" | "business";
export type OrderStatus = "new" | "confirmed" | "packing" | "delivering" | "completed" | "cancelled";
export type PaymentMethod = "qris" | "transfer" | "cod" | "terms";
export type PaymentStatus = "unpaid" | "awaiting_confirmation" | "paid" | "refund_due" | "void";
export type PaymentTerms = "prepaid" | "days3" | "weekly";
export type AccountStatus = "pending" | "approved" | "suspended";
export type PromoType = "percent" | "fixed" | "free_delivery";

export interface Settings {
  store_name: string;
  tagline: string;
  tagline_en: string | null;
  whatsapp_number: string; // international format without +, e.g. 628111234567
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  qris_image_url: string | null;
  cutoff_time: string; // "20:00" WIB
  min_order_retail: number;
  min_order_business: number;
  free_delivery_retail: number;
  free_delivery_business: number;
  catch_weight_buffer_pct: number;
  max_days_ahead: number;
  instagram: string;
  address_line: string;
  announcement: string | null;
  announcement_en: string | null;
  hero_image_url: string | null;
  about_image_url: string | null;
  /** Minutes a household transfer/QRIS order with a known total has to be paid before automatic cancellation (0 = never). */
  payment_window_minutes: number;
  /** Automatic WhatsApp messages that are switched on. */
  wa_events: WaKind[];
  /** Days a tempo invoice may be past due before new tempo orders are refused. */
  terms_grace_days: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  description: string;
  description_en: string | null;
  sort: number;
  icon: string; // key into the icon set
  image_url: string | null;
  is_seafood: boolean;
}

export interface Variant {
  id: string;
  product_id: string;
  label: string; // "300–500 g/ekor", "1 kg", "Tray 30"
  label_en: string | null;
  unit: Unit;
  min_qty: number;
  step_qty: number;
  price_retail: number;
  price_business: number;
  cost: number;
  stock_qty: number | null; // null = not tracked
  business_only: boolean;
  is_active: boolean;
  sort: number;
}

export interface PrepOption {
  id: string;
  product_id: string;
  label: string;
  label_en: string | null;
  surcharge: number; // per unit
  note: string | null;
  note_en: string | null;
  sort: number;
}

export interface Product {
  id: string;
  slug: string;
  category_id: string;
  name: string;
  name_en: string | null;
  scientific_name: string | null;
  aliases: string[];
  description: string;
  description_en: string | null;
  origin: string;
  origin_en: string | null;
  storage_class: StorageClass;
  storage_note: string;
  storage_note_en: string | null;
  is_catch_weight: boolean;
  available_today: boolean;
  is_active: boolean;
  is_featured: boolean;
  image_url: string | null;
  icon: string;
  sort: number;
  /** trader's-pick box: contents chosen by the owner each week after the auction */
  curated?: boolean;
  weekly_contents?: string;
  weekly_contents_en?: string | null;
  weekly_contents_at?: string | null;
  /** seasonal pre-order this product belongs to (sold only on its campaign page, for its delivery days) */
  campaign_id?: string | null;
  variants: Variant[];
  prep_options: PrepOption[];
}

/**
 * A seasonal pre-order (New Year's Eve, Chinese New Year, Lebaran): its own page and products, ordering from opens_on
 * until the shop cut-off on order_by, delivery on a day from deliver_from to deliver_to, paid in advance.
 */
export interface Campaign {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  intro: string;
  intro_en: string | null;
  image_url: string | null;
  opens_on: string;
  order_by: string;
  deliver_from: string;
  deliver_to: string;
  is_active: boolean;
  created_at: string;
}

export interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
  is_active: boolean;
  sort: number;
}

export interface DeliverySlot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  segment: Segment | "all";
  capacity: number;
  is_active: boolean;
  sort: number;
}

export interface Promo {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  min_spend: number;
  segment: Segment | "all";
  quota: number | null;
  used_count: number;
  first_order_only: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  description: string;
}

export interface BusinessAccount {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string;
  address: string;
  area_id: string | null;
  business_type: string;
  discount_pct: number;
  payment_terms: PaymentTerms;
  allow_cod: boolean;
  status: AccountStatus;
  access_code: string | null;
  preferred_slot_id: string | null;
  notes: string;
  applied_at: string;
  approved_at: string | null;
  /** Most the account may owe on tempo (open invoices, including undelivered orders); null = no limit. */
  credit_limit: number | null;
  /** Agreed prices (loaded with the account for pricing; current and future ones only). */
  contract_prices?: ContractPrice[];
}

export interface OrderItem {
  id: string;
  /** stock was deducted for this line at order time (only these lines give stock back on cancel) */
  stock_reserved?: boolean;
  order_id: string;
  product_id: string;
  variant_id: string;
  category_id: string;
  product_name: string;
  variant_label: string;
  unit: Unit;
  storage_class: StorageClass;
  is_catch_weight: boolean;
  qty_ordered: number;
  qty_final: number | null;
  unit_price: number; // after account discount
  prep_option_id: string | null;
  prep_label: string | null;
  prep_surcharge: number;
  unit_cost: number;
  line_total_est: number;
  line_total_final: number | null;
}

export interface StatusEvent {
  /** "unpaid": a tempo invoice reopened after a payment was removed */
  status: OrderStatus | "paid" | "weighed" | "unpaid";
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  code: string;
  segment: Segment;
  account_id: string | null;
  customer_name: string;
  phone: string;
  address: string;
  area_id: string | null;
  area_name: string;
  maps_url: string | null;
  delivery_date: string; // YYYY-MM-DD
  slot_id: string;
  slot_label: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  subtotal_est: number;
  discount: number;
  delivery_fee: number;
  total_est: number;
  subtotal_final: number | null;
  total_final: number | null;
  has_catch_weight: boolean;
  weighed_at: string | null;
  promo_code: string | null;
  /** promo terms frozen at order time (re-pricing after weighing uses these, not the live promo) */
  promo_type?: Promo["type"] | null;
  promo_value?: number | null;
  client_ref?: string | null;
  /** Unpaid by this time → cancelled automatically (null = never). */
  pay_by?: string | null;
  /** Customer agreed to order updates on WhatsApp (default true). */
  wa_opt_in?: boolean;
  /** If an item is short at the dawn auction: similar replacement, contact first, or leave it out. */
  substitution?: Substitution;
  /** Proof of delivery. */
  delivered_at?: string | null;
  delivery_note?: string | null;
  cod_collected?: number | null;
  /** Tempo invoices: delivery date + the account's terms, fixed when the order is placed. */
  due_date?: string | null;
  /** Gift orders: not null (possibly empty) for every gift; the recipient's phone is for the courier. */
  gift_message?: string | null;
  gift_from?: string | null;
  recipient_phone?: string | null;
  /** seasonal pre-order the order was placed under */
  campaign_id?: string | null;
  customer_note: string;
  internal_note: string;
  created_at: string;
  history: StatusEvent[];
  items: OrderItem[];
}

// --- Inputs ---

export interface CartLine {
  product_id: string;
  variant_id: string;
  qty: number;
  prep_option_id: string | null;
}

export interface PlaceOrderInput {
  lines: CartLine[];
  customer_name: string;
  phone: string;
  address: string;
  area_id: string;
  maps_url?: string;
  delivery_date: string;
  slot_id: string;
  payment_method: PaymentMethod;
  promo_code?: string;
  customer_note?: string;
  /** idempotency key from the checkout page: retries and double taps return the same order */
  client_ref?: string;
  /** consent to automatic order updates on WhatsApp */
  wa_opt_in?: boolean;
  substitution?: Substitution;
  /** send to someone else: `customer_name` and `address` are the recipient's; `phone` stays the buyer's */
  gift?: { recipient_phone: string; message: string; from: string } | null;
}

export interface Quote {
  segment: Segment;
  lines: Array<{
    key: string;
    product: Product;
    variant: Variant;
    prep: PrepOption | null;
    qty: number;
    unit_price: number;
    line_total: number;
  }>;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  min_order: number;
  min_order_met: boolean;
  has_catch_weight: boolean;
  promo: Promo | null;
  promo_error: string | null;
  errors: string[];
}

export interface DailySummary {
  date: string;
  orders_total: number;
  orders_retail: number;
  orders_business: number;
  sales: number;
  est_cost: number;
  est_gross_profit: number;
  margin_pct: number;
  non_seafood_share_pct: number;
  unpaid_amount: number;
  to_weigh: number;
  by_status: Record<OrderStatus, number>;
}

export interface BuyingLine {
  product_id: string;
  product_name: string;
  scientific_name: string | null;
  variant_label: string;
  unit: Unit;
  storage_class: StorageClass;
  qty: number;
  qty_with_buffer: number;
  order_count: number;
  prep_notes: string[];
}

export interface AccountApplication {
  business_name: string;
  contact_name: string;
  phone: string;
  address: string;
  area_id: string | null;
  business_type: string;
  notes: string;
}

// ---------- Standing orders (restaurant recurring orders) ----------
export interface StandingOrderLine {
  variant_id: string;
  qty: number;
  prep_option_id: string | null;
}

export interface StandingOrder {
  id: string;
  /** the restaurant that owns it; null for a household's weekly box */
  account_id: string | null;
  /** household weekly box: the customer, the saved address it goes to, and its rhythm */
  customer_id: string | null;
  address_id: string | null;
  /** 1 = every week, 2 = every second week counted from anchor_date */
  every_weeks: number;
  /** first delivery date (fixes which weeks a two-weekly box falls on) */
  anchor_date: string | null;
  /** why it was paused automatically ("unpaid", "address"); null when paused by hand or active */
  paused_reason: string | null;
  name: string;
  /** ISO weekdays: 1 = Monday … 7 = Sunday */
  weekdays: number[];
  slot_id: string;
  payment_method: PaymentMethod;
  lines: StandingOrderLine[];
  status: "active" | "paused";
  /** delivery dates (YYYY-MM-DD) the customer chose to skip */
  skip_dates: string[];
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface StandingOrderRun {
  id: string;
  standing_order_id: string;
  delivery_date: string;
  order_id: string | null;
  order_code: string | null;
  error: string | null;
  /** Items left out that night because they were unavailable (the rest was still placed). */
  note: string | null;
  created_at: string;
}

export type StandingOrderInput = Pick<StandingOrder, "name" | "weekdays" | "slot_id" | "payment_method" | "lines" | "note"> & { id?: string };
/** A household's weekly box: one delivery day, a saved address, every week or every second week. */
export type BoxInput = StandingOrderInput & { address_id: string; every_weeks: number };

/** A grouped application error (server or browser) for the back-office system page. */
export interface AppError {
  fingerprint: string;
  source: "server" | "client" | "action" | "job";
  message: string;
  path: string;
  digest: string | null;
  detail: string | null;
  count: number;
  first_at: string;
  last_at: string;
  resolved: boolean;
}

export interface JobRun { job: string; last_at: string; result: string }

/** One QR code issued through the payment gateway for an order (id = the gateway's order_id). */
export interface Payment {
  id: string;
  order_id: string;
  provider: "midtrans" | "mock";
  method: "qris";
  amount: number;
  amount_paid: number | null;
  status: "pending" | "paid" | "expired" | "failed" | "cancelled";
  qr_string: string | null;
  qr_url: string | null;
  expires_at: string | null;
  created_at: string;
  paid_at: string | null;
}

/** What recording a verified gateway result did to the order. */
export type GatewayOutcome = "paid" | "mismatch" | "late" | "duplicate" | "updated" | "noop";

export type WaKind = "received" | "invoice" | "paid" | "delivering" | "reminder" | "cancelled" | "standing" | "delivered" | "claim" | "restock" | "statement";

/** One automatic WhatsApp message to a customer (outbox row). */
export interface WaMessage {
  id: string;
  /** null for messages not tied to an order (back-in-stock alerts) */
  order_id: string | null;
  kind: WaKind;
  dedupe: string;
  phone: string;
  template: string;
  params: string[];
  body: string;
  /** "sending" = claimed by one process while the API call is in flight (prevents double sends). */
  status: "queued" | "sending" | "sent" | "failed" | "manual" | "skipped";
  provider_id: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  sent_at: string | null;
}

/** A household customer: a phone number verified with a one-time WhatsApp code. */
export interface Customer {
  id: string;
  phone: string;
  name: string;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  recipient: string;
  address: string;
  area_id: string | null;
  maps_url: string | null;
  is_default: boolean;
  created_at: string;
}

export type CustomerLoginResult = { status: "ok"; customerId: string } | { status: "wrong" | "expired" | "locked" };

export type Substitution = "similar" | "contact" | "remove";

/** A customer's rating of a delivered order (1-5 stars), with optional stars per product. */
export interface Rating {
  id: string;
  order_id: string;
  stars: number;
  comment: string;
  items: Array<{ product_id: string; stars: number }>;
  created_at: string;
  /** filled for back-office lists */
  order_code?: string;
  customer_name?: string;
  phone?: string;
}
export interface ProductRating { average: number; count: number }

/** One non-cancelled order, reduced to what customer-retention figures need. */
export interface OrderFact {
  code: string;
  segment: Segment;
  account_id: string | null;
  phone: string;
  customer_name: string;
  delivery_date: string;
  total: number;
}

/** A step of the visit funnel (anonymous daily counters). */
export type FunnelEvent = "visit" | "product_view" | "add_to_cart" | "checkout_start" | "order_placed";
export interface FunnelRow { day: string; event: FunnelEvent; product_id: string; n: number }

/** An agreed price for one restaurant and product size over a period (replaces the wholesale price and discount). */
export interface ContractPrice {
  id: string;
  account_id: string;
  variant_id: string;
  price: number;
  starts_on: string; // YYYY-MM-DD
  ends_on: string | null;
  note: string;
  created_at: string;
}

export type AccountPaymentMethod = "transfer" | "cash" | "qris" | "giro" | "other";

/** Money received from a restaurant against its tempo invoices. */
export interface AccountPayment {
  id: string;
  account_id: string;
  amount: number;
  paid_on: string; // YYYY-MM-DD
  method: AccountPaymentMethod;
  reference: string;
  note: string;
  created_at: string;
}

/** Part of a payment matched to one invoice (oldest invoice first). */
export interface PaymentAllocation {
  id: string;
  payment_id: string;
  order_id: string;
  amount: number;
  created_at: string;
}

export type ClaimReason = "not_fresh" | "wrong_item" | "short_weight" | "damaged" | "missing" | "other";

/** A freshness-guarantee report from the customer, decided by the owner. */
export interface Claim {
  id: string;
  order_id: string;
  items: Array<{ item_id: string; product_name?: string }>;
  reason: ClaimReason;
  note: string;
  /** small JPEG data URLs, compressed in the browser */
  photos: string[];
  status: "open" | "replace" | "refund" | "declined";
  resolution_note: string;
  refund_amount: number | null;
  created_at: string;
  resolved_at: string | null;
}

/** Dawn buying log: a purchase, or what was left over / thrown away, for a delivery date. */
export interface Purchase {
  id: string;
  delivery_date: string;
  product_id: string;
  kind: "purchase" | "leftover" | "waste";
  qty: number;
  unit: string;
  total_cost: number;
  supplier: string;
  note: string;
  created_at: string;
}
