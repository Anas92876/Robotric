import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import type { ResourceViewerResponse } from '../../types/resource.types';

interface UsePDFViewerProps {
  resourceId: string | null;
  isOpen?: boolean;
  initialUrl?: string | null;
  /** Path prefix for viewer API (e.g. 'student/resources' or 'clo/resources'). Default: 'student/resources' */
  viewerPathPrefix?: string;
}

interface UsePDFViewerReturn {
  pdfData: Uint8Array | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  title: string;
  downloadProgress: number;
  setCurrentPage: (page: number) => void;
  setTotalPages: (pages: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToWidth: () => void;
  resetViewer: () => void;
  refreshUrl: () => Promise<void>;
}

/**
 * Hook to manage PDF viewer logic.
 * Fetches the PDF as raw bytes and passes them directly to react-pdf,
 * so no URL is ever exposed in the DOM.
 */
export const usePDFViewer = ({ resourceId, isOpen = true, initialUrl = null, viewerPathPrefix = 'student/resources' }: UsePDFViewerProps): UsePDFViewerReturn => {
  const [pdfData, setPdfData] = useState<Uint8Array | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [title, setTitle] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();

  // Fetch PDF bytes from a full absolute URL (for initialUrl / Supabase signed URLs)
  const fetchPdfBytes = useCallback(async (url: string): Promise<Uint8Array> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }, []);

  // Fetch PDF bytes via the configured api instance (for backend viewerUrl)
  // The backend returns viewerUrl like '/api/student/resources/.../download?token=...'
  // We strip the '/api' prefix since the api instance baseURL already includes it
  const fetchPdfFromApi = useCallback(async (viewerUrl: string): Promise<Uint8Array> => {
    const path = viewerUrl.startsWith('/api') ? viewerUrl.substring(4) : viewerUrl;

    setDownloadProgress(0);

    const response = await api.get(path, {
      responseType: 'arraybuffer',
      timeout: 3000000, // 5 minutes timeout for large PDFs
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setDownloadProgress(percent);
        }
      }
    });

    setDownloadProgress(100);
    return new Uint8Array(response.data);
  }, []);

  const fetchViewerUrl = useCallback(async () => {
    if (!resourceId) {
      if (initialUrl) {
        setLoading(true);
        setError(null);
        try {
          const data = await fetchPdfBytes(initialUrl);
          setPdfData(data);
        } catch (err: any) {
          setError(err.message || 'Failed to load PDF');
        } finally {
          setLoading(false);
        }
      } else {
        setError('Unable to load PDF: Resource not available');
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = `/${viewerPathPrefix}/${resourceId}/viewer`;
      const response = await api.get<ResourceViewerResponse>(endpoint);

          if (response.data.success) {
            const { viewerUrl, title: resourceTitle, expiresIn } = response.data.data;
            setTitle(resourceTitle);

            // Signed URLs (e.g. from CLO) are full https; path URLs go through our API
            const data = viewerUrl.startsWith('http')
              ? await fetchPdfBytes(viewerUrl)
              : await fetchPdfFromApi(viewerUrl);
            setPdfData(data);

        // Set up auto-refresh before URL expires
        if (refreshTimerRef.current) {
          clearTimeout(refreshTimerRef.current);
        }

        const refreshTime = (expiresIn - 300) * 1000;
        if (refreshTime > 0) {
          refreshTimerRef.current = setTimeout(() => {
            fetchViewerUrl();
          }, refreshTime);
        }
      } else {
        throw new Error(response.data.message || 'Failed to get viewer data');
      }
    } catch (err: any) {
      console.error('[usePDFViewer] Error:', err);

      const errorMessage =
        err.response?.status === 403 ? 'You do not have permission to view this resource' :
        err.response?.status === 404 ? 'Resource not found' :
        err.response?.data?.message || err.message || 'Failed to load PDF viewer';

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [resourceId, user?.role, initialUrl, viewerPathPrefix, fetchPdfBytes, fetchPdfFromApi]);

  // Initial fetch when viewer opens
  useEffect(() => {
    if (!isOpen) return;

    if (resourceId) {
      // Fetch PDF via secure viewer endpoint
      const fetchPdf = async () => {
        setLoading(true);
        setError(null);
        try {
          const endpoint = `/${viewerPathPrefix}/${resourceId}/viewer`;
          const response = await api.get<ResourceViewerResponse>(endpoint);

          if (response.data.success) {
            const { viewerUrl, title: resourceTitle, expiresIn } = response.data.data;
            setTitle(resourceTitle);

            // Signed URLs (e.g. from CLO) are full https; path URLs go through our API
            const data = viewerUrl.startsWith('http')
              ? await fetchPdfBytes(viewerUrl)
              : await fetchPdfFromApi(viewerUrl);
            setPdfData(data);

            if (refreshTimerRef.current) {
              clearTimeout(refreshTimerRef.current);
            }
            const refreshTime = (expiresIn - 300) * 1000;
            if (refreshTime > 0) {
              refreshTimerRef.current = setTimeout(() => {
                fetchViewerUrl();
              }, refreshTime);
            }
          } else {
            throw new Error(response.data.message || 'Failed to get viewer data');
          }
        } catch (err: any) {
          const errorMessage =
            err.response?.status === 403 ? 'You do not have permission to view this resource' :
            err.response?.status === 404 ? 'Resource not found' :
            err.response?.data?.message || err.message || 'Failed to load PDF viewer';
          setError(errorMessage);
        } finally {
          setLoading(false);
        }
      };
      fetchPdf();
    } else if (initialUrl) {
      setLoading(true);
      setError(null);
      fetchPdfBytes(initialUrl)
        .then((data) => setPdfData(data))
        .catch((err: any) => setError(err.message || 'Failed to load PDF'))
        .finally(() => setLoading(false));
    } else {
      setError('Unable to load PDF: Resource not available');
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [isOpen, resourceId, initialUrl, viewerPathPrefix, fetchPdfFromApi, fetchPdfBytes]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const fitToWidth = useCallback(() => {
    setZoom(1.0);
  }, []);

  // Reset viewer state
  const resetViewer = useCallback(() => {
    setCurrentPage(1);
    setTotalPages(0);
    setZoom(1.0);
    setPdfData(null);
    setError(null);
    setTitle('');
    setDownloadProgress(0);
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
  }, []);

  // Manual refresh function
  const refreshUrl = useCallback(async () => {
    await fetchViewerUrl();
  }, [fetchViewerUrl]);

  return {
    pdfData,
    loading,
    error,
    currentPage,
    totalPages,
    zoom,
    title,
    downloadProgress,
    setCurrentPage,
    setTotalPages,
    zoomIn,
    zoomOut,
    fitToWidth,
    resetViewer,
    refreshUrl
  };
};
