import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });

export const metadata = {
  title: "Lumen — Conversation Dashboard",
  description: "Reply to every Telegram conversation from one focused inbox.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-sans bg-base text-text-primary antialiased">{children}</body>
    </html>
  );
}
