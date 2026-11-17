'use client';
import { Printer } from 'lucide-react';
export function PrintButton() { return <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white"><Printer className="size-4" aria-hidden />Print / save as PDF</button>; }
