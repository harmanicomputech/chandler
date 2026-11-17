'use client';
import { useActionState, startTransition } from 'react';
import { uploadMedia, updateMedia, type ActionState } from '@/app/admin/actions';
const input = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
export function MediaUpload({ csrf }: { csrf: string }) {
  const [s, a, p] = useActionState<ActionState, FormData>(uploadMedia, undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => a(fd)); }} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Upload image</h2><input type="hidden" name="_csrf" value={csrf} />
      <label className="block text-sm">File (JPEG/PNG/WebP/AVIF, ≤15 MB)<input type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="mt-1 block w-full text-sm" /></label>
      <label className="block text-sm">Alternative text *<input name="alt" required className={input} placeholder="Describe the image for screen readers" /></label>
      <label className="block text-sm">Photo credit<input name="credit" className={input} /></label>
      <div className="grid grid-cols-2 gap-2"><label className="text-sm">Website<select name="site" className={input}><option value="">Shared</option><option value="visit">Visit Chandler</option><option value="edo">EDO</option></select></label><label className="text-sm">Rights<select name="permission" className={input}><option value="pending">Pending</option><option value="approved">Approved</option><option value="restricted">Restricted</option></select></label></div>
      <label className="block text-sm">Folder<input name="folder" defaultValue="uploads" className={input} /></label>
      <button disabled={p} className="w-full rounded-md bg-[#214FA1] py-2 text-sm font-semibold text-white">{p ? 'Uploading…' : 'Upload'}</button>
      <p role="status" className={`text-sm ${s?.error ? 'text-red-600' : 'text-emerald-700'}`}>{s?.error ?? s?.message}</p>
    </form>
  );
}
export function MediaEdit({ media, csrf }: { media: { id: number; url: string; alt: string; caption: string | null; credit: string | null; permission: string; sourceUrl: string | null; width: number | null; height: number | null }; csrf: string }) {
  const [s, a, p] = useActionState<ActionState, FormData>(updateMedia.bind(null, media.id), undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => a(fd)); }} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Edit image #{media.id}</h2><input type="hidden" name="_csrf" value={csrf} />
      <img src={media.url} alt={media.alt} className="w-full rounded" /><p className="break-all text-xs text-slate-600">{media.url} · {media.width}×{media.height}{media.sourceUrl && <><br />Source: {media.sourceUrl}</>}</p>
      <label className="block text-sm">Alt text *<input name="alt" defaultValue={media.alt} required className={input} /></label>
      <label className="block text-sm">Caption<input name="caption" defaultValue={media.caption ?? ''} className={input} /></label>
      <label className="block text-sm">Credit<input name="credit" defaultValue={media.credit ?? ''} className={input} /></label>
      <label className="block text-sm">Reuse rights<select name="permission" defaultValue={media.permission} className={input}><option value="pending">Pending City confirmation</option><option value="approved">Approved for reuse</option><option value="restricted">Restricted — do not publish</option></select></label>
      <button disabled={p} className="w-full rounded-md bg-[#214FA1] py-2 text-sm font-semibold text-white">Save</button><p role="status" className="text-sm text-emerald-700">{s?.error ?? s?.message}</p>
    </form>
  );
}
