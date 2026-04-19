'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getImageUrl } from '@/lib/constants';

// Типы
interface Product {
  id: string;
  name: { ru: string; uz: string; en: string };
  type: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  images: { url: string }[];
}

interface Category {
  id: string;
  name: { ru: string; uz: string; en: string };
}

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { hasRole } = useAuth();
  const canEdit = hasRole('BRANCH_DIRECTOR');
  const canDelete = hasRole('OWNER');

  // Загрузка товаров
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', '10');
        if (categoryId) params.append('categoryId', categoryId);
        if (search) params.append('search', search);

        const response = await api.get(`/admin/products?${params.toString()}`);
        console.log('Products response:', response);
        
        // API возвращает { data: [...], meta: {...} }
        if (response && Array.isArray(response.data)) {
          setProducts(response.data);
          setMeta(response.meta || { total: response.data.length, page, limit: 10, totalPages: 1 });
        } else if (Array.isArray(response)) {
          setProducts(response);
          setMeta({ total: response.length, page, limit: 10, totalPages: 1 });
        } else {
          setProducts([]);
          setError('Invalid data format');
        }
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message || 'Failed to fetch products');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [page, categoryId, search]);

  // Загрузка категорий
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/admin/categories');
        console.log('Categories response:', response);
        if (Array.isArray(response)) {
          setCategories(response);
        } else if (response && Array.isArray(response.data)) {
          setCategories(response.data);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = async (product: Product) => {
    const name = product.name?.ru || product.name?.uz || product.name?.en || 'Unknown';
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }
    try {
      await api.delete(`/admin/products/${product.id}`);
      // Перезагрузить страницу для обновления списка
      setPage(1);
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '10');
      if (categoryId) params.append('categoryId', categoryId);
      if (search) params.append('search', search);
      const response = await api.get(`/admin/products?${params.toString()}`);
      if (response && Array.isArray(response.data)) {
        setProducts(response.data);
        setMeta(response.meta || { total: response.data.length, page: 1, limit: 10, totalPages: 1 });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
        {canEdit && (
          <Link href="/dashboard/products/new">
            <Button>
              <Plus size={18} className="mr-2" />
              Add Product
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
              placeholder="Search products..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" variant="secondary">
              <Search size={18} />
            </Button>
          </form>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name?.ru || cat.name?.uz || cat.name?.en || 'Unnamed'}
              </option>
            ))}
          </select>
        </div>

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
                        No products found
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr
                        key={product.id}
                        className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {product.images && product.images.length > 0 ? (
                              <img
                                src={getImageUrl(product.images[0].url) || ''}
                                alt={product.name?.ru || 'Product'}
                                className="w-12 h-12 rounded-lg object-cover bg-gray-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 viewBox=%220 0 48 48%22%3E%3Crect width=%2248%22 height=%2248%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2224%22 y=%2224%22 font-size=%2210%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 fill=%22%239ca3af%22%3ENo img%3C/text%3E%3C/svg%3E';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-slate-700 flex items-center justify-center">
                                <span className="text-gray-400 text-xs">No img</span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {product.name?.ru || product.name?.uz || product.name?.en || 'No name'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {product.name?.uz || ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{product.type}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(product.price)}</td>
                        <td className="px-4 py-3">{product.stockQuantity}</td>
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
                              >
                                <Edit size={16} />
                              </Link>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(product)}
                                className="p-2 rounded-lg text-accent-red hover:bg-accent-red/10 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
