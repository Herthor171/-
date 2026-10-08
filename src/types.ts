export type Lang = 'lo' | 'en';
export type UserRole = 'Admin' | 'Dentist' | 'Receptionist' | 'Assistant';

export const INCOME_CATEGORIES_LAO = [
  'ກວດ ແລະ ໃຫ້ຄຳປຶກສາ',
  'ຂູດຫີນປູນ / ທຳຄວາມສະອາດແຂ້ວ',
  'ອຸດແຂ້ວ',
  'ຖອນແຂ້ວ / ຜ່າຕັດແຂ້ວຄຸດ',
  'ຮັກສາຮາກແຂ້ວ',
  'ຂາຍແຂ້ວປອມ (ຖອດໄດ້)',
  'ຄອບແຂ້ວ / ສະພານແຂ້ວ',
  'ຝັງຮາກແຂ້ວທຽມ (Implant)',
  'ຈັດແຂ້ວ (ເຫຼັກ / ໃສ)',
  'ຟອກແຂ້ວຂາວ / ວີເນຍ',
  'ຖ່າຍພາບເອັກສະເຣ',
  'ຂາຍຢາ ແລະ ຜະລິດຕະພັນ',
  'ລາຍຮັບອື່ນໆ',
];

export const EXPENSE_CATEGORIES_LAO = [
  'ເງິນເດືອນພະນັກງານ',
  'ວັດສະດຸທັນຕະກຳ',
  'ຢາ ແລະ ເວຊະພັນ',
  'ອຸປະກອນຝັງແຂ້ວ (Implant parts)',
  'ຄ່າແລັບເຮັດແຂ້ວ',
  'ຄ່າໄຟຟ້າ',
  'ຄ່ານ້ຳປະປາ',
  'ຄ່າອິນເຕີເນັດ / ໂທລະສັບ',
  'ຄ່າເຊົ່າສະຖານທີ່',
  'ສ້ອມແປງ / ບຳລຸງຮັກສາອຸປະກອນ',
  'ຊື້ອຸປະກອນ / ເຄື່ອງມືໃໝ່',
  'ຂ້າເຊື້ອ / ກຳຈັດຂີ້ເຫຍື້ອການແພດ',
  'ເຄື່ອງໃຊ້ຫ້ອງການ',
  'ການຕະຫຼາດ / ໂຄສະນາ',
  'ອາກອນ / ໃບອະນຸຍາດ / ຄ່າທຳນຽມ',
  'ຄ່າທຳນຽມທະນາຄານ',
  'ອາຫານ / ສະຫວັດດີການພະນັກງານ',
  'ຄ່າຂົນສົ່ງ / ນ້ຳມັນ',
  'ລາຍຈ່າຍອື່ນໆ',
];

export const INCOME_DESCRIPTIONS_LAO = [
  'ຊຳລະຄ່າປິ່ນປົວແຂ້ວຄົບຈຳນວນ',
  'ຊຳລະຄ່າມັດຈຳ / ຜ່ອນຈ່າຍງວດທຳອິດ',
  'ຊຳລະຄ່າຜ່ອນຈັດແຂ້ວປະຈຳເດືອນ',
  'ຊຳລະຄ່າຝັງຮາກແຂ້ວທຽມ (Implant)',
  'ຊຳລະຄ່າຂູດຫີນປູນ ແລະ ຂັດແຂ້ວຂາວ',
  'ຊຳລະຄ່າອຸດແຂ້ວດ້ວຍວັດສະດຸສີເໝືອນແຂ້ວ (Composite)',
  'ຊຳລະຄ່າຮັກສາຮາກແຂ້ວ ແລະ ຄອບແຂ້ວ Zirconia',
  'ຊຳລະຄ່າຜ່າຕັດແຂ້ວຊາວ / ຖອນແຂ້ວ',
  'ຊຳລະຄ່າຟອກແຂ້ວຂາວ / ວີເນຍຄວາມງາມ',
  'ຊື້ຢາ ແລະ ຜະລິດຕະພັນດູແລຊ່ອງປາກ',
];

