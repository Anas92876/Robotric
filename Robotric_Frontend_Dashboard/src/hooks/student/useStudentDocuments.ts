import { useState, useCallback, useEffect } from 'react';
import { api } from '../../lib/api';

export interface StudentDocument {
  _id: string;
  studentId: string;
  documentType: DocumentType;
  fileUrl: string;
  storagePath: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationNote?: string | null;
  verifiedBy?: { name: string } | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType =
  | 'national_id'
  | 'official_photo'
  | 'civil_registry'
  | 'family_record'
  | 'travel_permission';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, { ar: string; en: string }> = {
  national_id: { ar: 'هوية شخصية', en: 'National ID' },
  official_photo: { ar: 'صورة رسمية', en: 'Official Photo' },
  civil_registry: { ar: 'صورة إخراج قيد', en: 'Civil Registry Extract' },
  family_record: { ar: 'صورة دفتر عائلة', en: 'Family Record Book' },
  travel_permission: { ar: 'إذن سفر', en: 'Travel Permission' },
};

export const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'national_id',
  'official_photo',
  'civil_registry',
  'family_record',
  'travel_permission',
];

export function useStudentDocuments() {
  const [documents, setDocuments] = useState<StudentDocument[]>([]);
  const [wroRequired, setWroRequired] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocumentType | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/student/documents');
      setDocuments(res.data.data || []);
      setWroRequired(res.data.wroRequired ?? null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadDocument = useCallback(async (file: File, documentType: DocumentType) => {
    try {
      setUploading(documentType);
      setUploadProgress(0);
      setError(null);

      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);

      const res = await api.post('/student/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });

      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.documentType !== documentType);
        return [...filtered, res.data.data];
      });

      return res.data.data as StudentDocument;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Upload failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setUploading(null);
      setUploadProgress(0);
    }
  }, []);

  const deleteDocument = useCallback(async (docId: string, documentType: DocumentType) => {
    try {
      setError(null);
      await api.delete(`/student/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d._id !== docId));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Delete failed';
      setError(msg);
      throw new Error(msg);
    }
  }, []);

  const getDocumentByType = useCallback(
    (type: DocumentType) => documents.find((d) => d.documentType === type) || null,
    [documents]
  );

  return {
    documents,
    wroRequired,
    loading,
    uploading,
    uploadProgress,
    error,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    getDocumentByType,
  };
}
