import { permanentRedirect } from "next/navigation";
// Belanja is the primary landing and conversion page.
export default function RootRedirect() {
  permanentRedirect("/belanja");
}
