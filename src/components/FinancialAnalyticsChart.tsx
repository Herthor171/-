import React from 'react';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { formatLak } from '../i18n';
import {
  EXPENSE_CATEGORIES_LAO,
  INCOME_CATEGORIES_LAO,
  Lang,
  Transaction,
} from '../types';

interface Props {
  lang: Lang;
  transactions: Transaction[];
}

export const FinancialAnalyticsChart: React.FC<Props> = ({ lang, transactions }) => {
  // 1. Aggregate total collected income vs expense vs outstanding credit
  const incomeList = transactions.filter((t) => t.txType === 'Income');
  const expenseList = transactions.filter((t) => t.txType === 'Expense');

  const totalCollectedIncome = incomeList.reduce(
    (sum, t) =>
      sum +
      Number(
        t.paidAmountLak !== undefined
          ? t.paidAmountLak
          : Number(t.amountLak || 0) - Number(t.discountLak || 0)
      ),
    0
  );

  const totalOutstandingCredit = incomeList.reduce(
    (sum, t) => sum + Number(t.balanceDueLak || 0),
    0
  );

  const totalExpense = expenseList.reduce((sum, t) => sum + Number(t.amountLak || 0), 0);

  // 2. Category Breakdown for Income
  const incomeByCategory = INCOME_CATEGORIES_LAO.map((cat) => {
    const matching = incomeList.filter((t) => t.category === cat);
    const paid = matching.reduce(
      (s, t) =>
        s +
        Number(
          t.paidAmountLak !== undefined
            ? t.paidAmountLak
            : Number(t.amountLak || 0) - Number(t.discountLak || 0)
        ),
      0
    );
    const due = matching.reduce((s, t) => s + Number(t.balanceDueLak || 0), 0);
    return { category: cat, paid, due, total: paid + due };
  }).filter((item) => item.total > 0);

  // Include any custom income categories not in the default list
  const customIncome = incomeList.filter((t) => !INCOME_CATEGORIES_LAO.includes(t.category));
  if (customIncome.length > 0) {
    const paid = customIncome.reduce(
      (s, t) =>
        s +
        Number(
          t.paidAmountLak !== undefined
            ? t.paidAmountLak
            : Number(t.amountLak || 0) - Number(t.discountLak || 0)
        ),
      0
    );
    const due = customIncome.reduce((s, t) => s + Number(t.balanceDueLak || 0), 0);
    incomeByCategory.push({ category: 'ລາຍຮັບອື່ນໆ / ທົ່ວໄປ', paid, due, total: paid + due });
  }

  // 3. Category Breakdown for Expenses
  const expenseByCategory = EXPENSE_CATEGORIES_LAO.map((cat) => {
    const matching = expenseList.filter((t) => t.category === cat);
    const total = matching.reduce((s, t) => s + Number(t.amountLak || 0), 0);
    return { category: cat, total };
  }).filter((item) => item.total > 0);

  const customExpense = expenseList.filter((t) => !EXPENSE_CATEGORIES_LAO.includes(t.category));
  if (customExpense.length > 0) {
    const total = customExpense.reduce((s, t) => s + Number(t.amountLak || 0), 0);
    expenseByCategory.push({ category: 'ລາຍຈ່າຍອື່ນໆ / ທົ່ວໄປ', total });
  }

  const maxBarValue = Math.max(
    1,
    totalCollectedIncome + totalOutstandingCredit,
    totalExpense
  );

  const maxIncomeCat = Math.max(1, ...incomeByCategory.map((i) => i.total));
  const maxExpenseCat = Math.max(1, ...expenseByCategory.map((e) => e.total));

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-teal-700" />
          <div>
            <h3 className="text-base font-bold text-slate-900">
              ກຣາບສະແດງຜົນລາຍຮັບ, ລາຍຈ່າຍ ແລະ ຍອດໜີ້ຄ້າງຈ່າຍລະອຽດ
            </h3>
            <p className="text-xs text-slate-500">
              ປຽບທຽບລາຍຮັບຈ່າຍຈິງ, ຍອດລູກຄ້າຕິດໜີ້/ຜ່ອນຈ່າຍ ແລະ ລາຍຈ່າຍທົ່ວໄປແຍກຕາມໝວດໝູ່ (ບໍ່ລວມເງິນເດືອນພະນັກງານ)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-3 h-3 rounded-xs bg-emerald-600 inline-block"></span>
            ລາຍຮັບຈ່າຍແລ້ວ
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block"></span>
            ຄ້າງຈ່າຍ (ຜ່ອນ/ຕິດໜີ້)
          </span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block"></span>
            ລາຍຈ່າຍທົ່ວໄປ
          </span>
        </div>
      </div>

      {/* Top Visual Comparison Bars */}
      <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              ລາຍຮັບລວມ (ຈ່າຍແລ້ວ + ຄ້າງຈ່າຍ)
            </span>
            <span className="font-mono font-bold text-slate-900">
              {formatLak(totalCollectedIncome + totalOutstandingCredit, lang)}
            </span>
          </div>
          <div className="w-full h-6 bg-slate-200 rounded-md overflow-hidden flex">
            <div
              style={{
                width: `${Math.round((totalCollectedIncome / maxBarValue) * 100)}%`,
              }}
              className="bg-emerald-600 h-full transition-all duration-300"
              title={`ຈ່າຍແລ້ວ: ${formatLak(totalCollectedIncome, lang)}`}
            />
            <div
              style={{
                width: `${Math.round((totalOutstandingCredit / maxBarValue) * 100)}%`,
              }}
              className="bg-amber-500 h-full transition-all duration-300"
              title={`ຄ້າງຈ່າຍ: ${formatLak(totalOutstandingCredit, lang)}`}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-600">
            <span>ຈ່າຍແລ້ວ: {formatLak(totalCollectedIncome, lang)}</span>
            <span>ຄ້າງຊຳລະ (Credit): {formatLak(totalOutstandingCredit, lang)}</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              ລາຍຈ່າຍທົ່ວໄປລວມ
            </span>
            <span className="font-mono font-bold text-rose-700">
              {formatLak(totalExpense, lang)}
            </span>
          </div>
          <div className="w-full h-6 bg-slate-200 rounded-md overflow-hidden flex">
            <div
              style={{
                width: `${Math.round((totalExpense / maxBarValue) * 100)}%`,
              }}
              className="bg-rose-600 h-full transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* Detailed Category Breakdown Charts (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Breakdown by Dental Treatment Category */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
            ລາຍລະອຽດລາຍຮັບແຍກຕາມໝວດໝູ່ການປິ່ນປົວ (Income Breakdown)
          </h4>
          {incomeByCategory.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">ຍັງບໍ່ມີຂໍ້ມູນລາຍຮັບ</p>
          ) : (
            <div className="space-y-3">
              {incomeByCategory.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.category}</span>
                    <span className="font-mono font-semibold text-emerald-800">
                      {formatLak(item.total, lang)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-sm overflow-hidden flex">
                    <div
                      style={{ width: `${Math.round((item.paid / maxIncomeCat) * 100)}%` }}
                      className="bg-emerald-600 h-full"
                    />
                    <div
                      style={{ width: `${Math.round((item.due / maxIncomeCat) * 100)}%` }}
                      className="bg-amber-500 h-full"
                    />
                  </div>
                  {item.due > 0 && (
                    <div className="text-[11px] font-mono text-amber-700">
                      ຈ່າຍແລ້ວ: {formatLak(item.paid, lang)} · ຄ້າງຈ່າຍ: {formatLak(item.due, lang)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense Breakdown by Category */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-2">
            ລາຍລະອຽດລາຍຈ່າຍແຍກຕາມໝວດໝູ່ (Expense Breakdown)
          </h4>
          {expenseByCategory.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">ຍັງບໍ່ມີຂໍ້ມູນລາຍຈ່າຍ</p>
          ) : (
            <div className="space-y-3">
              {expenseByCategory.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{item.category}</span>
                    <span className="font-mono font-semibold text-rose-700">
                      {formatLak(item.total, lang)}
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      style={{ width: `${Math.round((item.total / maxExpenseCat) * 100)}%` }}
                      className="bg-rose-600 h-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
