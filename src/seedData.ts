import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

export async function seedInitialClinicData(uid: string) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const samplePatients = [
    {
      id: 'pat_01',
      fullName: 'ທ້າວ ສົມພອນ ພົມມະວົງ (Sompone Phommavong)',
      phone: '020 5541 8890',
      age: 34,
      gender: 'Male',
      address: 'ບ້ານ ໂພນສະອາດ, ເມືອງ ໄຊເສດຖາ, ນະຄອນຫຼວງວຽງຈັນ',
      allergies: 'Penicillin (ແພ້ຢາເພນີຊີລິນ)',
      medicalHistory: 'ຄວາມດັນເລືອດປົກກະຕິ, ບໍ່ມີພະຍາດປະຈຳໂຕ',
      dentalChartNotes: 'ແຂ້ວເຫຼັ້ມ #16 ອຸດແຂ້ວດ້ວຍ Composite, #36 ຮັກສາຮາກແຂ້ວ',
      lastVisit: today,
    },
    {
      id: 'pat_02',
      fullName: 'ນາງ ມະນີວັນ ວົງສະຫວັນ (Manivanh Vongsavanh)',
      phone: '020 9982 3411',
      age: 27,
      gender: 'Female',
      address: 'ບ້ານ ສີຫອມ, ເມືອງ ຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
      allergies: 'ບໍ່ມີປະຫວັດແພ້ຢາ (None)',
      medicalHistory: 'ສຸຂະພາບແຂງແຮງດີ',
      dentalChartNotes: 'ຈັດແຂ້ວ (ເຫຼັກ / ໃສ) ແລະ ຂູດຫີນປູນປະຈຳປີ (#11-#21)',
      lastVisit: today,
    },
    {
      id: 'pat_03',
      fullName: 'ທ້າວ ບຸນມີ ສີສຸລິດ (Bounmy Sisoulith)',
      phone: '020 2234 7712',
      age: 48,
      gender: 'Male',
      address: 'ບ້ານ ດົງໂດກ, ເມືອງ ໄຊທານີ, ນະຄອນຫຼວງວຽງຈັນ',
      allergies: 'Aspirin',
      medicalHistory: 'ເບົາຫວານໄລຍະຕົ້ນ (ຄວບຄຸມລະດັບນ້ຳຕານແລ້ວ)',
      dentalChartNotes: 'ຝັງຮາກແຂ້ວທຽມ (Implant) ເຫຼັ້ມ #46 ແລະ ຄອບແຂ້ວ Zirconia',
      lastVisit: '2026-09-28',
    },
  ];

  const sampleAppointments = [
    {
      id: 'apt_01',
      patientId: 'pat_01',
      patientName: 'ທ້າວ ສົມພອນ ພົມມະວົງ (Sompone Phommavong)',
      patientPhone: '020 5541 8890',
      dentistName: 'ທ່ານໝໍ ດຣ. ລັດຕະນະ ວົງພະຈັນ',
      treatmentType: 'ຮັກສາຮາກແຂ້ວ & ຄອບແຂ້ວ (#36)',
      appointmentDate: today,
      appointmentTime: '09:30',
      status: 'Confirmed',
      reminderStatus: 'Pending',
      reminderChannel: 'WhatsApp',
      notes: 'ຄົນເຈັບແພ້ Penicillin, ໃຊ້ Clindamycin ແທນ',
    },
    {
      id: 'apt_02',
      patientId: 'pat_02',
      patientName: 'ນາງ ມະນີວັນ ວົງສະຫວັນ (Manivanh Vongsavanh)',
      patientPhone: '020 9982 3411',
      dentistName: 'ທ່ານໝໍ ດຣ. ຄຳແພງ ສີຫາລາດ',
      treatmentType: 'ຈັດແຂ້ວ (ເຫຼັກ / ໃສ) - ປັບເຄື່ອງມືເດືອນທີ 6',
      appointmentDate: today,
      appointmentTime: '11:00',
      status: 'Scheduled',
      reminderStatus: 'Pending',
      reminderChannel: 'SMS',
      notes: 'ນັດປ່ຽນຢາງຈັດແຂ້ວ ແລະ ຊຳລະຄ່າຜ່ອນຈັດແຂ້ວງວດທີ 3',
    },
  ];

  const sampleEhr = [
    {
      id: 'ehr_01',
      patientId: 'pat_01',
      patientName: 'ທ້າວ ສົມພອນ ພົມມະວົງ (Sompone Phommavong)',
      visitDate: today,
      toothNumber: '#36',
      diagnosis: 'Pulpitis Irreversible (ອັກເສບໂພງປະສາດແຂ້ວ #36)',
      procedure: 'ຮັກສາຮາກແຂ້ວ (Root Canal Therapy)',
      prescription: 'Clindamycin 300mg (1x3 ຫຼັງອາຫານ 5 ວັນ), Ibuprofen 400mg',
      dentistName: 'ທ່ານໝໍ ດຣ. ລັດຕະນະ ວົງພະຈັນ',
      feeLak: 1850000,
      clinicalNotes: 'ຄົນເຈັບແພ້ Penicillin, ປິ່ນປົວຄອງຮາກແຂ້ວສຳເລັດດ້ວຍດີ.',
    },
    {
      id: 'ehr_02',
      patientId: 'pat_02',
      patientName: 'ນາງ ມະນີວັນ ວົງສະຫວັນ (Manivanh Vongsavanh)',
      visitDate: today,
      toothNumber: '#11',
      diagnosis: 'Dental Crowding & Calculus',
      procedure: 'ຈັດແຂ້ວ (ເຫຼັກ / ໃສ) & ຂູດຫີນປູນ / ທຳຄວາມສະອາດແຂ້ວ',
      prescription: 'ນ້ຳຢາບ້ວນປາກ Chlorhexidine 0.12%',
      dentistName: 'ທ່ານໝໍ ດຣ. ຄຳແພງ ສີຫາລາດ',
      feeLak: 15000000,
      clinicalNotes: 'ແຜນຈັດແຂ້ວຜ່ອນຈ່າຍ 10 ງວດ.',
    },
  ];

  const sampleInventory = [
    {
      id: 'inv_01',
      itemName: 'ຢາຊາ (Lidocaine)',
      sku: 'LK-INV-001',
      category: 'Anesthetics',
      carriedForwardQty: 12,
      quantity: 3,
      minThreshold: 8,
      unit: 'ກ່ອງ (Boxes)',
      unitCostLak: 550000,
      supplier: 'Vientiane MedSupply Co.',
      expiryDate: '2027-08-15',
    },
    {
      id: 'inv_02',
      itemName: 'ວັດສະດຸອຸດແຂ້ວ (Composite)',
      sku: 'LK-INV-002',
      category: 'Consumables',
      carriedForwardQty: 8,
      quantity: 2,
      minThreshold: 5,
      unit: 'ຫຼອດ (Syringes)',
      unitCostLak: 920000,
      supplier: 'Lao Dental Care Import',
      expiryDate: '2027-05-20',
    },
    {
      id: 'inv_03',
      itemName: 'ຖົງມືຢາງ',
      sku: 'LK-INV-003',
      category: 'PPE',
      carriedForwardQty: 25,
      quantity: 4,
      minThreshold: 10,
      unit: 'ກ່ອງ (Boxes)',
      unitCostLak: 145000,
      supplier: 'Mekong Healthcare Lao',
      expiryDate: '2028-01-10',
    },
    {
      id: 'inv_04',
      itemName: 'ວັດສະດຸພິມປາກ (Alginate)',
      sku: 'LK-INV-004',
      category: 'Prosthetics',
      carriedForwardQty: 10,
      quantity: 14,
      minThreshold: 5,
      unit: 'ຖົງ (Bags)',
      unitCostLak: 260000,
      supplier: 'Lao Dental Care Import',
      expiryDate: '2027-11-30',
    },
    {
      id: 'inv_05',
      itemName: 'ຮາກແຂ້ວທຽມ (Fixture)',
      sku: 'LK-INV-005',
      category: 'Prosthetics',
      carriedForwardQty: 6,
      quantity: 9,
      minThreshold: 4,
      unit: 'ຊຸດ (Sets)',
      unitCostLak: 3200000,
      supplier: 'Osstem Lao Distributor',
      expiryDate: '2029-12-31',
    },
  ];

  const sampleTransactions = [
    {
      id: 'tx_01',
      txDate: today,
      txMonth: currentMonth,
      txType: 'Income',
      category: 'ຝັງຮາກແຂ້ວທຽມ (Implant)',
      description: 'ຝັງຮາກແຂ້ວທຽມ Titanium ເຫຼັ້ມ #46 (ຜ່ອນຈ່າຍ 3 ງວດ)',
      amountLak: 15000000,
      discountLak: 500000,
      paidAmountLak: 8500000,
      balanceDueLak: 6000000,
      nextPaymentDate: '2026-11-05',
      installmentCount: 2,
      customerPhone: '020 2234 7712',
      debtReminderStatus: 'Pending',
      paymentMethod: 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)',
      referenceName: 'ທ້າວ ບຸນມີ ສີສຸລິດ',
    },
    {
      id: 'tx_02',
      txDate: today,
      txMonth: currentMonth,
      txType: 'Income',
      category: 'ຈັດແຂ້ວ (ເຫຼັກ / ໃສ)',
      description: 'ແพັກເກັດຈັດແຂ້ວໃສ Clear Aligner (ຜ່ອນຈ່າຍລາຍເດືອນ)',
      amountLak: 18000000,
      discountLak: 1000000,
      paidAmountLak: 7000000,
      balanceDueLak: 10000000,
      nextPaymentDate: '2026-10-25',
      installmentCount: 5,
      customerPhone: '020 9982 3411',
      debtReminderStatus: 'Pending',
      paymentMethod: 'ຕິດໜີ້ / ຜ່ອນຈ່າຍ (Credit)',
      referenceName: 'ນາງ ມະນີວັນ ວົງສະຫວັນ',
    },
    {
      id: 'tx_03',
      txDate: today,
      txMonth: currentMonth,
      txType: 'Income',
      category: 'ຮັກສາຮາກແຂ້ວ',
      description: 'ຮັກສາຮາກແຂ້ວເຫຼັ້ມ #36 (ຈ່າຍຄົບ)',
      amountLak: 2000000,
      discountLak: 150000,
      paidAmountLak: 1850000,
      balanceDueLak: 0,
      nextPaymentDate: '',
      installmentCount: 0,
      customerPhone: '020 5541 8890',
      debtReminderStatus: 'None',
      paymentMethod: 'BCEL OnePay',
      referenceName: 'ທ້າວ ສົມພອນ ພົມມະວົງ',
    },
    {
      id: 'tx_04',
      txDate: today,
      txMonth: currentMonth,
      txType: 'Expense',
      category: 'ວັດສະດຸທັນຕະກຳ',
      description: 'ສັ່ງຊື້ວັດສະດຸອຸດແຂ້ວ Composite ແລະ ຢາຊາ Lidocaine',
      amountLak: 3450000,
      discountLak: 0,
      paidAmountLak: 3450000,
      balanceDueLak: 0,
      nextPaymentDate: '',
      installmentCount: 0,
      customerPhone: '',
      debtReminderStatus: 'None',
      paymentMethod: 'Bank Transfer',
      referenceName: 'Lao Dental Care Import',
    },
    {
      id: 'tx_05',
      txDate: today,
      txMonth: currentMonth,
      txType: 'Expense',
      category: 'ຄ່າແລັບເຮັດແຂ້ວ',
      description: 'ຄ່າແລັບເຮັດຄອບແຂ້ວ Zirconia 3 ຊີ່',
      amountLak: 2800000,
      discountLak: 0,
      paidAmountLak: 2800000,
      balanceDueLak: 0,
      nextPaymentDate: '',
      installmentCount: 0,
      customerPhone: '',
      debtReminderStatus: 'None',
      paymentMethod: 'BCEL OnePay',
      referenceName: 'Vientiane Dental Lab',
    },
  ];

  const sampleStaff = [
    {
      id: 'stf_01',
      fullName: 'ດຣ. ລັດຕະນະ ວົງພະຈັນ (Dr. Lattana Vongphachanh)',
      email: 'herthor12@gmail.com',
      phone: '020 5559 9911',
      role: 'Admin',
      specialty: 'ຜູ້ອຳນວຍການຄລີນິກ & ທັນຕະແພດຮາກແຂ້ວທຽມ',
      shiftSchedule: 'ຈັນ - ເສົາ (08:30 - 17:30)',
      baseSalaryLak: 18000000,
      salaryAdvanceLak: 2000000,
      bonusLak: 1500000,
      commissionLak: 3200000,
      lastPaidMonth: '2026-09',
      activeStatus: 'Active',
    },
    {
      id: 'stf_02',
      fullName: 'ດຣ. ຄຳແພງ ສີຫາລາດ (Dr. Khamphaeng Siharath)',
      email: 'khamphaeng.ortho@lksmile.la',
      phone: '020 5512 4433',
      role: 'Dentist',
      specialty: 'ທັນຕະແພດຈັດແຂ້ວ (Orthodontist)',
      shiftSchedule: 'ອັງຄານ - ອາທິດ (09:00 - 18:00)',
      baseSalaryLak: 15500000,
      salaryAdvanceLak: 1500000,
      bonusLak: 1000000,
      commissionLak: 2800000,
      lastPaidMonth: '2026-09',
      activeStatus: 'Active',
    },
    {
      id: 'stf_03',
      fullName: 'ນາງ ສຸກສະຫວັນ ແກ້ວມະນີ (Souksavanh Keomany)',
      email: 'frontdesk@lksmile.la',
      phone: '020 9911 2200',
      role: 'Receptionist',
      specialty: 'ພະນັກງານຕ້ອນຮັບ & ການເງິນ',
      shiftSchedule: 'ຈັນ - ເສົາ (08:00 - 17:00)',
      baseSalaryLak: 4800000,
      salaryAdvanceLak: 800000,
      bonusLak: 400000,
      commissionLak: 350000,
      lastPaidMonth: '2026-09',
      activeStatus: 'Active',
    },
    {
      id: 'stf_04',
      fullName: 'ນາງ ຈັນສຸດາ ພັນທະວົງ (Chansouda Phanthavong)',
      email: 'assistant@lksmile.la',
      phone: '020 7744 5566',
      role: 'Assistant',
      specialty: 'ຜູ້ຊ່ວຍທັນຕະແພດ & ປອດເຊື້ອ',
      shiftSchedule: 'ຈັນ - ເສົາ (08:30 - 17:30)',
      baseSalaryLak: 4500000,
      salaryAdvanceLak: 500000,
      bonusLak: 300000,
      commissionLak: 250000,
      lastPaidMonth: '2026-09',
      activeStatus: 'Active',
    },
  ];

  for (const p of samplePatients) {
    const { id, ...rest } = p;
    try {
      await setDoc(doc(db, 'patients', id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `patients/${id}`);
    }
  }

  for (const a of sampleAppointments) {
    const { id, ...rest } = a;
    try {
      await setDoc(doc(db, 'appointments', id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `appointments/${id}`);
    }
  }

  for (const ehr of sampleEhr) {
    const { id, ...rest } = ehr;
    try {
      await setDoc(doc(db, 'ehr_records', id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `ehr_records/${id}`);
    }
  }

  for (const inv of sampleInventory) {
    const { id, ...rest } = inv;
    try {
      await setDoc(doc(db, 'inventory', id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `inventory/${id}`);
    }
  }

  for (const tx of sampleTransactions) {
    const { id, ...rest } = tx;
    try {
      await setDoc(doc(db, 'transactions', id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `transactions/${id}`);
    }
  }

  for (const stf of sampleStaff) {
    const { id, ...rest } = stf;
    try {
      await setDoc(doc(db, 'staff', id), {
        ...rest,
        ownerId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `staff/${id}`);
    }
  }
}
