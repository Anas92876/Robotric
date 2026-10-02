import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Award, ExternalLink, FileText, ImageIcon } from 'lucide-react';
import { api } from '../../../lib/api';
import { publicSite } from '../../../lib/publicSite';
import { useFormat } from '../../../app/format';
import { CertificateA4, CertificateSquare, type CertData } from '../../../components/certificate/CertificateRenderer';
import { useCertificateDownload } from '../../../hooks/useCertificateDownload';
import { Button, EmptyState, PageHeader, Panel } from '../../../ui';

interface Cert { _id: string; certificateNumber: string; issuedAt: string; studentName: string; courseName: string; courseLevel?: string; trainingHours?: number; gender?: 'male' | 'female' }

function CertCard({ cert }: { cert: Cert }) {
  const { t } = useTranslation('dashboardStudent');
  const f = useFormat();
  const a4 = useRef<HTMLDivElement>(null);
  const square = useRef<HTMLDivElement>(null);
  const { downloadPDF, downloadImage, generating } = useCertificateDownload();
  const data: CertData = { ...cert };
  const base = `Robotrick-Certificate-${cert.studentName.replace(/\s+/g, '-')}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-card border border-line bg-paper shadow-card">
      {/* A4 certificate (1123×794) scaled into the card */}
      <div className="relative h-44 overflow-hidden border-b border-line bg-[#faf8f0]" aria-hidden>
        <div className="pointer-events-none origin-top-left scale-[0.302] rtl:origin-top-right" style={{ width: 1123, height: 794 }}>
          <CertificateA4 cert={data} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="font-semibold leading-snug text-ink" dir="auto">{cert.courseName}</h2>
        <p className="text-xs text-ink-4">
          {[cert.courseLevel && t(`courses.level.${cert.courseLevel}`, { defaultValue: cert.courseLevel }), cert.trainingHours ? t('cert.hours', { count: cert.trainingHours }) : null, t('cert.issued', { date: f.date(cert.issuedAt) })].filter(Boolean).join(' · ')}
        </p>
        <p className="font-mono text-xs text-ink-4" dir="ltr">{cert.certificateNumber}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" variant="primary" icon={<FileText />} loading={generating === 'pdf'} disabled={!!generating} onClick={() => downloadPDF(a4, base)}>{t('cert.pdf')}</Button>
          <Button size="sm" variant="secondary" icon={<ImageIcon />} loading={generating === 'image'} disabled={!!generating} onClick={() => downloadImage(square, `${base}-Instagram`)}>{t('cert.image')}</Button>
        </div>
        <a href={publicSite.verifyCertificate(cert.certificateNumber)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-ink-3 hover:text-ink focus-visible:focus-ring">
          <ExternalLink className="size-3.5" aria-hidden />{t('cert.verify')}
        </a>
      </div>
      {/* Full-size copies for the download (html2canvas needs them laid out on screen, invisibly) */}
      <div className="pointer-events-none fixed start-0 top-0 -z-10 opacity-0" aria-hidden>
        <CertificateA4 ref={a4} cert={data} />
        <CertificateSquare ref={square} cert={data} />
      </div>
    </article>
  );
}

/** Certificates the student earned: preview, PDF to print, square image to share, public verify link. */
export default function CertificatesPage() {
  const { t } = useTranslation('dashboardStudent');
  const q = useQuery({ queryKey: ['student', 'certificates'], queryFn: async () => ((await api.get('/student/certificates')).data.data ?? []) as Cert[] });
  return (
    <div className="space-y-5">
      <PageHeader title={t('cert.title')} description={t('cert.subtitle')} />
      {q.isError ? (
        <Panel><EmptyState icon={<Award />} title={t('cert.loadError')} action={<Button variant="secondary" onClick={() => void q.refetch()}>{t('courses.retry')}</Button>} /></Panel>
      ) : q.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1].map((i) => <div key={i} className="h-80 animate-pulse rounded-card bg-rail" />)}</div>
      ) : !q.data?.length ? (
        <Panel><EmptyState icon={<Award />} title={t('cert.none')} description={t('cert.noneHint')} /></Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{q.data.map((c) => <CertCard key={c._id} cert={c} />)}</div>
      )}
    </div>
  );
}
