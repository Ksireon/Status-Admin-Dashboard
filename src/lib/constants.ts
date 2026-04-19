export const UserRole = {
  USER: 'USER',
  MANAGER: 'MANAGER',
  BRANCH_DIRECTOR: 'BRANCH_DIRECTOR',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export const RoleRank: Record<UserRoleType, number> = {
  [UserRole.USER]: 0,
  [UserRole.MANAGER]: 10,
  [UserRole.BRANCH_DIRECTOR]: 20,
  [UserRole.OWNER]: 30,
  [UserRole.ADMIN]: 30,
};

export function hasRole(
  userRole: UserRoleType,
  requiredRole: UserRoleType,
): boolean {
  return RoleRank[userRole] >= RoleRank[requiredRole];
}

// Используем относительный URL для работы через API Routes (proxy)
// Это решает проблему Mixed Content (HTTPS → HTTP)
export const API_URL = '/api';

// URL для статических файлов (картинки) - без /api префикса
export const getImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // Если URL уже полный (начинается с http)
  if (url.startsWith('http')) {
    // Заменяем localhost:3001/3000 и IP на относительный URL
    // чтобы Next.js proxy сработал через /uploads
    if (url.includes('localhost:3000/uploads/') || 
        url.includes('localhost:3001/uploads/') ||
        /http:\/\/\d+\.\d+\.\d+\.\d+:3000\/uploads\//.test(url)) {
      // Извлекаем путь после /uploads/
      const match = url.match(/\/uploads\/(.+)$/);
      if (match) {
        return `/uploads/${match[1]}`;
      }
    }
    return url;
  }
  
  // Если URL относительный (начинается с /), оставляем как есть
  // Next.js rewrite перенаправит на правильный сервер
  if (url.startsWith('/')) {
    return url;
  }
  
  // Если URL без слеша в начале, добавляем /uploads/
  return `/uploads/products/${url}`;
};

export const OrderStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  DELIVERING: 'DELIVERING',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

export const OrderStatusLabels: Record<OrderStatusType, string> = {
  PENDING: 'В ожидании',
  PROCESSING: 'В обработке',
  DELIVERING: 'В доставке',
  COMPLETED: 'Завершен',
  CANCELED: 'Отменен',
};

export const OrderStatusColors: Record<OrderStatusType, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DELIVERING:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  COMPLETED:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};
