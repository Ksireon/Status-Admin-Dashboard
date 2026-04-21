'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Order, OrderStatusType } from '@/lib/types';

interface UseOrdersOptions {
  page?: number;
  limit?: number;
  status?: OrderStatusType | '';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.status) params.append('status', options.status);
      if (options.search) params.append('search', options.search);
      if (options.dateFrom) params.append('dateFrom', options.dateFrom);
      if (options.dateTo) params.append('dateTo', options.dateTo);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response: any = await api.get(`/admin/orders${queryString}`);
      
      // Handle different response formats
      if (response && Array.isArray(response.data)) {
        setOrders(response.data);
        setMeta(response.meta || { total: response.data.length, page: options.page || 1, limit: options.limit || 10, totalPages: 1 });
      } else if (response && response.data && Array.isArray(response.data.data)) {
        setOrders(response.data.data);
        setMeta(response.data.meta || { total: response.data.data.length, page: options.page || 1, limit: options.limit || 10, totalPages: 1 });
      } else if (Array.isArray(response)) {
        setOrders(response);
        setMeta({ total: response.length, page: options.page || 1, limit: options.limit || 10, totalPages: 1 });
      } else {
        setOrders([]);
        setError('Unexpected data format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.page, options.limit, options.status, options.search, options.dateFrom, options.dateTo]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId: string, status: OrderStatusType) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status });
      await fetchOrders();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update order status');
      return false;
    }
  };

  // Bulk update orders status
  const bulkUpdateStatus = async (orderIds: string[], status: OrderStatusType) => {
    try {
      // Update all orders in parallel
      await Promise.all(
        orderIds.map(id => api.patch(`/admin/orders/${id}/status`, { status }))
      );
      await fetchOrders();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to update orders');
      return false;
    }
  };

  // Export orders to CSV
  const exportOrders = (selectedOrders?: Order[]) => {
    const ordersToExport = selectedOrders || orders;
    
    const csvContent = [
      ['Order ID', 'Customer', 'Email', 'Status', 'Total', 'Date', 'Items Count'],
      ...ordersToExport.map(order => [
        order.shortId,
        order.user.name || 'Unknown',
        order.user.email,
        order.status,
        order.total.toString(),
        new Date(order.createdAt).toLocaleDateString(),
        order.items?.length?.toString() || '0',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    orders,
    meta,
    isLoading,
    error,
    refetch: fetchOrders,
    updateOrderStatus,
    bulkUpdateStatus,
    exportOrders,
  };
}
