import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ClinicFile, ClinicFileCategory } from '../types';

/**
 * Generates a UTF-8 BOM CSV file, triggers browser download, AND automatically
 * stores a persistent copy of the file in Firebase Firestore (/clinic_files).
 */
export async function exportAndSaveCsvToFirebase(params: {
  uid: string;
  fileName: string;
  category: ClinicFileCategory;
  headers: string[];
  rows: (string | number | undefined)[][];
  notes?: string;
}): Promise<void> {
  const { uid, fileName, category, headers, rows, notes = '' } = params;

  const escapeCsv = (val: string | number | undefined) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvBody = [
    headers.join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
  ].join('\n');

  const csvContent = '\uFEFF' + csvBody;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // 1. Trigger local browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);

  // 2. Store file in Firebase Firestore (/clinic_files) if within 850KB document limit
  if (csvContent.length <= 850000) {
    try {
      await addDoc(collection(db, 'clinic_files'), {
        fileName: fileName.slice(0, 180),
        category,
        mimeType: 'text/csv;charset=utf-8;',
        sizeBytes: blob.size,
        contentData: csvContent,
        notes: (notes || `Auto-saved ${category} CSV report (${rows.length} rows)`).slice(0, 300),
        ownerId: uid,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'clinic_files');
    }
  }
}

/**
 * Re-downloads any file stored in Firebase Firestore (/clinic_files).
 */
export function downloadStoredFirebaseFile(file: ClinicFile): void {
  if (file.contentData.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = file.contentData;
    a.download = file.fileName;
    a.click();
    return;
  }

  const blob = new Blob([file.contentData], {
    type: file.mimeType || 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.fileName;
  a.click();
  URL.revokeObjectURL(url);
}
