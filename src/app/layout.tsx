import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title: "School Admin",
  description: "Sistema de gestión escolar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="antialiased">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <Navbar />
          <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
