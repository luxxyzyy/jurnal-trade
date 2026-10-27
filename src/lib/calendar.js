import { getDb } from './db.js';

const CACHE_DURATION = 3600000; // 1 hour
let calendarCache = null;
let lastFetch = 0;

export async function getEconomicCalendar() {
  const now = Date.now();
  if (calendarCache && (now - lastFetch < CACHE_DURATION)) {
    return calendarCache;
  }

  try {
    const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();

    const nowISO = new Date().toISOString();
    const events = data
      .filter(event => event.date >= nowISO)
      .map(event => ({
        id: `${event.date}-${event.title}`,
        time: event.date,
        currency: event.country,
        impact: event.impact,
        title: event.title,
        description: '', // source JSON does not contain description
        forecast: event.forecast || '-',
        previous: event.previous || '-'
      }))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    calendarCache = events;
    lastFetch = now;
    return events;
  } catch (error) {
    console.error('Error fetching economic calendar:', error);
    return [];
  }
}
