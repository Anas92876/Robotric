import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';

export interface Part {
  _id: string;
  name: string;
  category: string;
  description?: string;
  sku: string;
  group?: string;
  partNumber?: string;
  availableQty: number;
  usedQty?: number;
  damagedQty?: number;
  reservedQty?: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockLevel {
  _id: string;
  partId: string;
  availableQty: number;
  usedQty: number;
  damagedQty: number;
  updatedAt: string;
}

export interface PartWithStock extends Part {
  stockLevel?: StockLevel;
  totalQty: number;
  imageUrl?: string;
}

export interface BoxGroup {
  sku: string;
  parts: PartWithStock[];
  totalQty: number;
  availableQty: number;
  usedQty: number;
  damagedQty: number;
  categories: string[];
  lowStock: boolean;
}

interface InventoryStats {
  totalParts: number;
  totalBoxes: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalAvailable: number;
  totalInUse: number;
  totalDamaged: number;
  categories: string[];
  groups: string[];
}

/**
 * Custom hook for managing inventory data
 * Fetches parts, calculates stats, and provides refresh capability
 */
export const useInventoryData = () => {
  const [parts, setParts] = useState<PartWithStock[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.get('/parts');
      const partsData: PartWithStock[] = response.data.map((part: Part) => ({
        ...part,
        availableQty: part.availableQty || 0,
        usedQty: part.usedQty || 0,
        damagedQty: part.damagedQty || 0,
        // Ordered items are reserved (not available) until the order is fulfilled,
        // but they are still in stock, so they count in the total.
        totalQty: (part.availableQty || 0) + (part.reservedQty || 0) + (part.usedQty || 0) + (part.damagedQty || 0),
        // Only parts with a photo have an imageUrl; asking for the others costs a 404 each
        imageUrl: part.imageUrl
      }));

      setParts(partsData);

      // Calculate statistics
      const categories = [...new Set(partsData.map(p => p.category).filter(Boolean))].sort();
      const groups = [...new Set(partsData.map(p => (p.group || '').trim()).filter(Boolean))].sort();

      const lowStockCount = partsData.filter(p => p.availableQty > 0 && p.availableQty < 5).length;
      const outOfStockCount = partsData.filter(p => p.availableQty === 0).length;
      const totalAvailable = partsData.reduce((sum, p) => sum + (p.availableQty || 0), 0);
      const totalInUse = partsData.reduce((sum, p) => sum + (p.usedQty || 0), 0);
      const totalDamaged = partsData.reduce((sum, p) => sum + (p.damagedQty || 0), 0);

      // Calculate box groups
      const boxGroupsMap: { [sku: string]: BoxGroup } = {};
      partsData.forEach(part => {
        if (!boxGroupsMap[part.sku]) {
          boxGroupsMap[part.sku] = {
            sku: part.sku,
            parts: [],
            totalQty: 0,
            availableQty: 0,
            usedQty: 0,
            damagedQty: 0,
            categories: [],
            lowStock: false
          };
        }

        boxGroupsMap[part.sku].parts.push(part);
        boxGroupsMap[part.sku].totalQty += part.totalQty;
        boxGroupsMap[part.sku].availableQty += part.availableQty || 0;
        boxGroupsMap[part.sku].usedQty += part.usedQty || 0;
        boxGroupsMap[part.sku].damagedQty += part.damagedQty || 0;

        if (!boxGroupsMap[part.sku].categories.includes(part.category)) {
          boxGroupsMap[part.sku].categories.push(part.category);
        }

        if ((part.availableQty || 0) < 5) {
          boxGroupsMap[part.sku].lowStock = true;
        }
      });

      const boxGroups = Object.values(boxGroupsMap);

      setStats({
        totalParts: partsData.length,
        totalBoxes: boxGroups.length,
        lowStockCount,
        outOfStockCount,
        totalAvailable,
        totalInUse,
        totalDamaged,
        categories,
        groups
      });

    } catch (err: any) {
      console.error('Error fetching inventory:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load inventory data';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  return {
    parts,
    stats,
    isLoading,
    error,
    refetch: fetchParts
  };
};
