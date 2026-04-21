'use client';

import React, { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { OrderStatusLabels, OrderStatusColors, OrderStatus } from '@/lib/constants';
import { Order, OrderStatusType } from '@/lib/types';
import { 
  Search, Filter, ChevronLeft, ChevronRight, Eye, 
  Download, CheckSquare, Square, Trash2, Calendar,
  MoreHorizontal, X
} from 'lucide-react';
import Link from 'next/link';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'DELIVERING', label: 'Delivering' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELED', label: 'Canceled' },
];

const quickDateRanges = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
];

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatusType | ''>('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const toast = useToast();
  const { orders, meta, isLoading, error, refetch, bulkUpdateStatus, exportOrders } = useOrders({
    page,
    limit: 10,
    status,
    search,
    dateFrom,
    dateTo,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setStatus('');
    setSearch('');
    setSearchInput('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const setQuickDateRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    setDateTo(to.toISOString().split('T')[0]);
    setDateFrom(from.toISOString().split('T')[0]);
    setPage(1);
  };

  const hasActiveFilters = status || search || dateFrom || dateTo;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const toggleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleBulkStatusUpdate = async (newStatus: OrderStatusType) => {
    if (selectedOrders.size === 0) {
      toast.warning('No orders selected', 'Please select at least one order');
      return;
    }

    setBulkActionLoading(true);
    const success = await bulkUpdateStatus(Array.from(selectedOrders), newStatus);
    setBulkActionLoading(false);

    if (success) {
      toast.success(
        'Status updated', 
        `${selectedOrders.size} order(s) moved to ${OrderStatusLabels[newStatus]}`
      );
      setSelectedOrders(new Set());
    } else {
      toast.error('Failed to update orders');
    }
  };

  const handleExport = () => {
    const ordersToExport = selectedOrders.size > 0 
      ? orders.filter(o => selectedOrders.has(o.id))
      : orders;
    
    exportOrders(ordersToExport);
    toast.success(
      'Export complete', 
      `${ordersToExport.length} order(s) exported to CSV`
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={18} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Card>
        {/* Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
              placeholder="Search by order ID or customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-md"
            />
            <Button type="submit" variant="secondary">
              <Search size={18} />
            </Button>
            {search && (
              <Button type="button" variant="ghost" onClick={() => { setSearchInput(''); setSearch(''); }}>
                <X size={18} />
              </Button>
            )}
          </form>

          <div className="flex items-center gap-2">
            <Button 
              variant={showFilters ? 'primary' : 'secondary'} 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} className="mr-2" />
              Filters
              {hasActiveFilters && (
                <Badge variant="primary" className="ml-2">!</Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as OrderStatusType | '');
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  {statusOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date From
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date To
                </label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>
              </div>
            </div>

            {/* Quick Date Range Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 py-1">Quick select:</span>
              {quickDateRanges.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setQuickDateRange(range.days)}
                  className="px-3 py-1 text-sm rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                >
                  {range.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <div className="flex justify-end">
                <Button variant="ghost" onClick={clearFilters}>
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Bulk Actions Bar */}
        {selectedOrders.size > 0 && (
          <div className="bg-accent-blue/10 dark:bg-accent-blue/20 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-accent-blue">
                {selectedOrders.size} selected
              </span>
              <div className="h-4 w-px bg-gray-300 dark:bg-slate-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Bulk actions:
              </span>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleBulkStatusUpdate('PROCESSING')}
                disabled={bulkActionLoading}
              >
                Mark Processing
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleBulkStatusUpdate('DELIVERING')}
                disabled={bulkActionLoading}
              >
                Mark Delivering
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => handleBulkStatusUpdate('COMPLETED')}
                disabled={bulkActionLoading}
              >
                Mark Completed
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedOrders(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-accent-red">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <button 
                        onClick={toggleSelectAll}
                        className="hover:opacity-70"
                      >
                        {selectedOrders.size === orders.length && orders.length > 0 ? (
                          <CheckSquare size={18} className="text-accent-blue" />
                        ) : (
                          <Square size={18} className="text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr
                        key={order.id}
                        className={`bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50 ${
                          selectedOrders.has(order.id) ? 'bg-accent-blue/5 dark:bg-accent-blue/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => toggleSelectOrder(order.id)}
                            className="hover:opacity-70"
                          >
                            {selectedOrders.has(order.id) ? (
                              <CheckSquare size={18} className="text-accent-blue" />
                            ) : (
                              <Square size={18} className="text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-medium">#{order.shortId}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{order.user.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{order.user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${OrderStatusColors[order.status]}`}>
                            {OrderStatusLabels[order.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(order.total)}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-accent-blue hover:underline"
                          >
                            <Eye size={16} />
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * meta.limit + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total} orders
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft size={18} />
                  </Button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {page} of {meta.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setPage(page + 1)}
                    disabled={page === meta.totalPages}
                  >
                    <ChevronRight size={18} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
