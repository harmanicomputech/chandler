'use client';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { track } from '@/components/shared/track';

export type SavedItem = { kind: 'listing' | 'event'; id: number; name: string; href: string; image?: string | null; lat?: number | null; lng?: number | null; category?: string | null };
const KEY = 'vc:saved';
export function readSaved(): SavedItem[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function writeSaved(items: SavedItem[]) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} window.dispatchEvent(new Event('vc:saved-changed')); }

/** Save to the visitor's collection — no account required; stored in the browser and shareable via the trip planner. */
export function SaveButton({ item, variant = 'icon' }: { item: SavedItem; variant?: 'icon' | 'pill' }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(readSaved().some((s) => s.kind === item.kind && s.id === item.id));
    sync(); window.addEventListener('vc:saved-changed', sync); return () => window.removeEventListener('vc:saved-changed', sync);
  }, [item.kind, item.id]);
  const toggle = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const cur = readSaved();
    const next = on ? cur.filter((s) => !(s.kind === item.kind && s.id === item.id)) : [...cur, item];
    writeSaved(next); if (!on) track('visit', 'save_item', { entity: item.kind, entityId: item.id });
  };
  if (variant === 'pill') return (
    <button type="button" onClick={toggle} aria-pressed={on} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold ring-1 transition ${on ? 'bg-navy text-white ring-navy' : 'bg-white text-navy ring-line hover:ring-navy'}`}>
      <Heart className={`size-4 ${on ? 'fill-teal-400 text-teal-400' : ''}`} aria-hidden />{on ? 'Saved to your trip' : 'Save to trip'}
    </button>
  );
  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? `Remove ${item.name} from saved` : `Save ${item.name}`}
      className="grid size-10 place-items-center rounded-full bg-white/90 text-navy shadow-lg backdrop-blur transition hover:scale-110 active:scale-95">
      <Heart className={`size-[18px] transition ${on ? 'scale-110 fill-teal-400 text-teal-500' : ''}`} aria-hidden />
    </button>
  );
}
