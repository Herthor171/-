/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  AlertTriangle,
  Bot,
  Calendar,
  Database,
  FileText,
  FolderOpen,
  Globe,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { ChatbotSection } from './components/ChatbotSection';
import { ClinicLogo } from './components/ClinicLogo';
import { EhrSection } from './components/EhrSection';
import { FinanceSection } from './components/FinanceSection';
import { FinancialAnalyticsChart } from './components/FinancialAnalyticsChart';
import { FirebaseFilesSection } from './components/FirebaseFilesSection';
import { InventorySection } from './components/InventorySection';
import { SchedulingSection } from './components/SchedulingSection';
import { StaffSection } from './components/StaffSection';
import {
  db,
  googleSignIn,
  handleFirestoreError,
  initAuth,
  logout,
  OperationType,
} from './firebase';
import { formatLak, translations } from './i18n';
import { seedInitialClinicData } from './seedData';
import {
  Appointment,
  ChatMessage,
  ClinicFile,
  EhrRecord,
  InventoryItem,
  Lang,
  Patient,
  StaffMember,
  Transaction,
  UserRole,
} from './types';

type ActiveTab =
  | 'overview'
  | 'scheduling'
  | 'ehr'
  | 'inventory'
  | 'finance'
  | 'staff'
  | 'files'
  | 'chatbot';

