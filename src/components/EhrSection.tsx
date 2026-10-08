import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Search,
  Stethoscope,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { formatLak, translations } from '../i18n';
import {
  ALLERGY_PRESETS_LAO,
  CLINICAL_NOTES_PRESETS_LAO,
  DIAGNOSIS_PRESETS_LAO,
  EhrRecord,
  INCOME_CATEGORIES_LAO,
  Lang,
  MEDICAL_HISTORY_PRESETS_LAO,
  Patient,
  PRESCRIPTION_PRESETS_LAO,
  StaffMember,
  UserRole,
} from '../types';
import { CreatableSelect } from './CreatableSelect';
import { exportAndSaveCsvToFirebase } from '../utils/firebaseFileStorage';

interface Props {
  lang: Lang;
  uid: string;
  role: UserRole;
  patients: Patient[];
  ehrRecords: EhrRecord[];
  staff?: StaffMember[];
  onConfirmDelete: (collectionName: string, docId: string, label: string) => void;
}

const UPPER_TEETH = [
  '#18', '#17', '#16', '#15', '#14', '#13', '#12', '#11',
  '#21', '#22', '#23', '#24', '#25', '#26', '#27', '#28',
];
const LOWER_TEETH = [
  '#48', '#47', '#46', '#45', '#44', '#43', '#42', '#41',
  '#31', '#32', '#33', '#34', '#35', '#36', '#37', '#38',
];

const ADDRESS_PRESETS_LAO = [
  'ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
  'ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
  'ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ',
  'ເມືອງ ສີໂຄດຕະບອງ, ນະຄອນຫຼວງວຽງຈັນ',
  'ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ',
  'ເມືອງ ຫາດຊາຍຟອງ, ນະຄອນຫຼວງວຽງຈັນ',
];

