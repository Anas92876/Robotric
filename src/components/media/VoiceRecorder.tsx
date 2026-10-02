import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mic, Square, RotateCcw, Check, AlertTriangle } from "lucide-react";
import { Button } from "../ui";
import { formatDuration } from "./types";

interface VoiceRecorderProps {
  onRecorded: (file: File, durationSeconds: number) => void;
  maxDurationSeconds?: number;
  disabled?: boolean;
}

// MediaRecorder emits different mimetypes across browsers — try the good ones first,
// fall back to whatever the browser will actually give us.
function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return undefined;
}

export default function VoiceRecorder({ onRecorded, maxDurationSeconds = 300, disabled }: VoiceRecorderProps) {
  const { t } = useTranslation("dashboardCommon");
  const [supported] = useState(() => typeof window !== 'undefined' && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => () => {
    cleanupStream();
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  }, [recordedUrl]);

  const tickLevel = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((sum, v) => sum + v, 0) / data.length;
    setLevel(Math.min(1, avg / 128));
    rafRef.current = requestAnimationFrame(tickLevel);
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      tickLevel();

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        cleanupStream();
      };

      recorder.start();
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setElapsed(0);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startTimeRef.current) / 1000;
        setElapsed(secs);
        if (secs >= maxDurationSeconds) stopRecording();
      }, 200);
    } catch {
      setError(t("media.micError"));
      cleanupStream();
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const reRecord = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setElapsed(0);
  };

  const attach = () => {
    if (!recordedBlob) return;
    const ext = recordedBlob.type.includes('mp4') ? 'm4a' : recordedBlob.type.includes('ogg') ? 'ogg' : 'webm';
    const file = new File([recordedBlob], `voice-note-${Date.now()}.${ext}`, { type: recordedBlob.type });
    onRecorded(file, elapsed);
    reRecord();
  };

  if (!supported) {
    return (
      <div className="flex items-start gap-2 text-xs text-ink/60 bg-ink/5 border border-ink/15 rounded-lg px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>{t("media.noVoice")}</span>
      </div>
    );
  }

  if (recordedUrl) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-ink/15 bg-white px-3 py-2.5">
        <audio src={recordedUrl} controls className="h-8 flex-1 min-w-0" />
        <span className="text-xs text-ink/60 flex-shrink-0 tabular-nums">{formatDuration(elapsed)}</span>
        <Button type="button" variant="ghost" size="sm" onClick={reRecord} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
          {t("media.reRecord")}
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={attach} leftIcon={<Check className="w-3.5 h-3.5" />} disabled={disabled}>
          {t("media.attach")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${isRecording ? 'border-red-300 bg-red-50' : 'border-ink/15 bg-white'}`}>
        {isRecording ? (
          <>
            <div className="flex items-end gap-0.5 h-6 flex-shrink-0" aria-hidden="true">
              {[0, 1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-red-500 transition-all duration-100"
                  style={{ height: `${4 + level * 20 * (0.5 + Math.abs(Math.sin(i + elapsed * 4)))}px` }}
                />
              ))}
            </div>
            <span className="text-xs font-medium text-red-600 tabular-nums flex-1">{formatDuration(elapsed)}</span>
            <Button type="button" variant="danger" size="sm" onClick={stopRecording} leftIcon={<Square className="w-3.5 h-3.5" />}>
              {t("media.stop")}
            </Button>
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 text-ink/50 flex-shrink-0" />
            <span className="text-xs text-ink/60 flex-1">{t("media.record")}</span>
            <Button type="button" variant="outline" size="sm" onClick={startRecording} disabled={disabled} leftIcon={<Mic className="w-3.5 h-3.5" />}>
              {t("media.start")}
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
