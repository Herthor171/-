import React, { useEffect, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import {
  Bot,
  MessageSquare,
  Send,
  Sparkles,
  Stethoscope,
  Trash2,
  User as UserIcon,
  Wallet,
  Zap,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatLak } from '../i18n';
import {
  Appointment,
  ChatMessage,
  EhrRecord,
  InventoryItem,
  Lang,
  Patient,
  StaffMember,
  Transaction,
} from '../types';

interface Props {
  lang: Lang;
  uid: string;
  messages: ChatMessage[];
  patients: Patient[];
  appointments: Appointment[];
  ehrRecords: EhrRecord[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  staff: StaffMember[];
}

export const CHAT_PERSONAS = [
  {
    id: 'clinical_advisor',
    labelLo: 'ຜູ້ຊ່ວຍທັນຕະແພດ & ວິເຄາະອາການ (Clinical Dental Advisor)',
    labelEn: 'Clinical Dental Advisor',
    icon: Stethoscope,
    systemInstruction:
      'You are the Senior Clinical Dental Advisor at LK Smile Dental Clinic (ຄລີນິກແຂ້ວ LK Smile) in Vientiane, Laos. You assist dentists and staff with dental diagnoses (FDI 32-tooth system), post-op care instructions, medication dosage guidelines (e.g. Amoxicillin, Clindamycin for Penicillin-allergic patients, NSAIDs), cosmetic dentistry (veneers, bleaching, implants), and clinical notes in clear Lao (ພາສາລາວ) and English.',
  },
  {
    id: 'finance_payroll',
    labelLo: 'ຜູ້ຊ່ວຍບັນຊີ, ຕິດໜີ້ຜ່ອນຈ່າຍ & ເງິນເດືອນ (Finance & Payroll Analyst)',
    labelEn: 'Finance & Payroll Analyst',
    icon: Wallet,
    systemInstruction:
      'You are the Clinic Financial & Payroll Analyst for LK Smile Dental Clinic. You analyze monthly income, expenses, customer installment receivables (ຕິດໜີ້ / ຜ່ອນຈ່າຍ), low-stock supply costs, and isolated staff payroll calculations (Base Salary + Bonus + Commission - Salary Advance) in Lao Kip (ກີບ / LAK). Provide clear, actionable summaries in Lao (ພາສາລາວ) or English.',
  },
  {
    id: 'reception_concierge',
    labelLo: 'ຜູ້ຊ່ວຍຕ້ອນຮັບ & ຮ່າງຂໍ້ຄວາມແຈ້ງເຕືອນລູກຄ້າ (Patient Reception & SMS)',
    labelEn: 'Reception & Patient Reminder Assistant',
    icon: MessageSquare,
    systemInstruction:
      'You are the Front-Desk Reception & Patient Communication Specialist at LK Smile Dental Clinic. You draft polite, professional Lao and English WhatsApp/SMS appointment reminders, installment payment due reminders, and post-treatment follow-up messages for patients.',
  },
];

export const FREE_MODELS = [
  {
    id: 'gemini-3.5-flash',
    labelLo: 'gemini-3.5-flash (ວຽກທົ່ວໄປ & ວິເຄາະຂໍ້ມູນຄລີນິກ - Free)',
    labelEn: 'gemini-3.5-flash (General Tasks - Free)',
  },
  {
    id: 'gemini-3.1-flash-lite',
    labelLo: 'gemini-3.1-flash-lite (ຕອບໄວພິເສດ Fast Response - Free)',
    labelEn: 'gemini-3.1-flash-lite (Fast Response - Free)',
  },
];

export const ChatbotSection: React.FC<Props> = ({
  lang,
  uid,
  messages,
  patients,
  appointments,
  ehrRecords,
  inventory,
  transactions,
  staff,
}) => {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(CHAT_PERSONAS[0].id);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const activePersona =
    CHAT_PERSONAS.find((p) => p.id === selectedPersonaId) || CHAT_PERSONAS[0];

  const sortedMessages = [...messages].sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tA - tB;
  });

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sortedMessages.length, isSending]);

  // Build concise live clinic snapshot so the chatbot can answer real questions about clinic data
  const buildClinicContext = () => {
    const lowStock = inventory.filter((i) => i.quantity <= i.minThreshold);
    const totalIncome = transactions
      .filter((t) => t.txType === 'Income')
      .reduce((acc, t) => acc + Number(t.paidAmountLak ?? t.amountLak ?? 0), 0);
    const totalExpense = transactions
      .filter((t) => t.txType === 'Expense')
      .reduce((acc, t) => acc + Number(t.amountLak ?? 0), 0);
    const totalDebt = transactions
      .filter((t) => t.txType === 'Income')
      .reduce((acc, t) => acc + Number(t.balanceDueLak ?? 0), 0);

    return [
      `- Registered Patients: ${patients.length} (${patients
        .slice(0, 5)
        .map((p) => `${p.fullName} [Allergies: ${p.allergies}]`)
        .join('; ')})`,
      `- Scheduled Appointments: ${appointments.length}`,
      `- EHR Clinical Records: ${ehrRecords.length}`,
      `- Low Stock Items (${lowStock.length}): ${lowStock
        .map((i) => `${i.itemName} (${i.quantity} ${i.unit} left)`)
        .join(', ')}`,
      `- Financial Summary: Collected Income = ${formatLak(totalIncome)}, General Expense = ${formatLak(
        totalExpense
      )}, Unpaid Customer Installment Debt = ${formatLak(totalDebt)}`,
      `- Staff Count: ${staff.length} (${staff
        .map((s) => `${s.fullName} [${s.role}]`)
        .join(', ')})`,
    ].join('\n');
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isSending) return;

    if (!customPrompt) setInput('');
    setErrorMsg(null);
    setIsSending(true);

    try {
      // 1. Persist User Message to Firestore
      await addDoc(collection(db, 'chat_messages'), {
        role: 'user',
        text: textToSend.slice(0, 10000),
        persona: activePersona.id,
        modelUsed: selectedModel,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });

      // 2. Build Multi-Turn Conversation History (last 16 messages + new user message)
      const historyPayload = [
        ...sortedMessages.slice(-16).map((m) => ({
          role: m.role,
          text: m.text,
        })),
        { role: 'user', text: textToSend },
      ];

      // 3. Call Server-Side Gemini API Endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyPayload,
          model: selectedModel,
          systemInstruction: activePersona.systemInstruction,
          clinicContext: buildClinicContext(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response from Gemini chatbot');
      }

      const replyText =
        data.text?.trim() ||
        (lang === 'lo'
          ? 'ຂໍອະໄພ, ລະບົບບໍ່ສາມາດສ້າງຄຳຕອບໄດ້ໃນขณะນີ້.'
          : 'Sorry, I could not generate a response right now.');

      // 4. Persist Model Response to Firestore
      await addDoc(collection(db, 'chat_messages'), {
        role: 'model',
        text: replyText.slice(0, 10000),
        persona: activePersona.id,
        modelUsed: data.modelUsed || selectedModel,
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = async () => {
    for (const msg of messages) {
      try {
        await deleteDoc(doc(db, 'chat_messages', msg.id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `chat_messages/${msg.id}`);
      }
    }
  };

  const quickPrompts =
    lang === 'lo'
      ? [
          'ສະຫຼຸບພາບລວມລາຍຮັບ-ລາຍຈ່າຍ, ຍອດໜີ້ຄ້າງຈ່າຍ ແລະ ອຸປະກອນໃກ້ໝົດໃນຄລີນິກ',
          'ແນະນຳການສັ່ງຢາສຳລັບຄົນເຈັບຖອນແຂ້ວຊາວຄຸດ ທີ່ມີປະຫວັດແພ້ຢາ Penicillin',
          'ຮ່າງຂໍ້ຄວາມ WhatsApp ແຈ້ງເຕືອນລູກຄ້າຊຳລະຄ່າຜ່ອນຈັດແຂ້ວປະຈຳເດືອນ',
          'ຄຳນວນຍອດຈ່າຍເງິນເດືອນພະນັກງານທ້າຍເດືອນ ຫຼັງຫັກເງິນເບີກລ່ວງໜ້າ',
        ]
      : [
          'Summarize clinic income, expenses, unpaid installment debts, and low-stock items',
          'Recommend antibiotic & pain relief regimen for wisdom tooth extraction with Penicillin allergy',
          'Draft a polite bilingual WhatsApp reminder for monthly orthodontic installment payment',
          'Summarize staff payroll net payouts after salary advance deductions',
        ];

  return (
    <div className="space-y-5">
      {/* Header & Role/Model Controls */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {lang === 'lo'
                ? 'ຜູ້ຊ່ວຍ AI ອັດສະລິຍະປະຈຳຄລີນິກ (Gemini Multi-Turn Clinic Assistant - Free Tier)'
                : 'Gemini Multi-Turn Clinic Assistant (Free Tier)'}
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-teal-700" />
              {lang === 'lo'
                ? 'ຜູ້ຊ່ວຍ AI ปรຶກສາທັນຕະກຳ, ບັນຊີ & ບໍລິຫານຄລີນິກ (Gemini Chatbot)'
                : 'LK Smile Gemini AI Assistant'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {lang === 'lo'
                ? 'ຖາມ-ຕອບຕໍ່ເນື່ອງ (Multi-turn Chat) ພ້ອມບັນທຶກປະຫວັດການສົນທະນາລົງໃນຖານຂໍ້ມູນ Firestore ອັດຕະໂນມັດ'
                : 'Multi-turn conversation with role-specific system instructions and Firestore history persistence.'}
            </p>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors self-start lg:self-center cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {lang === 'lo' ? 'ລ້າງປະຫວັດສົນທະນາ' : 'Clear Chat History'}
            </button>
          )}
        </div>

        {/* Role Persona & Model Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              {lang === 'lo'
                ? '1. ເລືອກບົດບາດຜູ້ຊ່ວຍ AI (System Instruction Role):'
                : '1. Select Chatbot Role (System Instruction):'}
            </label>
            <select
              value={selectedPersonaId}
              onChange={(e) => setSelectedPersonaId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-900"
            >
              {CHAT_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {lang === 'lo' ? p.labelLo : p.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
              {lang === 'lo'
                ? '2. ເລືອກລຸ້ນໂມເດວ Gemini (Free Tier Models):'
                : '2. Select Gemini Model (Free Tier):'}
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-teal-300 bg-teal-50/50 text-teal-950"
            >
              {FREE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {lang === 'lo' ? m.labelLo : m.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Prompt Starters */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-bold text-slate-500">
            {lang === 'lo' ? 'ຄຳຖາມແນະນຳດ່ວນ:' : 'Quick Prompts:'}
          </span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSending}
              onClick={() => handleSendMessage(qp)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-900 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Multi-Turn Conversation Thread */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {sortedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <Bot className="w-6 h-6" />
              </div>
              <div className="text-sm font-extrabold text-slate-800">
                {lang === 'lo'
                  ? 'ເລີ່ມຕົ້ນສົນທະນາກັບຜູ້ຊ່ວຍ AI ຄລີນິກແຂ້ວ LK Smile'
                  : 'Start a conversation with LK Smile Clinic AI'}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {lang === 'lo'
                  ? 'ທ່ານສາມາດຖາມກ່ຽວກັບແຜນການປິ່ນປົວແຂ້ວ, ຢາທີ່ສັ່ງຈ່າຍ, ສະຫຼຸບບັນຊີລາຍຮັບ-ລາຍຈ່າຍ, ຫຼື ໃຫ້ຊ່ວຍຮ່າງຂໍ້ຄວາມແຈ້ງເຕືອນລູກຄ້າເປັນພາສາລາວ ແລະ ອັງກິດ.'
                  : 'Ask clinical dental questions, analyze monthly clinic revenue & expenses, or draft patient reminders in Lao and English.'}
              </p>
            </div>
          ) : (
            sortedMessages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-emerald-800 text-white rounded-br-xs'
                        : 'bg-slate-100 text-slate-900 border border-slate-200/80 rounded-bl-xs'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div
                      className={`text-[10px] font-mono mt-1.5 flex items-center gap-2 ${
                        isUser ? 'text-emerald-200' : 'text-slate-500'
                      }`}
                    >
                      <span>{msg.modelUsed}</span>
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })
          )}

          {isSending && (
            <div className="flex items-center gap-3 text-xs font-semibold text-teal-800 bg-teal-50/70 border border-teal-200 rounded-xl px-4 py-3 w-fit">
              <Zap className="w-4 h-4 animate-pulse text-teal-600" />
              <span>
                {lang === 'lo'
                  ? `ກຳລັງປະມວນຜົນຄຳຕອບດ້ວຍ ${selectedModel}...`
                  : `Generating response with ${selectedModel}...`}
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {errorMsg}
            </div>
          )}

          <div ref={threadEndRef} />
        </div>

        {/* Message Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3.5 border-t border-slate-200 bg-slate-50 rounded-b-xl flex items-center gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              lang === 'lo'
                ? 'ພິມຄຳຖາມກ່ຽວກັບຄລີນິກ, ການປິ່ນປົວແຂ້ວ, ຫຼື ບັນຊີລາຍຮັບ-ລາຍຈ່າຍ...'
                : 'Ask about dental treatments, clinic finances, or patient reminders...'
            }
            disabled={isSending}
            className="flex-1 px-4 py-2.5 text-sm bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {lang === 'lo' ? 'ສົ່ງຂໍ້ຄວາມ' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};
