'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { 
  BarChart, Download, Calendar, TrendingUp, TrendingDown, 
  DollarSign, ShoppingCart, Users, Package, FileText,
  ChevronLeft, ChevronRight, Filter, RefreshCw
} from 'lucide-react';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { api } from '@/lib/api';
import { DashboardStats, OrderStatusType } from '@/lib/types';
import { OrderStatusLabels, OrderStatusColors } from '@/lib/constants';
import { getLocalizedName, formatPrice } from '@/lib/utils';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

interface DateRange {
  from: string;
  to: string;
}

const quickRanges = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const COLORS = ['#4361ee', '#2ec4b6', '#ff9f1c', '#e63946', '#3a0ca3'];

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: '',
    to: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const toast = useToast();

  // Calculate default date range (last 30 days)
  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    
    setDateRange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    });
  }, []);

  useEffect(() => {
    if (!dateRange.from || !dateRange.to) return;
    
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<DashboardStats>('/admin/dashboard/stats');
        setStats(data);
      } catch (error) {
        toast.error('Failed to load reports', 'Please try again later');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to]);

  const setQuickRange = (days: number) => {
    const to = new Date();
    const from = new Date();
    if (days === 0) {
      // Today only
      setDateRange({
        from: to.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0]
      });
    } else if (days === 1) {
      // Yesterday
      from.setDate(from.getDate() - 1);
      setDateRange({
        from: from.toISOString().split('T')[0],
        to: from.toISOString().split('T')[0]
      });
    } else {
      from.setDate(from.getDate() - days);
      setDateRange({
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0]
      });
    }
  };

  // Derived metrics
  const metrics = useMemo(() => {
    if (!stats) return null;
    
    const avgOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
    const completionRate = stats.totalOrders > 0 
      ? (stats.ordersByStatus.find(s => s.status === 'COMPLETED')?.count || 0) / stats.totalOrders * 100 
      : 0;
    
    return {
      avgOrderValue,
      completionRate,
      conversionRate: 0, // Would need visitor data
    };
  }, [stats]);

  // Chart data
  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return stats.ordersByStatus.map(item => ({
      name: OrderStatusLabels[item.status as OrderStatusType],
      value: item.count,
      color: item.status === 'COMPLETED' ? '#2ec4b6' : 
             item.status === 'CANCELED' ? '#e63946' : 
             item.status === 'PENDING' ? '#ff9f1c' : '#4361ee'
    }));
  }, [stats]);

  const topProductsData = useMemo(() => {
    if (!stats) return [];
    return stats.topProducts.map((p, i) => ({
      name: getLocalizedName(p.name, 'Product').slice(0, 20) + '...',
      fullName: getLocalizedName(p.name, 'Product'),
      revenue: p.totalRevenue,
      quantity: p.totalQuantity,
      fill: COLORS[i % COLORS.length]
    }));
  }, [stats]);

  const exportToCSV = () => {
    if (!stats) return;
    
    const csvContent = [
      ['Metric', 'Value'],
      ['Report Period', `${dateRange.from} to ${dateRange.to}`],
      [''],
      ['Revenue Metrics'],
      ['Total Revenue', formatPrice(stats.totalRevenue)],
      ['Recent Revenue (30 days)', formatPrice(stats.recentRevenue)],
      ['Average Order Value', formatPrice(metrics?.avgOrderValue || 0)],
      [''],
      ['Order Metrics'],
      ['Total Orders', stats.totalOrders],
      ['Recent Orders (30 days)', stats.recentOrders],
      ['Pending Orders', stats.pendingOrders],
      ['Completion Rate', `${metrics?.completionRate.toFixed(1)}%`],
      [''],
      ['Orders by Status'],
      ...stats.ordersByStatus.map(s => [OrderStatusLabels[s.status as OrderStatusType], s.count]),
      [''],
      ['Top Products'],
      ['Rank', 'Product', 'Quantity Sold', 'Revenue'],
      ...stats.topProducts.map((p, i) => [
        i + 1, 
        getLocalizedName(p.name, 'Product'), 
        p.totalQuantity, 
        formatPrice(p.totalRevenue)
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `status-shop-report-${dateRange.from}-${dateRange.to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export complete', 'Report downloaded successfully');
  };

  const exportToPDF = () => {
    // Placeholder for PDF export
    toast.info('PDF Export', 'This feature is coming soon');
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <RoleGuard requiredRole="BRANCH_DIRECTOR">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="h-32">
                <div className="animate-pulse h-full flex items-center justify-center">
                  <div className="h-12 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
                </div>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="h-80">
              <div className="animate-pulse p-4 h-full">
                <div className="h-full bg-gray-200 dark:bg-slate-700 rounded" />
              </div>
            </Card>
            <Card className="h-80">
              <div className="animate-pulse p-4 h-full">
                <div className="h-full bg-gray-200 dark:bg-slate-700 rounded" />
              </div>
            </Card>
          </div>
        </div>
      </RoleGuard>
    );
  }

  if (!stats) {
    return (
      <RoleGuard requiredRole="BRANCH_DIRECTOR">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Failed to load reports</p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw size={16} className="mr-2" />
            Retry
          </Button>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredRole="BRANCH_DIRECTOR">
      <div>
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {dateRange.from && dateRange.to && (
                <>Period: {new Date(dateRange.from).toLocaleDateString()} - {new Date(dateRange.to).toLocaleDateString()}</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={18} className="mr-2" />
              Filters
            </Button>
            <Button variant="secondary" onClick={exportToCSV}>
              <Download size={18} className="mr-2" />
              CSV
            </Button>
            <Button variant="secondary" onClick={exportToPDF}>
              <FileText size={18} className="mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Date Filters */}
        {showFilters && (
          <Card className="mb-6">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-500 py-2">Quick select:</span>
                {quickRanges.map((range) => (
                  <button
                    key={range.label}
                    onClick={() => setQuickRange(range.days)}
                    className="px-3 py-1.5 text-sm rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    From
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={dateRange.from}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    To
                  </label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={dateRange.to}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatPrice(stats.totalRevenue)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">+{formatPrice(stats.recentRevenue)} (30d)</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <DollarSign size={24} className="text-accent-green" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalOrders}
                </h3>
                <p className="text-xs text-gray-400 mt-1">+{stats.recentOrders} (30d)</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <ShoppingCart size={24} className="text-accent-blue" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Order Value</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {formatPrice(metrics?.avgOrderValue || 0)}
                </h3>
                <p className="text-xs text-gray-400 mt-1">Per transaction</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp size={24} className="text-purple-600" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completion Rate</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {metrics?.completionRate.toFixed(1)}%
                </h3>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-accent-green h-1.5 rounded-full"
                    style={{ width: `${metrics?.completionRate || 0}%` }}
                  />
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <Package size={24} className="text-accent-amber" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Orders by Status Chart */}
          <Card title="Orders by Status" subtitle="Distribution of order statuses">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
              {statusChartData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Products Revenue Chart */}
          <Card title="Top Products by Revenue" subtitle="Best performing products">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ReBarChart data={topProductsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(val) => formatPrice(val)} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={100}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(val: number) => formatPrice(val)}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Revenue Breakdown */}
          <Card title="Revenue Breakdown" className="lg:col-span-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-300">Total Revenue</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatPrice(stats.totalRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-blue-700 dark:text-blue-300">Last 30 Days</span>
                <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                  {formatPrice(stats.recentRevenue)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-green-700 dark:text-green-300">Average Order</span>
                <span className="text-lg font-semibold text-green-700 dark:text-green-300">
                  {formatPrice(metrics?.avgOrderValue || 0)}
                </span>
              </div>
              <div className="p-3 border border-gray-200 dark:border-slate-700 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Pending Revenue</p>
                <p className="text-lg font-semibold text-amber-600">
                  {formatPrice(stats.pendingOrders * (metrics?.avgOrderValue || 0))}
                </p>
                <p className="text-xs text-gray-400">From {stats.pendingOrders} pending orders</p>
              </div>
            </div>
          </Card>

          {/* Order Metrics */}
          <Card title="Order Metrics" className="lg:col-span-1">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalOrders}</p>
                  <p className="text-sm text-gray-500 mt-1">Total Orders</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.recentOrders}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Last 30 Days</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                  <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">{stats.pendingOrders}</p>
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Pending</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {stats.ordersByStatus.find(s => s.status === 'COMPLETED')?.count || 0}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">Completed</p>
                </div>
              </div>
              <div className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</span>
                  <Badge variant="success">{metrics?.completionRate.toFixed(1)}%</Badge>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-accent-green h-2 rounded-full transition-all"
                    style={{ width: `${metrics?.completionRate || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Status Breakdown */}
          <Card title="Status Breakdown" className="lg:col-span-1">
            <div className="space-y-3">
              {stats.ordersByStatus.map((item) => {
                const percentage = stats.totalOrders > 0 ? (item.count / stats.totalOrders) * 100 : 0;
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={
                            item.status === 'COMPLETED' ? 'success' :
                            item.status === 'CANCELED' ? 'danger' :
                            item.status === 'PENDING' ? 'warning' :
                            'info'
                          }
                        >
                          {OrderStatusLabels[item.status as OrderStatusType]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.count}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          item.status === 'COMPLETED' ? 'bg-accent-green' :
                          item.status === 'CANCELED' ? 'bg-accent-red' :
                          item.status === 'PENDING' ? 'bg-accent-amber' :
                          'bg-accent-blue'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Top Products Table */}
        <Card title="Top Products Performance" subtitle="Best selling products by revenue">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3 text-right">Quantity Sold</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts.map((product, index) => (
                  <tr 
                    key={product.productId} 
                    className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  >
                    <td className="px-4 py-3">
                      <span className={`
                        inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold
                        ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                          index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300' :
                          index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                          'bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-gray-400'}
                      `}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {getLocalizedName(product.name, 'Unknown Product')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">{product.totalQuantity}</span>
                      <span className="text-gray-400 text-xs ml-1">units</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatPrice(product.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {product.totalQuantity > 0 
                        ? formatPrice(product.totalRevenue / product.totalQuantity)
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </RoleGuard>
  );
}
