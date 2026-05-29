import { redirect } from "next/navigation";
import { getAipSession } from "@/lib/aip-session";
import { AipBookingView } from "./aip-booking-view";

export const dynamic = "force-dynamic";

export default async function AipBookPage() {
  const session = await getAipSession();
  if (!session) redirect("/aip");

  return <AipBookingView />;
}
