import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Let's Canto · 一齊學",
    short_name: "一齊學",
    description: "Personalised Hong Kong Cantonese for heritage learners and families.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f5ed",
    theme_color: "#234d40",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
