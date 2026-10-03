/**
 * useCertificateDownload
 *
 * Renders a hidden certificate DOM node → html2canvas → PNG / jsPDF
 */

import { useState, useCallback } from 'react';
import type { RefObject } from 'react';

type DownloadType = 'pdf' | 'image' | null;

export function useCertificateDownload() {
  const [generating, setGenerating] = useState<DownloadType>(null);

  const downloadPDF = useCallback(async (
    ref: RefObject<HTMLDivElement>,
    filename: string
  ) => {
    if (!ref.current || generating) return;
    try {
      setGenerating('pdf');
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF }   = await import('jspdf');

      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      // Landscape A4: 297mm × 210mm
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      pdf.save(`${filename}.pdf`);
    } finally {
      setGenerating(null);
    }
  }, [generating]);

  const downloadImage = useCallback(async (
    ref: RefObject<HTMLDivElement>,
    filename: string
  ) => {
    if (!ref.current || generating) return;
    try {
      setGenerating('image');
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(ref.current, {
        scale: 1, // already 1080px, no scaling needed
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setGenerating(null);
    }
  }, [generating]);

  return { downloadPDF, downloadImage, generating };
}