export const EhrSection: React.FC<Props> = ({
  lang,
  uid,
  role,
  patients,
  ehrRecords,
  staff = [],
  onConfirmDelete,
}) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');
  const [selectedTooth, setSelectedTooth] = useState<string>('All');
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  const [showEhrModal, setShowEhrModal] = useState(false);
  const [editingEhrId, setEditingEhrId] = useState<string | null>(null);

  const dentistOptions = Array.from(
    new Set([
      'ທ່ານໝໍ ດຣ. ລັດຕະນະ ວົງພະຈັນ',
      'ທ່ານໝໍ ດຣ. ຄຳແພງ ສີຫາລາດ',
      ...staff.filter((s) => s.role === 'Dentist' || s.role === 'Admin').map((s) => s.fullName),
    ])
  );

  const [patientForm, setPatientForm] = useState({
    fullName: '',
    phone: '',
    age: 30,
    gender: 'Female' as Patient['gender'],
    address: ADDRESS_PRESETS_LAO[0],
    allergies: ALLERGY_PRESETS_LAO[0],
    medicalHistory: MEDICAL_HISTORY_PRESETS_LAO[0],
    dentalChartNotes: CLINICAL_NOTES_PRESETS_LAO[0],
  });

  const [ehrForm, setEhrForm] = useState({
    patientId: '',
    patientName: '',
    visitDate: new Date().toISOString().slice(0, 10),
    toothNumber: '#36',
    diagnosis: DIAGNOSIS_PRESETS_LAO[0],
    procedure: INCOME_CATEGORIES_LAO[2],
    prescription: PRESCRIPTION_PRESETS_LAO[1],
    dentistName: dentistOptions[0],
    feeLak: 450000,
    clinicalNotes: CLINICAL_NOTES_PRESETS_LAO[0],
  });

  const canWriteClinical = role === 'Admin' || role === 'Dentist';
  const canRegisterPatient = role === 'Admin' || role === 'Dentist' || role === 'Receptionist';
  const isAdmin = role === 'Admin';

  const treatedTeethSet = new Set(ehrRecords.map((r) => r.toothNumber));

  const filteredEhr = ehrRecords.filter((r) => {
    const matchesSearch =
      r.patientName.toLowerCase().includes(search.toLowerCase()) ||
      r.diagnosis.toLowerCase().includes(search.toLowerCase()) ||
      r.procedure.toLowerCase().includes(search.toLowerCase()) ||
      r.toothNumber.toLowerCase().includes(search.toLowerCase());
    const matchesTooth = selectedTooth === 'All' || r.toothNumber === selectedTooth;
    return matchesSearch && matchesTooth;
  });

  const openNewPatientModal = () => {
    setEditingPatientId(null);
    setPatientForm({
      fullName: '',
      phone: '',
      age: 30,
      gender: 'Female',
      address: ADDRESS_PRESETS_LAO[0],
      allergies: ALLERGY_PRESETS_LAO[0],
      medicalHistory: MEDICAL_HISTORY_PRESETS_LAO[0],
      dentalChartNotes: CLINICAL_NOTES_PRESETS_LAO[0],
    });
    setShowPatientModal(true);
  };

  const openEditPatientModal = (p: Patient) => {
    setEditingPatientId(p.id);
    setPatientForm({
      fullName: p.fullName,
      phone: p.phone,
      age: p.age,
      gender: p.gender,
      address: p.address,
      allergies: p.allergies,
      medicalHistory: p.medicalHistory,
      dentalChartNotes: p.dentalChartNotes,
    });
    setShowPatientModal(true);
  };

  const openNewEhrModal = () => {
    setEditingEhrId(null);
    setEhrForm({
      patientId: patients[0]?.id || '',
      patientName: patients[0]?.fullName || '',
      visitDate: new Date().toISOString().slice(0, 10),
      toothNumber: selectedTooth === 'All' ? '#36' : selectedTooth,
      diagnosis: DIAGNOSIS_PRESETS_LAO[0],
      procedure: INCOME_CATEGORIES_LAO[2],
      prescription: PRESCRIPTION_PRESETS_LAO[1],
      dentistName: dentistOptions[0],
      feeLak: 450000,
      clinicalNotes: CLINICAL_NOTES_PRESETS_LAO[0],
    });
    setShowEhrModal(true);
  };

  const openEditEhrModal = (r: EhrRecord) => {
    setEditingEhrId(r.id);
    setEhrForm({
      patientId: r.patientId,
      patientName: r.patientName,
      visitDate: r.visitDate,
      toothNumber: r.toothNumber,
      diagnosis: r.diagnosis,
      procedure: r.procedure,
      prescription: r.prescription,
      dentistName: r.dentistName,
      feeLak: r.feeLak,
      clinicalNotes: r.clinicalNotes,
    });
    setShowEhrModal(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRegisterPatient) return;
    const payload = {
      fullName: patientForm.fullName.trim().slice(0, 120),
      phone: patientForm.phone.trim().slice(0, 40),
      age: Number(patientForm.age) || 25,
      gender: patientForm.gender,
      address: patientForm.address.trim().slice(0, 250),
      allergies: patientForm.allergies.trim().slice(0, 300),
      medicalHistory: patientForm.medicalHistory.trim().slice(0, 1000),
      dentalChartNotes: patientForm.dentalChartNotes.trim().slice(0, 2000),
      lastVisit: new Date().toISOString().slice(0, 10),
      updatedAt: serverTimestamp(),
    };

    if (editingPatientId) {
      try {
        await updateDoc(doc(db, 'patients', editingPatientId), payload);
        setShowPatientModal(false);
        setEditingPatientId(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `patients/${editingPatientId}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'patients'), {
          ...payload,
          ownerId: uid,
          createdAt: serverTimestamp(),
        });
        setShowPatientModal(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'patients');
      }
    }
  };

  const handleSaveEhr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteClinical) return;
    const payload = {
      patientId: (ehrForm.patientId || 'pat_custom').slice(0, 128),
      patientName: ehrForm.patientName.trim().slice(0, 120),
      visitDate: ehrForm.visitDate.slice(0, 30),
      toothNumber: ehrForm.toothNumber.trim().slice(0, 40),
      diagnosis: ehrForm.diagnosis.trim().slice(0, 500),
      procedure: ehrForm.procedure.trim().slice(0, 500),
      prescription: ehrForm.prescription.trim().slice(0, 500),
      dentistName: ehrForm.dentistName.trim().slice(0, 120),
      feeLak: Math.max(0, Number(ehrForm.feeLak) || 0),
      clinicalNotes: ehrForm.clinicalNotes.trim().slice(0, 1000),
      updatedAt: serverTimestamp(),
    };

    if (editingEhrId) {
      try {
        await updateDoc(doc(db, 'ehr_records', editingEhrId), payload);
        setShowEhrModal(false);
        setEditingEhrId(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `ehr_records/${editingEhrId}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'ehr_records'), {
          ...payload,
          ownerId: uid,
          createdAt: serverTimestamp(),
        });
        setShowEhrModal(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'ehr_records');
      }
    }
  };

  const handleExportPatientsCsv = async () => {
    const headers = [
      'Full Name',
      'Phone',
      'Age',
      'Gender',
      'Address',
      'Drug Allergies',
      'Medical History',
      'Dental Chart Notes',
      'Last Visit',
    ];
    const rows = patients.map((p) => [
      p.fullName,
      p.phone,
      p.age,
      p.gender,
      p.address,
      p.allergies,
      p.medicalHistory,
      p.dentalChartNotes,
      p.lastVisit,
    ]);
    const today = new Date().toISOString().slice(0, 10);
    await exportAndSaveCsvToFirebase({
      uid,
      fileName: `LK_Dental_Patients_${today}.csv`,
      category: 'Patients',
      headers,
      rows,
      notes: `ລາຍຊື່ຄົນເຈັບທັງໝົດ (${rows.length} ຄົນ)`,
    });
  };

  const handleExportEhrCsv = async () => {
    const headers = [
      'Visit Date',
      'Patient Name',
      'Tooth Number (FDI)',
      'Diagnosis',
      'Treatment Procedure',
      'Prescription',
      'Dentist Name',
      'Fee (LAK)',
      'Clinical Notes',
    ];
    const rows = filteredEhr.map((r) => [
      r.visitDate,
      r.patientName,
      r.toothNumber,
      r.diagnosis,
      r.procedure,
      r.prescription,
      r.dentistName,
      r.feeLak,
      r.clinicalNotes,
    ]);
    const today = new Date().toISOString().slice(0, 10);
    await exportAndSaveCsvToFirebase({
      uid,
      fileName: `LK_Dental_EHR_History_${today}.csv`,
      category: 'EHR',
      headers,
      rows,
      notes: `ປະຫວັດການປິ່ນປົວທັນຕະກຳ EHR (${rows.length} ລາຍການ)`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.ehrTitle}</h2>
          <p className="text-sm text-slate-600 mt-1">{t.ehrDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPatientsCsv}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            {lang === 'lo' ? 'ດາວໂຫຼດລາຍຊື່ຄົນເຈັບ (CSV)' : 'Download Patients (CSV)'}
          </button>
          <button
            onClick={handleExportEhrCsv}
            className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-700" />
            {lang === 'lo' ? 'ດາວໂຫຼດປະຫວັດປິ່ນປົວ EHR (CSV)' : 'Download EHR (CSV)'}
          </button>
          {canRegisterPatient && (
            <button
              onClick={openNewPatientModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-teal-700" />
              {t.newPatient}
            </button>
          )}
          {canWriteClinical && (
            <button
              onClick={openNewEhrModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t.newEhrEntry}
            </button>
          )}
        </div>
      </div>

      {/* Interactive 32-Tooth FDI Odontogram Selector */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t.odontogramHeader}</h3>
            <p className="text-xs text-slate-500">{t.odontogramSub}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <button
              onClick={() => setSelectedTooth('All')}
              className={`px-2.5 py-1 rounded-md font-medium border ${
                selectedTooth === 'All'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {t.allFilter} (32)
            </button>
          </div>
        </div>

        <div className="space-y-2 overflow-x-auto pb-1">
          <div className="grid grid-cols-16 gap-1.5 min-w-[640px]">
            {UPPER_TEETH.map((tooth) => {
              const isSelected = selectedTooth === tooth;
              const hasHistory = treatedTeethSet.has(tooth);
              return (
                <button
                  key={tooth}
                  onClick={() => setSelectedTooth(isSelected ? 'All' : tooth)}
                  className={`py-2 px-1 rounded-md border text-center font-mono text-xs transition-colors ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-700 font-bold'
                      : hasHistory
                      ? 'bg-teal-50 text-teal-900 border-teal-300 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {tooth}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-16 gap-1.5 min-w-[640px]">
            {LOWER_TEETH.map((tooth) => {
              const isSelected = selectedTooth === tooth;
              const hasHistory = treatedTeethSet.has(tooth);
              return (
                <button
                  key={tooth}
                  onClick={() => setSelectedTooth(isSelected ? 'All' : tooth)}
                  className={`py-2 px-1 rounded-md border text-center font-mono text-xs transition-colors ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-700 font-bold'
                      : hasHistory
                      ? 'bg-teal-50 text-teal-900 border-teal-300 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {tooth}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Patient Directory Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">
            ລາຍຊື່ຄົນເຈັບໃນລະບົບ (Registered Patients · {patients.length}) — ຄລິກແຖວເພື່ອແກ້ໄຂ
          </h3>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-600"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-900">
                <th className="py-2.5 px-4">{t.patientName}</th>
                <th className="py-2.5 px-4">
                  {t.age} / {t.gender}
                </th>
                <th className="py-2.5 px-4">{t.allergies}</th>
                <th className="py-2.5 px-4">{t.dentalChartNotes}</th>
                <th className="py-2.5 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {patients.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => isAdmin && openEditPatientModal(p)}
                  className={`hover:bg-slate-50/80 ${isAdmin ? 'cursor-pointer' : ''}`}
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{p.fullName}</div>
                    <div className="text-xs font-mono text-slate-500">
                      {p.phone} · {p.address}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                    {p.age} · {p.gender}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <span
                      className={
                        p.allergies.includes('None') || p.allergies.includes('ບໍ່ມີ')
                          ? 'text-slate-600'
                          : 'text-rose-600 font-bold'
                      }
                    >
                      {p.allergies}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">{p.dentalChartNotes}</td>
                  <td
                    className="py-3 px-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      {canRegisterPatient && (
                        <button
                          onClick={() => openEditPatientModal(p)}
                          className="px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          ແກ້ໄຂ
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => onConfirmDelete('patients', p.id, p.fullName)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clinical EHR Procedure Ledger */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-700" />
            ປະຫວັດການປິ່ນປົວທັນຕະກຳ (Clinical EHR Procedures · {filteredEhr.length}) — ຄລິກເພື່ອແກ້ໄຂ
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-900">
                <th className="py-2.5 px-4">{t.date}</th>
                <th className="py-2.5 px-4">{t.toothNumber}</th>
                <th className="py-2.5 px-4">{t.patientName}</th>
                <th className="py-2.5 px-4">
                  {t.diagnosis} & {t.procedure}
                </th>
                <th className="py-2.5 px-4">{t.prescription}</th>
                <th className="py-2.5 px-4 text-right">{t.feeLak}</th>
                <th className="py-2.5 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredEhr.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => isAdmin && openEditEhrModal(r)}
                  className={`hover:bg-slate-50/80 ${isAdmin ? 'cursor-pointer' : ''}`}
                >
                  <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">
                    {r.visitDate}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-teal-800 whitespace-nowrap">
                    {r.toothNumber}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{r.patientName}</div>
                    <div className="text-xs text-slate-500">{r.dentistName}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{r.procedure}</div>
                    <div className="text-xs text-teal-800 font-medium">{r.diagnosis}</div>
                    {r.clinicalNotes && (
                      <div className="text-xs text-slate-500 mt-0.5">{r.clinicalNotes}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-700">{r.prescription}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs font-bold text-slate-900 whitespace-nowrap">
                    {formatLak(r.feeLak, lang)}
                  </td>
                  <td
                    className="py-3 px-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1">
                      {canWriteClinical && (
                        <button
                          onClick={() => openEditEhrModal(r)}
                          className="px-2 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded inline-flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          ແກ້ໄຂ
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() =>
                            onConfirmDelete('ehr_records', r.id, `${r.patientName} (${r.toothNumber})`)
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Register or Edit Patient with Creatable Dropdowns */}
      {showPatientModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingPatientId ? 'ແກ້ໄຂຂໍ້ມູນຄົນເຈັບ (Edit Patient)' : t.newPatient}
              </h3>
              <button onClick={() => setShowPatientModal(false)} className="text-xs text-slate-500">
                {t.cancel}
              </button>
            </div>
            <form onSubmit={handleSavePatient} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.patientName} *
                  </label>
                  <input
                    required
                    type="text"
                    value={patientForm.fullName}
                    onChange={(e) => setPatientForm({ ...patientForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.phone} *</label>
                  <input
                    required
                    type="text"
                    value={patientForm.phone}
                    onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.age} *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={120}
                    value={patientForm.age}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, age: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.gender}</label>
                  <select
                    value={patientForm.gender}
                    onChange={(e) =>
                      setPatientForm({ ...patientForm, gender: e.target.value as Patient['gender'] })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Female">Female (ຍິງ)</option>
                    <option value="Male">Male (ຊາຍ)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <CreatableSelect
                label={t.address}
                value={patientForm.address}
                options={ADDRESS_PRESETS_LAO}
                onChange={(val) => setPatientForm({ ...patientForm, address: val })}
                placeholder="ພິມບ້ານ, ເມືອງ, ແຂວງ..."
              />

              <CreatableSelect
                label={t.allergies}
                value={patientForm.allergies}
                options={ALLERGY_PRESETS_LAO}
                onChange={(val) => setPatientForm({ ...patientForm, allergies: val })}
                placeholder="ພິມຊື່ຢາ ຫຼື ສິ່ງທີ່ແພ້..."
              />

              <CreatableSelect
                label={t.medicalHistory}
                value={patientForm.medicalHistory}
                options={MEDICAL_HISTORY_PRESETS_LAO}
                onChange={(val) => setPatientForm({ ...patientForm, medicalHistory: val })}
                placeholder="ພິມພະຍາດປະຈຳໂຕ..."
              />

              <CreatableSelect
                label={t.dentalChartNotes}
                value={patientForm.dentalChartNotes}
                options={CLINICAL_NOTES_PRESETS_LAO}
                onChange={(val) => setPatientForm({ ...patientForm, dentalChartNotes: val })}
                placeholder="ພິມບັນທຶກແຜນຜັງແຂ້ວ..."
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPatientModal(false)}
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

      {/* Modal: Add or Edit Clinical EHR Record with Dropdowns + Custom Input */}
      {showEhrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700" />
                {editingEhrId
                  ? 'ແກ້ໄຂບັນທຶກການປິ່ນປົວ (Edit EHR Record)'
                  : t.newEhrEntry}
              </h3>
              <button onClick={() => setShowEhrModal(false)} className="text-xs text-slate-500">
                {t.cancel}
              </button>
            </div>
            <form onSubmit={handleSaveEhr} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CreatableSelect
                  label={t.patientName}
                  required
                  value={ehrForm.patientName}
                  options={
                    patients.length > 0
                      ? patients.map((p) => p.fullName)
                      : ['ທ້າວ ສົມພອນ ພົມມະວົງ']
                  }
                  onChange={(val) => {
                    const matched = patients.find((p) => p.fullName === val);
                    setEhrForm({
                      ...ehrForm,
                      patientName: val,
                      patientId: matched ? matched.id : ehrForm.patientId,
                    });
                  }}
                  placeholder="ພິມຊື່ຄົນເຈັບ..."
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.toothNumber} *
                  </label>
                  <select
                    value={ehrForm.toothNumber}
                    onChange={(e) => setEhrForm({ ...ehrForm, toothNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-mono font-bold"
                  >
                    {[...UPPER_TEETH, ...LOWER_TEETH, 'ທັງປາກ (Full Mouth)'].map((tNum) => (
                      <option key={tNum} value={tNum}>
                        {tNum}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <CreatableSelect
                label={`${t.diagnosis} (ພະຍາດແຂ້ວ ຫຼື ເຮັດຄວາມງາມແຂ້ວ)`}
                required
                value={ehrForm.diagnosis}
                options={DIAGNOSIS_PRESETS_LAO}
                onChange={(val) => setEhrForm({ ...ehrForm, diagnosis: val })}
                placeholder="ພິມການບົ່ງມະຕິພະຍາດແຂ້ວ ຫຼື ຄວາມງາມແຂ້ວ..."
              />

              <CreatableSelect
                label={t.procedure}
                required
                value={ehrForm.procedure}
                options={INCOME_CATEGORIES_LAO}
                onChange={(val) => setEhrForm({ ...ehrForm, procedure: val })}
                placeholder="ພິມຫັດຖະການປິ່ນປົວ..."
              />

              <CreatableSelect
                label={t.prescription}
                value={ehrForm.prescription}
                options={PRESCRIPTION_PRESETS_LAO}
                onChange={(val) => setEhrForm({ ...ehrForm, prescription: val })}
                placeholder="ພິມຊື່ຢາ ແລະ ຂະໜາດທີ່ສັ່ງຈ່າຍ..."
              />

              <CreatableSelect
                label="ບັນທຶກອາການ (Clinical Notes)"
                value={ehrForm.clinicalNotes}
                options={CLINICAL_NOTES_PRESETS_LAO}
                onChange={(val) => setEhrForm({ ...ehrForm, clinicalNotes: val })}
                placeholder="ພິມບັນທຶກອາການຄົນເຈັບ..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <CreatableSelect
                  label={t.dentist}
                  required
                  value={ehrForm.dentistName}
                  options={dentistOptions}
                  onChange={(val) => setEhrForm({ ...ehrForm, dentistName: val })}
                  placeholder="ພິມຊື່ທັນຕະແພດ..."
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.date} *
                  </label>
                  <input
                    required
                    type="date"
                    value={ehrForm.visitDate}
                    onChange={(e) => setEhrForm({ ...ehrForm, visitDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.feeLak} *
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={ehrForm.feeLak}
                    onChange={(e) => setEhrForm({ ...ehrForm, feeLak: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono font-bold text-teal-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEhrModal(false)}
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
