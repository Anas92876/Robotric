import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  Eye,
  X,
  Box,
  Grid,
  List,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { PartFormModal } from '../../components/parts/PartFormModal';
import {
  useInventoryData,
  type PartWithStock,
  type BoxGroup
} from '../../hooks';
import { LoadingState, Alert, Button } from '../../components/ui';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type ViewMode = 'parts' | 'boxes';

/**
 * Professional Inventory Management Page
 */
export default function Inventory() {
  const { i18n } = useTranslation(['dashboardCommon', 'dashboardAdmin']);
  const isRTL = i18n.language === 'ar';
  const { user } = useAuth();
  const { parts, stats, isLoading, error, refetch } = useInventoryData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'qty' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('parts');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBoxModal, setShowBoxModal] = useState(false);
  const [editingPart, setEditingPart] = useState<PartWithStock | null>(null);
  const [showStockModal, setShowStockModal] = useState<PartWithStock | null>(null);
  const [selectedBox, setSelectedBox] = useState<BoxGroup | null>(null);

  // Use stats from hook instead of calculating here
  const categories = stats?.categories || [];
  const groups = stats?.groups || [];

  // Group parts by SKU for box view
  const boxGroups = useMemo(() => {
    const groups: { [sku: string]: BoxGroup } = {};
    
    parts.forEach(part => {
      if (!groups[part.sku]) {
        groups[part.sku] = {
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
      
      groups[part.sku].parts.push(part);
      groups[part.sku].totalQty += part.totalQty;
      groups[part.sku].availableQty += part.availableQty || 0;
      groups[part.sku].usedQty += part.usedQty || 0;
      groups[part.sku].damagedQty += part.damagedQty || 0;
      
      if (!groups[part.sku].categories.includes(part.category)) {
        groups[part.sku].categories.push(part.category);
      }
      
      // Check if any part in this SKU group has low stock
      if ((part.availableQty || 0) < 5) {
        groups[part.sku].lowStock = true;
      }
    });
    
    return Object.values(groups);
  }, [parts]);

  // Use stats from hook
  const lowStockCount = stats?.lowStockCount || 0;

  // Filtered and sorted parts
  const filteredParts = useMemo(() => {
    let filtered = parts.filter(part => {
      const matchesSearch = !searchQuery || 
        part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        part.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (part.partNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (part.group || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
      const matchesGroup = selectedGroup === 'all' || (part.group || '') === selectedGroup;
      
      return matchesSearch && matchesCategory && matchesGroup;
    });

    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'category':
          aVal = a.category;
          bVal = b.category;
          break;
        case 'qty':
          aVal = a.totalQty;
          bVal = b.totalQty;
          break;
        case 'updated':
          aVal = new Date(a.updatedAt);
          bVal = new Date(b.updatedAt);
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [parts, searchQuery, selectedCategory, sortBy, sortOrder]);

  // Filtered boxes
  const filteredBoxes = useMemo(() => {
    let filtered = boxGroups.filter(box => {
      const matchesSearch = !searchQuery || 
        box.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        box.categories.some(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
        box.categories.includes(selectedCategory);
      const matchesGroup = selectedGroup === 'all' || box.parts.some(p => (p.group || '') === selectedGroup);
      
      return matchesSearch && matchesCategory && matchesGroup;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.sku.localeCompare(b.sku) : b.sku.localeCompare(a.sku);
      }
      if (sortBy === 'qty') {
        return sortOrder === 'asc' ? a.totalQty - b.totalQty : b.totalQty - a.totalQty;
      }
      return 0;
    });

    return filtered;
  }, [boxGroups, searchQuery, selectedCategory, sortBy, sortOrder]);

  const handleDeletePart = async (partId: string) => {
    if (!window.confirm('Are you sure you want to delete this part? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/parts/${partId}`);
      refetch(); // Refetch inventory after deletion
    } catch (error) {
      console.error('Error deleting part:', error);
      alert('Failed to delete part. Please try again.');
    }
  };

  const role = user?.role?.toLowerCase() as string | undefined;
  const canManageParts = role === 'admin' || role === 'superadmin';

  // Show loading state with premium skeleton
  if (isLoading) {
    return <LoadingState type="skeleton" text="Loading inventory..." />;
  }

  // Show error state with retry
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <Alert variant="error">
          <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Failed to load inventory</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={refetch}
            >
              Retry
            </Button>
          </div>
        </Alert>
      </motion.div>
    );
  }

  const currentItems = viewMode === 'parts' ? filteredParts : filteredBoxes;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div>
          <h1 className="text-3xl font-bold text-primary">Parts Inventory</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-gray-400">
              Manage your robotics parts and stock levels
            </p>
            {lowStockCount > 0 && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-3 py-1"
              >
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 text-sm font-medium">
                  {lowStockCount} item{lowStockCount > 1 ? 's' : ''} low stock
                </span>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={refetch}
          >
            Refresh
          </Button>

          {canManageParts && (
            <>
              <button
                onClick={() => setShowBoxModal(true)}
                className="btn-outline flex items-center gap-2"
              >
                <Box className="w-5 h-5" />
                Add Box
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Part
              </button>
            </>
          )}
        </div>
      </div>

      {/* View Mode Toggle & Search */}
      <div className="bg-surface border border-gray-700 rounded-2xl p-6">
        {/* View Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode('parts')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'parts'
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
              Parts View
            </button>
            <button
              onClick={() => setViewMode('boxes')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                viewMode === 'boxes'
                  ? 'bg-primary text-white shadow-lg'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Grid className="w-4 h-4" />
              Boxes View
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={`Search ${viewMode} by name, SKU, or category...`}
              className="input pl-12 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <select
              className="select min-w-[150px]"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

          <select
            className="select min-w-[150px]"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="all">All Groups</option>
            {groups.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

            <select
              className="select min-w-[120px]"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="category-asc">Category A-Z</option>
              <option value="qty-desc">Stock High-Low</option>
              <option value="qty-asc">Stock Low-High</option>
              {viewMode === 'parts' && <option value="updated-desc">Recently Updated</option>}
            </select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {viewMode === 'parts' ? stats?.totalParts : stats?.totalBoxes}
            </div>
            <div className="text-sm text-gray-400">
              Total {viewMode === 'parts' ? 'Parts' : 'Boxes'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">
              {stats?.totalAvailable || 0}
            </div>
            <div className="text-sm text-gray-400">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {stats?.totalInUse || 0}
            </div>
            <div className="text-sm text-gray-400">In Use</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-400">
              {stats?.totalDamaged || 0}
            </div>
            <div className="text-sm text-gray-400">Damaged</div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      {currentItems.length === 0 ? (
        <div className="bg-surface border border-gray-700 rounded-2xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-300 mb-2">
            No {viewMode} found
          </h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : `Get started by adding your first ${viewMode === 'parts' ? 'part' : 'box'}.`
            }
          </p>
          {canManageParts && !searchQuery && selectedCategory === 'all' && (
            <button
              onClick={() => viewMode === 'parts' ? setShowCreateModal(true) : setShowBoxModal(true)}
              className="btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add First {viewMode === 'parts' ? 'Part' : 'Box'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {viewMode === 'parts' ? (
            filteredParts.map((part) => (
              <PartCard
                key={part._id}
                part={part}
                onEdit={canManageParts ? () => setEditingPart(part) : undefined}
                onDelete={canManageParts ? () => handleDeletePart(part._id) : undefined}
                onViewStock={() => setShowStockModal(part)}
              />
            ))
          ) : (
            filteredBoxes.map((box) => (
              <BoxCard
                key={box.sku}
                box={box}
                onClick={() => setSelectedBox(box)}
              />
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <PartFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}

      {editingPart && (
        <PartFormModal
          part={editingPart}
          onClose={() => setEditingPart(null)}
          onSaved={() => {
            setEditingPart(null);
            refetch();
          }}
        />
      )}

      {showStockModal && (
        <StockDetailsModal
          part={showStockModal}
          onClose={() => setShowStockModal(null)}
          onStockUpdated={refetch}
        />
      )}

      {selectedBox && (
        <BoxDetailsModal
          box={selectedBox}
          onClose={() => setSelectedBox(null)}
        />
      )}

      {showBoxModal && (
        <BoxFormModal
          onClose={() => setShowBoxModal(false)}
        />
      )}
    </motion.div>
  );
}

/**
 * Professional Part Card Component
 */
interface PartCardProps {
  part: PartWithStock;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewStock: () => void;
}

const PartCard: React.FC<PartCardProps> = ({ part, onEdit, onDelete, onViewStock }) => {
  const lowStock = (part.availableQty || 0) < 5;
  const outOfStock = (part.availableQty || 0) === 0;
  
  return (
    <div className={`bg-surface border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 group relative overflow-hidden ${
      lowStock ? 'border-yellow-400/50' : outOfStock ? 'border-red-400/50' : 'border-gray-700'
    }`}>
      {/* Stock Status Badge */}
      {lowStock && (
        <div className="absolute top-4 right-4 z-10">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
            outOfStock 
              ? 'bg-red-400/20 text-red-300 border border-red-400/30' 
              : 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
          }`}>
            <AlertTriangle className="w-3 h-3" />
            {outOfStock ? 'Out' : 'Low'}
          </div>
        </div>
      )}

      {/* Part Image */}
      <div className="aspect-square bg-gray-800/50 rounded-xl mb-4 overflow-hidden border border-gray-700/50">
        {part.imageUrl && (
          <img
            src={part.imageUrl}
            alt={part.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              if (target.nextElementSibling) {
                (target.nextElementSibling as HTMLElement).classList.remove('hidden');
              }
            }}
          />
        )}
        <div className={`w-full h-full flex items-center justify-center ${part.imageUrl ? 'hidden' : ''}`}>
          <Package className="w-12 h-12 text-gray-500" />
        </div>
      </div>

      {/* Part Info */}
      <div className="space-y-3">
        <div className="min-h-[3rem]">
          <h3 className="font-semibold text-lg text-gray-200 leading-tight line-clamp-2">
            {part.name}
          </h3>
          <p className="text-sm text-gray-400 mt-1">{part.category}</p>
        </div>

        {part.sku && (
          <div className="text-xs text-gray-500 font-mono bg-gray-800/30 rounded px-2 py-1 border border-gray-700/50">
            SKU: {part.sku}
          </div>
        )}

        {part.partNumber && (
          <div className="text-xs text-gray-500 font-mono bg-gray-800/30 rounded px-2 py-1 border border-gray-700/50">
            Part #: {part.partNumber}
          </div>
        )}

        {/* Stock Levels */}
        <div className="space-y-2 bg-gray-800/30 rounded-xl p-3 border border-gray-700/30">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Available:</span>
            <span className={`font-semibold ${
              outOfStock ? 'text-red-400' : lowStock ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {part.availableQty || 0}
            </span>
          </div>
          
          {(part.usedQty || 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">In Use:</span>
              <span className="text-yellow-400 font-semibold">{part.usedQty}</span>
            </div>
          )}
          
          {(part.damagedQty || 0) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Damaged:</span>
              <span className="text-red-400 font-semibold">{part.damagedQty}</span>
            </div>
          )}
        </div>

        {/* Action Buttons - Professional Layout */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <button
            onClick={onViewStock}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-300 bg-gray-800/50 border border-gray-600/50 rounded-lg hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
          >
            <Eye className="w-3.5 h-3.5" />
            Stock
          </button>
          
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-300 bg-gray-800/50 border border-gray-600/50 rounded-lg hover:border-blue-400 hover:text-blue-400 hover:bg-blue-400/5 transition-all duration-200"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-400 bg-gray-800/50 border border-red-600/50 rounded-lg hover:border-red-400 hover:bg-red-400/10 transition-all duration-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Box Card Component
 */
interface BoxCardProps {
  box: BoxGroup;
  onClick: () => void;
}

const BoxCard: React.FC<BoxCardProps> = ({ box, onClick }) => {
  const primaryCategory = box.categories[0] || 'Mixed';
  const hasMultipleCategories = box.categories.length > 1;
  
  return (
    <div 
      onClick={onClick}
      className={`bg-surface border rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 cursor-pointer group ${
        box.lowStock ? 'border-yellow-400/50' : 'border-gray-700'
      }`}
    >
      {/* Box Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
            <Box className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-200">Box {box.sku}</h3>
            <p className="text-sm text-gray-400">
              {primaryCategory}{hasMultipleCategories && ` +${box.categories.length - 1} more`}
            </p>
          </div>
        </div>
        
        {box.lowStock && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </div>
        )}
      </div>

      {/* Box Stats */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Parts in Box:</span>
          <span className="font-semibold text-primary">{box.parts.length}</span>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center bg-gray-800/30 rounded-xl p-3 border border-gray-700/30">
          <div>
            <div className="text-sm font-semibold text-green-400">{box.availableQty}</div>
            <div className="text-xs text-gray-500">Available</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-yellow-400">{box.usedQty}</div>
            <div className="text-xs text-gray-500">In Use</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-red-400">{box.damagedQty}</div>
            <div className="text-xs text-gray-500">Damaged</div>
          </div>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-xs text-primary">Click to view contents</p>
      </div>
    </div>
  );
};

/**
 * Box Details Modal
 */
const BoxDetailsModal: React.FC<{
  box: BoxGroup;
  onClose: () => void;
}> = ({ box, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-primary">Box {box.sku}</h2>
            <p className="text-gray-400">{box.parts.length} parts • {box.categories.join(', ')}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Box Stats */}
        <div className="p-6 border-b border-gray-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{box.totalQty}</div>
              <div className="text-sm text-gray-400">Total Stock</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{box.availableQty}</div>
              <div className="text-sm text-gray-400">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{box.usedQty}</div>
              <div className="text-sm text-gray-400">In Use</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{box.damagedQty}</div>
              <div className="text-sm text-gray-400">Damaged</div>
            </div>
          </div>
        </div>

        {/* Parts List */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Parts in this Box</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {box.parts.map((part) => (
              <div key={part._id} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
                    {part.imageUrl && (
                      <img
                        src={part.imageUrl}
                        alt={part.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          if (target.nextElementSibling) {
                            (target.nextElementSibling as HTMLElement).classList.remove('hidden');
                          }
                        }}
                      />
                    )}
                    <div className={`w-full h-full flex items-center justify-center ${part.imageUrl ? 'hidden' : ''}`}>
                      <Package className="w-4 h-4 text-gray-500" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-200 truncate">{part.name}</h4>
                    <p className="text-xs text-gray-400">{part.category}</p>
                  {part.partNumber && (
                    <p className="text-[11px] text-gray-500 mt-0.5">Part #: {part.partNumber}</p>
                  )}
                  </div>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Available:</span>
                    <span className="text-green-400 font-medium">{part.availableQty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Used:</span>
                    <span className="text-yellow-400 font-medium">{part.usedQty || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Damaged:</span>
                    <span className="text-red-400 font-medium">{part.damagedQty || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-700">
          <button onClick={onClose} className="btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Box Form Modal (Placeholder)
 */
const BoxFormModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-gray-700 rounded-2xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">Add New Box</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-400 text-center mb-6">
          Boxes are automatically created when parts share the same SKU. 
          Add parts with the same SKU to group them into a box.
        </p>
        
        <div className="flex justify-end">
          <button onClick={onClose} className="btn-outline">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Stock Details Modal
 */
const StockDetailsModal: React.FC<{
  part: PartWithStock;
  onClose: () => void;
  onStockUpdated: () => void;
}> = ({ part, onClose, onStockUpdated }) => {
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('adjustment');
  const [loading, setLoading] = useState(false);

  const handleStockAdjustment = async () => {
    if (adjustmentQty === 0) return;
    
    setLoading(true);
    try {
      await api.post('/stock/adjust', {
        partId: part._id,
        qtyChange: adjustmentQty,
        reason: adjustmentReason
      });
      onStockUpdated();
      setAdjustmentQty(0);
    } catch (error) {
      alert('Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const lowStock = part.availableQty < 5;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-gray-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-primary">{part.name}</h2>
            <p className="text-gray-400">{part.category} • SKU: {part.sku}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Current Stock
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Available:</span>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${lowStock ? 'text-yellow-400' : 'text-green-400'}`}>
                    {part.availableQty}
                  </span>
                  {lowStock && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">In Use:</span>
                <span className="text-xl font-semibold text-yellow-400">{part.usedQty}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Damaged:</span>
                <span className="text-xl font-semibold text-red-400">{part.damagedQty}</span>
              </div>
              
              <div className="border-t border-gray-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 font-medium">Total:</span>
                  <span className="text-xl font-bold text-primary">{part.totalQty}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Stock Adjustment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quantity Change
                </label>
                <input
                  type="number"
                  className="input w-full"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                  placeholder="Enter positive or negative number..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason
                </label>
                <select
                  className="select w-full"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                >
                  <option value="adjustment">Inventory Adjustment</option>
                  <option value="purchase">Purchase/Delivery</option>
                  <option value="used">Used in Project</option>
                  <option value="damaged">Damaged/Lost</option>
                  <option value="return">Return to Stock</option>
                </select>
              </div>

              <button
                onClick={handleStockAdjustment}
                disabled={loading || adjustmentQty === 0}
                className="btn w-full"
              >
                {loading ? 'Applying...' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn-outline">Close</button>
        </div>
      </div>
    </div>
  );
};