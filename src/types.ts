export type ViewMode = 'year' | 'month' | 'week' | 'day';

export interface EventReminder {
  id: string;
  minutesBefore: number; // e.g. 15 for 15 mins
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: Date; // Start time
  durationMinutes?: number; 
  repeatPattern?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  location?: string;
  reminders?: EventReminder[];
  color?: string;
}
