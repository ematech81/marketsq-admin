"use client";

import BannerForm, { emptyBanner } from "@/components/BannerForm";
import Shell from "@/components/Shell";

export default function NewBannerPage() {
  return (
    <Shell adminOnly>
      <h1 className="mb-6 text-[32px] font-bold tracking-[-0.02em]">Add hero section</h1>
      <BannerForm initial={emptyBanner} />
    </Shell>
  );
}
