"use client";

import { Buildings, Lightning, ShieldCheck } from "@phosphor-icons/react";

function SidebarFeatureIcon({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Buildings;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
        aria-hidden
      >
        <Icon
          size={24}
          weight="duotone"
          className="text-[#06DEC0]"
          aria-hidden
        />
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/65">{subtitle}</p>
      </div>
    </div>
  );
}

export function SidebarTrustFeatures() {
  return (
    <div className="relative z-10 flex flex-col gap-6">
      <SidebarFeatureIcon
        icon={Buildings}
        title="Licensed Lender"
        subtitle="MAS & MinLaw regulated"
      />
      <SidebarFeatureIcon
        icon={Lightning}
        title="Fast Approval"
        subtitle="Funds disbursed same day"
      />
      <SidebarFeatureIcon
        icon={ShieldCheck}
        title="No Credit Impact"
        subtitle="Soft checks only"
      />
    </div>
  );
}
