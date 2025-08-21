'use client';

import { useState } from 'react';

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isAuthenticated = false;
  const user: { email?: string } | null = null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
              E-commerce Inventory
              <span className="text-primary block">Management System</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Modern full-stack inventory management with real-time updates, 
              comprehensive analytics, and seamless user experience.
            </p>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold text-card-foreground mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated ? `Logged in as ${user?.email}` : 'Not authenticated'}
              </p>
              <div className={`w-3 h-3 rounded-full mt-2 ${
                isAuthenticated ? 'bg-success' : 'bg-muted'
              }`} />
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold text-card-foreground mb-2">Theme</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Current: {theme}
              </p>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded"
              >
                Toggle Theme
              </button>
            </div>
            
            <div className="bg-card border rounded-lg p-6">
              <h3 className="font-semibold text-card-foreground mb-2">API Status</h3>
              <p className="text-sm text-muted-foreground">
                tRPC client configured
              </p>
              <div className="w-3 h-3 rounded-full mt-2 bg-warning" />
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              'Product Management',
              'Inventory Tracking',
              'Order Processing',
              'Supplier Management',
              'Real-time Analytics',
              'Mobile Support',
              'Multi-tenant',
              'API Integration'
            ].map((feature) => (
              <div key={feature} className="bg-muted/50 rounded-lg p-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              Get Started
            </button>
            <button className="border border-border text-foreground px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors">
              View Documentation
            </button>
          </div>

          {/* Tech Stack */}
          <div className="mt-16 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Built with</p>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <span>Next.js 14</span>
              <span>•</span>
              <span>TypeScript</span>
              <span>•</span>
              <span>tRPC</span>
              <span>•</span>
              <span>Tailwind CSS</span>
              <span>•</span>
              <span>Zustand</span>
              <span>•</span>
              <span>React Query</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