export const EXPENSE_DESCRIPTIONS_LAO = [
  'ຈ່າຍເງິນເດືອນພະນັກງານປະຈຳເດືອນ',
  'ສັ່ງຊື້ວັດສະດຸທັນຕະກຳ ແລະ ຢາຊາ',
  'ຈ່າຍຄ່າແລັບເຮັດແຂ້ວປອມ / ຄອບແຂ້ວ',
  'ຈ່າຍຄ່າອຸປະກອນຮາກແຂ້ວທຽມ (Implant Fixture)',
  'ຈ່າຍຄ່າໄຟຟ້າ ແລະ ນ້ຳປະປາປະຈຳເດືອນ',
  'ຈ່າຍຄ່າອິນເຕີເນັດ ແລະ ໂທລະສັບຄລີນິກ',
  'ຈ່າຍຄ່າເຊົ່າອາຄານສະຖານທີ່ຄລີນິກ',
  'ຈ່າຍຄ່າບຳລຸງຮັກສາເກົ້າອີ້ທັນຕະກຳ ແລະ ເຄື່ອງມື',
  'ຈ່າຍຄ່າກຳຈັດຂີ້ເຫຍື້ອທາງການແພດ ແລະ ນ້ຳຢາຂ້າເຊື້ອ',
  'ຈ່າຍຄ່າໂຄສະນາການຕະຫຼາດ (Facebook / TikTok)',
];

export const DIAGNOSIS_PRESETS_LAO = [
  'ແຂ້ວแมງ / ແຂ້ວຜຸ (Dental Caries)',
  'ອັກເສບໂພງປະສາດແຂ້ວ (Pulpitis Irreversible)',
  'ຫີນປູນ ແລະ ເຫືອກອັກເສບ (Dental Calculus & Gingivitis)',
  'ພະຍາດปริທັນອັກເສບ (Periodontitis)',
  'ແຂ້ວຊາວຄຸດ / ແຂ້ວຝັງ (Impacted Wisdom Tooth)',
  'ແຂ້ວຊ້ອນເກ, ແຂ້ວຫ່າງ, ແຂ້ວຍື່ນ (Malocclusion / Orthodontics)',
  'ສູນເສຍແຂ້ວທຳມະຊາດ - ຕ້ອງການໃສ່ຮາກແຂ້ວທຽມ (Missing Tooth for Implant)',
  'ແຂ້ວເຫຼືອງ / ຕ້ອງການຟອກແຂ້ວຂາວເພື່ອຄວາມງາມ (Tooth Discoloration / Esthetic Bleaching)',
  'ແຂ້ວບິ່ນ / ຕ້ອງການເຮັດວີເນຍເຊຣາມິກ (Chipped Tooth / Esthetic Veneers)',
  'ປັບຮູບຮ່າງຮອຍຍິ້ມ (Smile Makeover / Cosmetic Dentistry)',
  'ແຂ້ວສึกກ່ອນ / เสียวແຂ້ວ (Tooth Abrasion & Sensitivity)',
];

export const PRESCRIPTION_PRESETS_LAO = [
  'ບໍ່ມີການສັ່ງຢາ (No Medication Required)',
  'Amoxicillin 500mg (ກິນ 1 ເມັດ 3 ເວລາ ຫຼັງອາຫານ 5-7 ວັນ) + Paracetamol 500mg',
  'Amoxicillin/Clavulanate (Augmentin) 625mg (1x2 ຫຼັງອາຫານ 5 ວັນ) + Ibuprofen 400mg',
  'Clindamycin 300mg (ສຳລັບຜູ້ແພ້ Penicillin 1x3 ຫຼັງອາຫານ 5 ວັນ) + Mefenamic Acid 500mg',
  'Metronidazole 400mg (1x3 ຫຼັງອາຫານ 5 ວັນ) + Amoxicillin 500mg',
  'Ibuprofen 400mg (ກິນເມື່ອປວດ ຫຼັງອາຫານທັນທີ) + ນ້ຳຢາບ້ວນປາກ Chlorhexidine 0.12%',
  'Paracetamol 500mg (ກິນເມື່ອປວດ ທຸກ 4-6 ຊົ່ວໂມງ)',
  'ນ້ຳຢາບ້ວນປາກຂ້າເຊື້ອ Chlorhexidine 0.12% + ຢາສີແຂ້ວລົດອາການສຽວແຂ້ວ',
];

