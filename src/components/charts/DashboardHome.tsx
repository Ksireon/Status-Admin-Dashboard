'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DashboardStats, Order } from '@/lib/types';
import { OrderStatusLabels, OrderStatusColors, OrderStatus } from '@/lib/constants';
import { getLocalizedName } from '@/lib/utils';
import { 
  ShoppingCart, DollarSign, Users, Package, TrendingUp, TrendingDown,
  ArrowRight, Clock, PackageCheck, AlertCircle, Activity, Plus,
  FileText, RefreshCw
} from 'lucide-react';
import Link from 'next/link';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
  href?: string;
}

function StatCard({ title, value, icon: Icon, trend, subtitle, href }: StatCardProps) {
  const content = (
    <Card className={href ? 'hover:shadow-md transition-shadow cursor-pointer h-full' : 'h-full'}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 bg-accent-blue/10 rounded-lg">
          <Icon size={24} className="text-accent-blue" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1">
          {trend.isPositive ? (
            <TrendingUp size={16} className="text-accent-green" />
          ) : (
            <TrendingDown size={16} className="text-accent-red" />
          )}
          <span className={`text-sm font-medium ${trend.isPositive ? 'text-accent-green' : 'text-accent-red'}`}>
            {trend.value}%
          </span>
          <span className="text-sm text-gray-500">vs last month</span>
        </div>
      )}
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

interface DashboardHomeProps {
  stats: DashboardStats | null;
  isLoading: boolean;
}

export function DashboardHome({ stats, isLoading }: DashboardHomeProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32">
              <div className="animate-pulse flex items-center justify-center h-full">
                <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-full"></div>
              </div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="h-64">
            <div className="animate-pulse p-4">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 dark:bg-slate-700 rounded"></div>
                ))}
              </div>
            </div>
          </Card>
          <Card className="h-64">
            <div className="animate-pulse p-4">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 dark:bg-slate-700 rounded"></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
        <p className="text-gray-500 mb-4">Failed to load dashboard data</p>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw size={16} className="mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate some derived metrics
  const avgOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
  const completionRate = stats.totalOrders > 0 
    ? (stats.ordersByStatus.find(s => s.status === 'COMPLETED')?.count || 0) / stats.totalOrders * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/orders">
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-accent-blue dark:hover:border-accent-blue transition-colors group">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
              <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Orders</p>
              <p className="text-xs text-gray-500">Manage orders</p>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/products/new">
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-accent-blue dark:hover:border-accent-blue transition-colors group">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
              <Plus size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Add Product</p>
              <p className="text-xs text-gray-500">Create new item</p>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/reports">
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-accent-blue dark:hover:border-accent-blue transition-colors group">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
              <FileText size={20} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Reports</p>
              <p className="text-xs text-gray-500">View analytics</p>
            </div>
          </div>
        </Link>
        <Link href="/dashboard/support">
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-accent-blue dark:hover:border-accent-blue transition-colors group">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
              <Activity size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Support</p>
              <p className="text-xs text-gray-500">Customer tickets</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          subtitle={`+${formatCurrency(stats.recentRevenue)} this month`}
          href="/dashboard/reports"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingCart}
          subtitle={`${stats.recentOrders} this month`}
          href="/dashboard/orders"
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          icon={Clock}
          subtitle="Need attention"
          href="/dashboard/orders?status=PENDING"
        />
        <StatCard
          title="Avg Order Value"
          value={formatCurrency(avgOrderValue)}
          icon={Package}
          subtitle={`${completionRate.toFixed(1)}% completion rate`}
        />
      </div>

      {/* Secondary Stats */}
      {(stats.totalCustomers !== undefined || stats.totalProducts !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.totalCustomers !== undefined && (
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={Users}
              href="/dashboard/customers"
            />
          )}
          {stats.totalProducts !== undefined && (
            <StatCard
              title="Active Products"
              value={stats.totalProducts}
              icon={PackageCheck}
              href="/dashboard/products"
            />
          )}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Order Completion</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {completionRate.toFixed(1)}%
                </h3>
              </div>
              <div className="p-3 bg-accent-green/10 rounded-lg">
                <PackageCheck size={24} className="text-accent-green" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-accent-green h-2 rounded-full transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders by Status */}
        <Card title="Orders by Status" className="lg:col-span-1">
          <div className="space-y-4">
            {stats.ordersByStatus.map((item) => {
              const percentage = stats.totalOrders > 0 ? (item.count / stats.totalOrders) * 100 : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1">
                    <Badge
                      variant={
                        item.status === 'COMPLETED' ? 'success' :
                        item.status === 'CANCELED' ? 'danger' :
                        item.status === 'PENDING' ? 'warning' :
                        'info'
                      }
                    >
                      {OrderStatusLabels[item.status]}
                    </Badge>
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
                      className={`h-2 rounded-full transition-all duration-500 ${
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

        {/* Top Products */}
        <Card title="Top Products" className="lg:col-span-1">
          <div className="space-y-4">
            {stats.topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No sales data yet</p>
            ) : (
              stats.topProducts.map((product, index) => (
                <div key={product.productId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold
                      ${index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                        index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300' :
                        index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                        'bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-gray-400'}
                    `}>
                      {index + 1}
                    </span>
                    <div>
                    <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                      {getLocalizedName(product.name, 'Unnamed')}
                    </p>
                      <p className="text-sm text-gray-500">
                        {product.totalQuantity} sold
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(product.totalRevenue)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Link 
              href="/dashboard/products" 
              className="text-sm text-accent-blue hover:underline flex items-center gap-1"
            >
              View all products
              <ArrowRight size={14} />
            </Link>
          </div>
        </Card>

        {/* Quick Activity */}
        <Card title="Recent Activity" className="lg:col-span-1">
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {stats.latestOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-slate-700 last:border-0">
                <div className={`
                  p-2 rounded-lg
                  ${order.status === 'COMPLETED' ? 'bg-green-50 dark:bg-green-900/20' :
                    order.status === 'CANCELED' ? 'bg-red-50 dark:bg-red-900/20' :
                    order.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-900/20' :
                    'bg-blue-50 dark:bg-blue-900/20'}
                `}>
                  <ShoppingCart size={14} className={`
                    ${order.status === 'COMPLETED' ? 'text-green-600 dark:text-green-400' :
                      order.status === 'CANCELED' ? 'text-red-600 dark:text-red-400' :
                      order.status === 'PENDING' ? 'text-amber-600 dark:text-amber-400' :
                      'text-blue-600 dark:text-blue-400'}
                  `} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Order #{order.shortId}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {order.user.name || order.user.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${OrderStatusColors[order.status]}`}>
                      {OrderStatusLabels[order.status]}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <Link 
              href="/dashboard/orders" 
              className="text-sm text-accent-blue hover:underline flex items-center gap-1"
            >
              View all orders
              <ArrowRight size={14} />
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card title="Recent Orders" headerAction={
        <Link href="/dashboard/orders" className="text-accent-blue hover:underline text-sm flex items-center gap-1">
          View all
          <ArrowRight size={14} />
        </Link>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.latestOrders.slice(0, 5).map((order) => (
                <tr key={order.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50">
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
                      className="text-accent-blue hover:underline text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
