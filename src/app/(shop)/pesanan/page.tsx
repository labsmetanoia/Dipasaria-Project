import { getRepo } from "@/lib/data";
import { getCurrentAccount } from "@/lib/auth";
import { OrderLookup } from "@/components/shop/OrderLookup";
import { MyOrders } from "@/components/shop/MyOrders";

export const metadata = { title: "Pesanan" };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const account = await getCurrentAccount();
  const accountOrders = account ? await (await getRepo()).getOrdersForAccount(account.id, 20) : [];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ocean-900">Pesanan</h1>
      <MyOrders accountOrders={accountOrders} />
      <OrderLookup />
    </div>
  );
}
