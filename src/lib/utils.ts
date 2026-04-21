import { LocalizedText } from '@/lib/types';

export function isLocalizedText(value: unknown): value is LocalizedText {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ru' in value &&
    'uz' in value &&
    'en' in value
  );
}

export function getLocalizedName(
  value: LocalizedText | string | undefined | null,
  fallback = 'Unnamed'
): string {
  if (!value) return fallback;
  if (typeof value === 'string') return value || fallback;
  if (isLocalizedText(value)) {
    return value.ru || value.uz || value.en || fallback;
  }
  return fallback;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'UZS',
    maximumFractionDigits: 0,
  }).format(value);
}
