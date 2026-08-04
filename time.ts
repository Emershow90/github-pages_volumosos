/**
 * Brasília Time (UTC-3) Utility Functions
 * Ensures timezone independence across browser environments.
 */

export function getBrasiliaDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * -3));
}

export function getBrasiliaTimeString(): string {
  return new Date().toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function getBrasiliaISOString(): string {
  return new Date().toISOString(); // Use standard ISO for persistence but formatted under America/Sao_Paulo when displaying.
}

export function formatToBrasiliaTime(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return '--:--';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch {
    return '--:--';
  }
}

export function getBrasiliaDateString(dateInput: Date | string | number = new Date()): string {
  try {
    const d = new Date(dateInput);
    return d.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });
  } catch {
    return '';
  }
}
