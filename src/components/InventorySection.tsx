import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatLak, translations } from '../i18n';
import {
  INVENTORY_PRESET_ITEMS_LAO,
  INVENTORY_SUPPLIERS_LAO,
  InventoryItem,
  Lang,
  UserRole,
} from '../types';
import { CreatableSelect } from './CreatableSelect';
import { exportAndSaveCsvToFirebase } from '../utils/firebaseFileStorage';

interface Props {
  lang: Lang;
  uid: string;
  role: UserRole;
  inventory: InventoryItem[];
  onConfirmDelete: (collectionName: string, docId: string, label: string) => void;
}

const COMMON_UNITS = [
  'ກ່ອງ (Boxes)',
  'ຫຼອດ (Syringes)',
  'ຫໍ່ (Packs)',
  'ຖົງ (Bags)',
  'ກະປ໋ອງ (Bottles)',
  'ແພັກ (Packs)',
  'ຊຸດ (Sets)',
  'ອັນ (Pieces)',
];

export const InventorySection: React.FC<Props> = ({
  lang,
  uid,
  role,
  inventory,
  onConfirmDelete,
}) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'low'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [form, setForm] = useState({
    itemName: INVENTORY_PRESET_ITEMS_LAO[0].name,
    sku: 'LK-INV-010',
    category: INVENTORY_PRESET_ITEMS_LAO[0].category as InventoryItem['category'],
    carriedForwardQty: 15,
    quantity: 10,
    minThreshold: 8,
    unit: INVENTORY_PRESET_ITEMS_LAO[0].defaultUnit,
    unitCostLak: 150000,
    supplier: INVENTORY_SUPPLIERS_LAO[0],
    expiryDate: '2027-12-31',
  });

  const canModify = role === 'Admin' || role === 'Dentist' || role === 'Assistant';
  const isAdmin = role === 'Admin';
  const lowStockItems = inventory.filter((item) => item.quantity <= item.minThreshold);

  const filtered = inventory.filter((item) => {
    const matchesSearch =
      item.itemName.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      item.supplier.toLowerCase().includes(search.toLowerCase());
    const matchesLow = filterMode === 'all' || item.quantity <= item.minThreshold;
    return matchesSearch && matchesLow;
  });

  const openNewItemModal = () => {
    setEditingItemId(null);
    setForm({
      itemName: INVENTORY_PRESET_ITEMS_LAO[0].name,
      sku: `LK-INV-0${inventory.length + 1}`,
      category: INVENTORY_PRESET_ITEMS_LAO[0].category,
      carriedForwardQty: 15,
      quantity: 10,
      minThreshold: 8,
      unit: INVENTORY_PRESET_ITEMS_LAO[0].defaultUnit,
      unitCostLak: 150000,
      supplier: INVENTORY_SUPPLIERS_LAO[0],
      expiryDate: '2027-12-31',
    });
    setShowModal(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setForm({
      itemName: item.itemName,
      sku: item.sku,
      category: item.category,
      carriedForwardQty: item.carriedForwardQty ?? 0,
      quantity: item.quantity,
      minThreshold: item.minThreshold,
      unit: item.unit,
      unitCostLak: item.unitCostLak,
      supplier: item.supplier,
      expiryDate: item.expiryDate,
    });
    setShowModal(true);
  };

  const handleAdjustQuantity = async (item: InventoryItem, delta: number) => {
    if (!canModify) return;
    const nextQty = Math.max(0, item.quantity + delta);
    try {
      await updateDoc(doc(db, 'inventory', item.id), {
        quantity: nextQty,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${item.id}`);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    const payload = {
      itemName: form.itemName.trim().slice(0, 150),
      sku: form.sku.trim().slice(0, 50),
      category: form.category,
      carriedForwardQty: Math.max(0, Number(form.carriedForwardQty) || 0),
      quantity: Math.max(0, Number(form.quantity) || 0),
      minThreshold: Math.max(0, Number(form.minThreshold) || 0),
      unit: form.unit.trim().slice(0, 40),
      unitCostLak: Math.max(0, Number(form.unitCostLak) || 0),
      supplier: form.supplier.trim().slice(0, 150),
      expiryDate: form.expiryDate.slice(0, 30),
      updatedAt: serverTimestamp(),
    };

    if (editingItemId) {
      try {
        await updateDoc(doc(db, 'inventory', editingItemId), payload);
        setShowModal(false);
        setEditingItemId(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `inventory/${editingItemId}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'inventory'), {
          ...payload,
          ownerId: uid,
          createdAt: serverTimestamp(),
        });
        setShowModal(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'inventory');
      }
    }
  };

  // Export Current Filtered Inventory Table Data as CSV & Store in Firebase
  const handleExportCurrentInventoryCsv = async () => {
    const headers = [
      'SKU',
      'Item Name (ຊື່ອຸປະກອນ)',
      'Category (ໝວດໝູ່)',
      'Carried Forward (ຍອດຍົກມາ)',
      'Remaining Qty (ຄົງເຫຼືອ)',
      'Min Threshold (ເກນຂັ້ນຕ່ຳ)',
      'Unit (ຫົວໜ່ວຍ)',
      'Status (ສະຖານະ)',
      'Unit Cost LAK (ຕົ້ນທຶນ)',
      'Supplier (ຜູ້ສະໜອງ)',
      'Expiry Date (ວັນໝົດອາຍຸ)',
    ];
    const rows = filtered.map((i) => {
      const statusText =
        i.quantity === 0 ? 'Depleted' : i.quantity <= i.minThreshold ? 'Low Stock' : 'Nominal';
      return [
        i.sku,
        i.itemName,
        i.category,
        i.carriedForwardQty ?? 0,
        i.quantity,
        i.minThreshold,
        i.unit,
        statusText,
        i.unitCostLak,
        i.supplier,
        i.expiryDate,
      ];
    });
    const today = new Date().toISOString().slice(0, 10);
    await exportAndSaveCsvToFirebase({
      uid,
      fileName: `LK_Smile_Inventory_Table_${today}.csv`,
      category: 'Inventory',
      headers,
      rows,
      notes: `ຕາຕະລາງສາງອຸປະກອນຄລີນິກ (${rows.length} ລາຍການ)`,
    });
  };

  const handleExportReorderReport = async () => {
    const headers = [
      'SKU',
      'Item Name',
      'Category',
      'Carried Forward Qty',
      'Remaining Qty',
      'Min Threshold',
      'Unit',
      'Unit Cost LAK',
      'Supplier',
    ];
    const rows = lowStockItems.map((i) => [
      i.sku,
      i.itemName,
      i.category,
      i.carriedForwardQty ?? 0,
      i.quantity,
      i.minThreshold,
      i.unit,
      i.unitCostLak,
      i.supplier,
    ]);
    const today = new Date().toISOString().slice(0, 10);
    await exportAndSaveCsvToFirebase({
      uid,
      fileName: `LK_Smile_LowStock_Report_${today}.csv`,
      category: 'Inventory',
      headers,
      rows,
      notes: `ລາຍງານສັ່ງຊື້ອຸປະກອນໃກ້ໝົດ (${rows.length} ລາຍການ)`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.inventoryTitle}</h2>
          <p className="text-sm text-slate-600 mt-1">{t.inventoryDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCurrentInventoryCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-700" />
            Export CSV ({filtered.length})
          </button>
          <button
            onClick={handleExportReorderReport}
            className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {t.generateRestockReport} ({lowStockItems.length})
          </button>
          {canModify && (
            <button
              onClick={openNewItemModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t.newInventoryItem}
            </button>
          )}
        </div>
      </div>

      {/* Prominent Remaining Items / Low-Stock Notification Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {t.lowStockBannerTitle} ({lowStockItems.length})
              </span>
            </div>
          </div>
          <p className="text-xs text-amber-800">{t.lowStockBannerDesc}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-amber-200 rounded-md p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">{item.itemName}</div>
                  <div className="text-xs text-slate-600 font-mono mt-0.5">
                    {t.remainingQty}: <strong className="text-rose-600">{item.quantity}</strong> /{' '}
                    {item.minThreshold} {item.unit}
                  </div>
                </div>
                {canModify && (
                  <button
                    onClick={() => handleAdjustQuantity(item, 10)}
                    className="px-2.5 py-1 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md whitespace-nowrap shrink-0"
                  >
                    +10
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
          />
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterMode === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
            }`}
          >
            {t.allFilter} ({inventory.length})
          </button>
          <button
            onClick={() => setFilterMode('low')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterMode === 'low'
                ? 'bg-white text-rose-700 shadow-xs font-semibold'
                : 'text-slate-600'
            }`}
          >
            {t.stockStatusLow} ({lowStockItems.length})
          </button>
        </div>
      </div>

      {/* Inventory Table with Bold Headers, Carried-Forward Balance & Click-to-Edit */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-900">
                <th className="py-3 px-4">{t.sku}</th>
                <th className="py-3 px-4">{t.itemName}</th>
                <th className="py-3 px-4">{t.category}</th>
                <th className="py-3 px-4 text-right">{t.carriedForwardQty}</th>
                <th className="py-3 px-4 text-right">{t.quantity}</th>
                <th className="py-3 px-4">{t.unit}</th>
                <th className="py-3 px-4">{t.status}</th>
                <th className="py-3 px-4 text-right">{t.unitCost}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((item) => {
                const isLow = item.quantity <= item.minThreshold;
                const isOut = item.quantity === 0;
                return (
                  <tr
                    key={item.id}
                    onClick={() => isAdmin && openEditItemModal(item)}
                    className={`hover:bg-slate-50/80 ${isAdmin ? 'cursor-pointer' : ''}`}
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 whitespace-nowrap">
                      {item.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.itemName}</div>
                      <div className="text-xs text-slate-500">
                        {item.supplier} · Exp: {item.expiryDate}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{item.category}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700 whitespace-nowrap">
                      {item.carriedForwardQty ?? 0}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs whitespace-nowrap">
                      <span
                        className={isLow ? 'text-rose-600 font-bold' : 'text-slate-900 font-bold'}
                      >
                        {item.quantity}
                      </span>{' '}
                      <span className="text-slate-400">/ {item.minThreshold}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {item.unit}
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          isOut
                            ? 'text-rose-700 font-bold'
                            : isLow
                            ? 'text-amber-700 font-bold'
                            : 'text-emerald-700 font-semibold'
                        }
                      >
                        {isOut ? t.stockStatusOut : isLow ? t.stockStatusLow : t.stockStatusNormal}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-800 whitespace-nowrap">
                      {formatLak(item.unitCostLak, lang)}
                    </td>
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        {canModify && (
                          <button
                            onClick={() => openEditItemModal(item)}
                            className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            ແກ້ໄຂ
                          </button>
                        )}
                        {canModify && (
                          <>
                            <button
                              onClick={() => handleAdjustQuantity(item, -1)}
                              className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 rounded text-slate-700"
                              title="Use 1 item"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleAdjustQuantity(item, 5)}
                              className="px-2 py-1 text-xs font-mono bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded"
                              title="Restock 5 items"
                            >
                              +5
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => onConfirmDelete('inventory', item.id, item.itemName)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Inventory Modal with Creatable Dropdown Lists */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-700" />
                {editingItemId
                  ? 'ແກ້ໄຂລາຍການອຸປະກອນໃນສາງ (Edit Inventory Item)'
                  : t.newInventoryItem}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-xs text-slate-500">
                {t.cancel}
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CreatableSelect
                  label={t.itemName}
                  required
                  value={form.itemName}
                  options={INVENTORY_PRESET_ITEMS_LAO.map((p) => p.name)}
                  onChange={(val) => {
                    const matched = INVENTORY_PRESET_ITEMS_LAO.find((p) => p.name === val);
                    setForm({
                      ...form,
                      itemName: val,
                      unit: matched ? matched.defaultUnit : form.unit,
                      category: matched ? matched.category : form.category,
                    });
                  }}
                  placeholder="ພິມຊື່ອຸປະກອນໃໝ່..."
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.sku} *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.category}
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as InventoryItem['category'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  >
                    <option value="Consumables">Consumables (ວັດສະດຸສິ້ນເປືອງ)</option>
                    <option value="Anesthetics">Anesthetics (ຢາຊາ)</option>
                    <option value="Orthodontics">Orthodontics (ອຸປະກອນຈັດແຂ້ວ)</option>
                    <option value="Instruments">Instruments (ເຄື່ອງມືທັນຕະກຳ)</option>
                    <option value="PPE">PPE (ອຸປະກອນປ້ອງກັນ)</option>
                    <option value="Prosthetics">Prosthetics (ແຂ້ວທຽມ/ຮາກແຂ້ວທຽມ)</option>
                  </select>
                </div>

                <CreatableSelect
                  label={t.unit}
                  required
                  value={form.unit}
                  options={COMMON_UNITS}
                  onChange={(val) => setForm({ ...form, unit: val })}
                  placeholder="ພິມຫົວໜ່ວຍ..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.carriedForwardQty} *
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.carriedForwardQty}
                    onChange={(e) =>
                      setForm({ ...form, carriedForwardQty: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.quantity} *
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.minThresholdLabel} *
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.minThreshold}
                    onChange={(e) =>
                      setForm({ ...form, minThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.unitCost} *
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={form.unitCostLak}
                    onChange={(e) =>
                      setForm({ ...form, unitCostLak: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <CreatableSelect
                  label={t.supplier}
                  value={form.supplier}
                  options={INVENTORY_SUPPLIERS_LAO}
                  onChange={(val) => setForm({ ...form, supplier: val })}
                  placeholder="ພິມຊື່ບໍລິສັດຜູ້ສະໜອງ..."
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.expiryDate}
                  </label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-slate-600"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
