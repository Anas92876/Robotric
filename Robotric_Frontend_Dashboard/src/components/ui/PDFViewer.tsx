/**
 * PDFViewer Component
 * Secure view-only PDF viewer with screenshot protection, watermark,
 * scrollable pages, thumbnails, and keyboard navigation
 */

import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import '../../styles/PDFViewer.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { usePDFViewer } from '../../hooks/common/usePDFViewer';
import { useAuth } from '../../providers/AuthProvider';
import { Button } from './Button';
import { LoadingState } from './LoadingState';
import { Alert } from './Alert';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  resourceId: string | null;
  initialUrl?: string | null;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  /** Path prefix for viewer API (e.g. 'student/resources' or 'clo/resources'). Default: 'student/resources' */
  viewerPathPrefix?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  resourceId,
  initialUrl = null,
  title: propTitle,
  isOpen,
  onClose,
  viewerPathPrefix = 'student/resources'
}) => {
  const {
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
  } = usePDFViewer({ resourceId, isOpen, initialUrl, viewerPathPrefix });

  // Build the file prop for react-pdf Document
  const pdfFile = useMemo(() => {
    if (!pdfData) return null;
    return { data: pdfData };
  }, [pdfData]);

  const { user } = useAuth();

  const [showSidebar, setShowSidebar] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isProtected, setIsProtected] = useState(false);
  const [downloadWarning, setDownloadWarning] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const protectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downloadWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Watermark text from user info
  const watermarkText = useMemo(() => {
    if (user?.name && user?.email) return `${user.name} - ${user.email}`;
    if (user?.name) return user.name;
    if (user?.email) return user.email;
    return '';
  }, [user?.name, user?.email]);

  // --- Screenshot protection ---

  // Trigger protection shield (blur content)
  const triggerProtection = useCallback(() => {
    setIsProtected(true);
    if (protectionTimerRef.current) clearTimeout(protectionTimerRef.current);
    protectionTimerRef.current = setTimeout(() => {
      setIsProtected(false);
    }, 1500);
  }, []);

  // 1. Blur on visibility change (tab switch, Alt+Tab, screen share prompt)
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibility = () => {
      if (document.hidden) {
        setIsProtected(true);
      } else {
        // Small delay before unblurring so screenshot tools can't catch it
        protectionTimerRef.current = setTimeout(() => {
          setIsProtected(false);
        }, 800);
      }
    };

    const handleBlur = () => setIsProtected(true);
    const handleFocus = () => {
      protectionTimerRef.current = setTimeout(() => {
        setIsProtected(false);
      }, 800);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (protectionTimerRef.current) clearTimeout(protectionTimerRef.current);
    };
  }, [isOpen]);

  // 2. Detect PrintScreen key
  useEffect(() => {
    if (!isOpen) return;

    const handleScreenshotKey = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        e.key === 'Snapshot' ||
        // Windows Snipping Tool: Win+Shift+S
        (e.shiftKey && e.metaKey && e.key === 'S') ||
        (e.shiftKey && e.metaKey && e.key === 's')
      ) {
        e.preventDefault();
        triggerProtection();
      }
    };

    document.addEventListener('keyup', handleScreenshotKey);
    return () => document.removeEventListener('keyup', handleScreenshotKey);
  }, [isOpen, triggerProtection]);

  // 3. DevTools detection — protect content when DevTools opens
  useEffect(() => {
    if (!isOpen) return;

    let devtoolsOpen = false;

    const detectDevTools = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;

      if (widthDiff || heightDiff) {
        if (!devtoolsOpen) {
          devtoolsOpen = true;
          setIsProtected(true);
        }
      } else {
        if (devtoolsOpen) {
          devtoolsOpen = false;
          protectionTimerRef.current = setTimeout(() => {
            setIsProtected(false);
          }, 800);
        }
      }
    };

    const interval = setInterval(detectDevTools, 1000);
    window.addEventListener('resize', detectDevTools);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', detectDevTools);
    };
  }, [isOpen]);

  // 4. Screen Capture API detection
  useEffect(() => {
    if (!isOpen) return;

    const handleDisplayMediaChange = () => {
      // If someone starts screen sharing/recording via the browser API
      if (navigator.mediaDevices) {
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        if (originalGetDisplayMedia) {
          navigator.mediaDevices.getDisplayMedia = async function (constraints) {
            triggerProtection();
            throw new DOMException('Screen capture is blocked', 'NotAllowedError');
          };

          return () => {
            navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
          };
        }
      }
    };

    const cleanup = handleDisplayMediaChange();
    return () => cleanup?.();
  }, [isOpen, triggerProtection]);

  // --- End screenshot protection ---

  // Track current page via scroll position
  useEffect(() => {
    if (!pdfData || totalPages === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.getAttribute('data-page'));
            if (pageNum) setCurrentPage(pageNum);
          }
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.5,
      }
    );

    return () => observerRef.current?.disconnect();
  }, [pdfData, totalPages, setCurrentPage]);

  // Observe each page element
  const setPageRef = useCallback(
    (pageNum: number, el: HTMLDivElement | null) => {
      if (el) {
        pageRefs.current.set(pageNum, el);
        observerRef.current?.observe(el);
      }
    },
    []
  );

  // Scroll to a specific page
  const scrollToPage = useCallback((pageNum: number) => {
    const el = pageRefs.current.get(pageNum);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Show/hide scroll-to-top button
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setShowScrollTop(scrollContainerRef.current.scrollTop > 400);
    }
  }, []);

  // Set draggable="false" on all canvas elements
  useEffect(() => {
    if (!isOpen || !pdfData) return;

    const disableCanvasDrag = () => {
      const canvases = document.querySelectorAll('.pdf-viewer canvas');
      canvases.forEach((canvas) => {
        (canvas as HTMLCanvasElement).setAttribute('draggable', 'false');
        (canvas as HTMLCanvasElement).style.userSelect = 'none';
        (canvas as HTMLCanvasElement).style.webkitUserSelect = 'none';
        (canvas as HTMLCanvasElement).style.mozUserSelect = 'none';
        (canvas as HTMLCanvasElement).style.msUserSelect = 'none';
      });
    };

    // Run immediately and after a short delay to catch dynamically rendered canvases
    disableCanvasDrag();
    const timer = setTimeout(disableCanvasDrag, 500);
    const timer2 = setTimeout(disableCanvasDrag, 1500);

    // Use MutationObserver to catch new canvas elements
    const observer = new MutationObserver(disableCanvasDrag);
    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      observer.disconnect();
    };
  }, [isOpen, pdfData, totalPages]);

  // Show download warning
  const showDownloadWarning = useCallback(() => {
    setDownloadWarning(true);
    if (downloadWarningTimerRef.current) {
      clearTimeout(downloadWarningTimerRef.current);
    }
    downloadWarningTimerRef.current = setTimeout(() => {
      setDownloadWarning(false);
    }, 3000);
  }, []);

  // Block download attempts
  const handleDownloadAttempt = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    showDownloadWarning();
    triggerProtection();
    console.warn('[PDFViewer] Download attempt blocked');
  }, [showDownloadWarning, triggerProtection]);

  // Security: Disable context menu
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerProtection();
    showDownloadWarning();
  }, [triggerProtection, showDownloadWarning]);

  // Disable drag
  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }, []);

  // Enhanced download prevention
  useEffect(() => {
    if (!isOpen) return;

    // Monitor for download events
    const handleDownload = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      showDownloadWarning();
      triggerProtection();
    };

    // Block canvas right-click save
    const handleCanvasContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'CANVAS' || target.closest('canvas')) {
        e.preventDefault();
        e.stopPropagation();
        showDownloadWarning();
        triggerProtection();
      }
    };

    // Block image drag
    const handleImageDrag = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'CANVAS' || target.tagName === 'IMG' || target.closest('canvas')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Block copy events
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showDownloadWarning();
    };

    // Block cut events
    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      showDownloadWarning();
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleCanvasContextMenu, true);
    document.addEventListener('dragstart', handleImageDrag, true);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('cut', handleCut, true);

    return () => {
      document.removeEventListener('contextmenu', handleCanvasContextMenu, true);
      document.removeEventListener('dragstart', handleImageDrag, true);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('cut', handleCut, true);
      if (downloadWarningTimerRef.current) {
        clearTimeout(downloadWarningTimerRef.current);
      }
    };
  }, [isOpen, showDownloadWarning, triggerProtection]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!isOpen) {
      resetViewer();
      setShowSidebar(false);
      setIsProtected(false);
      setDownloadWarning(false);
      if (downloadWarningTimerRef.current) {
        clearTimeout(downloadWarningTimerRef.current);
      }
    }
  }, [isOpen, resetViewer]);

  // Keyboard navigation + security
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Block save & print
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();
        showDownloadWarning();
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        showDownloadWarning();
        return false;
      }
      // Block Ctrl+Shift+S (Save As)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        showDownloadWarning();
        triggerProtection();
        return false;
      }
      // Block Ctrl+Shift+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        triggerProtection();
      }
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
        triggerProtection();
      }
      // Block Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        triggerProtection();
      }

      if (e.key === 'Escape') {
        resetViewer();
        onClose();
      }
      if (e.key === '+' || (e.ctrlKey && e.key === '=')) {
        e.preventDefault();
        zoomIn();
      }
      if (e.key === '-' || (e.ctrlKey && e.key === '-')) {
        e.preventDefault();
        zoomOut();
      }
    },
    [onClose, resetViewer, zoomIn, zoomOut, triggerProtection, showDownloadWarning]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Document load success
  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages);
      setCurrentPage(1);
    },
    [setTotalPages, setCurrentPage]
  );

  // Close handler
  const handleClose = useCallback(() => {
    resetViewer();
    onClose();
  }, [resetViewer, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex bg-[#1a1a2e]/95 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            className="relative w-full h-full flex flex-col pdf-viewer print-warning"
          >
            {/* Screenshot protection overlay */}
            <AnimatePresence>
              {isProtected && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f0f23] pointer-events-none"
                >
                  <ShieldAlert className="w-16 h-16 text-red-400/60 mb-4" />
                  <p className="text-white/60 text-lg font-semibold">Content Protected</p>
                  <p className="text-white/30 text-sm mt-1">Screenshots are not allowed</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Download warning overlay */}
            <AnimatePresence>
              {downloadWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none"
                >
                  <div className="bg-red-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-lg shadow-lg border border-red-400/50 flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                    <p className="font-semibold text-sm whitespace-nowrap">
                      Downloading PDF files is not allowed
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 px-2 sm:px-5 py-2 sm:py-3 border-b border-white/10 bg-[#0f0f23]/80 backdrop-blur-sm">
              {/* Title section - full width on mobile */}
              <div className="flex items-center gap-2 w-full sm:w-auto min-w-0 flex-1">
                {/* Sidebar toggle - always visible */}
                {!loading && !error && pdfData && totalPages > 1 && (
                  <button
                    onClick={() => setShowSidebar((v) => !v)}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white flex-shrink-0"
                    title={showSidebar ? 'Hide pages' : 'Show pages'}
                  >
                    {showSidebar ? (
                      <PanelLeftClose className="w-5 h-5" />
                    ) : (
                      <PanelLeftOpen className="w-5 h-5" />
                    )}
                  </button>
                )}
                <h2 className="text-sm sm:text-lg font-semibold text-white truncate flex-1 min-w-0">
                  {propTitle || title || 'PDF Viewer'}
                </h2>
              </div>

              {/* Controls - wrap on mobile */}
              <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end w-full sm:w-auto">
                {/* Zoom controls - visible on mobile but smaller */}
                {!loading && !error && pdfData && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={zoomOut}
                      disabled={zoom <= 0.5}
                      className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Zoom Out (-)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs sm:text-sm text-white/60 min-w-[36px] sm:min-w-[50px] text-center font-mono">
                      {Math.round(zoom * 100)}%
                    </span>
                    <button
                      onClick={zoomIn}
                      disabled={zoom >= 3.0}
                      className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Zoom In (+)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={fitToWidth}
                      className="hidden sm:flex items-center justify-center w-9 h-9 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                      title="Reset Zoom"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Page indicator + close */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {!loading && !error && pdfData && totalPages > 0 && (
                    <span className="text-xs sm:text-sm text-white/50 font-mono whitespace-nowrap">
                      {currentPage} / {totalPages}
                    </span>
                  )}
                  <button
                    onClick={handleClose}
                    className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-red-500/20 transition-colors text-white/70 hover:text-red-400 flex-shrink-0"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* Thumbnails sidebar */}
              <AnimatePresence>
                {showSidebar && !loading && !error && pdfData && totalPages > 1 && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 140, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hidden sm:flex flex-col border-r border-white/10 bg-[#0f0f23]/60 overflow-hidden"
                  >
                    <div className="flex-1 overflow-y-auto p-2 space-y-2 pdf-thumbnails">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => scrollToPage(pageNum)}
                            className={`w-full rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                              currentPage === pageNum
                                ? 'border-primary shadow-lg shadow-primary/20'
                                : 'border-transparent hover:border-white/20'
                            }`}
                          >
                            <div className="bg-white rounded-md overflow-hidden">
                              <Document
                                file={pdfFile}
                                loading=""
                              >
                                <Page
                                  pageNumber={pageNum}
                                  width={110}
                                  renderTextLayer={false}
                                  renderAnnotationLayer={false}
                                  loading=""
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onDragStart={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    return false;
                                  }}
                                />
                              </Document>
                            </div>
                            <p
                              className={`text-[10px] py-1 text-center font-medium ${
                                currentPage === pageNum
                                  ? 'text-primary'
                                  : 'text-white/40'
                              }`}
                            >
                              {pageNum}
                            </p>
                          </button>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scrollable pages area */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto pdf-scroll-area"
              >
                {loading && (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <LoadingState text="Loading PDF..." />
                    {downloadProgress > 0 && downloadProgress < 100 && (
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm text-white/60">
                          <span>Downloading</span>
                          <span>{downloadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${downloadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="flex items-center justify-center h-full p-4">
                    <Alert variant="error" className="max-w-md">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold">Failed to load PDF</p>
                          <p className="text-sm mt-1">{error}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshUrl}
                            className="mt-3"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                          </Button>
                        </div>
                      </div>
                    </Alert>
                  </div>
                )}

                {!loading && !error && pdfData && (
                  <div className="relative">
                    {/* Watermark overlay */}
                    {watermarkText && (
                      <div className="pdf-watermark-overlay" aria-hidden="true">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div key={i} className="pdf-watermark-row">
                            <span className="pdf-watermark-text">{watermarkText}</span>
                            <span className="pdf-watermark-text">{watermarkText}</span>
                            <span className="pdf-watermark-text">{watermarkText}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Document
                      file={pdfFile}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onLoadError={(err) => console.error('[PDFViewer] Document load error:', err)}
                      loading={
                        <div className="flex items-center justify-center h-full">
                          <LoadingState text="Loading document..." />
                        </div>
                      }
                      error={
                        <div className="flex items-center justify-center h-full p-4">
                          <Alert variant="error">
                            <AlertCircle className="w-5 h-5" />
                            Failed to load PDF file
                          </Alert>
                        </div>
                      }
                      className="pdf-document"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => (
                          <div
                            key={pageNum}
                            ref={(el) => setPageRef(pageNum, el)}
                            data-page={pageNum}
                            className="pdf-page-wrapper"
                          >
                            <Page
                              pageNumber={pageNum}
                              scale={zoom}
                              renderTextLayer={false}
                              renderAnnotationLayer={false}
                              loading={
                                <div className="pdf-page-loading">
                                  <div className="pdf-page-loading-spinner" />
                                </div>
                              }
                              className="pdf-page"
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                showDownloadWarning();
                                triggerProtection();
                              }}
                              onDragStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                              }}
                            />
                            <div className="pdf-page-number">
                              {pageNum}
                            </div>
                          </div>
                        )
                      )}
                    </Document>
                  </div>
                )}
              </div>
            </div>

            {/* Scroll to top button */}
            <AnimatePresence>
              {showScrollTop && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={() =>
                    scrollContainerRef.current?.scrollTo({
                      top: 0,
                      behavior: 'smooth',
                    })
                  }
                  className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-primary/90 hover:bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center transition-colors z-10"
                  title="Scroll to top"
                >
                  <ChevronUp className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Mobile page indicator bar */}
            {!loading && !error && pdfData && totalPages > 1 && (
              <div className="sm:hidden flex items-center justify-center gap-3 px-4 py-2 border-t border-white/10 bg-[#0f0f23]/80">
                <span className="text-xs text-white/50 font-mono">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex-1 max-w-[200px] h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{
                      width: `${(currentPage / totalPages) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Print prevention styles
const style = document.createElement('style');
style.textContent = `
  @media print {
    .pdf-viewer {
      display: none !important;
    }
    .print-warning::after {
      content: "Printing is not allowed for this material" !important;
      display: block !important;
      padding: 20px !important;
      font-size: 18px !important;
      color: red !important;
      font-weight: bold !important;
    }
  }
`;
document.head.appendChild(style);
