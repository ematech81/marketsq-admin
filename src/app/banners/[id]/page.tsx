"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import BannerForm, { type BannerValues } from "@/components/BannerForm";
import Shell from "@/components/Shell";
import { ErrorText } from "@/components/form";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ApiBanner = {
  title: string;
  image: { url: string; publicId?: string };
  mobileImage?: { url: string; publicId?: string };
  alt: string;
  link?: string;
  active: boolean;
};

export default function EditBannerPage() {
  return (
    <Shell adminOnly>
      <h1 className="mb-6 text-[32px] font-bold tracking-[-0.02em]">Edit banner</h1>
      <Editor />
    </Shell>
  );
}

function Editor() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [values, setValues] = useState<BannerValues | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ banner: ApiBanner }>(`/admin/banners/${id}`, { token })
      .then(({ banner: b }) =>
        setValues({ title: b.title, image: b.image, mobileImage: b.mobileImage ?? null, alt: b.alt, link: b.link ?? "", active: b.active }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the banner"));
  }, [id, token]);

  if (!values) return error ? <ErrorText message={error} /> : <p className="text-muted">Loading…</p>;
  return <BannerForm bannerId={id} initial={values} />;
}
