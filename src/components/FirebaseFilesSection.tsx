import React, { useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import {
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Trash2,
  Upload,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { translations } from '../i18n';
import {
  Appointment,
  ClinicFile,
  ClinicFileCategory,
  EhrRecord,
  InventoryItem,
  Lang,
  Patient,
  StaffMember,
  Transaction,
  UserRole,
} from '../types';
import {
  downloadStoredFirebaseFile,
  exportAndSaveCsvToFirebase,
} from '../utils/firebaseFileStorage';

interface Props {
  lang: Lang;
  uid: string;
  role: UserRole;
  files: ClinicFile[];
  patients: Patient[];
  appointments: Appointment[];
  ehrRecords: EhrRecord[];
  inventory: InventoryItem[];
  transactions: Transaction[];
  staff: StaffMember[];
  onConfirmDelete: (collectionName: string, docId: string, label: string) => void;
}

export const FirebaseFilesSection: React.FC<Props> = ({
  lang,
  uid,
  role,
  files,
  patients,
  appointments,
  ehrRecords,
  inventory,
  transactions,
  staff,
  onConfirmDelete,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadCategory, setUploadCategory] =
    useState<ClinicFileCategory>('Uploaded Document');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canModify = role === 'Admin' || role === 'Dentist' || role === 'Receptionist';

  const sortedFiles = [...files].sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tB - tA;
  });

  const filteredFiles = sortedFiles.filter((f) =>
    categoryFilter === 'All' ? true : f.category === categoryFilter
  );

  // Upload any local file (CSV, JSON, TXT, PDF, Image X-Ray <= 650KB) into Firebase Firestore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setErrorMessage(null);
    setStatusMessage(null);

    if (selectedFile.size > 650 * 1024) {
      setErrorMessage(
        lang === 'lo'
          ? 'ຂະໜາດໄຟລ໌ໃຫຍ່ເກີນໄປ (ກະລຸນາເລືອກໄຟລ໌ບໍ່ເກີນ 650 KB ສຳລັບເກັບໃນ Firebase Firestore)'
          : 'File is too large. Please select a file under 650 KB for Firebase Firestore storage.'
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsSaving(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resultData = String(reader.result || '');
        await addDoc(collection(db, 'clinic_files'), {
          fileName: selectedFile.name.slice(0, 180),
          category: uploadCategory,
          mimeType: (selectedFile.type || 'application/octet-stream').slice(0, 100),
          sizeBytes: selectedFile.size,
          contentData: resultData,
          notes: (
            uploadNotes.trim() ||
            (lang === 'lo' ? 'ໄຟລ໌ອັບໂຫຼດເກັບໄວ້ໃນ Firebase' : 'Uploaded clinic file stored in Firebase')
          ).slice(0, 300),
          ownerId: uid,
          createdAt: serverTimestamp(),
        });

        setUploadNotes('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setStatusMessage(
          lang === 'lo'
            ? `ບັນທຶກໄຟລ໌ "${selectedFile.name}" ລົງໃນ Firebase ສຳເລັດແລ້ວ!`
            : `Successfully stored "${selectedFile.name}" in Firebase!`
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'clinic_files');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  // Generate & Store All Clinic CSV Files in Firebase with 1 Click
  const handleSaveAllClinicFilesToFirebase = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    setStatusMessage(null);
    const today = new Date().toISOString().slice(0, 10);

    try {
      // 1. Patients CSV
      await exportAndSaveCsvToFirebase({
        uid,
        fileName: `LK_Dental_Patients_${today}.csv`,
        category: 'Patients',
        headers: [
          'Full Name',
          'Phone',
          'Age',
          'Gender',
          'Address',
          'Drug Allergies',
          'Medical History',
          'Dental Chart Notes',
          'Last Visit',
        ],
        rows: patients.map((p) => [
          p.fullName,
          p.phone,
          p.age,
          p.gender,
          p.address,
          p.allergies,
          p.medicalHistory,
          p.dentalChartNotes,
          p.lastVisit,
        ]),
        notes: `ລາຍຊື່ຄົນເຈັບທັງໝົດ (${patients.length} ຄົນ)`,
      });

      // 2. EHR CSV
      await exportAndSaveCsvToFirebase({
        uid,
        fileName: `LK_Dental_EHR_${today}.csv`,
        category: 'EHR',
        headers: [
          'Visit Date',
          'Patient Name',
          'Tooth (FDI)',
          'Diagnosis',
          'Procedure',
          'Prescription',
          'Dentist',
          'Fee (LAK)',
          'Clinical Notes',
        ],
        rows: ehrRecords.map((r) => [
          r.visitDate,
          r.patientName,
          r.toothNumber,
          r.diagnosis,
          r.procedure,
          r.prescription,
          r.dentistName,
          r.feeLak,
          r.clinicalNotes,
        ]),
        notes: `ປະຫວັດການປິ່ນປົວ EHR (${ehrRecords.length} ລາຍການ)`,
      });

      // 3. Appointments CSV
      await exportAndSaveCsvToFirebase({
        uid,
        fileName: `LK_Dental_Appointments_${today}.csv`,
        category: 'Appointments',
        headers: [
          'Date',
          'Time',
          'Patient Name',
          'Phone',
          'Dentist',
          'Treatment',
          'Status',
          'Reminder Status',
          'Channel',
          'Notes',
        ],
        rows: appointments.map((a) => [
          a.appointmentDate,
          a.appointmentTime,
          a.patientName,
          a.patientPhone,
          a.dentistName,
          a.treatmentType,
          a.status,
          a.reminderStatus,
          a.reminderChannel,
          a.notes,
        ]),
        notes: `ຕາຕະລາງນັດໝາຍ (${appointments.length} ລາຍການ)`,
      });

      // 4. Payroll CSV
      await exportAndSaveCsvToFirebase({
        uid,
        fileName: `LK_Dental_Payroll_${today}.csv`,
        category: 'Payroll',
        headers: [
          'Full Name',
          'Role',
          'Specialty',
          'Phone',
          'Email',
          'Base Salary (LAK)',
          'Advance (LAK)',
          'Bonus (LAK)',
          'Commission (LAK)',
          'Net Payable (LAK)',
        ],
        rows: staff.map((s) => {
          const net = Math.max(
            0,
            Number(s.baseSalaryLak || 0) +
              Number(s.bonusLak || 0) +
              Number(s.commissionLak || 0) -
              Number(s.salaryAdvanceLak || 0)
          );
          return [
            s.fullName,
            s.role,
            s.specialty,
            s.phone,
            s.email || '',
            s.baseSalaryLak,
            s.salaryAdvanceLak || 0,
            s.bonusLak || 0,
            s.commissionLak || 0,
            net,
          ];
        }),
        notes: `ຕາຕະລາງເງິນເດືອນພະນັກງານ (${staff.length} ຄົນ)`,
      });

      setStatusMessage(
        lang === 'lo'
          ? 'ບັນທຶກໄຟລ໌ຂໍ້ມູນຄລີນິກທັງໝົດລົງໃນ Firebase Firestore ຮຽບຮ້ອຍແລ້ວ!'
          : 'All clinic files have been generated and stored in Firebase Firestore!'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold mb-1.5">
            <Database className="w-3.5 h-3.5 text-amber-700" />
            {lang === 'lo'
              ? 'ຄັງເກັບໄຟລ໌ຄລີນິກໃນ Firebase Firestore (Firebase File Repository)'
              : 'Firebase Firestore Clinic File Storage'}
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-teal-700" />
            {lang === 'lo'
              ? 'ບ່ອນເກັບໄຟລ໌ຄລີນິກໃນ Firebase (ປະຫວັດຄົນເຈັບ, ນັດໝາຍ, ເງິນເດືອນ, ບັນຊີ & ເອກະສານ)'
              : 'Clinic Files Stored in Firebase'}
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {lang === 'lo'
              ? 'ທຸກຄັ້ງທີ່ກົດດາວໂຫຼດໄຟລ໌ CSV ຫຼື ອັບໂຫຼດໄຟລ໌ເອກະສານ ລະບົບຈະບັນທຶກໄຟລ໌ໄວ້ໃນຖານຂໍ້ມູນ Firebase ຂອງທ່ານໂດຍອັດຕະໂນມັດ ເພື່ອດາວໂຫຼດຄືນໄດ້ທຸກເວລາ'
              : 'Every exported CSV report and uploaded clinical document is securely stored in your Firebase database for anytime download.'}
          </p>
        </div>

        {canModify && (
          <button
            onClick={handleSaveAllClinicFilesToFirebase}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {lang === 'lo'
              ? '+ ບັນທຶກໄຟລ໌ຄົນເຈັບ, ນັດໝາຍ & ເງິນເດືອນລົງ Firebase ທັນທີ'
              : '+ Save Patients, Appointments & Payroll Files to Firebase'}
          </button>
        )}
      </div>

      {/* Status / Error Banner */}
      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between text-xs font-bold text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-800 hover:underline cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex items-center justify-between text-xs font-bold text-rose-800">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-800 hover:underline cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Custom File to Firebase Card */}
      {canModify && (
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-700" />
            {lang === 'lo'
              ? 'ອັບໂຫຼດໄຟລ໌ເອກະສານ / ຮູບພາບ X-Ray / ໄຟລ໌ CSV ຂຶ້ນເກັບໄວ້ໃນ Firebase'
              : 'Upload Any File to Store in Firebase'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'lo' ? 'ໝວດໝູ່ໄຟລ໌ (Category)' : 'File Category'}
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as ClinicFileCategory)}
                className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-300 bg-slate-50 text-slate-900"
              >
                <option value="Uploaded Document">ເອກະສານທົ່ວໄປ / ຮູບ X-Ray (Uploaded Document)</option>
                <option value="Patients">ປະຫວັດຄົນເຈັບ (Patients)</option>
                <option value="EHR">ບັນທຶກການປິ່ນປົວ (EHR)</option>
                <option value="Appointments">ຕາຕະລາງນັດໝາຍ (Appointments)</option>
                <option value="Payroll">ເງິນເດືອນພະນັກງານ (Payroll)</option>
                <option value="Financials">ລາຍຮັບ-ລາຍຈ່າຍ (Financials)</option>
                <option value="Inventory">ສາງອຸປະກອນ (Inventory)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {lang === 'lo' ? 'ໝາຍເຫດໄຟລ໌ (Notes)' : 'File Description / Notes'}
              </label>
              <input
                type="text"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder={
                  lang === 'lo'
                    ? 'ເຊັ່ນ: ຟິມ X-Ray ຄົນເຈັບ, ໃບບິນສັ່ງຊື້ຢາ...'
                    : 'e.g. Patient X-ray, supplier invoice...'
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
              />
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                id="firebase-file-upload-input"
              />
              <label
                htmlFor="firebase-file-upload-input"
                className="w-full px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                {isSaving
                  ? lang === 'lo'
                    ? 'ກຳລັງບັນທຶກລົງ Firebase...'
                    : 'Storing in Firebase...'
                  : lang === 'lo'
                  ? 'ເລືອກໄຟລ໌ເພື່ອເກັບລົງ Firebase'
                  : 'Choose File to Store in Firebase'}
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Stored Files Table in Firebase */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                'All',
                'Patients',
                'EHR',
                'Appointments',
                'Payroll',
                'Financials',
                'Inventory',
                'Uploaded Document',
              ] as const
            ).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-emerald-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {cat === 'All' ? t.allFilter : cat}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono font-bold text-slate-600">
            {filteredFiles.length}{' '}
            {lang === 'lo' ? 'ໄຟລ໌ທີ່ເກັບໄວ້ໃນ Firebase' : 'files stored in Firebase'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4">
                  {lang === 'lo' ? 'ຊື່ໄຟລ໌ (File Name)' : 'File Name'}
                </th>
                <th className="py-3.5 px-4">{t.category}</th>
                <th className="py-3.5 px-4">
                  {lang === 'lo' ? 'ລາຍລະອຽດ / ໝາຍເຫດ' : 'Notes'}
                </th>
                <th className="py-3.5 px-4 text-right">
                  {lang === 'lo' ? 'ຂະໜາດໄຟລ໌' : 'Size'}
                </th>
                <th className="py-3.5 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 text-sm">
              {filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-teal-700 shrink-0" />
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {file.fileName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200">
                      {file.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-700">{file.notes}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-600 whitespace-nowrap">
                    {formatBytes(file.sizeBytes)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-2">
                      <button
                        onClick={() => downloadStoredFirebaseFile(file)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {lang === 'lo' ? 'ດາວໂຫຼດໄຟລ໌' : 'Download'}
                      </button>
                      {canModify && (
                        <button
                          onClick={() =>
                            onConfirmDelete('clinic_files', file.id, file.fileName)
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-slate-500">
                    {lang === 'lo'
                      ? 'ຍັງບໍ່ມີໄຟລ໌ທີ່ບັນທຶກໄວ້ໃນ Firebase — ກົດປຸ່ມດາວໂຫຼດ CSV ໃນໜ້າຕ່າງໆ ຫຼື ກົດປຸ່ມບັນທຶກໄຟລ໌ດ້ານເທິງເພື່ອເກັບໄຟລ໌ລົງ Firebase ທັນທີ'
                      : 'No files stored in Firebase yet. Export any CSV or click the button above to store files in Firebase.'}
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
