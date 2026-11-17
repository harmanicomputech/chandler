'use client';
import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Link2, Quote, Code2, Undo2 } from 'lucide-react';

/** Lightweight accessible rich-text editor (contenteditable + toolbar) with an HTML source view. Output is sanitised server-side. */
export function RichText({ id, name, initial }: { id: string; name: string; initial: string }) {
  const ref = useRef<HTMLDivElement>(null); const [html, setHtml] = useState(initial); const [source, setSource] = useState(false);
  useEffect(() => { if (ref.current && !source) ref.current.innerHTML = html; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [source]);
  const cmd = (c: string, v?: string) => { ref.current?.focus(); document.execCommand(c, false, v); setHtml(ref.current?.innerHTML ?? ''); };
  const tools: [typeof Bold, string, () => void][] = [[Bold, 'Bold', () => cmd('bold')], [Italic, 'Italic', () => cmd('italic')], [Heading2, 'Heading 2', () => cmd('formatBlock', 'h2')], [Heading3, 'Heading 3', () => cmd('formatBlock', 'h3')], [List, 'Bulleted list', () => cmd('insertUnorderedList')], [ListOrdered, 'Numbered list', () => cmd('insertOrderedList')], [Quote, 'Quote', () => cmd('formatBlock', 'blockquote')],
    [Link2, 'Link', () => { const u = prompt('Link URL (https://… or /path/)'); if (u && /^(https?:\/\/|\/|mailto:|tel:)/.test(u)) cmd('createLink', u); }], [Undo2, 'Undo', () => cmd('undo')]];
  return (
    <div className="mt-1 rounded-md border border-slate-300 focus-within:border-[#214FA1] focus-within:ring-2 focus-within:ring-[#214FA1]/20">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-slate-200 bg-slate-50 p-1">
        {tools.map(([I, l, f]) => <button key={l} type="button" onClick={f} disabled={source} aria-label={l} title={l} className="grid size-8 place-items-center rounded hover:bg-white disabled:opacity-30"><I className="size-4" /></button>)}
        <button type="button" onClick={() => { if (!source) setHtml(ref.current?.innerHTML ?? html); setSource((s) => !s); }} aria-pressed={source} className="ml-auto inline-flex items-center gap-1 rounded px-2 text-xs font-medium hover:bg-white"><Code2 className="size-4" aria-hidden />HTML</button>
      </div>
      {source ? <textarea aria-label="HTML source" value={html} onChange={(e) => setHtml(e.target.value)} rows={14} className="block w-full p-3 font-mono text-xs outline-none" />
        : <div ref={ref} id={id} role="textbox" aria-multiline="true" contentEditable suppressContentEditableWarning onInput={() => setHtml(ref.current?.innerHTML ?? '')} className="prose-vc min-h-[220px] max-w-none p-4 text-[15px] outline-none" />}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