export const CLINICAL_NOTES_PRESETS_LAO = [
  'ການປິ່ນປົວສຳເລັດດ້ວຍດີ ຄົນເຈັບບໍ່ມີອາການແຊກຊ້ອນ',
  'ແນະນຳການດູແລອະນາໄມຊ່ອງປາກ ແລະ ນັດກວດຕິດຕາມອາການອີກ 1 ອາທິດ',
  'ແນະນຳກັດຜ້າກ໊ອດແໜ້ນໆ 1 ຊົ່ວໂມງ ຫຼັງຖອນແຂ້ວ ແລະ งົດອາຫານຮ້ອນ/เผັດ',
  'ຄົນເຈັບມີປະຫວັດແພ້ຢາ Penicillin ໄດ້ປ່ຽນໃຊ້ຢາກຸ່ມ Clindamycin ແທນແລ້ວ',
  'ປັບເຄື່ອງມືຈັດແຂ້ວ ແລະ ປ່ຽນຢາງຈັດແຂ້ວ ນັດຄັ້ງຕໍ່ໄປອີກ 1 ເດືອນ',
  'ພິມປາກສົ່ງແລັບເຮັດຄອບແຂ້ວ/ແຂ້ວປອມ ນັດໃສ່ແຂ້ວອີກ 5-7 ວັນ',
  'ຝັງຮາກແຂ້ວທຽມສຳເລັດ ຄວາມໜາແໜ້ນກະດູກດີ ນັດຕັດໄໝອີກ 7-10 ວັນ',
  'ຟອກແຂ້ວຂາວສຳເລັດ ແນະນຳງົດຊາ, ກາເຟ ແລະ ອາຫານສີເຂັ້ມ 48 ຊົ່ວໂມງ',
];

export const ALLERGY_PRESETS_LAO = [
  'ບໍ່ມີປະຫວັດແພ້ຢາ (None)',
  'ແພ້ຢາ Penicillin / Amoxicillin',
  'ແພ້ຢາແກ້ປວດກຸ່ມ NSAIDs (Ibuprofen / Aspirin)',
  'ແພ້ຢາ Sulfa (Sulfonamides)',
  'ແພ້ຢາຊາສະເພາະຈຸດ (Local Anesthetic Sensitivity)',
  'ແພ້ຖົງມືຢາງທຳມະຊາດ (Latex Allergy)',
];

export const MEDICAL_HISTORY_PRESETS_LAO = [
  'ສຸຂະພາບແຂງແຮງປົກກະຕິ ບໍ່ມີພະຍາດປະຈຳໂຕ',
  'ຄວາມດັນເລືອດສູງ (ກິນຢາຄວບຄຸມປົກກະຕິ)',
  'ເບົາຫວານ (ຄວບຄຸມລະດັບນ້ຳຕານໃນເລືອດແລ້ວ)',
  'ພະຍາດຫົວໃຈ / ກິນຢາละລາຍລິ່ມເລືອດ (ຕ້ອງລະວັງເລືອດໄຫຼ)',
  'ພະຍາດຫອບຫືດ / ພູມແພ້',
  'ກຳລັງຖືພາ (Pregnant - ລະວັງການສ່ອງເອັກສະເຣ ແລະ ການໃຊ້ຢາ)',
];

