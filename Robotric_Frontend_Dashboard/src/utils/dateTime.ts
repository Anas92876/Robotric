const TZ = 'Asia/Damascus';

export function formatDate(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { timeZone: TZ, ...options });
}

export function formatTime(
  date: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true }
): string {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-US', { timeZone: TZ, ...options });
}

export function formatHHMM(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function nowInDamascus(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}
