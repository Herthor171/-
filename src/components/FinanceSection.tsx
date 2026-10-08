import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  FileSpreadsheet,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
  Wallet,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatLak, translations } from '../i18n';
import {
  EXPENSE_CATEGORIES_LAO,
  EXPENSE_DESCRIPTIONS_LAO,
  INCOME_CATEGORIES_LAO,
  INCOME_DESCRIPTIONS_LAO,
  Lang,
  Patient,
  Transaction,
  UserRole,
} from '../types';
import { CreatableSelect } from './CreatableSelect';
import { exportAndSaveCsvToFirebase } from '../utils/firebaseFileStorage';

interface Props {
  lang: Lang;
  uid: string;
  role: UserRole;
  transactions: Transaction[];
  patients?: Patient[];
  onConfirmDelete: (collectionName: string, docId: string, label: string) => void;
}

export const FinanceSection: React.FC<Props> = ({
  lang,
  uid,
  role,
  transactions,
  patients = [],
  onConfirmDelete,
}) => {
  const t = translations[lang];
  const currentMonthDefault = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault);
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense' | 'Credit'>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [debtReminderPreview, setDebtReminderPreview] = useState<Transaction | null>(null);

  const [form, setForm] = useState({
    txDate: new Date().toISOString().slice(0, 10),
    txType: 'Income' as Transaction['txType'],
    category: INCOME_CATEGORIES_LAO[0],
    description: INCOME_DESCRIPTIONS_LAO[0],
    amountLak: 1500000,
    discountLak: 0,
    paidAmountLak: 1500000,
    nextPaymentDate: '',
    installmentCount: 0,
    customerPhone: '',
    paymentMethod: 'BCEL OnePay' as Transaction['paymentMethod'],
    referenceName: '',
  });

  const isAdmin = role === 'Admin';
  const canModify = role === 'Admin' || role === 'Receptionist';

  const netAfterDiscount = Math.max(0, Number(form.amountLak || 0) - Number(form.discountLak || 0));
  const calculatedBalanceDue =
    form.txType === 'Income'
      ? Math.max(0, netAfterDiscount - Number(form.paidAmountLak || 0))
      : 0;

  const monthsAvailable = Array.from(
    new Set([currentMonthDefault, ...transactions.map((tx) => tx.txMonth)])
  )
    .sort()
    .reverse();

  const monthTransactions = transactions.filter((tx) => tx.txMonth === selectedMonth);
  const filtered = monthTransactions.filter((tx) => {
    if (typeFilter === 'All') return true;
    if (typeFilter === 'Credit') return (tx.balanceDueLak || 0) > 0;
    return tx.txType === typeFilter;
  });

  // Calculate collected income vs receivables (Strictly separated from Dedicated Staff Payroll System)
  const totalCollectedIncome = monthTransactions
    .filter((tx) => tx.txType === 'Income')
    .reduce(
      (acc, tx) =>
        acc +
        Number(
          tx.paidAmountLak !== undefined
            ? tx.paidAmountLak
            : Number(tx.amountLak || 0) - Number(tx.discountLak || 0)
        ),
      0
    );

  const totalExpense = monthTransactions
    .filter((tx) => tx.txType === 'Expense')
    .reduce((acc, tx) => acc + Number(tx.amountLak || 0), 0);

  const totalOutstandingDebt = transactions
    .filter((tx) => tx.txType === 'Income')
    .reduce((acc, tx) => acc + Number(tx.balanceDueLak || 0), 0);

  const netProfit = totalCollectedIncome - totalExpense;

  const openCreateModal = () => {
    setEditingTx(null);
    setForm({
      txDate: new Date().toISOString().slice(0, 10),
      txType: 'Income',
      category: INCOME_CATEGORIES_LAO[0],
      description: INCOME_DESCRIPTIONS_LAO[0],
      amountLak: 1500000,
      discountLak: 0,
      paidAmountLak: 1500000,
      nextPaymentDate: '',
      installmentCount: 0,
      customerPhone: '',
      paymentMethod: 'BCEL OnePay',
      referenceName: '',
    });
    setShowModal(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTx(tx);
    setForm({
      txDate: tx.txDate,
      txType: tx.txType,
      category: tx.category,
      description: tx.description,
      amountLak: Number(tx.amountLak || 0),
      discountLak: Number(tx.discountLak || 0),
      paidAmountLak:
        tx.paidAmountLak !== undefined
          ? Number(tx.paidAmountLak)
          : Math.max(0, Number(tx.amountLak || 0) - Number(tx.discountLak || 0)),
      nextPaymentDate: tx.nextPaymentDate || '',
      installmentCount: Number(tx.installmentCount || 0),
      customerPhone: tx.customerPhone || '',
      paymentMethod: tx.paymentMethod,
      referenceName: tx.referenceName,
    });
    setShowModal(true);
  };

  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    const txMonth = form.txDate.slice(0, 7);
    const grossAmount = Math.max(0, Number(form.amountLak) || 0);
    const discount = form.txType === 'Income' ? Math.max(0, Number(form.discountLak) || 0) : 0;
    const netAmount = Math.max(0, grossAmount - discount);
    const paid =
      form.txType === 'Income'
        ? Math.min(netAmount, Math.max(0, Number(form.paidAmountLak) || 0))
        : grossAmount;
    const balanceDue = form.txType === 'Income' ? Math.max(0, netAmount - paid) : 0;

    try {
      const payload = {
        txDate: form.txDate,
        txMonth,
        txType: form.txType,
        category: form.category.trim().slice(0, 120),
        description: form.description.trim().slice(0, 300),
        amountLak: grossAmount,
        discountLak: discount,
        paidAmountLak: paid,
        balanceDueLak: balanceDue,
        nextPaymentDate: balanceDue > 0 ? form.nextPaymentDate.slice(0, 30) : '',
        installmentCount:
          balanceDue > 0 ? Math.max(1, Math.min(60, Number(form.installmentCount) || 1)) : 0,
        customerPhone: form.customerPhone.trim().slice(0, 40),
        debtReminderStatus:
          balanceDue > 0
            ? editingTx?.debtReminderStatus === 'Sent'
              ? 'Sent'
              : 'Pending'
            : 'None',
        paymentMethod:
          balanceDue > 0 ? 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)' : form.paymentMethod,
        referenceName: form.referenceName.trim().slice(0, 120),
        updatedAt: serverTimestamp(),
      };

      if (editingTx) {
        await updateDoc(doc(db, 'transactions', editingTx.id), payload);
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...payload,
          ownerId: uid,
          createdAt: serverTimestamp(),
        });
      }
      setShowModal(false);
      setEditingTx(null);
    } catch (err) {
      handleFirestoreError(
        err,
        editingTx ? OperationType.UPDATE : OperationType.CREATE,
        'transactions'
      );
    }
  };

  const handleSettleInstallment = async (tx: Transaction) => {
    if (!canModify) return;
    const currentPaid = Number(tx.paidAmountLak || 0);
    const currentBalance = Number(tx.balanceDueLak || 0);
    const remainingInstallments = Math.max(1, Number(tx.installmentCount || 1));
    const installmentPayment = Math.ceil(currentBalance / remainingInstallments);
    const nextPaid = currentPaid + installmentPayment;
    const nextBalance = Math.max(0, currentBalance - installmentPayment);
    const nextCount = nextBalance > 0 ? Math.max(1, remainingInstallments - 1) : 0;

    try {
      await updateDoc(doc(db, 'transactions', tx.id), {
        paidAmountLak: nextPaid,
        balanceDueLak: nextBalance,
        installmentCount: nextCount,
        nextPaymentDate: nextBalance === 0 ? '' : tx.nextPaymentDate || '',
        debtReminderStatus: nextBalance === 0 ? 'None' : tx.debtReminderStatus || 'Pending',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${tx.id}`);
    }
  };

  const handleSendDebtReminder = async (tx: Transaction) => {
    if (!canModify) return;
    try {
      await updateDoc(doc(db, 'transactions', tx.id), {
        debtReminderStatus: 'Sent',
        updatedAt: serverTimestamp(),
      });
      setDebtReminderPreview({ ...tx, debtReminderStatus: 'Sent' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${tx.id}`);
    }
  };

  const handleExportCsv = async () => {
    const headers = [
      'Date',
      'Month',
      'Type',
      'Category',
      'Description',
      'Customer / Payee',
      'Phone',
      'Payment Method',
      'Gross Amount (LAK)',
      'Discount (LAK)',
      'Paid Amount (LAK)',
      'Balance Due (LAK)',
      'Installments Remaining',
      'Next Payment Due Date',
    ];

    const rows = filtered.map((tx) => [
      tx.txDate,
      tx.txMonth,
      tx.txType,
      tx.category,
      tx.description,
      tx.referenceName,
      tx.customerPhone || '',
      tx.paymentMethod,
      tx.amountLak,
      tx.discountLak ?? 0,
      tx.paidAmountLak ?? tx.amountLak,
      tx.balanceDueLak ?? 0,
      tx.installmentCount ?? 0,
      tx.nextPaymentDate || '',
    ]);

    await exportAndSaveCsvToFirebase({
      uid,
      fileName: `LK_Dental_Financials_${selectedMonth}.csv`,
      category: 'Financials',
      headers,
      rows,
      notes: `ລາຍງານບັນຊີລາຍຮັບ-ລາຍຈ່າຍປະຈຳເດືອນ ${selectedMonth} (${rows.length} ລາຍການ)`,
    });
  };

  const referenceOptions = Array.from(
    new Set([
      ...patients.map((p) => p.fullName),
      'Lao Dental Care Import',
      'Vientiane MedSupply Co.',
      'ໄຟຟ້ານະຄອນຫຼວງ / ນ້ຳປະປາ',
      'ແລັບທັນຕະກຳ ວຽງຈັນ (Vientiane Dental Lab)',
      'ຄ່າເຊົ່າອາຄານຄລີນິກ',
    ])
  ).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header & Month Filter */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-teal-700" />
            {t.financeTitle}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">{t.financeDesc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-slate-600">{t.selectMonth}:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-mono font-semibold text-slate-900 focus:outline-none"
            >
              {monthsAvailable.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            {lang === 'lo' ? 'ສົ່ງອອກໄຟລ໌ CSV (Export CSV)' : 'Export CSV'}
          </button>

          {canModify && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.newTransaction}
            </button>
          )}
        </div>
      </div>

      {/* 4 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.totalIncome} ({selectedMonth})
            </span>
            <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-xl font-bold font-mono tabular-nums text-emerald-700">
            {formatLak(totalCollectedIncome)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.totalExpense} ({selectedMonth})
            </span>
            <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-xl font-bold font-mono tabular-nums text-rose-700">
            {formatLak(totalExpense)}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.netProfit} ({selectedMonth})
            </span>
            <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-xs font-mono font-semibold">
              NET
            </span>
          </div>
          <div
            className={`mt-3 text-xl font-bold font-mono tabular-nums ${
              netProfit >= 0 ? 'text-slate-900' : 'text-rose-700'
            }`}
          >
            {formatLak(netProfit)}
          </div>
        </div>

        <div className="bg-amber-50/70 rounded-xl border border-amber-300/80 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              {t.totalReceivables}
            </span>
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-xl font-bold font-mono tabular-nums text-amber-900">
            {formatLak(totalOutstandingDebt)}
          </div>
          <p className="text-[11px] text-amber-800 mt-1">
            {lang === 'lo'
              ? 'ລວມຍອດລູກຄ້າຕິດໜີ້ / ຜ່ອນຈ່າຍທີ່ຍັງຄ້າງຊຳລະ'
              : 'Total unpaid customer installment balances'}
          </p>
        </div>
      </div>

      {/* Debt Reminder Message Preview Banner */}
      {debtReminderPreview && (
        <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
              <MessageSquare className="w-4 h-4" />
              {lang === 'lo'
                ? 'ສົ່ງຂໍ້ຄວາມແຈ້ງເຕືອນລູກຄ້າຊຳລະໜີ້ຄ້າງຈ່າຍສຳເລັດ (WhatsApp / SMS)'
                : 'Customer Debt Payment Reminder Dispatched'}
            </div>
            <p className="text-sm text-slate-900 font-medium">
              “ສະບາຍດີ ທ່ານ <span className="font-bold">{debtReminderPreview.referenceName}</span>,
              ຈາກ ຄລີນິກແຂ້ວ LK Smile ຂໍແຈ້ງເຕືອນຍອດຄ້າງຊຳລະຄ່າປິ່ນປົວ ({debtReminderPreview.category})
              ຈຳນວນ{' '}
              <span className="font-mono font-bold text-rose-700">
                {formatLak(debtReminderPreview.balanceDueLak || 0)}
              </span>{' '}
              (ຍັງເຫຼືອ {debtReminderPreview.installmentCount || 1} ງວດ) ກຳນົດຊຳລະວັນທີ{' '}
              <span className="font-mono font-bold">
                {debtReminderPreview.nextPaymentDate || 'ຕາມກຳນົດ'}
              </span>
              . ຂໍຂອບໃຈ!”
            </p>
          </div>
          <button
            onClick={() => setDebtReminderPreview(null)}
            className="text-xs font-semibold text-amber-900 hover:underline self-end sm:self-center cursor-pointer"
          >
            ປິດ / Dismiss
          </button>
        </div>
      )}

      {/* Filter & Detailed Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-1.5">
            {(['All', 'Income', 'Expense', 'Credit'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTypeFilter(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  typeFilter === tf
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tf === 'All'
                  ? t.allFilter
                  : tf === 'Income'
                  ? t.income
                  : tf === 'Expense'
                  ? t.expense
                  : lang === 'lo'
                  ? 'ລາຍການຕິດໜີ້ / ຄ້າງຈ່າຍ'
                  : 'Unpaid / Credit Only'}
              </button>
            ))}
          </div>
          <span className="text-xs font-mono text-slate-500">
            {filtered.length} {lang === 'lo' ? 'ລາຍການ (ຄລິກແຖວເພື່ອແກ້ໄຂ)' : 'transactions'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-3">{t.date}</th>
                <th className="py-3.5 px-3">{t.category}</th>
                <th className="py-3.5 px-3">{t.referenceName}</th>
                <th className="py-3.5 px-3">{t.paymentMethod}</th>
                <th className="py-3.5 px-3 text-right">
                  {lang === 'lo' ? 'ຍອດລວມ / ສ່ວນຫຼຸດ' : 'Gross / Discount'}
                </th>
                <th className="py-3.5 px-3 text-right">{t.paidAmountLak}</th>
                <th className="py-3.5 px-3 text-right">{t.balanceDueLak}</th>
                <th className="py-3.5 px-3">
                  {lang === 'lo' ? 'ວັນຊຳລະຕໍ່ໄປ / ງວດ' : 'Next Due / Installments'}
                </th>
                <th className="py-3.5 px-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm">
              {filtered.map((tx) => {
                const hasDebt = (tx.balanceDueLak || 0) > 0;
                return (
                  <tr
                    key={tx.id}
                    onClick={() => {
                      if (isAdmin) openEditModal(tx);
                    }}
                    className={`transition-colors ${
                      isAdmin ? 'cursor-pointer' : ''
                    } ${hasDebt ? 'bg-amber-50/30 hover:bg-amber-50/60' : 'hover:bg-slate-50/80'}`}
                  >
                    <td className="py-3.5 px-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                      {tx.txDate}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          tx.txType === 'Income'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {tx.category}
                      </span>
                      <div className="text-xs text-slate-600 mt-1">{tx.description}</div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-semibold text-slate-900">{tx.referenceName}</div>
                      {tx.customerPhone && (
                        <div className="text-xs font-mono text-slate-500">{tx.customerPhone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`text-xs font-mono px-2 py-1 rounded border ${
                          hasDebt
                            ? 'bg-amber-100/80 text-amber-900 border-amber-300 font-semibold'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="text-slate-800 font-semibold">{formatLak(tx.amountLak)}</div>
                      {(tx.discountLak || 0) > 0 && (
                        <div className="text-xs text-amber-700">
                          -{formatLak(tx.discountLak || 0)} (ສ່ວນຫຼຸດ)
                        </div>
                      )}
                    </td>
                    <td
                      className={`py-3.5 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${
                        tx.txType === 'Income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.txType === 'Income' ? '+' : '-'}
                      {formatLak(
                        tx.paidAmountLak !== undefined
                          ? tx.paidAmountLak
                          : Number(tx.amountLak || 0) - Number(tx.discountLak || 0)
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {hasDebt ? (
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                          {formatLak(tx.balanceDueLak || 0)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0 ກີບ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {hasDebt ? (
                        <div className="text-xs">
                          <div className="font-mono font-bold text-amber-900">
                            📅 {tx.nextPaymentDate || 'ບໍ່ລະບຸ'}
                          </div>
                          <div className="text-slate-600">
                            ເຫຼືອ <span className="font-mono font-bold">{tx.installmentCount || 1}</span> ງວດ
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-700 font-medium inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ຊຳລະຄົບແລ້ວ
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {isAdmin && (
                          <button
                            onClick={() => openEditModal(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                            title={lang === 'lo' ? 'ແກ້ໄຂລາຍການ' : 'Edit Transaction'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {lang === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}
                          </button>
                        )}
                        {hasDebt && canModify && (
                          <>
                            <button
                              onClick={() => handleSendDebtReminder(tx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold transition-colors cursor-pointer"
                              title={t.sendDebtReminder}
                            >
                              <Send className="w-3 h-3" />
                              {tx.debtReminderStatus === 'Sent'
                                ? lang === 'lo'
                                  ? 'ແຈ້ງເຕືອນອີກ'
                                  : 'Resend'
                                : t.sendDebtReminder}
                            </button>
                            <button
                              onClick={() => handleSettleInstallment(tx)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              + ຮັບຊຳລະງວດ
                            </button>
                          </>
                        )}
                        {canModify && (
                          <button
                            onClick={() =>
                              onConfirmDelete(
                                'transactions',
                                tx.id,
                                `${tx.category} (${formatLak(tx.amountLak)})`
                              )
                            }
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-sm text-slate-500">
                    {lang === 'lo'
                      ? 'ບໍ່ມີລາຍການທຸລະກຳໃນເດືອນທີ່ເລືອກ'
                      : 'No transactions recorded for this month.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingTx
                  ? lang === 'lo'
                    ? 'ແກ້ໄຂລາຍການລາຍຮັບ / ລາຍຈ່າຍ (Edit Transaction)'
                    : 'Edit Financial Transaction'
                  : t.newTransaction}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTx(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.txType}
                  </label>
                  <select
                    value={form.txType}
                    onChange={(e) => {
                      const nextType = e.target.value as Transaction['txType'];
                      setForm({
                        ...form,
                        txType: nextType,
                        category:
                          nextType === 'Income'
                            ? INCOME_CATEGORIES_LAO[0]
                            : EXPENSE_CATEGORIES_LAO[0],
                        description:
                          nextType === 'Income'
                            ? INCOME_DESCRIPTIONS_LAO[0]
                            : EXPENSE_DESCRIPTIONS_LAO[0],
                        paymentMethod:
                          nextType === 'Expense' &&
                          form.paymentMethod === 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)'
                            ? 'BCEL OnePay'
                            : form.paymentMethod,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="Income">{t.income}</option>
                    <option value="Expense">{t.expense}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.date}
                  </label>
                  <input
                    required
                    type="date"
                    value={form.txDate}
                    onChange={(e) => setForm({ ...form, txDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>

                {/* Creatable Category Dropdown */}
                <div className="sm:col-span-2">
                  <CreatableSelect
                    label={`${t.category} (${
                      form.txType === 'Income' ? 'ໝວດໝູ່ລາຍຮັບ' : 'ໝວດໝູ່ລາຍຈ່າຍ'
                    })`}
                    value={form.category}
                    options={
                      form.txType === 'Income' ? INCOME_CATEGORIES_LAO : EXPENSE_CATEGORIES_LAO
                    }
                    onChange={(val) => setForm({ ...form, category: val })}
                    placeholder="ພິມໝວດໝູ່ລາຍຮັບ/ລາຍຈ່າຍເພີ່ມເຕີມ..."
                    required
                  />
                </div>

                <div>
                  <CreatableSelect
                    label={t.referenceName}
                    value={form.referenceName}
                    options={referenceOptions}
                    onChange={(selectedRef) => {
                      const matchedPatient = patients.find((p) => p.fullName === selectedRef);
                      setForm({
                        ...form,
                        referenceName: selectedRef,
                        customerPhone: matchedPatient ? matchedPatient.phone : form.customerPhone,
                      });
                    }}
                    placeholder="ພິມຊື່ລູກຄ້າ ຫຼື ບໍລິສັດຜູ້ຮັບເງິນ..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.phone} ({lang === 'lo' ? 'ສຳລັບສົ່ງແຈ້ງເຕືອນໜີ້' : 'For Debt SMS'})
                  </label>
                  <input
                    type="text"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="+856 20 ..."
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.paymentMethod}
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => {
                      const method = e.target.value as Transaction['paymentMethod'];
                      const net = Math.max(
                        0,
                        Number(form.amountLak || 0) - Number(form.discountLak || 0)
                      );
                      setForm({
                        ...form,
                        paymentMethod: method,
                        paidAmountLak:
                          method === 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)'
                            ? Math.round(net * 0.3)
                            : net,
                        installmentCount:
                          method === 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)'
                            ? Math.max(1, form.installmentCount || 3)
                            : 0,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 font-semibold"
                  >
                    <option value="BCEL OnePay">BCEL OnePay</option>
                    <option value="Cash">ເງິນສົດ (Cash)</option>
                    <option value="Bank Transfer">ໂອນຜ່ານທະນາຄານ (Bank Transfer)</option>
                    <option value="Card">ບັດເຄຣດິດ (Card)</option>
                    {form.txType === 'Income' && (
                      <option value="ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)">
                        ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit / Installments)
                      </option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.amountLak}
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={10000}
                    value={form.amountLak}
                    onChange={(e) => {
                      const gross = Number(e.target.value) || 0;
                      const net = Math.max(0, gross - Number(form.discountLak || 0));
                      setForm({
                        ...form,
                        amountLak: gross,
                        paidAmountLak:
                          form.paymentMethod === 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)'
                            ? Math.min(net, form.paidAmountLak)
                            : net,
                      });
                    }}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>

                {/* Income Specific Fields: Discount, Paid Amount, Balance Due, Next Payment Date, Installment Count */}
                {form.txType === 'Income' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.discountLak}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={form.discountLak}
                        onChange={(e) => {
                          const disc = Number(e.target.value) || 0;
                          const net = Math.max(0, Number(form.amountLak || 0) - disc);
                          setForm({
                            ...form,
                            discountLak: disc,
                            paidAmountLak:
                              form.paymentMethod === 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)'
                                ? Math.min(net, form.paidAmountLak)
                                : net,
                          });
                        }}
                        className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-emerald-800 mb-1">
                        {t.paidAmountLak}
                      </label>
                      <input
                        required
                        type="number"
                        min={0}
                        max={netAfterDiscount}
                        step={10000}
                        value={form.paidAmountLak}
                        onChange={(e) => {
                          const paid = Number(e.target.value) || 0;
                          const balance = Math.max(0, netAfterDiscount - paid);
                          setForm({
                            ...form,
                            paidAmountLak: paid,
                            paymentMethod:
                              balance > 0 ? 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)' : form.paymentMethod,
                            installmentCount:
                              balance > 0 ? Math.max(1, form.installmentCount || 3) : 0,
                          });
                        }}
                        className="w-full px-3 py-2 text-sm font-mono font-bold text-emerald-800 bg-emerald-50/50 rounded-lg border border-emerald-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-rose-800 mb-1">
                        {t.balanceDueLak}
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={formatLak(calculatedBalanceDue)}
                        className="w-full px-3 py-2 text-sm font-mono font-bold text-rose-700 bg-rose-50/60 rounded-lg border border-rose-200"
                      />
                    </div>

                    {calculatedBalanceDue > 0 && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 mb-1">
                            {t.nextPaymentDate}
                          </label>
                          <input
                            required
                            type="date"
                            value={form.nextPaymentDate}
                            onChange={(e) =>
                              setForm({ ...form, nextPaymentDate: e.target.value })
                            }
                            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-amber-400 bg-amber-50/40"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-amber-900 mb-1">
                            {t.installmentCount}
                          </label>
                          <input
                            required
                            type="number"
                            min={1}
                            max={60}
                            value={form.installmentCount || 1}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                installmentCount: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-amber-400 bg-amber-50/40"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}

                <div className="sm:col-span-2">
                  <CreatableSelect
                    label={t.description}
                    value={form.description}
                    options={
                      form.txType === 'Income'
                        ? INCOME_DESCRIPTIONS_LAO
                        : EXPENSE_DESCRIPTIONS_LAO
                    }
                    onChange={(val) => setForm({ ...form, description: val })}
                    placeholder="ພິມລາຍລະອຽດລາຍການ..."
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTx(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer"
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
