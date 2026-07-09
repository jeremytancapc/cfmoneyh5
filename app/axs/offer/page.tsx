import type { Metadata } from "next";
import { AxsOfferView } from "./axs-offer-view";

export const metadata: Metadata = {
  title: "Your Offer — CF Money",
};

export default function AxsOfferPage() {
  return <AxsOfferView />;
}
