import { api } from "./api";

export type UploadedImage = { url: string; publicId: string };

const MAX_BYTES = 10 * 1024 * 1024;

// Gets a signature from our API, then uploads the file straight to Cloudinary.
export async function uploadImage(file: File, token: string): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 10 MB`);

  const sig = await api<{
    cloudName: string;
    apiKey: string;
    timestamp: number;
    folder: string;
    signature: string;
  }>("/admin/uploads/sign", { method: "POST", token });

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("signature", sig.signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message ?? "Image upload failed");
  return { url: data.secure_url, publicId: data.public_id };
}
