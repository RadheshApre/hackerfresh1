import type { Metadata } from "next";
import "./globals.css";
import Tracker from "@/components/Tracker";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "HackerFresh — ATS-friendly resume builder for Indian freshers",
  description: "Build a clean, ATS-friendly resume with professional templates, a resume checker and PDF download. Try it free.",
  openGraph: { title: "HackerFresh — Hack Your Way Into Your First Job", description: "ATS-friendly resume builder for Indian freshers.", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><Tracker /><Navbar />{children}<Footer /></body></html>);
}
