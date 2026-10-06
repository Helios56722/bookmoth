import "./globals.css";

export const metadata = {
  title: "Bookmoth | Turn screenshots into learning material",
  description: "An open-source learning studio that turns permitted screenshots into grounded study guides, reports, practice sets, and visual collages.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/bookmoth-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/bookmoth-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/bookmoth-apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  themeColor: "#201433",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
