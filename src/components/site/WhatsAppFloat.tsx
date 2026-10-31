import { MessageCircle } from "lucide-react";
import { waLink } from "@/lib/format";

export function WhatsAppFloat({ number, text, label }: { number: string; text: string; label: string }) {
 return (
    <a
 href={waLink(number, text)}
 target="_blank"
 rel="noreferrer"
 aria-label={label}
 className="no-print fixed bottom-5 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-float transition hover:scale-105 md:bottom-6 md:right-6 md:h-14 md:w-14"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}
