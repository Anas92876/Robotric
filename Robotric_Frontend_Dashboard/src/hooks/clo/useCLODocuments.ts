import { useState, useCallback, useEffect } from 'react';
import { api } from '../../lib/api';
import type { DocumentType } from '../student/useStudentDocuments';

export interface CLODocument {
  _id: string;
  studentId: { _id: string; name: string; email: string };
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
}

export interface StudentSummary {
  _id: string;
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  student: { name: string; email: string };
}

export function useCLODocuments() {
  const [documents, setDocuments] = useState<CLODocument[]>([]);
  const [studentsSummary, setStudentsSummary] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 20 });

  const fetchDocuments = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.documentType = typeFilter;

      const res = await api.get('/clo/documents', { params });
      setDocuments(res.data.data || []);
      setPagination(res.data.pagination || { total: 0, page: 1, pages: 1, limit: 20 });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  const fetchStudentsSummary = useCallback(async () => {
    try {
      const res = await api.get('/clo/documents/students-summary');
      setStudentsSummary(res.data.data || []);
    } catch {
      // non-critical
    }
  }, []);

  const fetchStudentDocuments = useCallback(async (studentId: string): Promise<CLODocument[]> => {
    const res = await api.get(`/clo/documents/student/${studentId}`);
    return res.data.data || [];
  }, []);

  const updateStatus = useCallback(
    async (docId: string, verificationStatus: string, verificationNote?: string) => {
      const res = await api.patch(`/clo/documents/${docId}/status`, {
        verificationStatus,
        verificationNote: verificationNote || null,
      });
      const updated: CLODocument = res.data.data;
      setDocuments((prev) =>
        prev.map((d) => (d._id === docId ? updated : d))
      );
      // Refresh summary counts
      fetchStudentsSummary();
      return updated;
    },
    [fetchStudentsSummary]
  );

  const getDownloadUrl = useCallback(async (docId: string): Promise<string> => {
    const res = await api.get(`/clo/documents/${docId}/download`);
    return res.data.url;
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchStudentsSummary();
  }, [fetchDocuments, fetchStudentsSummary]);

  return {
    documents,
    studentsSummary,
    loading,
    error,
    pagination,
    statusFilter,
    typeFilter,
    setStatusFilter,
    setTypeFilter,
    fetchDocuments,
    fetchStudentDocuments,
    updateStatus,
    getDownloadUrl,
  };
}
