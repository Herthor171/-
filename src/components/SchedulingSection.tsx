import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import {
  Bell,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { translations } from '../i18n';
import {
  APPOINTMENT_NOTES_PRESETS_LAO,
  Appointment,
  INCOME_CATEGORIES_LAO,
  Lang,
  Patient,
  StaffMember,
  UserRole,
} from '../types';
import { CreatableSelect } from './CreatableSelect';
import { exportAndSaveCsvToFirebase } from '../utils/firebaseFileStorage';

interface Props {
  lang: Lang;
  uid: string;
  role: UserRole;
  appointments: Appointment[];
  patients: Patient[];
  staff: StaffMember[];
  onConfirmDelete: (collectionName: string, docId: string, label: string) => void;
}

export const SchedulingSection: React.FC<Props> = ({
  lang,
  uid,
  role,
  appointments,
  patients,
  staff,
  onConfirmDelete,
}) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showModal, setShowModal] = useState(false);
  const [editingAptId, setEditingAptId] = useState<string | null>(null);
  const [selectedReminderApt, setSelectedReminderApt] = useState<Appointment | null>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);

  const dentistOptions = Array.from(
    new Set([
      'ທ່ານໝໍ ດຣ. ລັດຕະນະ ວົງພະຈັນ',
      'ທ່ານໝໍ ດຣ. ຄຳແພງ ສີຫາລາດ',
      ...staff
        .filter(
          (s) =>
            s.role.includes('Dentist') ||
            s.role.includes('ທັນຕະແພດ') ||
            s.role.includes('Admin')
        )
        .map((s) => s.fullName),
    ])
  );

  const [form, setForm] = useState({
    patientId: '',
    patientName: '',
    patientPhone: '',
    dentistName: dentistOptions[0],
    treatmentType: INCOME_CATEGORIES_LAO[0],
    appointmentDate: new Date().toISOString().slice(0, 10),
    appointmentTime: '09:30',
    status: 'Scheduled' as Appointment['status'],
    reminderChannel: 'WhatsApp' as Appointment['reminderChannel'],
    notes: APPOINTMENT_NOTES_PRESETS_LAO[0],
  });

  const canModify = role === 'Admin' || role === 'Dentist' || role === 'Receptionist';
  const isAdmin = role === 'Admin';

  const filtered = appointments.filter((a) => {
    const matchesSearch =
      a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.patientPhone.toLowerCase().includes(search.toLowerCase()) ||
      a.treatmentType.toLowerCase().includes(search.toLowerCase()) ||
      a.dentistName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openNewAppointmentModal = () => {
    setEditingAptId(null);
    setForm({
      patientId: patients[0]?.id || '',
      patientName: patients[0]?.fullName || '',
      patientPhone: patients[0]?.phone || '',
      dentistName: dentistOptions[0],
      treatmentType: INCOME_CATEGORIES_LAO[0],
      appointmentDate: new Date().toISOString().slice(0, 10),
      appointmentTime: '09:30',
      status: 'Scheduled',
      reminderChannel: 'WhatsApp',
      notes: APPOINTMENT_NOTES_PRESETS_LAO[0],
    });
    setShowModal(true);
  };

  const openEditAppointmentModal = (apt: Appointment) => {
    setEditingAptId(apt.id);
    setForm({
      patientId: apt.patientId,
      patientName: apt.patientName,
      patientPhone: apt.patientPhone,
      dentistName: apt.dentistName,
      treatmentType: apt.treatmentType,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.appointmentTime,
      status: apt.status,
      reminderChannel: apt.reminderChannel,
      notes: apt.notes,
    });
    setShowModal(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify) return;
    const payload = {
      patientId: (form.patientId || 'walkin_01').slice(0, 128),
      patientName: form.patientName.trim().slice(0, 120),
      patientPhone: form.patientPhone.trim().slice(0, 40),
      dentistName: form.dentistName.trim().slice(0, 120),
      treatmentType: form.treatmentType.trim().slice(0, 150),
      appointmentDate: form.appointmentDate.slice(0, 30),
      appointmentTime: form.appointmentTime.slice(0, 20),
      status: form.status,
      reminderChannel: form.reminderChannel,
      notes: form.notes.trim().slice(0, 500),
      updatedAt: serverTimestamp(),
    };

    if (editingAptId) {
      try {
        await updateDoc(doc(db, 'appointments', editingAptId), payload);
        setShowModal(false);
        setEditingAptId(null);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `appointments/${editingAptId}`);
      }
    } else {
      try {
        await addDoc(collection(db, 'appointments'), {
          ...payload,
          reminderStatus: 'Pending',
          ownerId: uid,
          createdAt: serverTimestamp(),
        });
        setShowModal(false);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'appointments');
      }
    }
  };

  const handleSendReminder = async (apt: Appointment) => {
    if (!canModify) return;
    setDispatchingId(apt.id);
    setSelectedReminderApt(apt);
    try {
      await updateDoc(doc(db, 'appointments', apt.id), {
        reminderStatus: 'Sent',
        status: apt.status === 'Scheduled' ? 'Confirmed' : apt.status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${apt.id}`);
    } finally {
      setDispatchingId(null);
    }
  };

  const handleBatchReminders = async () => {
    if (!canModify) return;
    const pendingList = appointments.filter((a) => a.reminderStatus !== 'Sent');
    for (const apt of pendingList) {
      try {
        await updateDoc(doc(db, 'appointments', apt.id), {
          reminderStatus: 'Sent',
          status: apt.status === 'Scheduled' ? 'Confirmed' : apt.status,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `appointments/${apt.id}`);
      }
    }
  };

  const handleMarkStatus = async (apt: Appointment, nextStatus: Appointment['status']) => {
    if (!canModify) return;
    try {
      await updateDoc(doc(db, 'appointments', apt.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `appointments/${apt.id}`);
    }
  };

  const handleExportAppointmentsCsv = async () => {
    const headers = [
      'Date',
      'Time',
      'Patient Name',
      'Phone',
      'Dentist',
      'Treatment Type',
      'Status',
      'Reminder Status',
      'Reminder Channel',
      'Notes',
    ];
    const rows = filtered.map((apt) => [
      apt.appointmentDate,
      apt.appointmentTime,
      apt.patientName,
      apt.patientPhone,
      apt.dentistName,
      apt.treatmentType,
      apt.status,
      apt.reminderStatus,
      apt.reminderChannel,
      apt.notes,
    ]);
    const today = new Date().toISOString().slice(0, 10);
    await exportAndSaveCsvToFirebase({
      uid,
      fileName: `LK_Dental_Appointments_${today}.csv`,
      category: 'Appointments',
      headers,
      rows,
      notes: `ຕາຕະລາງນັດໝາຍຄົນເຈັບ (${rows.length} ລາຍການ)`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.scheduleTitle}</h2>
          <p className="text-sm text-slate-600 mt-1">{t.scheduleDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportAppointmentsCsv}
            className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            {lang === 'lo' ? 'ດາວໂຫຼດຕາຕະລາງນັດໝາຍ (CSV)' : 'Download Appointments (CSV)'}
          </button>
          {canModify && (
            <>
              <button
                onClick={handleBatchReminders}
                className="px-3.5 py-2 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                {t.sendBatchReminders}
              </button>
              <button
                onClick={openNewAppointmentModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t.newAppointment}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Automated Reminder Message Preview Banner */}
      {selectedReminderApt && (
        <div className="bg-white border border-teal-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-800">
              <MessageSquare className="w-4 h-4 text-teal-700" />
              <span>{t.reminderPreviewTitle}</span>
              <span aria-hidden="true">·</span>
              <span>{selectedReminderApt.reminderChannel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{selectedReminderApt.patientPhone}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              “ສະບາຍດີ {selectedReminderApt.patientName}, ຄລີນິກແຂ້ວ LK Smile ຂໍແຈ້ງເຕືອນຄິວນັດໝາຍປິ່ນປົວ ({selectedReminderApt.treatmentType}) ກັບ {selectedReminderApt.dentistName} ໃນວັນທີ {selectedReminderApt.appointmentDate} ເວລາ {selectedReminderApt.appointmentTime}. ກະລຸນາມາຮອດກ່ອນເວລາ 10 ນາທີ. ຂໍຂອບໃຈ!”
            </p>
          </div>
          <button
            onClick={() => setSelectedReminderApt(null)}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 whitespace-nowrap"
          >
            {t.cancel}
          </button>
        </div>
      )}

      {/* Search & Segmented Status Filter */}
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
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          {['All', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'All' ? t.allFilter : st}
            </button>
          ))}
        </div>
      </div>

      {/* High-density Schedule Data Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-900">
                <th className="py-3 px-4">
                  {t.date} / {t.time}
                </th>
                <th className="py-3 px-4">{t.patientName}</th>
                <th className="py-3 px-4">{t.treatment}</th>
                <th className="py-3 px-4">{t.dentist}</th>
                <th className="py-3 px-4">{t.status}</th>
                <th className="py-3 px-4">{t.reminderStatus}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    ບໍ່ພົບລາຍການນັດໝາຍ (No appointments matching filter)
                  </td>
                </tr>
              ) : (
                filtered.map((apt) => (
                  <tr
                    key={apt.id}
                    onClick={() => isAdmin && openEditAppointmentModal(apt)}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isAdmin ? 'cursor-pointer' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-800 whitespace-nowrap">
                      <div>{apt.appointmentDate}</div>
                      <div className="text-slate-500">{apt.appointmentTime}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{apt.patientName}</div>
                      <div className="text-xs font-mono text-slate-500">{apt.patientPhone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{apt.treatmentType}</div>
                      {apt.notes && (
                        <div className="text-xs text-slate-500 mt-0.5">{apt.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{apt.dentistName}</td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      <span
                        className={
                          apt.status === 'Completed'
                            ? 'text-emerald-700 font-bold'
                            : apt.status === 'Confirmed'
                            ? 'text-teal-700 font-bold'
                            : apt.status === 'Cancelled'
                            ? 'text-rose-600 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap text-slate-600">
                      <span>{apt.reminderStatus}</span>
                      <span aria-hidden="true" className="mx-1.5">
                        ·
                      </span>
                      <span>{apt.reminderChannel}</span>
                    </td>
                    <td
                      className="py-3 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        {canModify && (
                          <button
                            onClick={() => openEditAppointmentModal(apt)}
                            className="px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded inline-flex items-center gap-1"
                          >
                            <Pencil className="w-3 h-3" />
                            ແກ້ໄຂ
                          </button>
                        )}
                        {canModify && (
                          <button
                            onClick={() => handleSendReminder(apt)}
                            disabled={dispatchingId === apt.id}
                            className="px-2.5 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-md transition-colors inline-flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            {t.sendReminderBtn}
                          </button>
                        )}
                        {canModify && apt.status !== 'Completed' && (
                          <button
                            onClick={() => handleMarkStatus(apt, 'Completed')}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-md transition-colors inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {t.markCompleted}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() =>
                              onConfirmDelete('appointments', apt.id, apt.patientName)
                            }
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                            title={t.delete}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Appointment Modal with Creatable Dropdowns */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-700" />
                {editingAptId
                  ? 'ແກ້ໄຂລາຍການນັດໝາຍ (Edit Appointment)'
                  : t.newAppointment}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                {t.cancel}
              </button>
            </div>
            <form onSubmit={handleSaveAppointment} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CreatableSelect
                  label={t.patientName}
                  required
                  value={form.patientName}
                  options={
                    patients.length > 0
                      ? patients.map((p) => p.fullName)
                      : ['ທ້າວ ສົມພອນ ພົມມະວົງ']
                  }
                  onChange={(val) => {
                    const matched = patients.find((p) => p.fullName === val);
                    setForm({
                      ...form,
                      patientName: val,
                      patientId: matched ? matched.id : form.patientId,
                      patientPhone: matched ? matched.phone : form.patientPhone,
                    });
                  }}
                  placeholder="ພິມຊື່ຄົນເຈັບໃໝ່..."
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.phone} *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.patientPhone}
                    onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CreatableSelect
                  label={t.dentist}
                  required
                  value={form.dentistName}
                  options={dentistOptions}
                  onChange={(val) => setForm({ ...form, dentistName: val })}
                  placeholder="ພິມຊື່ທັນຕະແພດ..."
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.reminderChannel}
                  </label>
                  <select
                    value={form.reminderChannel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reminderChannel: e.target.value as Appointment['reminderChannel'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 font-medium"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS">SMS</option>
                    <option value="Phone">Phone Call</option>
                  </select>
                </div>
              </div>

              <CreatableSelect
                label={t.treatment}
                required
                value={form.treatmentType}
                options={INCOME_CATEGORIES_LAO}
                onChange={(val) => setForm({ ...form, treatmentType: val })}
                placeholder="ພິມລາຍການປິ່ນປົວ..."
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.date} *
                  </label>
                  <input
                    required
                    type="date"
                    value={form.appointmentDate}
                    onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.time} *
                  </label>
                  <input
                    required
                    type="time"
                    value={form.appointmentTime}
                    onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.status}
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as Appointment['status'] })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-medium"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <CreatableSelect
                label="ລາຍລະອຽດໝາຍເຫດ (Notes)"
                value={form.notes}
                options={APPOINTMENT_NOTES_PRESETS_LAO}
                onChange={(val) => setForm({ ...form, notes: val })}
                placeholder="ພິມໝາຍເຫດເພີ່ມເຕີມ..."
              />

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
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
