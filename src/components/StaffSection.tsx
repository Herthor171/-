import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  Banknote,
  CheckCircle2,
  FileSpreadsheet,
  Lock,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatLak, translations } from '../i18n';
import {
  Lang,
  STAFF_ROLES_LAO,
  STAFF_SHIFTS_LAO,
  STAFF_SPECIALTIES_LAO,
  StaffMember,
  UserRole,
} from '../types';
import { CreatableSelect } from './CreatableSelect';
import { exportAndSaveCsvToFirebase } from '../utils/firebaseFileStorage';

interface Props {
  lang: Lang;
  uid: string;
  role: UserRole;
  staff: StaffMember[];
  onConfirmDelete: (collectionName: string, docId: string, label: string) => void;
}

export const StaffSection: React.FC<Props> = ({
  lang,
  uid,
  role,
  staff,
  onConfirmDelete,
}) => {
  const t = translations[lang];
  const [showModal, setShowModal] = useState(false);
  const [editingStaffProfile, setEditingStaffProfile] = useState<StaffMember | null>(null);
  const [editingPayrollStaff, setEditingPayrollStaff] = useState<StaffMember | null>(null);
  const [payrollEditForm, setPayrollEditForm] = useState({
    baseSalaryLak: 0,
    salaryAdvanceLak: 0,
    bonusLak: 0,
    commissionLak: 0,
  });

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: STAFF_ROLES_LAO[1],
    specialty: STAFF_SPECIALTIES_LAO[1],
    shiftSchedule: STAFF_SHIFTS_LAO[0],
    baseSalaryLak: 8500000,
    salaryAdvanceLak: 0,
    bonusLak: 0,
    commissionLak: 0,
    activeStatus: 'Active' as StaffMember['activeStatus'],
  });

  const isAdmin = role === 'Admin';
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Isolated Payroll Totals (Strictly separated from General Income & Expense)
  const totalBasePayroll = staff.reduce((acc, s) => acc + Number(s.baseSalaryLak || 0), 0);
  const totalAdvancesTaken = staff.reduce((acc, s) => acc + Number(s.salaryAdvanceLak || 0), 0);
  const totalBonusAndCommission = staff.reduce(
    (acc, s) => acc + Number(s.bonusLak || 0) + Number(s.commissionLak || 0),
    0
  );
  const totalNetMonthEndPayout = staff.reduce((acc, s) => {
    const net =
      Number(s.baseSalaryLak || 0) +
      Number(s.bonusLak || 0) +
      Number(s.commissionLak || 0) -
      Number(s.salaryAdvanceLak || 0);
    return acc + Math.max(0, net);
  }, 0);

  const openCreateModal = () => {
    setEditingStaffProfile(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      role: STAFF_ROLES_LAO[1],
      specialty: STAFF_SPECIALTIES_LAO[1],
      shiftSchedule: STAFF_SHIFTS_LAO[0],
      baseSalaryLak: 8500000,
      salaryAdvanceLak: 0,
      bonusLak: 0,
      commissionLak: 0,
      activeStatus: 'Active',
    });
    setShowModal(true);
  };

  const openEditProfileModal = (member: StaffMember) => {
    setEditingStaffProfile(member);
    setForm({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      role: member.role,
      specialty: member.specialty,
      shiftSchedule: member.shiftSchedule,
      baseSalaryLak: Number(member.baseSalaryLak || 0),
      salaryAdvanceLak: Number(member.salaryAdvanceLak || 0),
      bonusLak: Number(member.bonusLak || 0),
      commissionLak: Number(member.commissionLak || 0),
      activeStatus: member.activeStatus,
    });
    setShowModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const payload = {
        fullName: form.fullName.trim().slice(0, 120),
        email: form.email.trim().slice(0, 120),
        phone: form.phone.trim().slice(0, 40),
        role: form.role.trim().slice(0, 120),
        specialty: form.specialty.trim().slice(0, 120),
        shiftSchedule: form.shiftSchedule.trim().slice(0, 120),
        baseSalaryLak: Math.max(0, Number(form.baseSalaryLak) || 0),
        salaryAdvanceLak: Math.max(0, Number(form.salaryAdvanceLak) || 0),
        bonusLak: Math.max(0, Number(form.bonusLak) || 0),
        commissionLak: Math.max(0, Number(form.commissionLak) || 0),
        activeStatus: form.activeStatus,
        updatedAt: serverTimestamp(),
      };

      if (editingStaffProfile) {
        await updateDoc(doc(db, 'staff', editingStaffProfile.id), payload);
      } else {
        await addDoc(collection(db, 'staff'), {
          ...payload,
          lastPaidMonth: '',
          ownerId: uid,
          createdAt: serverTimestamp(),
        });
      }
      setShowModal(false);
      setEditingStaffProfile(null);
    } catch (err) {
      handleFirestoreError(
        err,
        editingStaffProfile ? OperationType.UPDATE : OperationType.CREATE,
        'staff'
      );
    }
  };

  const handleChangeRole = async (member: StaffMember, nextRole: string) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'staff', member.id), {
        role: nextRole.trim().slice(0, 120),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `staff/${member.id}`);
    }
  };

  const openPayrollEditor = (member: StaffMember) => {
    setEditingPayrollStaff(member);
    setPayrollEditForm({
      baseSalaryLak: Number(member.baseSalaryLak || 0),
      salaryAdvanceLak: Number(member.salaryAdvanceLak || 0),
      bonusLak: Number(member.bonusLak || 0),
      commissionLak: Number(member.commissionLak || 0),
    });
  };

  const handleSavePayrollAdjustments = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !editingPayrollStaff) return;
    try {
      await updateDoc(doc(db, 'staff', editingPayrollStaff.id), {
        baseSalaryLak: Math.max(0, Number(payrollEditForm.baseSalaryLak) || 0),
        salaryAdvanceLak: Math.max(0, Number(payrollEditForm.salaryAdvanceLak) || 0),
        bonusLak: Math.max(0, Number(payrollEditForm.bonusLak) || 0),
        commissionLak: Math.max(0, Number(payrollEditForm.commissionLak) || 0),
        updatedAt: serverTimestamp(),
      });
      setEditingPayrollStaff(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `staff/${editingPayrollStaff.id}`);
    }
  };

  const handleSettleMonthEndSalary = async (member: StaffMember) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'staff', member.id), {
        salaryAdvanceLak: 0,
        bonusLak: 0,
        commissionLak: 0,
        lastPaidMonth: currentMonth,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `staff/${member.id}`);
    }
  };

  const allRoleOptions = Array.from(
    new Set([
      ...STAFF_ROLES_LAO,
      'Admin',
      'Dentist',
      'Receptionist',
      'Assistant',
      ...staff.map((s) => s.role),
    ])
  ).filter(Boolean);

  const handleExportPayrollCsv = async () => {
    const headers = [
      'Full Name',
      'Position / Role',
      'Specialty',
      'Phone',
      'Email',
      'Shift Schedule',
      'Base Salary (LAK)',
      'Salary Advance (LAK)',
      'Bonus (LAK)',
      'Commission (LAK)',
      'Net Payable Salary (LAK)',
      'Last Paid Month',
      'Status',
    ];
    const rows = staff.map((s) => {
      const base = Number(s.baseSalaryLak || 0);
      const advance = Number(s.salaryAdvanceLak || 0);
      const bonus = Number(s.bonusLak || 0);
      const commission = Number(s.commissionLak || 0);
      const netPayable = Math.max(0, base + bonus + commission - advance);
      return [
        s.fullName,
        s.role,
        s.specialty,
        s.phone,
        s.email || '',
        s.shiftSchedule,
        base,
        advance,
        bonus,
        commission,
        netPayable,
        s.lastPaidMonth || '',
        s.activeStatus,
      ];
    });
    await exportAndSaveCsvToFirebase({
      uid,
      fileName: `LK_Dental_Staff_Payroll_${currentMonth}.csv`,
      category: 'Payroll',
      headers,
      rows,
      notes: `ຕາຕະລາງເງິນເດືອນພະນັກງານປະຈຳເດືອນ ${currentMonth} (${rows.length} ຄົນ)`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold mb-1.5">
            <Banknote className="w-3.5 h-3.5" />
            {lang === 'lo'
              ? 'ບັນຊີເງິນເດືອນແຍກຂາດຕົວຈາກລາຍຮັບ-ລາຍຈ່າຍທົ່ວໄປ (Isolated Payroll System)'
              : 'Isolated Staff Payroll System'}
          </div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-700" />
            {t.staffTitle}
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">{t.staffDesc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportPayrollCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            {lang === 'lo' ? 'ດາວໂຫຼດໄຟລ໌ເງິນເດືອນ (CSV)' : 'Download Payroll (CSV)'}
          </button>

          {isAdmin ? (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.newStaff}
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              {t.rbacRestrictedMsg}
            </div>
          )}
        </div>
      </div>

      {/* 4 Dedicated Payroll Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t.baseSalaryLak}
          </span>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-slate-900">
            {formatLak(totalBasePayroll)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {lang === 'lo' ? 'ລວມເງິນເດືອນພື້ນຖານທັງໝົດ' : 'Total monthly base salaries'}
          </p>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-300 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
            {t.salaryAdvanceLak}
          </span>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-amber-800">
            -{formatLak(totalAdvancesTaken)}
          </div>
          <p className="text-[11px] text-amber-800 mt-1">
            {lang === 'lo'
              ? 'ຍອດເບີກລ່ວງໜ້າ (ຈະຖືກຫັກລົບອັດຕະໂນມັດທ້າຍເດືອນ)'
              : 'Advances to be auto-deducted at month-end'}
          </p>
        </div>

        <div className="bg-emerald-50 rounded-xl border border-emerald-300 p-5 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
            Bonus + Commission
          </span>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-emerald-700">
            +{formatLak(totalBonusAndCommission)}
          </div>
          <p className="text-[11px] text-emerald-800 mt-1">
            {lang === 'lo'
              ? 'ລວມເງິນໂບນັດ ແລະ ຄ່າຄອມມິດຊັນພະນັກງານ'
              : 'Total staff bonuses & clinical commissions'}
          </p>
        </div>

        <div className="bg-teal-900 text-white rounded-xl p-5 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-200">
            {t.netPayableSalary}
          </span>
          <div className="mt-2 text-xl font-bold font-mono tabular-nums text-white">
            {formatLak(totalNetMonthEndPayout)}
          </div>
          <p className="text-[11px] text-teal-200 mt-1">
            {lang === 'lo'
              ? 'ເງິນເດືອນພື້ນຖານ + Bonus + Commission - ເບີກລ່ວງໜ້າ'
              : 'Base + Bonus + Commission - Salary Advance'}
          </p>
        </div>
      </div>

      {/* Staff Payroll & Advance Deduction Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs font-bold text-slate-700">
            {lang === 'lo'
              ? 'ຕາຕະລາງຄຳນວນເງິນເດືອນພະນັກງານ, ເບີກລ່ວງໜ້າ, Bonus & Commission (ຄລິກແຖວເພື່ອແກ້ໄຂຂໍ້ມູນພະນັກງານ)'
              : 'Staff Payroll, Advances, Bonus & Commission Schedule'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-3">ຊື່ພະນັກງານ / ຄວາມຊ່ຽວຊານ</th>
                <th className="py-3.5 px-3">{t.role}</th>
                <th className="py-3.5 px-3 text-right">{t.baseSalaryLak}</th>
                <th className="py-3.5 px-3 text-right">{t.salaryAdvanceLak}</th>
                <th className="py-3.5 px-3 text-right">{t.bonusLak}</th>
                <th className="py-3.5 px-3 text-right">{t.commissionLak}</th>
                <th className="py-3.5 px-3 text-right">{t.netPayableSalary}</th>
                <th className="py-3.5 px-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm">
              {staff.map((member) => {
                const base = Number(member.baseSalaryLak || 0);
                const advance = Number(member.salaryAdvanceLak || 0);
                const bonus = Number(member.bonusLak || 0);
                const commission = Number(member.commissionLak || 0);
                const netPayable = Math.max(0, base + bonus + commission - advance);
                const isPaidThisMonth = member.lastPaidMonth === currentMonth;

                return (
                  <tr
                    key={member.id}
                    onClick={() => {
                      if (isAdmin) openEditProfileModal(member);
                    }}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isAdmin ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-slate-900">{member.fullName}</div>
                      <div className="text-xs text-slate-600">{member.specialty}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {member.phone} · {member.shiftSchedule}
                      </div>
                    </td>
                    <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <select
                          value={member.role}
                          onChange={(e) => {
                            if (e.target.value === '__EDIT_CUSTOM__') {
                              openEditProfileModal(member);
                            } else {
                              handleChangeRole(member, e.target.value);
                            }
                          }}
                          className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                        >
                          {allRoleOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                          <option value="__EDIT_CUSTOM__">+ ພິມຕຳແໜ່ງເອງ...</option>
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                      {formatLak(base)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      {advance > 0 ? (
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          -{formatLak(advance)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0 ກີບ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap text-emerald-700 font-medium">
                      +{formatLak(bonus)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums whitespace-nowrap text-emerald-700 font-medium">
                      +{formatLak(commission)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                      <span className="text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                        {formatLak(netPayable)}
                      </span>
                      {isPaidThisMonth && (
                        <div className="text-[11px] text-emerald-700 font-sans font-semibold mt-1 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ຈ່າຍເດືອນ {currentMonth} ແລ້ວ
                        </div>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isAdmin && (
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditProfileModal(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                            title={lang === 'lo' ? 'ແກ້ໄຂຂໍ້ມູນພະນັກງານ' : 'Edit Profile'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            {lang === 'lo' ? 'ແກ້ໄຂ' : 'Edit'}
                          </button>
                          <button
                            onClick={() => openPayrollEditor(member)}
                            className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            {lang === 'lo'
                              ? 'ເບີກລ່ວງໜ້າ / Bonus'
                              : 'Advance / Bonus'}
                          </button>
                          <button
                            onClick={() => handleSettleMonthEndSalary(member)}
                            className="px-2.5 py-1 rounded-md bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors cursor-pointer"
                            title={t.settlePayrollBtn}
                          >
                            {lang === 'lo' ? 'ຈ່າຍເງິນເດືອນ (ຫັກລົບ)' : 'Pay & Deduct'}
                          </button>
                          <button
                            onClick={() =>
                              onConfirmDelete('staff', member.id, member.fullName)
                            }
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Permissions Matrix */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-700" />
          <h3 className="text-sm font-bold text-slate-900">{t.rbacMatrixTitle}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2.5 px-3">ຟັງຊັນການໃຊ້ງານ (Clinic Module)</th>
                <th className="py-2.5 px-3 text-center">Admin (ຜູ້ບໍລິຫານ)</th>
                <th className="py-2.5 px-3 text-center">Dentist (ທັນຕະແພດ)</th>
                <th className="py-2.5 px-3 text-center">Receptionist (ຕ້ອນຮັບ)</th>
                <th className="py-2.5 px-3 text-center">Assistant (ຜູ້ຊ່ວຍ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-medium">
                  ຕາຕະລາງນັດໝາຍ & ແຈ້ງເຕືອນອັດຕະໂນມັດ (Scheduling & Reminders)
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                  Full + Edit
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                  Read / Update
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                  Full Access
                </td>
                <td className="py-2.5 px-3 text-center text-slate-500">Read Only</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">
                  ປະຫວັດຄົນເຈັບ & ແຜນຜັງແຂ້ວ 32 ເຫຼັ້ມ (Patient EHR & Odontogram)
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                  Full + Edit
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                  Full Clinical Write
                </td>
                <td className="py-2.5 px-3 text-center text-teal-700">Register Patient</td>
                <td className="py-2.5 px-3 text-center text-slate-500">Read Clinical</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">
                  ສາງອຸປະກອນ & ຍອດຍົກມາ (Inventory & Carried-Forward)
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                  Full + Edit + CSV
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                  Restock / Adjust
                </td>
                <td className="py-2.5 px-3 text-center text-slate-500">View Alerts</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                  Restock / Adjust
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">
                  ລາຍຮັບ-ລາຍຈ່າຍທົ່ວໄປ & ລະບົບຕິດໜີ້ຜ່ອນຈ່າຍ (Finance & Installments)
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                  Full + Edit + CSV
                </td>
                <td className="py-2.5 px-3 text-center text-slate-500">View Summary</td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">
                  Log Billing & Debt SMS
                </td>
                <td className="py-2.5 px-3 text-center text-rose-600">Restricted</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium">
                  ລະບົບເງິນເດືອນແຍກຂາດ, ເບີກລ່ວງໜ້າ, Bonus & Commission
                </td>
                <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                  Admin Exclusive
                </td>
                <td className="py-2.5 px-3 text-center text-rose-600">Restricted</td>
                <td className="py-2.5 px-3 text-center text-rose-600">Restricted</td>
                <td className="py-2.5 px-3 text-center text-rose-600">Restricted</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Editing Salary Advance, Bonus, and Commission */}
      {editingPayrollStaff && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {lang === 'lo'
                    ? 'ບັນທຶກເບີກເງິນເດືອນລ່ວງໜ້າ / Bonus / Commission'
                    : 'Update Advance, Bonus & Commission'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingPayrollStaff.fullName}</p>
              </div>
              <button
                onClick={() => setEditingPayrollStaff(null)}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayrollAdjustments} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.baseSalaryLak}
                </label>
                <input
                  type="number"
                  min={0}
                  step={100000}
                  value={payrollEditForm.baseSalaryLak}
                  onChange={(e) =>
                    setPayrollEditForm({
                      ...payrollEditForm,
                      baseSalaryLak: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  {t.salaryAdvanceLak} (ຈະຖືກຫັກລົບອັດຕະໂນມັດເມື່ອຈ່າຍເງິນເດືອນທ້າຍເດືອນ)
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={payrollEditForm.salaryAdvanceLak}
                  onChange={(e) =>
                    setPayrollEditForm({
                      ...payrollEditForm,
                      salaryAdvanceLak: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono font-bold text-amber-900 bg-amber-50/60 rounded-lg border border-amber-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  {t.bonusLak}
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={payrollEditForm.bonusLak}
                  onChange={(e) =>
                    setPayrollEditForm({
                      ...payrollEditForm,
                      bonusLak: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono text-emerald-800 bg-emerald-50/40 rounded-lg border border-emerald-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  {t.commissionLak}
                </label>
                <input
                  type="number"
                  min={0}
                  step={50000}
                  value={payrollEditForm.commissionLak}
                  onChange={(e) =>
                    setPayrollEditForm({
                      ...payrollEditForm,
                      commissionLak: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono text-emerald-800 bg-emerald-50/40 rounded-lg border border-emerald-300"
                />
              </div>

              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
                <span className="text-xs font-bold text-teal-900">
                  {t.netPayableSalary}:
                </span>
                <span className="text-sm font-mono font-bold text-teal-900">
                  {formatLak(
                    Math.max(
                      0,
                      Number(payrollEditForm.baseSalaryLak || 0) +
                        Number(payrollEditForm.bonusLak || 0) +
                        Number(payrollEditForm.commissionLak || 0) -
                        Number(payrollEditForm.salaryAdvanceLak || 0)
                    )
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPayrollStaff(null)}
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

      {/* Add / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingStaffProfile
                  ? lang === 'lo'
                    ? 'ແກ້ໄຂຂໍ້ມູນພະນັກງານ & ຕຳແໜ່ງ (Edit Staff)'
                    : 'Edit Staff Member'
                  : t.newStaff}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingStaffProfile(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ຊື່ ແລະ ນາມສະກຸນ / Full Name
                  </label>
                  <input
                    required
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email ({lang === 'lo' ? 'ບໍ່ບັງຄັບ - ໃສ່ຕາມຫຼັງໄດ້' : 'Optional - can add later'})
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder={lang === 'lo' ? 'ປ່ອຍວ່າງໄວ້ກ່ອນໄດ້...' : 'Optional email...'}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.phone}
                  </label>
                  <input
                    required
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+856 20 ..."
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>

                {/* Staff Position / Role with CreatableSelect (Includes existing + ທັນຕະແພດ, ການຕະຫຼາດ, ບັນຊີ, ແມ່ບ້ານ, ຍາມ + Custom input) */}
                <div className="sm:col-span-2">
                  <CreatableSelect
                    label={`${t.role} (ເລືອກຕຳແໜ່ງ ຫຼື ພິມໃສ່ເອງ)`}
                    value={form.role}
                    options={allRoleOptions}
                    onChange={(val) => setForm({ ...form, role: val })}
                    placeholder="ພິມຕຳແໜ່ງພະນັກງານເພີ່ມເຕີມ..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.baseSalaryLak}
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    step={100000}
                    value={form.baseSalaryLak}
                    onChange={(e) =>
                      setForm({ ...form, baseSalaryLak: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-800 mb-1">
                    {t.salaryAdvanceLak}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={form.salaryAdvanceLak}
                    onChange={(e) =>
                      setForm({ ...form, salaryAdvanceLak: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-amber-300 bg-amber-50/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">
                    {t.bonusLak}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={form.bonusLak}
                    onChange={(e) =>
                      setForm({ ...form, bonusLak: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-emerald-300 bg-emerald-50/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-800 mb-1">
                    {t.commissionLak}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={50000}
                    value={form.commissionLak}
                    onChange={(e) =>
                      setForm({ ...form, commissionLak: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-emerald-300 bg-emerald-50/40"
                  />
                </div>

                <div className="sm:col-span-2">
                  <CreatableSelect
                    label={t.specialty}
                    value={form.specialty}
                    options={STAFF_SPECIALTIES_LAO}
                    onChange={(val) => setForm({ ...form, specialty: val })}
                    placeholder="ພິມຄວາມຊ່ຽວຊານສະເພາະທາງ..."
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <CreatableSelect
                    label={t.shiftSchedule}
                    value={form.shiftSchedule}
                    options={STAFF_SHIFTS_LAO}
                    onChange={(val) => setForm({ ...form, shiftSchedule: val })}
                    placeholder="ພິມຕາຕະລາງເວນເຮັດວຽກ..."
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingStaffProfile(null);
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
