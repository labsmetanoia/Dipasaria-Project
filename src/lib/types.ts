// Domain types shared by the storefront, the back-office and both data adapters.

export type StorageClass = "chilled" | "frozen" | "ambient";
export type Unit = "kg" | "pack" | "tray" | "pcs" | "bottle" | "crate" | "box";
export type Segment = "retail" | "business";
export type OrderStatus = "new" | "confirmed" | "packing" | "delivering" | "completed" | "cancelled";
export type PaymentMethod = "qris" | "transfer" | "cod" | "terms";
export type PaymentStatus = "unpaid" | "awaiting_confirmation" | "paid" | "void";
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
  variants: Variant[];
  prep_options: PrepOption[];
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
}

export interface OrderItem {
  id: string;
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
  status: OrderStatus | "paid" | "weighed";
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
