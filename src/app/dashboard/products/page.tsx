'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { 
  Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight,
  Filter, X, Download, Package, AlertCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getImageUrl } from '@/lib/constants';
import { getLocalizedName } from '@/lib/utils';

// Types
interface Product {
  id: string;
  name: { ru: string; uz: string; en: string };
  type: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  images: { url: string }[];
  categoryId?: string;
}

interface Category {
  id: string;
  name: { ru: string; uz: string; en: string };
}

type ProductStatusFilter = 'all' | 'active' | 'inactive';
type StockFilter = 'all' | 'inStock' | 'lowStock' | 'outOfStock';

export default function ProductsPage() {
  // Pagination & filters
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { hasRole } = useAuth();
  const toast = useToast();
  const canEdit = hasRole('BRANCH_DIRECTOR');
  const canDelete = hasRole('OWNER');

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (categoryId) params.append('categoryId', categoryId);
      if (search) params.append('search', search);

      const response: any = await api.get(`/admin/products?${params.toString()}`);
      
      if (response && Array.isArray(response.data)) {
        setAllProducts(response.data);
        applyFilters(response.data);
        setMeta(response.meta || { total: response.data.length, page, limit: 10, totalPages: 1 });
      } else if (Array.isArray(response)) {
        setAllProducts(response);
        applyFilters(response);
        setMeta({ total: response.length, page, limit: 10, totalPages: 1 });
      } else {
        setProducts([]);
        setError('Invalid data format');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, categoryId, search]);

  // Apply client-side filters
  const applyFilters = (data: Product[]) => {
    let filtered = [...data];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => 
        statusFilter === 'active' ? p.isActive : !p.isActive
      );
    }
    
    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (stockFilter === 'inStock') return p.stockQuantity > 10;
        if (stockFilter === 'lowStock') return p.stockQuantity > 0 && p.stockQuantity <= 10;
        if (stockFilter === 'outOfStock') return p.stockQuantity === 0;
        return true;
      });
    }
    
    setProducts(filtered);
  };

  // Re-apply filters when they change
  useEffect(() => {
    applyFilters(allProducts);
  }, [statusFilter, stockFilter, allProducts]);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/admin/categories');
        if (Array.isArray(response)) {
          setCategories(response);
        } else if (response && Array.isArray(response.data)) {
          setCategories(response.data);
        }
      } catch (err) {
        // Silent fail for categories
      }
    };
    fetchCategories();
  }, []);

  // Initial load
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setCategoryId('');
    setSearch('');
    setSearchInput('');
    setStatusFilter('all');
    setStockFilter('all');
    setPage(1);
    toast.info('Filters cleared');
  };

  const hasActiveFilters = categoryId || search || statusFilter !== 'all' || stockFilter !== 'all';

  const handleDelete = async (product: Product) => {
    const name = product.name?.ru || product.name?.uz || product.name?.en || 'Unknown';
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }
    
    try {
      await api.delete(`/admin/products/${product.id}`);
      toast.success('Product deleted', `"${name}" has been removed`);
      fetchProducts();
    } catch (err: any) {
      toast.error('Failed to delete product', err.message);
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name (RU)', 'Name (UZ)', 'Type', 'Price', 'Stock', 'Status'],
      ...products.map(p => [
        p.id,
        p.name.ru || '',
        p.name.uz || '',
        p.type,
        p.price.toString(),
        p.stockQuantity.toString(),
        p.isActive ? 'Active' : 'Inactive',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Export complete', `${products.length} products exported`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of stock', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
    if (quantity <= 10) return { label: 'Low stock', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' };
    return { label: 'In stock', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  };

  // Stats
  const activeCount = allProducts.filter(p => p.isActive).length;
  const lowStockCount = allProducts.filter(p => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
  const outOfStockCount = allProducts.filter(p => p.stockQuantity === 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {allProducts.length} total • {activeCount} active • {lowStockCount} low stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={18} className="mr-2" />
            Export
          </Button>
          {canEdit && (
            <Link href="/dashboard/products/new">
              <Button>
                <Plus size={18} className="mr-2" />
                Add Product
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="mb-6 space-y-2">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle size={20} className="text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">{lowStockCount} products</span> are running low on stock
              </p>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <Package size={20} className="text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">
                <span className="font-medium">{outOfStockCount} products</span> are out of stock
              </p>
            </div>
          )}
        </div>
      )}

      <Card>
        {/* Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
              placeholder="Search products..."
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
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name?.ru || cat.name?.uz || cat.name?.en || 'Unnamed'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ProductStatusFilter)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Stock Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stock Level
                </label>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  <option value="all">All Stock</option>
                  <option value="inStock">In Stock (&gt;10)</option>
                  <option value="lowStock">Low Stock (1-10)</option>
                  <option value="outOfStock">Out of Stock (0)</option>
                </select>
              </div>
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-accent-red">
            <AlertCircle size={48} className="mx-auto mb-4" />
            <p>{error}</p>
            <Button variant="secondary" onClick={fetchProducts} className="mt-4">
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-slate-700 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        {hasActiveFilters ? 'No products match your filters' : 'No products found'}
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => {
                      const stockStatus = getStockStatus(product.stockQuantity);
                      return (
                        <tr
                          key={product.id}
                          className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  src={getImageUrl(product.images[0].url) || ''}
                                  alt={getLocalizedName(product.name, 'Product')}
                                  className="w-12 h-12 rounded-lg object-cover bg-gray-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 viewBox=%220 0 48 48%22%3E%3Crect width=%2248%22 height=%2248%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2224%22 y=%2224%22 font-size=%2210%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 fill=%22%239ca3af%22%3ENo img%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                                  <Package size={20} className="text-gray-400" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {getLocalizedName(product.name, 'No name')}
                                </p>
                                <p className="text-xs text-gray-500">
                                  ID: {product.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 capitalize">{product.type}</td>
                          <td className="px-4 py-3 font-medium">{formatCurrency(product.price)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{product.stockQuantity}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${stockStatus.color}`}>
                                {stockStatus.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={product.isActive ? 'success' : 'default'}>
                              {product.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <Link
                                  href={`/dashboard/products/${product.id}`}
                                  className="p-2 rounded-lg text-accent-blue hover:bg-accent-blue/10 transition-colors"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </Link>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(product)}
                                  className="p-2 rounded-lg text-accent-red hover:bg-accent-red/10 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-gray-500">
              Showing {products.length} of {allProducts.length} products
            </div>

            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * meta.limit + 1} to {Math.min(page * meta.limit, meta.total)} of {meta.total} products
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