export const APPOINTMENT_NOTES_PRESETS_LAO = [
  'ກະລຸນາມາຮອດຄລີນິກກ່ອນເວລານັດ 10 ນາທີ',
  'ນັດກວດຕິດຕາມອາການ ແລະ ຕັດໄໝ',
  'ນັດປັບເຄື່ອງມືຈັດແຂ້ວປະຈຳເດືອນ ແລະ ຊຳລະຄ່າຜ່ອນ',
  'ນັດໃສ່ຄອບແຂ້ວ / ແຂ້ວປອມຈາກແລັບ',
  'ຄົນເຈັບແພ້ຢາ Penicillin (ກະລຸນາກວດປະຫວັດ EHR ກ່ອນປິ່ນປົວ)',
  'ນັດຟອກແຂ້ວຂາວ / ວີເນຍຄວາມງາມ',
];

export const STAFF_ROLES_LAO = [
  'Admin (ຜູ້ບໍລິຫານ)',
  'ທັນຕະແພດ (Dentist)',
  'ພະນັກງານຕ້ອນຮັບ (Receptionist)',
  'ຜູ້ຊ່ວຍທັນຕະແພດ (Assistant)',
  'ການຕະຫຼາດ (Marketing)',
  'ບັນຊີ (Accountant)',
  'ແມ່ບ້ານ (Housekeeper)',
  'ຍາມ / ຮັກສາຄວາມປອດໄພ (Security Guard)',
];

export const STAFF_SPECIALTIES_LAO = [
  'ຜູ້ອຳນວຍການຄລີນິກ & ທັນຕະແພດຮາກແຂ້ວທຽມ (Implantologist)',
  'ທັນຕະແພດຈັດແຂ້ວ (Orthodontist)',
  'ທັນຕະແພດຄວາມງາມ & ວີເນຍ (Cosmetic & Veneer Dentist)',
  'ທັນຕະແພດຮັກສາຮາກແຂ້ວ (Endodontist)',
  'ທັນຕະແພດຜ່າຕັດຊ່ອງປາກ (Oral Surgeon)',
  'ທັນຕະແພດທົ່ວໄປ (General Dentist)',
  'ພະນັກງານຕ້ອນຮັບ & ການເງິນ (Reception & Billing)',
  'ຜູ້ຊ່ວຍທັນຕະແພດ & ປອດເຊື້ອ (Dental Assistant & Sterilization)',
];

export const STAFF_SHIFTS_LAO = [
  'ຈັນ - ເສົາ (08:30 - 17:30)',
  'ຈັນ - ອາທິດ (09:00 - 18:00)',
  'ອັງຄານ - ອາທິດ (08:30 - 17:30)',
  'ກະເຊົ້າ (08:00 - 14:00)',
  'ກະບ່າຍ-ແລງ (13:00 - 20:00)',
  'Part-Time / ຕາມຄິວນັດໝາຍ',
];

export const INVENTORY_SUPPLIERS_LAO = [
  'Lao Dental Care Import',
  'Vientiane MedSupply Co.',
  'Mekong Healthcare Lao',
  'Osstem Implant Lao Distributor',
  '3M Healthcare Vientiane',
  'Bangkok Ortho Dental Supply',
];

