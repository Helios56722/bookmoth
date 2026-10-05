import "./globals.css";

export const metadata = {
  title: "Bookmoth | Turn screenshots into learning material",
  description: "An open-source learning studio that turns permitted screenshots into grounded study guides, reports, practice sets, and visual collages.",
  manifest: "/manifest.webmanifest",
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
