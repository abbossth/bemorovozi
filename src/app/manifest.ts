import type { MetadataRoute } from "next";

// Makes the admin panel installable ("Add to Home Screen") — required for web push on iPhone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BemorOvozi — Boshqaruv paneli",
    short_name: "BemorOvozi",
    description: "Bemorlarning fikr-mulohazalarini kuzatish paneli",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0F6E5C",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
