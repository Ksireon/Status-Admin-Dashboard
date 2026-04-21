'use client';

import React, { useEffect, useState } from 'react';
import { DashboardHome } from '@/components/charts/DashboardHome';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { DashboardStats } from '@/lib/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<DashboardStats>('/admin/dashboard/stats');
        setStats(data);
      } catch (error) {
        toast.error('Failed to load dashboard data', 'Please try refreshing the page');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>
      <DashboardHome stats={stats} isLoading={isLoading} />
    </div>
  );
}
