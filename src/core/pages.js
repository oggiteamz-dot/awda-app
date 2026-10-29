/**
 * pages.js — the knowledge library a person reads.
 *
 * Pages are written by scholars and admins inside the app and appear here only
 * once an admin has published them. The device keeps the last published set,
 * so the library opens with no signal — the same rule as the text.
 */
import { publishedPages } from './cloud.js';

/* The eight sections of المعرفة. The keys are fixed in the database. */
export const SECTIONS = [
  { k: 'prayer', ar: 'أساسيّات الصلاة', ic: 'prayer' },
  { k: 'qada', ar: 'القضاء والفوائت', ic: 'qada' },
  { k: 'tahara', ar: 'الطهارة', ic: 'sun' },
  { k: 'sawm', ar: 'الصوم والكفّارات', ic: 'moon' },
  { k: 'khums', ar: 'الخمس والزكاة', ic: 'scale' },
  { k: 'will', ar: 'الوصيّة والميراث', ic: 'will' },
  { k: 'death', ar: 'الموت وما بعده', ic: 'ihtidar' },
  { k: 'calendar', ar: 'التقويم ومناسباته', ic: 'calendar' },
];
export const sectionByKey = (k) => SECTIONS.find((s) => s.k === k);

const KEY = 'awda.pages.v1';
let pages = [];
try { pages = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { pages = []; }

export const allPages = () => pages;
export const inSection = (k) => pages.filter((p) => p.section === k);
export const bySlug = (slug) => pages.find((p) => p.slug === slug);

/** Refresh from the server. Resolves true if anything changed. */
export async function refreshPages() {
  try {
    const next = await publishedPages();
    const changed = JSON.stringify(next) !== JSON.stringify(pages);
    pages = next;
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* full */ }
    return changed;
  } catch (err) {
    window.reportError?.(err, 'refreshing pages', 'PAGES_REFRESH_FAILED');
    return false;
  }
}
