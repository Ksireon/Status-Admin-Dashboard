'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { Order, OrderStatusType } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { OrderStatusLabels, OrderStatusColors, getImageUrl } from '@/lib/constants';
import { getLocalizedName } from '@/lib/utils';
import { ArrowLeft, Package, User, MapPin, CreditCard, Printer, Download } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const statusFlow: OrderStatusType[] = ['PENDING', 'PROCESSING', 'DELIVERING', 'COMPLETED'];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const orderData = await api.get<Order>(`/admin/orders/${params.id}`);
        setOrder(orderData);
      } catch (error) {
        toast.error('Failed to load order', 'Order not found or access denied');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const updateStatus = async (newStatus: OrderStatusType) => {
    if (!order) return;
    setIsUpdating(true);
    try {
      await api.patch(`/admin/orders/${order.id}/status`, { status: newStatus });
      setOrder({ ...order, status: newStatus });
      toast.success('Status updated', `Order marked as ${OrderStatusLabels[newStatus]}`);
    } catch (error: any) {
      toast.error('Failed to update status', error.message || 'Please try again');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Placeholder for PDF export functionality
    toast.info('PDF Export', 'This feature is coming soon');
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getNextStatus = (currentStatus: OrderStatusType): OrderStatusType | null => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
        <Link href="/dashboard/orders" className="text-accent-blue hover:underline mt-2 inline-block">
          Back to orders
        </Link>
      </div>
    );
  }

  const nextStatus = getNextStatus(order.status);
  const canUpdateStatus = hasRole('MANAGER') && order.status !== 'CANCELED' && order.status !== 'COMPLETED';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orders" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Order #{order.shortId}
          </h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${OrderStatusColors[order.status]}`}>
            {OrderStatusLabels[order.status]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePrint}>
            <Printer size={18} className="mr-2" />
            Print
          </Button>
          <Button variant="secondary" onClick={handleExportPDF}>
            <Download size={18} className="mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Order Items">
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                  {/* Product Image */}
                  <div className="w-16 h-16 flex-shrink-0">
                    {item.imageSnapshot ? (
                      <img
                        src={getImageUrl(item.imageSnapshot) || ''}
                        alt={getLocalizedName(item.nameSnapshot, 'Product')}
                        className="w-full h-full rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            parent.innerHTML = '';
                            const fallbackDiv = document.createElement('div');
                            fallbackDiv.className = 'w-full h-full rounded-lg bg-gray-200 dark:bg-slate-600 flex items-center justify-center';
                            fallbackDiv.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M20 7l-8-5-8 5"></path><path d="M20 17l-8 5-8-5"></path></svg>';
                            parent.appendChild(fallbackDiv);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-gray-200 dark:bg-slate-600 flex items-center justify-center">
                        <Package size={24} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {getLocalizedName(item.nameSnapshot, 'Unknown Product')}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                      <span>Quantity: <span className="font-medium text-gray-700 dark:text-gray-300">{item.quantity}</span></span>
                      {item.colorLabel && (
                        <span className="flex items-center gap-1">
                          Color: 
                          <span className="flex items-center gap-1">
                            <span 
                              className="w-3 h-3 rounded-full border border-gray-300" 
                              style={{ backgroundColor: item.colorLabel }}
                            />
                            {item.colorLabel}
                          </span>
                        </span>
                      )}
                      {item.size && <span>Size: {item.size}</span>}
                      {item.meters && <span>Meters: {item.meters}m</span>}
                      <span>Unit Price: {formatCurrency(item.unitPrice)}</span>
                    </div>
                  </div>
                  
                  {/* Line Total */}
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white text-lg">
                      {formatCurrency(item.lineTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">Total</span>
              <span className="text-2xl font-bold text-accent-blue">{formatCurrency(order.total)}</span>
            </div>
          </Card>

          <Card title="Order Timeline">
            <div className="space-y-4">
              {statusFlow.map((status, index) => {
                const isCompleted = statusFlow.indexOf(order.status) >= index;
                const isCurrent = order.status === status;
                
                return (
                  <div key={status} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCompleted ? 'bg-accent-green text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-400'
                    }`}>
                      {isCompleted ? index + 1 : ''}
                    </div>
                    <div>
                      <p className={`font-medium ${isCurrent ? 'text-accent-blue' : 'text-gray-900 dark:text-white'}`}>
                        {OrderStatusLabels[status]}
                      </p>
                      {isCurrent && (
                        <p className="text-sm text-gray-500">Current status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Customer Information">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={18} className="text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{order.user.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-500">{order.user.email}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Delivery Information">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {order.deliveryType === 'PICKUP' ? 'Pickup' : 'Delivery'}
                  </p>
                  {order.deliveryAddress && (
                    <p className="text-sm text-gray-500">{order.deliveryAddress}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Package size={18} className="text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{order.shop.name?.ru || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Payment Information">
            <div className="flex items-center gap-3">
              <CreditCard size={18} className="text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{order.paymentMethod}</p>
                <p className="text-sm text-gray-500">{formatCurrency(order.total)}</p>
              </div>
            </div>
          </Card>

          <Card title="Order Details">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Order ID:</span>
                <span className="text-gray-900 dark:text-white font-mono">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span className="text-gray-900 dark:text-white">{new Date(order.createdAt).toLocaleString('ru-RU')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated:</span>
                <span className="text-gray-900 dark:text-white">{new Date(order.updatedAt).toLocaleString('ru-RU')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Items count:</span>
                <span className="text-gray-900 dark:text-white">{order.items.length}</span>
              </div>
            </div>
          </Card>

          {order.comment && (
            <Card title="Comment">
              <p className="text-sm text-gray-700 dark:text-gray-300">{order.comment}</p>
            </Card>
          )}

          {canUpdateStatus && nextStatus && (
            <Card title="Actions">
              <div className="space-y-3">
                <Button
                  onClick={() => updateStatus(nextStatus)}
                  isLoading={isUpdating}
                  className="w-full"
                >
                  Mark as {OrderStatusLabels[nextStatus]}
                </Button>
                {order.status !== 'CANCELED' && (
                  <Button
                    variant="danger"
                    onClick={() => updateStatus('CANCELED')}
                    isLoading={isUpdating}
                    className="w-full"
                  >
                    Cancel Order
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
