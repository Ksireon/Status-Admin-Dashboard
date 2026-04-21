'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Product, Category } from '@/lib/types';
import { ArrowLeft, Plus, Trash2, Upload, X, GripVertical } from 'lucide-react';
import Link from 'next/link';
import { getImageUrl } from '@/lib/constants';

interface ProductFormData {
  categoryId: string;
  type: 'textile' | 'vinyl' | 'bag';
  nameRu: string;
  nameUz: string;
  nameEn: string;
  descriptionRu: string;
  descriptionUz: string;
  descriptionEn: string;
  price: number;
  stockQuantity: number;
  isActive: boolean;
  images: { url: string; label: string; id?: string }[];
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<ProductFormData>({
    categoryId: '',
    type: 'textile',
    nameRu: '',
    nameUz: '',
    nameEn: '',
    descriptionRu: '',
    descriptionUz: '',
    descriptionEn: '',
    price: 0,
    stockQuantity: 0,
    isActive: true,
    images: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productData, categoriesData] = await Promise.all([
          api.get<Product>(`/admin/products/${productId}`),
          api.get<Category[]>('/admin/categories'),
        ]);
        
        setCategories(categoriesData);
        
        setFormData({
          categoryId: productData.categoryId,
          type: productData.type,
          nameRu: productData.name.ru || '',
          nameUz: productData.name.uz || '',
          nameEn: productData.name.en || '',
          descriptionRu: productData.description?.ru || '',
          descriptionUz: productData.description?.uz || '',
          descriptionEn: productData.description?.en || '',
          price: productData.price,
          stockQuantity: productData.stockQuantity,
          isActive: productData.isActive,
          images: productData.images?.map(img => ({ 
            url: img.url, 
            label: img.label || '', 
            id: img.id 
          })) || [],
        });
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load product data');
      } finally {
        setIsFetching(false);
      }
    };
    
    if (productId) {
      fetchData();
    }
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        categoryId: formData.categoryId,
        type: formData.type,
        name: {
          ru: formData.nameRu,
          uz: formData.nameUz,
          en: formData.nameEn,
        },
        description: {
          ru: formData.descriptionRu,
          uz: formData.descriptionUz,
          en: formData.descriptionEn,
        },
        price: Number(formData.price),
        stockQuantity: Number(formData.stockQuantity),
        isActive: formData.isActive,
      };

      await api.patch(`/admin/products/${productId}`, payload);
      router.push('/dashboard/products');
    } catch (err: any) {
      console.error('Failed to update product:', err);
      setError(err.message || 'Failed to update product');
      setIsLoading(false);
    }
  };

  const updateImageField = (index: number, field: 'url' | 'label', value: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.map((img, i) => i === index ? { ...img, [field]: value } : img),
    }));
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      await api.delete(`/admin/product-images/${imageId}`);
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter(img => img.id !== imageId),
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.uploadFile(`/admin/products/${productId}/images/upload`, formData);

      // Refresh product data to get updated images
      const updatedProduct = await api.get<Product>(`/admin/products/${productId}`);
      setFormData(prev => ({
        ...prev,
        images: updatedProduct.images?.map(img => ({
          url: img.url,
          label: img.label || '',
          id: img.id
        })) || [],
      }));
    } catch (err: any) {
      console.error('Failed to upload image:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateImageSort = async (imageId: string, newSort: number) => {
    try {
      await api.patch(`/admin/product-images/${imageId}`, { sort: newSort });
      // Refresh to get updated order
      const updatedProduct = await api.get<Product>(`/admin/products/${productId}`);
      setFormData(prev => ({
        ...prev,
        images: updatedProduct.images?.map(img => ({
          url: img.url,
          label: img.label || '',
          id: img.id
        })) || [],
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update image order');
    }
  };

  const handleAddImageByUrl = async () => {
    const url = imageUrlInput.trim();
    
    if (!url) {
      setError('Please enter an image URL');
      return;
    }

    // Validate URL format
    let validatedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // If URL doesn't have protocol, add https://
      validatedUrl = 'https://' + url;
    }

    try {
      new URL(validatedUrl);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com/image.jpg)');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      console.log('Adding image URL:', validatedUrl);
      const result = await api.post(`/admin/products/${productId}/images`, {
        url: validatedUrl,
        label: '',
      });
      console.log('Image added result:', result);

      // Refresh product data to get updated images
      const updatedProduct = await api.get<Product>(`/admin/products/${productId}`);
      console.log('Updated product images:', updatedProduct.images);
      setFormData(prev => ({
        ...prev,
        images: updatedProduct.images?.map(img => ({
          url: img.url,
          label: img.label || '',
          id: img.id
        })) || [],
      }));

      // Clear input
      setImageUrlInput('');
    } catch (err: any) {
      console.error('Failed to add image by URL:', err);
      setError(err.message || 'Failed to add image');
    } finally {
      setIsUploading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-blue"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/products" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Product</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-lg bg-accent-red/10 border border-accent-red/30 text-accent-red">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name.ru}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                required
              >
                <option value="textile">Textile</option>
                <option value="vinyl">Vinyl</option>
                <option value="bag">Bag</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Name (Russian) *
            </label>
            <Input
              value={formData.nameRu}
              onChange={(e) => setFormData(prev => ({ ...prev, nameRu: e.target.value }))}
              placeholder="Enter product name in Russian"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Name (Uzbek)
              </label>
              <Input
                value={formData.nameUz}
                onChange={(e) => setFormData(prev => ({ ...prev, nameUz: e.target.value }))}
                placeholder="Enter product name in Uzbek"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Name (English)
              </label>
              <Input
                value={formData.nameEn}
                onChange={(e) => setFormData(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="Enter product name in English"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Russian)
            </label>
            <textarea
              value={formData.descriptionRu}
              onChange={(e) => setFormData(prev => ({ ...prev, descriptionRu: e.target.value }))}
              placeholder="Enter description in Russian"
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Uzbek)
              </label>
              <textarea
                value={formData.descriptionUz}
                onChange={(e) => setFormData(prev => ({ ...prev, descriptionUz: e.target.value }))}
                placeholder="Enter description in Uzbek"
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (English)
              </label>
              <textarea
                value={formData.descriptionEn}
                onChange={(e) => setFormData(prev => ({ ...prev, descriptionEn: e.target.value }))}
                placeholder="Enter description in English"
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price (UZS) *
              </label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                placeholder="0"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stock Quantity *
              </label>
              <Input
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => setFormData(prev => ({ ...prev, stockQuantity: Number(e.target.value) }))}
                placeholder="0"
                required
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-accent-blue rounded border-gray-300 focus:ring-accent-blue"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>
          </div>

          {/* Product Images Section */}
          <div className="pt-6 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Product Images</h3>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={isUploading}
                  disabled={isUploading}
                >
                  <Upload size={16} className="mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
            </div>

            {formData.images.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600">
                <p className="text-gray-500 dark:text-gray-400">No images yet. Upload an image to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {formData.images.map((image, index) => (
                  <div
                    key={image.id || index}
                    className="relative group bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden"
                  >
                    {/* Image Preview */}
                    <div className="aspect-square relative">
                      <img
                        src={getImageUrl(image.url) || ''}
                        alt={image.label || `Product image ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2250%22 y=%2250%22 font-size=%2212%22 text-anchor=%22middle%22 alignment-baseline=%22middle%22 fill=%22%239ca3af%22%3EError%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>

                    {/* Image Info */}
                    <div className="p-2">
                      <Input
                        value={image.label || ''}
                        onChange={(e) => updateImageField(index, 'label', e.target.value)}
                        placeholder="Label (optional)"
                        className="text-xs h-7"
                      />
                    </div>

                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {image.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(image.id!)}
                          className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                          title="Delete image"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Sort indicator */}
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Image by URL */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add Image by URL</h4>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddImageByUrl();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddImageByUrl}
                  isLoading={isUploading}
                  disabled={isUploading || !imageUrlInput.trim()}
                >
                  <Plus size={16} className="mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button type="submit" isLoading={isLoading}>
              Update Product
            </Button>
            <Link href="/dashboard/products">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
