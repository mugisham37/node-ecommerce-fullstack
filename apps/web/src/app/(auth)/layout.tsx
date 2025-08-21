import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - E-commerce Inventory Management',
  description: 'Sign in or create an account to access your inventory management dashboard',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}