import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { SettingsPanel } from "@/components/SettingsPanel";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-7 text-xs text-slate-500">
          <Link href="/" className="hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">Projects</Link>
          <span aria-hidden="true" className="px-2">/</span>
          <span aria-current="page" className="font-medium text-slate-800">Settings</span>
        </nav>
        <SettingsPanel />
      </main>
    </div>
  );
}