export const INVENTORY_PRESET_ITEMS_LAO = [
  { name: 'ຖົງມືຢາງ', defaultUnit: 'ກ່ອງ (Boxes)', category: 'PPE' as const },
  { name: 'ໜ້າກາກອະນາໄມ', defaultUnit: 'ກ່ອງ (Boxes)', category: 'PPE' as const },
  { name: 'ຢາຊາ (Lidocaine)', defaultUnit: 'ກ່ອງ (Boxes)', category: 'Anesthetics' as const },
  { name: 'ວັດສະດຸອຸດແຂ້ວ (Composite)', defaultUnit: 'ຫຼອດ (Syringes)', category: 'Consumables' as const },
  { name: 'ສຳລີ / ຜ້າກ໊ອດ', defaultUnit: 'ຫໍ່ (Packs)', category: 'Consumables' as const },
  { name: 'ເຂັມສັກຢາ', defaultUnit: 'ກ່ອງ (Boxes)', category: 'Consumables' as const },
  { name: 'ວັດສະດຸພິມປາກ (Alginate)', defaultUnit: 'ຖົງ (Bags)', category: 'Prosthetics' as const },
  { name: 'ຫຼອດດູດນ້ຳລາຍ', defaultUnit: 'ຫໍ່ (Packs)', category: 'Consumables' as const },
  { name: 'ນ້ຳຢາຂ້າເຊື້ອ', defaultUnit: 'ກະປ໋ອງ (Bottles)', category: 'Consumables' as const },
  { name: 'ຈອກບ້ວນປາກ', defaultUnit: 'ແພັກ (Packs)', category: 'Consumables' as const },
  { name: 'ຟິມ / ເຊັນເຊີເອັກສະເຣ', defaultUnit: 'ກ່ອງ (Boxes)', category: 'Instruments' as const },
  { name: 'ຮາກແຂ້ວທຽມ (Fixture)', defaultUnit: 'ຊຸດ (Sets)', category: 'Prosthetics' as const },
];

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  allergies: string;
  medicalHistory: string;
  dentalChartNotes: string;
  lastVisit: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  dentistName: string;
  treatmentType: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled';
  reminderStatus: 'Pending' | 'Queued' | 'Sent';
  reminderChannel: 'WhatsApp' | 'SMS' | 'Phone';
  notes: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface EhrRecord {
  id: string;
  patientId: string;
  patientName: string;
  visitDate: string;
  toothNumber: string;
  diagnosis: string;
  procedure: string;
  prescription: string;
  dentistName: string;
  feeLak: number;
  clinicalNotes: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface InventoryItem {
  id: string;
  itemName: string;
  sku: string;
  category: 'Consumables' | 'Instruments' | 'Orthodontics' | 'Anesthetics' | 'PPE' | 'Prosthetics';
  carriedForwardQty?: number;
  quantity: number;
  minThreshold: number;
  unit: string;
  unitCostLak: number;
  supplier: string;
  expiryDate: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Transaction {
  id: string;
  txDate: string;
  txMonth: string; // YYYY-MM
  txType: 'Income' | 'Expense';
  category: string;
  description: string;
  amountLak: number;
  discountLak?: number;
  paidAmountLak?: number;
  balanceDueLak?: number;
  nextPaymentDate?: string;
  installmentCount?: number;
  customerPhone?: string;
  debtReminderStatus?: 'None' | 'Pending' | 'Sent';
  paymentMethod: 'BCEL OnePay' | 'Cash' | 'Bank Transfer' | 'Card' | 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)';
  referenceName: string;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  specialty: string;
  shiftSchedule: string;
  baseSalaryLak: number;
  salaryAdvanceLak?: number;
  bonusLak?: number;
  commissionLak?: number;
  lastPaidMonth?: string;
  activeStatus: 'Active' | 'On Leave' | 'Inactive';
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface BackupLog {
  id: string;
  backupDate: string;
  backupType: 'Google Sheets Sync' | 'Cloud JSON Snapshot';
  spreadsheetId: string;
  spreadsheetUrl: string;
  recordsCount: number;
  status: 'Completed' | 'Failed';
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  persona: string;
  modelUsed: string;
  ownerId: string;
  createdAt?: any;
}

export type ClinicFileCategory =
  | 'Patients'
  | 'EHR'
  | 'Appointments'
  | 'Inventory'
  | 'Financials'
  | 'Payroll'
  | 'Uploaded Document';

export interface ClinicFile {
  id: string;
  fileName: string;
  category: ClinicFileCategory;
  mimeType: string;
  sizeBytes: number;
  contentData: string;
  notes: string;
  ownerId: string;
  createdAt?: any;
}


