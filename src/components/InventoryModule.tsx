import React, { useState } from 'react';
import { useBusiness } from '../context/BusinessContext';
import { InventoryItem, CurrencyCode, CURRENCY_SYMBOLS } from '../types';
import { Plus, Trash2, Search, AlertTriangle, CheckCircle, Package, X, Check, Pencil, Sparkles } from 'lucide-react';

export const InventoryModule: React.FC = () => {
  const { inventory, saveInventoryItem, removeInventoryItem, adjustStock, settings } = useBusiness();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState<CurrencyCode>((settings.defaultCurrency as CurrencyCode) || 'USD');
  const [quantity, setQuantity] = useState<number>(10);
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [taxRate, setTaxRate] = useState<number>(settings.defaultTaxRate || 10);
  const [type, setType] = useState<'product' | 'item' | 'service'>('product');
  const [filterType, setFilterType] = useState<'all' | 'product' | 'item' | 'service'>('all');
  const [errorLocal, setErrorLocal] = useState('');

  const filteredItems = inventory.filter(i => {
    const matchesSearch = 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || (i.type || 'product') === filterType;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSku('');
    setDescription('');
    setPrice(0);
    setCurrency((settings.defaultCurrency as CurrencyCode) || 'USD');
    setQuantity(10);
    setMinStockLevel(5);
    setTaxRate(settings.defaultTaxRate || 10);
    setType('product');
    setErrorLocal('');
    setShowAddForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowAddForm(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setName(item.name);
    setSku(item.sku);
    setDescription(item.description || '');
    setPrice(item.price);
    setCurrency((item.currency as CurrencyCode) || 'USD');
    setQuantity(item.quantity);
    setMinStockLevel(item.minStockLevel);
    setTaxRate(item.taxRate);
    setType(item.type || 'product');
    setErrorLocal('');
    setShowAddForm(true);
  };

  const loadSampleCatalog = async () => {
    const ts = Date.now();
    const cur = (settings.defaultCurrency as CurrencyCode) || 'USD';
    const tax = settings.defaultTaxRate || 10;
    const samples = [
      {
        id: 'p1_' + ts,
        name: 'Premium Consulting',
        sku: 'SRV-CONS',
        description: 'Business advisory service (hourly)',
        price: 150,
        currency: cur,
        quantity: 999999,
        minStockLevel: 0,
        taxRate: tax,
        type: 'service' as const,
      },
      {
        id: 'p2_' + (ts + 1),
        name: 'Standard Product Kit',
        sku: 'PRD-KIT',
        description: 'Starter product package',
        price: 89,
        currency: cur,
        quantity: 25,
        minStockLevel: 5,
        taxRate: tax,
        type: 'product' as const,
      },
      {
        id: 'p3_' + (ts + 2),
        name: 'Consumable Parts',
        sku: 'ITM-PART',
        description: 'Replacement parts pack',
        price: 12,
        currency: cur,
        quantity: 100,
        minStockLevel: 20,
        taxRate: tax,
        type: 'item' as const,
      },
    ];
    // Sequential saves so local state doesn't race
    await saveInventoryItem(samples[0]);
    await saveInventoryItem(samples[1]);
    await saveInventoryItem(samples[2]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorLocal('');

    if (!name || price < 0) {
      setErrorLocal('Please input valid item parameters (name and positive price are required).');
      return;
    }

    try {
      const itemPayload = {
        id: editingId || 'prod_' + Date.now().toString(),
        name,
        sku: sku || 'SKU-' + Date.now().toString().slice(-5).toUpperCase(),
        description,
        price,
        currency,
        quantity: type === 'service' ? 999999 : quantity,
        minStockLevel: type === 'service' ? 0 : minStockLevel,
        taxRate,
        type
      };

      await saveInventoryItem(itemPayload);
      resetForm();
    } catch (err: any) {
      setErrorLocal(err.message || 'Failed to catalog product');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Inventory & Stock Manager</h2>
          <p className="text-xs text-slate-500">Track raw hardware, products, service catalogs, stock refills, and threshold shortages.</p>
        </div>

        <button
          onClick={() => (showAddForm ? resetForm() : openCreate())}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-300 shadow-md cursor-pointer select-none active:scale-[0.98] ${
            showAddForm
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 shadow-rose-100/50'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-100 shadow-indigo-500/10'
          }`}
        >
          {showAddForm ? (
            <>
              <X className="w-4 h-4" />
              Close Form
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Catalog New Product/Service
            </>
          )}
        </button>
      </div>

      {/* Stock catalog submission form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-4 max-w-3xl">
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider mb-2">
            {editingId ? 'Edit Product / Service' : 'Configure Product / Service Profile'}
          </h3>

          {errorLocal && (
            <div className="bg-red-50 border border-red-200 text-red-605 rounded p-3 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{errorLocal}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-2">
            <label className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">Catalog Asset Classification Type</label>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 uppercase tracking-wider text-[10px] sm:text-xs">
              <button
                type="button"
                onClick={() => setType('product')}
                className={`py-2 rounded-lg font-bold transition-all duration-150 flex items-center justify-center gap-1.5 border cursor-pointer ${type === 'product' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 hover:text-slate-800 border-slate-205'}`}
              >
                📦 Product
              </button>
              <button
                type="button"
                onClick={() => setType('item')}
                className={`py-2 rounded-lg font-bold transition-all duration-150 flex items-center justify-center gap-1.5 border cursor-pointer ${type === 'item' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-500 hover:text-slate-800 border-slate-205'}`}
              >
                🔧 Item
              </button>
              <button
                type="button"
                onClick={() => setType('service')}
                className={`py-2 rounded-lg font-bold transition-all duration-150 flex items-center justify-center gap-1.5 border cursor-pointer ${type === 'service' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-500 hover:text-slate-800 border-slate-205'}`}
              >
                💼 Service
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Product/Service Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Database Tuning Hour"
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">SKU Code</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SRV-DB-TUN"
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Unit Price *</label>
              <input
                type="number"
                step="0.01"
                value={price || ''}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                placeholder="150"
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all"
              >
                {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                  <option key={code} value={code}>
                    {code} ({symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-mono font-medium text-slate-500 uppercase">Default Tax Percentage (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseInt(e.target.value) || 0)}
                className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {type !== 'service' ? (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono font-medium text-slate-500 uppercase">Initial Stock Level</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono font-medium text-slate-500 uppercase">Low Stock Alert Level</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
                    className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-center bg-blue-50 border border-blue-100 rounded-lg p-3.5 sm:col-span-2 text-left">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block font-mono">Service Catalog Asset</span>
                <span className="text-xs text-blue-600 mt-0.5">No physical inventory counts required. This operates as an unlimited, on-demand billed service asset.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono font-medium text-slate-500 uppercase">Brief Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enterprise service to restructure queries, optimize cluster replicas, and clean up orphan indexes."
              rows={2}
              className="border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white rounded-lg p-2 text-xs outline-none focus:border-blue-500 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 mt-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-550 transition-all cursor-pointer border border-transparent hover:border-slate-200 flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-100"
            >
              <Check className="w-3.5 h-3.5" />
              {editingId ? 'Save Changes' : 'Save Catalog Asset'}
            </button>
          </div>
        </form>
      )}

      {/* Search Bar & Alerts highlights */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-400 focus-within:border-blue-500 flex-1 transition-all">
            <Search className="w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog by name or SKU..."
              className="text-xs w-full bg-transparent outline-none text-slate-700 font-sans"
            />
          </div>

          {/* Quick filter block */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 sm:py-0">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${filterType === 'all' ? 'bg-slate-800 text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
            >
              All Assets ({inventory.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('product')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${filterType === 'product' ? 'bg-blue-600 text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
            >
              📦 Products ({inventory.filter(i => (i.type || 'product') === 'product').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('item')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${filterType === 'item' ? 'bg-purple-600 text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
            >
              🔧 Items ({inventory.filter(i => i.type === 'item').length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('service')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap border ${filterType === 'service' ? 'bg-amber-600 text-white border-transparent' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
            >
              💼 Services ({inventory.filter(i => i.type === 'service').length})
            </button>
          </div>
        </div>

        {/* Low Stock Indicator Summary */}
        <div className="flex items-center gap-4 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm animate-pulse" />
            <span className="text-slate-500 font-medium font-sans">
              Critical Shortages: <strong className="text-red-600 font-mono">{inventory.filter(i => (i.type || 'product') !== 'service' && i.quantity <= i.minStockLevel).length} items</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Catalog Table Layout Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-650 border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px] text-slate-550">
                <th className="py-3 px-4 w-12"></th>
                <th className="py-3 px-2">Catalog Details</th>
                <th className="py-3 px-4 text-center">SKU</th>
                <th className="py-3 px-4 text-right">Base Price</th>
                <th className="py-3 px-4 text-center">Tax preset</th>
                <th className="py-3 px-4 text-center w-40">Stock Quantity</th>
                <th className="py-3 px-4 text-center">Availability Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const isLowStock = (item.type || 'product') !== 'service' && item.quantity <= item.minStockLevel;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${
                        item.type === 'service' ? 'bg-amber-50 text-amber-600' :
                        item.type === 'item' ? 'bg-purple-50 text-purple-650' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        <Package className="w-4 h-4" />
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 text-sm leading-tight">{item.name}</p>
                        {item.type === 'service' && <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full font-mono">Service</span>}
                        {(item.type || 'product') === 'product' && <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full font-mono">Product</span>}
                        {item.type === 'item' && <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full font-mono">Item</span>}
                      </div>
                      {item.description && <p className="text-xs text-slate-450 line-clamp-1 mt-1 max-w-sm font-sans">{item.description}</p>}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-[10px] text-slate-500 uppercase">
                      {item.sku}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                      {item.currency} {item.price.toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-slate-500">
                      {item.taxRate || 0}%
                    </td>
                    <td className="py-4 px-4 font-sans text-center">
                      {item.type === 'service' ? (
                        <span className="text-slate-400 italic text-xs">Unlimited (Service)</span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => adjustStock(item.id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold transition-all outline-none cursor-pointer"
                          >
                            -
                          </button>
                          <span className={`w-10 text-center font-mono font-bold text-xs ${isLowStock ? 'text-red-655 bg-red-50 p-0.5 px-1.5 rounded border border-red-105' : 'text-slate-800'}`}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => adjustStock(item.id, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-705 font-bold transition-all outline-none cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {item.type === 'service' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          💼 Billable
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 bg-red-50 border border-red-100 text-red-605 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          STOCKED
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                          title="Edit Product"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${item.name}" from catalog?`)) {
                              removeInventoryItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded text-slate-300 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Package className="w-8 h-8 text-slate-350" />
                      <h5 className="font-bold text-slate-700">Stock Catalog is Empty</h5>
                      <p className="text-xs leading-normal max-w-xs font-sans">
                        Add products, items, or services. Line items pull pricing and tax into quotes and invoices.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center mt-1">
                        <button
                          type="button"
                          onClick={openCreate}
                          className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-700"
                        >
                          Add first item
                        </button>
                        {inventory.length === 0 && (
                          <button
                            type="button"
                            onClick={loadSampleCatalog}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-50 flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Load sample catalog
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
