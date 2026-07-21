import { Sidebar } from '@/components/sidebar';
import { ProductTour } from '@/components/product-tour';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
      <ProductTour />
    </div>
  );
}