export default function App() {
  const [lang, setLang] = useState<Lang>('lo');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [role, setRole] = useState<UserRole>('Admin');

  // Firestore Live State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [ehrRecords, setEhrRecords] = useState<EhrRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [clinicFiles, setClinicFiles] = useState<ClinicFile[]>([]);

  // Delete Confirmation Modal State
  const [pendingDelete, setPendingDelete] = useState<{
    collectionName: string;
    docId: string;
    label: string;
  } | null>(null);

  const t = translations[lang];

  useEffect(() => {
    const unsub = initAuth(
      (u) => {
        setUser(u);
        setAuthReady(true);
      },
      () => {
        setUser(null);
        setAuthReady(true);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;

    const uid = user.uid;

    const unsubPatients = onSnapshot(
      query(collection(db, 'patients'), where('ownerId', '==', uid)),
      (snap) => {
        setPatients(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'patients')
    );

    const unsubAppointments = onSnapshot(
      query(collection(db, 'appointments'), where('ownerId', '==', uid)),
      (snap) => {
        setAppointments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'appointments')
    );

    const unsubEhr = onSnapshot(
      query(collection(db, 'ehr_records'), where('ownerId', '==', uid)),
      (snap) => {
        setEhrRecords(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'ehr_records')
    );

    const unsubInventory = onSnapshot(
      query(collection(db, 'inventory'), where('ownerId', '==', uid)),
      (snap) => {
        setInventory(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'inventory')
    );

    const unsubTransactions = onSnapshot(
      query(collection(db, 'transactions'), where('ownerId', '==', uid)),
      (snap) => {
        setTransactions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'transactions')
    );

    const unsubStaff = onSnapshot(
      query(collection(db, 'staff'), where('ownerId', '==', uid)),
      (snap) => {
        setStaff(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'staff')
    );

    const unsubChat = onSnapshot(
      query(collection(db, 'chat_messages'), where('ownerId', '==', uid)),
      (snap) => {
        setChatMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'chat_messages')
    );

    const unsubFiles = onSnapshot(
      query(collection(db, 'clinic_files'), where('ownerId', '==', uid)),
      (snap) => {
        setClinicFiles(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'clinic_files')
    );

    return () => {
      unsubPatients();
      unsubAppointments();
      unsubEhr();
      unsubInventory();
      unsubTransactions();
      unsubStaff();
      unsubChat();
      unsubFiles();
    };
  }, [authReady, user]);

  useEffect(() => {
    if (
      authReady &&
      user &&
      patients.length === 0 &&
      inventory.length === 0 &&
      transactions.length === 0 &&
      !isSeeding
    ) {
      const timer = setTimeout(async () => {
        if (patients.length === 0 && inventory.length === 0) {
          setIsSeeding(true);
          try {
            await seedInitialClinicData(user.uid);
          } finally {
            setIsSeeding(false);
          }
        }
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [authReady, user, patients.length, inventory.length, transactions.length]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleManualSeed = async () => {
    if (!user || isSeeding) return;
    setIsSeeding(true);
    try {
      await seedInitialClinicData(user.uid);
    } finally {
      setIsSeeding(false);
    }
  };

  const executeConfirmedDelete = async () => {
    if (!pendingDelete) return;
    const { collectionName, docId } = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteDoc(doc(db, collectionName, docId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
    }
  };

  // KPI Calculations
  const lowStockItems = inventory.filter((i) => i.quantity <= i.minThreshold);
  const pendingRemindersCount = appointments.filter((a) => a.reminderStatus !== 'Sent').length;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyIncome = transactions
    .filter((tx) => tx.txMonth === currentMonth && tx.txType === 'Income')
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
  const monthlyExpense = transactions
    .filter((tx) => tx.txMonth === currentMonth && tx.txType === 'Expense')
    .reduce((acc, tx) => acc + Number(tx.amountLak || 0), 0);
  const monthlyNetProfit = monthlyIncome - monthlyExpense;

  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: t.navDashboard,
      icon: LayoutDashboard,
      activeBg: 'bg-teal-700 text-white shadow-sm',
      inactiveText: 'text-teal-900 hover:bg-teal-50',
      iconColor: 'text-teal-700',
    },
    {
      id: 'scheduling' as ActiveTab,
      label: t.navScheduling,
      icon: Calendar,
      activeBg: 'bg-blue-700 text-white shadow-sm',
      inactiveText: 'text-blue-900 hover:bg-blue-50',
      iconColor: 'text-blue-700',
    },
    {
      id: 'ehr' as ActiveTab,
      label: t.navEhr,
      icon: FileText,
      activeBg: 'bg-indigo-700 text-white shadow-sm',
      inactiveText: 'text-indigo-900 hover:bg-indigo-50',
      iconColor: 'text-indigo-700',
    },
    {
      id: 'inventory' as ActiveTab,
      label: `${t.navInventory} (${lowStockItems.length})`,
      icon: Package,
      activeBg: 'bg-amber-600 text-white shadow-sm',
      inactiveText: 'text-amber-900 hover:bg-amber-50',
      iconColor: 'text-amber-600',
    },
    {
      id: 'finance' as ActiveTab,
      label: t.navFinance,
      icon: Wallet,
      activeBg: 'bg-emerald-700 text-white shadow-sm',
      inactiveText: 'text-emerald-900 hover:bg-emerald-50',
      iconColor: 'text-emerald-700',
    },
    {
      id: 'staff' as ActiveTab,
      label: t.navStaff,
      icon: Users,
      activeBg: 'bg-purple-700 text-white shadow-sm',
      inactiveText: 'text-purple-900 hover:bg-purple-50',
      iconColor: 'text-purple-700',
    },
    {
      id: 'files' as ActiveTab,
      label:
        lang === 'lo'
          ? `ໄຟລ໌ໃນ Firebase (${clinicFiles.length})`
          : `Firebase Files (${clinicFiles.length})`,
      icon: FolderOpen,
      activeBg: 'bg-rose-700 text-white shadow-sm',
      inactiveText: 'text-rose-900 hover:bg-rose-50',
      iconColor: 'text-rose-700',
    },
    {
      id: 'chatbot' as ActiveTab,
      label: lang === 'lo' ? 'ຜູ້ຊ່ວຍ AI (Gemini)' : 'AI Assistant',
      icon: Bot,
      activeBg: 'bg-cyan-700 text-white shadow-sm',
      inactiveText: 'text-cyan-900 hover:bg-cyan-50',
      iconColor: 'text-cyan-700',
    },
  ];

  // Unauthenticated Welcome & Official Google Sign-In Screen with Dark Green + Subtle Logo Watermark
  if (!user) {
    return (
      <div className="min-h-screen bg-[#022c22] relative overflow-hidden flex flex-col justify-between">
        {/* Subtle Non-Intrusive Clinic Logo Background Watermark */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 select-none overflow-hidden">
          <ClinicLogo className="w-[540px] h-[540px] opacity-[0.04]" />
        </div>

        {/* Top Bar with Bold Larger Function Links */}
        <header className="relative z-20 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur-md border-b border-emerald-900/20 shadow-sm">
          <a href="#top" className="flex items-center gap-3">
            <ClinicLogo className="w-10 h-10 shrink-0" />
            <span className="text-xl font-extrabold tracking-tight text-emerald-950">
              {t.brandTitle}
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-base font-extrabold">
            <span className="text-blue-800">{t.navScheduling}</span>
            <span className="text-indigo-800">{t.navEhr}</span>
            <span className="text-amber-800">{t.navInventory}</span>
            <span className="text-emerald-800">{t.navFinance}</span>
            <span className="text-purple-800">{t.navStaff}</span>
          </nav>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === 'lo' ? 'en' : 'lo')}
              className="px-4 py-2 text-sm font-extrabold text-emerald-950 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              {lang === 'lo' ? 'ພາສາລາວ / EN' : 'English / ລາວ'}
            </button>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 bg-white/95 backdrop-blur-md border border-emerald-800/30 rounded-2xl p-8 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <ClinicLogo className="w-16 h-16 shrink-0" />
              <div>
                <p className="text-xs font-extrabold text-teal-800 tracking-wide uppercase">
                  {t.brandSubtitle}
                </p>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mt-1">
                  {t.brandTitle}
                </h1>
              </div>
            </div>
            <p className="text-base text-slate-700 font-medium leading-relaxed">
              ລະບົບບໍລິຫານຄລີນິກທັນຕະກຳຄົບວົງຈອນ: ບັນທຶກຂໍ້ມູນ ແລະ ເກັບໄຟລ໌ທັງໝົດໄວ້ໃນ Firebase ໂດຍກົງ, ກຣາບສະແດງຜົນລາຍຮັບ-ລາຍຈ່າຍລະອຽດ, ລະບົບຕິດໜີ້/ຜ່ອນຈ່າຍ, ສາງອຸປະກອນ, ລະບົບເງິນເດືອນພະນັກງານແຍກຂາດຕົວ, ແລະ ຜູ້ຊ່ວຍ AI ອັດສະລິຍະ Gemini.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents font-bold">
                    {t.signInGoogle}
                  </span>
                  <span style={{ display: 'none' }}>Sign in with Google</span>
                </div>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white/95 backdrop-blur-md border border-emerald-800/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              <ClinicLogo className="w-9 h-9 shrink-0" />
              <h2 className="text-base font-extrabold text-slate-900">
                ຟັງຊັນຫຼັກຂອງຄລີນິກແຂ້ວ LK Smile
              </h2>
            </div>
            <ul className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <li>
                <strong className="text-emerald-900">1. ເກັບໄຟລ໌ທັງໝົດໄວ້ໃນ Firebase:</strong>{' '}
                ທຸກໄຟລ໌ CSV ທີ່ສົ່ງອອກ ແລະ ໄຟລ໌ທີ່ອັບໂຫຼດ ຖືກບັນທຶກໄວ້ໃນ Firebase Firestore ໂດຍກົງ.
              </li>
              <li>
                <strong className="text-blue-900">2. ລະບົບຕິດໜີ້ / ຜ່ອນຈ່າຍ & ແຈ້ງເຕືອນຊຳລະໜີ້:</strong>{' '}
                ມີຊ່ອງສ່ວນຫຼຸດ, ຈຳນວນຈ່າຍແລ້ວ, ຄ້າງຈ່າຍ, ຈຳນວນງວດ ແລະ ວັນທີຊຳລະຄັ້ງຕໍ່ໄປ.
              </li>
              <li>
                <strong className="text-amber-900">3. ສາງອຸປະກອນ Dropdown & ຍອດຍົກມາ:</strong>{' '}
                ເລືອກລາຍການອຸປະກອນພ້ອມຫົວໜ່ວຍ ແລະ ບັນທຶກຍອດຍົກມາຈາກເດືອນກ່ອນ.
              </li>
              <li>
                <strong className="text-cyan-900">4. ຜູ້ຊ່ວຍ AI ອັດສະລິຍະ Gemini:</strong>{' '}
                ຖາມ-ຕອບຕໍ່ເນື່ອງກ່ຽວກັບແຜນການປິ່ນປົວ, ຢາ, ບັນຊີ ແລະ ຮ່າງຂໍ້ຄວາມແຈ້ງເຕືອນລູກຄ້າ.
              </li>
            </ul>
          </div>
        </main>

        <footer className="relative z-20 px-6 py-4 border-t border-emerald-900/40 text-xs text-emerald-100/80 flex items-center justify-between bg-[#011c16]/90">
          <span>© 2026 LK Smile Dental Clinic Management</span>
          <span>Lao PDR · Bilingual Clinical Workspace</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#022c22] relative overflow-x-hidden flex flex-col">
      {/* Subtle Non-Intrusive Clinic Logo Background Watermark Pattern so content stays crisp and readable */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <div className="absolute -top-16 -left-16 opacity-[0.035]">
          <ClinicLogo className="w-[420px] h-[420px]" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03]">
          <ClinicLogo className="w-[620px] h-[620px]" />
        </div>
        <div className="absolute -bottom-20 -right-20 opacity-[0.035]">
          <ClinicLogo className="w-[440px] h-[440px]" />
        </div>
      </div>

      {/* Top Navigation Bar with Larger, Bold, Color-Coded Function Buttons */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white/95 backdrop-blur-md border-b-2 border-emerald-800/30 shadow-md">
        {/* Zone 1: Clinic Logo & Bold Wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('overview');
          }}
          className="flex items-center gap-3 whitespace-nowrap"
        >
          <ClinicLogo className="w-10 h-10 shrink-0" />
          <span className="text-lg sm:text-xl font-extrabold tracking-tight text-emerald-950">
            {t.brandTitle}
          </span>
        </a>

        {/* Zone 2: Top Function Navigation with Larger Bold Multi-Color Styling */}
        <nav className="hidden xl:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-2 rounded-xl text-sm font-extrabold transition-all whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? item.activeBg
                    : `${item.inactiveText} bg-slate-50/80 border border-slate-200/80`
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-white' : item.iconColor
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Right-Side Action Controls (Larger Bold Text & Distinct Colors) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === 'lo' ? 'en' : 'lo')}
            className="px-3.5 py-2 text-sm font-extrabold text-indigo-950 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Globe className="w-4 h-4 text-indigo-700" />
            {lang === 'lo' ? 'ພາສາລາວ / EN' : 'EN / ລາວ'}
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className="px-3.5 py-2 text-sm font-extrabold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors whitespace-nowrap inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FolderOpen className="w-4 h-4" />
            {lang === 'lo' ? 'ໄຟລ໌ໃນ Firebase' : 'Firebase Files'}
          </button>
        </div>
      </header>

      {/* Workspace Body: Sidebar + Crisp High-Contrast Main Surface */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row max-w-[1480px] w-full mx-auto my-4 px-3 sm:px-5 gap-5">
        {/* Sidebar Navigation with Bold Large Multi-Color Function Items */}
        <aside className="w-full md:w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-emerald-900/20 p-4 flex flex-col justify-between shrink-0 shadow-lg">
          <div className="space-y-4">
            {/* Clinic Logo Lockup in Sidebar */}
            <div className="hidden md:flex items-center gap-3 pb-3.5 border-b border-slate-200">
              <ClinicLogo className="w-12 h-12 shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-emerald-950 truncate">
                  {t.brandTitle}
                </div>
                <div className="text-xs text-teal-700 font-bold truncate">
                  LK Smile Clinical OS
                </div>
              </div>
            </div>

            <div className="flex md:flex-col gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-[15px] font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                      active
                        ? item.activeBg
                        : `${item.inactiveText} hover:translate-x-0.5`
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        active ? 'text-white' : item.iconColor
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* RBAC Role Switcher Panel */}
            <div className="hidden md:block pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>{t.switchRoleSim}</span>
              </div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-xs bg-emerald-50/70 border border-emerald-300 rounded-xl font-extrabold text-emerald-950"
              >
                <option value="Admin">{t.roleAdmin}</option>
                <option value="Dentist">{t.roleDentist}</option>
                <option value="Receptionist">{t.roleReceptionist}</option>
                <option value="Assistant">{t.roleAssistant}</option>
              </select>
            </div>
          </div>

          {/* Account & Sample Data Controls */}
          <div className="hidden md:block pt-4 border-t border-slate-200 space-y-3">
            <button
              onClick={handleManualSeed}
              disabled={isSeeding}
              className="w-full px-3 py-2.5 text-xs font-extrabold text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Database className="w-4 h-4 text-teal-700" />
              <span>{isSeeding ? t.seedingData : t.seedSampleData}</span>
            </button>

            <div className="flex items-center justify-between pt-1 text-xs font-bold text-slate-700">
              <span className="truncate max-w-[170px]" title={user.email || ''}>
                {user.email}
              </span>
              <button
                onClick={logout}
                className="text-rose-700 hover:text-rose-900 font-extrabold inline-flex items-center gap-1 cursor-pointer"
                title={t.signOut}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Viewport: Crisp Light Surface for Maximum Clarity & Detail */}
        <main className="flex-1 bg-slate-50/95 backdrop-blur-md rounded-2xl border border-emerald-900/20 p-5 sm:p-7 space-y-7 min-w-0 shadow-xl relative overflow-hidden">
          {/* Very Subtle Interior Watermark Logo */}
          <div className="pointer-events-none absolute right-6 bottom-6 opacity-[0.03] select-none">
            <ClinicLogo className="w-72 h-72" />
          </div>

          <div className="relative z-10">
            {activeTab === 'overview' && (
              <div className="space-y-7">
                {/* Clinic Header with Logo & Bold Right-Side Quick Functions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <ClinicLogo className="w-13 h-13 shrink-0" />
                    <div>
                      <h1 className="text-2xl font-extrabold text-slate-900">
                        {t.brandTitle}
                      </h1>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {t.brandSubtitle} · {t.activeRoleLabel}:{' '}
                        <strong className="text-teal-800 font-extrabold">{role}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Right-Side Quick Function Buttons: Larger, Bold, Distinct Colors */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => setActiveTab('scheduling')}
                      className="px-4 py-2.5 text-sm font-extrabold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                    >
                      {t.newAppointment}
                    </button>
                    <button
                      onClick={() => setActiveTab('files')}
                      className="px-4 py-2.5 text-sm font-extrabold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <FolderOpen className="w-4 h-4" />
                      {lang === 'lo' ? `ໄຟລ໌ໃນ Firebase (${clinicFiles.length})` : 'Firebase Files'}
                    </button>
                    <button
                      onClick={() => setActiveTab('chatbot')}
                      className="px-4 py-2.5 text-sm font-extrabold text-cyan-950 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Bot className="w-4 h-4 text-cyan-800" />
                      {lang === 'lo' ? 'ຖາມ AI ຜູ້ຊ່ວຍ' : 'Ask Gemini AI'}
                    </button>
                  </div>
                </div>

                {/* 4 KPI Stat Grid with Bold Colored Titles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div
                    onClick={() => setActiveTab('ehr')}
                    className="bg-white border-2 border-indigo-200 rounded-xl p-5 cursor-pointer hover:border-indigo-600 transition-colors shadow-xs"
                  >
                    <div className="text-sm font-extrabold text-indigo-900">
                      {t.kpiTotalPatients}
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-slate-900 mt-2">
                      {patients.length}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 mt-1">
                      {ehrRecords.length} EHR records · {t.kpiUnitPatients}
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('scheduling')}
                    className="bg-white border-2 border-blue-200 rounded-xl p-5 cursor-pointer hover:border-blue-600 transition-colors shadow-xs"
                  >
                    <div className="text-sm font-extrabold text-blue-900">
                      {t.kpiTodayAppts}
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-blue-700 mt-2">
                      {appointments.length} / {pendingRemindersCount}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 mt-1">
                      WhatsApp & SMS Automated Queue
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('finance')}
                    className="bg-white border-2 border-emerald-200 rounded-xl p-5 cursor-pointer hover:border-emerald-600 transition-colors shadow-xs"
                  >
                    <div className="text-sm font-extrabold text-emerald-900">
                      {t.kpiMonthlyNet}
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-emerald-700 mt-2">
                      {formatLak(monthlyNetProfit, lang)}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 font-mono mt-1">
                      +{formatLak(monthlyIncome, lang)}
                    </div>
                  </div>

                  <div
                    onClick={() => setActiveTab('inventory')}
                    className="bg-white border-2 border-amber-300 rounded-xl p-5 cursor-pointer hover:border-amber-600 transition-colors shadow-xs"
                  >
                    <div className="text-sm text-amber-900 font-extrabold">
                      {t.kpiLowStock}
                    </div>
                    <div className="text-2xl font-extrabold font-mono text-rose-600 mt-2">
                      {lowStockItems.length}
                    </div>
                    <div className="text-xs font-semibold text-amber-800 mt-1">
                      {t.kpiUnitItems}
                    </div>
                  </div>
                </div>

                {/* Detailed Income & Expense Analytics Chart on Overview */}
                <FinancialAnalyticsChart lang={lang} transactions={transactions} />

                {/* Remaining Clinic Items Low-Stock Alert Banner on Dashboard */}
                {lowStockItems.length > 0 && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-extrabold text-amber-950">
                        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                        <span>
                          {t.lowStockBannerTitle} ({lowStockItems.length})
                        </span>
                      </div>
                      <button
                        onClick={() => setActiveTab('inventory')}
                        className="text-sm font-extrabold text-amber-950 underline cursor-pointer"
                      >
                        {t.navInventory} →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {lowStockItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold text-slate-900 truncate">
                              {item.itemName}
                            </div>
                            <div className="text-xs font-mono text-slate-700 mt-0.5">
                              {t.remainingQty}:{' '}
                              <strong className="text-rose-600">{item.quantity}</strong> /{' '}
                              {item.minThreshold} {item.unit}
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-amber-900 shrink-0">
                            {item.sku}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Schedule & Financial Overview Split */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-blue-50/70">
                      <h3 className="text-sm font-extrabold text-blue-950">
                        {t.navScheduling} ({appointments.length})
                      </h3>
                      <button
                        onClick={() => setActiveTab('scheduling')}
                        className="text-xs font-extrabold text-blue-800 hover:underline cursor-pointer"
                      >
                        View All →
                      </button>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {appointments.slice(0, 4).map((apt) => (
                        <div
                          key={apt.id}
                          className="p-3.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{apt.patientName}</div>
                            <div className="text-slate-600 mt-0.5">
                              {apt.treatmentType} · {apt.dentistName}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-slate-900 font-semibold">
                              {apt.appointmentDate} {apt.appointmentTime}
                            </div>
                            <div className="text-teal-700 font-bold">
                              {apt.status} · {apt.reminderStatus}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
                      <h3 className="text-sm font-extrabold text-emerald-950">
                        {t.navFinance} ({currentMonth})
                      </h3>
                      <button
                        onClick={() => setActiveTab('finance')}
                        className="text-xs font-extrabold text-emerald-800 hover:underline cursor-pointer"
                      >
                        View Ledger →
                      </button>
                    </div>
                    <div className="divide-y divide-slate-200">
                      {transactions.slice(0, 4).map((tx) => {
                        const paid =
                          tx.paidAmountLak !== undefined
                            ? Number(tx.paidAmountLak)
                            : Number(tx.amountLak || 0) - Number(tx.discountLak || 0);
                        const due = Number(tx.balanceDueLak || 0);
                        return (
                          <div
                            key={tx.id}
                            className="p-3.5 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{tx.category}</div>
                              <div className="text-slate-600 mt-0.5">
                                {tx.referenceName || tx.description} · {tx.paymentMethod}
                              </div>
                            </div>
                            <div className="text-right font-mono whitespace-nowrap">
                              <div
                                className={`font-bold ${
                                  tx.txType === 'Income'
                                    ? 'text-emerald-700'
                                    : 'text-rose-600'
                                }`}
                              >
                                {tx.txType === 'Income' ? '+' : '-'}
                                {formatLak(paid, lang)}
                              </div>
                              {due > 0 && (
                                <div className="text-[11px] text-amber-800 font-bold">
                                  ຄ້າງຈ່າຍ: {formatLak(due, lang)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'scheduling' && (
              <SchedulingSection
                lang={lang}
                uid={user.uid}
                role={role}
                appointments={appointments}
                patients={patients}
                staff={staff}
                onConfirmDelete={(collectionName, docId, label) =>
                  setPendingDelete({ collectionName, docId, label })
                }
              />
            )}

            {activeTab === 'ehr' && (
              <EhrSection
                lang={lang}
                uid={user.uid}
                role={role}
                patients={patients}
                ehrRecords={ehrRecords}
                staff={staff}
                onConfirmDelete={(collectionName, docId, label) =>
                  setPendingDelete({ collectionName, docId, label })
                }
              />
            )}

            {activeTab === 'inventory' && (
              <InventorySection
                lang={lang}
                uid={user.uid}
                role={role}
                inventory={inventory}
                onConfirmDelete={(collectionName, docId, label) =>
                  setPendingDelete({ collectionName, docId, label })
                }
              />
            )}

            {activeTab === 'finance' && (
              <FinanceSection
                lang={lang}
                uid={user.uid}
                role={role}
                transactions={transactions}
                patients={patients}
                onConfirmDelete={(collectionName, docId, label) =>
                  setPendingDelete({ collectionName, docId, label })
                }
              />
            )}

            {activeTab === 'staff' && (
              <StaffSection
                lang={lang}
                uid={user.uid}
                role={role}
                staff={staff}
                onConfirmDelete={(collectionName, docId, label) =>
                  setPendingDelete({ collectionName, docId, label })
                }
              />
            )}

            {activeTab === 'files' && (
              <FirebaseFilesSection
                lang={lang}
                uid={user.uid}
                role={role}
                files={clinicFiles}
                patients={patients}
                appointments={appointments}
                ehrRecords={ehrRecords}
                inventory={inventory}
                transactions={transactions}
                staff={staff}
                onConfirmDelete={(collectionName, docId, label) =>
                  setPendingDelete({ collectionName, docId, label })
                }
              />
            )}

            {activeTab === 'chatbot' && (
              <ChatbotSection
                lang={lang}
                uid={user.uid}
                messages={chatMessages}
                patients={patients}
                appointments={appointments}
                ehrRecords={ehrRecords}
                inventory={inventory}
                transactions={transactions}
                staff={staff}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mandatory User Confirmation Dialog for Record Deletion */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">{t.confirmActionTitle}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.confirmDeleteDesc} ({pendingDelete.label})
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                {t.cancel}
              </button>
              <button
                onClick={executeConfirmedDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
