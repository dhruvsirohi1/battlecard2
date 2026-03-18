/**
 * Brandfetch Search API – live brand search for competitor autocomplete.
 * @see https://docs.brandfetch.com/reference/brand-search-api
 */

const BRANDFETCH_BASE = 'https://api.brandfetch.io';
const CLIENT_ID = import.meta.env.VITE_BRANDFETCH_CLIENT_ID as string | undefined;

export interface BrandfetchBrand {
  icon: string | null;
  name: string | null;
  domain: string;
  claimed: boolean;
  brandId: string;
}

export interface BrandSearchResult {
  name: string;
  domain: string;
  icon: string | null;
  brandId: string;
  claimed: boolean;
}

/**
 * Search brands by name. Returns empty array if no client ID or on error.
 */
export async function searchBrands(query: string): Promise<BrandSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || !CLIENT_ID) return [];

  const name = encodeURIComponent(trimmed);
  const url = `${BRANDFETCH_BASE}/v2/search/${name}?c=${encodeURIComponent(CLIENT_ID)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as BrandfetchBrand[];
    if (!Array.isArray(data)) return [];
    return data.map((b) => ({
      name: b.name ?? b.domain ?? 'Unknown',
      domain: b.domain,
      icon: b.icon ?? null,
      brandId: b.brandId,
      claimed: Boolean(b.claimed),
    }));
  } catch {
    return [];
  }
}

export function isBrandfetchConfigured(): boolean {
  return Boolean(CLIENT_ID);
}
