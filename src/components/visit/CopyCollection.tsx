'use client';
import { useState } from 'react';
import { Heart, Check } from 'lucide-react';
import { readSaved, writeSaved, type SavedItem } from './SaveButton';
/** Lets the recipient of a shared list copy its places into their own saved list. */
export function CopyCollection({ items }: { items: SavedItem[] }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" onClick={() => { const cur = readSaved(); const merged = [...cur, ...items.filter((i) => !cur.some((c) => c.kind === i.kind && c.id === i.id))]; writeSaved(merged); setDone(true); }}
      className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-6 py-3 font-bold text-navy hover:bg-teal-300">{done ? <Check className="size-4" aria-hidden /> : <Heart className="size-4" aria-hidden />}{done ? 'Added to your saved places' : 'Save all to my list'}</button>
  );
}
