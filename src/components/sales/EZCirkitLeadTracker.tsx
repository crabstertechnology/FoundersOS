'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtINR, fmtDateWithDay } from '@/lib/utils/formatters';
import { Trash2, AlertCircle, Phone, Mail, Calendar, Target, TrendingUp, Users, IndianRupee, Plus, X, Clock, History, Download } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useFirebase } from '@/firebase';
import type { DocumentReference } from 'firebase/firestore';
import * as XLSX from 'xlsx';

export type LeadType = 'school' | 'college' | 'student' | 'other';
export type LeadStatus = 'new-lead' | 'contacted' | 'meeting-scheduled' | 'proposal-sent' | 'follow-up' | 'negotiation' | 'won' | 'lost' | 'on-hold';
export type LeadSource = 'cold-call' | 'referral' | 'instagram' | 'whatsapp' | 'website' | 'event' | 'other';

export interface LeadHistoryEntry {
  id: string; timestamp: string; changedBy: string; note: string;
  snapshot?: {
    date?: string;
    leadType?: LeadType;
    organization?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    source?: LeadSource;
    requirement?: string;
    status?: LeadStatus;
    nextAction?: string;
    followUpDate?: string;
    expectedRevenue?: number;
    actualRevenue?: number;
    remarks?: string;
  };
}

export interface EZLead {
  id: string; date: string; leadType: LeadType; organization: string;
  contactPerson: string; phone: string; email: string; source: LeadSource;
  requirement: string; status: LeadStatus; nextAction: string;
  followUpDate: string; expectedRevenue: number; actualRevenue: number;
  remarks: string; history: LeadHistoryEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export const TYPE_CLR: Record<string,string> = { school:'bg-blue-50 text-blue-700 border-blue-100', college:'bg-purple-50 text-purple-700 border-purple-100', student:'bg-emerald-50 text-emerald-700 border-emerald-100', other:'bg-slate-50 text-slate-600 border-slate-200' };
export const STAT_CLR: Record<string,string> = { 'new-lead':'bg-slate-100 text-slate-700 border-slate-200', contacted:'bg-blue-50 text-blue-700 border-blue-100', 'meeting-scheduled':'bg-indigo-50 text-indigo-700 border-indigo-100', 'proposal-sent':'bg-amber-50 text-amber-700 border-amber-100', 'follow-up':'bg-cyan-50 text-cyan-700 border-cyan-100', negotiation:'bg-orange-50 text-orange-700 border-orange-100', won:'bg-emerald-50 text-emerald-700 border-emerald-100', lost:'bg-rose-50 text-rose-700 border-rose-100', 'on-hold':'bg-gray-50 text-gray-600 border-gray-200' };
export const STAT_LABELS: Record<LeadStatus,string> = { 'new-lead':'New Lead', contacted:'Contacted', 'meeting-scheduled':'Meeting Scheduled', 'proposal-sent':'Proposal Sent', 'follow-up':'Follow-up', negotiation:'Negotiation', won:'Won', lost:'Lost', 'on-hold':'On Hold' };

interface F { date:string; leadType:LeadType; organization:string; contactPerson:string; phone:string; email:string; source:LeadSource; requirement:string; status:LeadStatus; nextAction:string; followUpDate:string; expectedRevenue:number|''; actualRevenue:number|''; remarks:string; }
const blank = (d:string): F => ({ date:d, leadType:'school', organization:'', contactPerson:'', phone:'', email:'', source:'cold-call', requirement:'', status:'new-lead', nextAction:'', followUpDate:'', expectedRevenue:'', actualRevenue:'', remarks:'' });

export function diffNote(prev: Partial<EZLead>, next: Partial<EZLead>): string {
  const c: string[] = [];
  if (prev.organization !== next.organization) c.push(`Organization: "${prev.organization || '—'}" → "${next.organization || '—'}"`);
  if (prev.leadType !== next.leadType) c.push(`Type: ${prev.leadType} → ${next.leadType}`);
  if (prev.source !== next.source) c.push(`Source: ${prev.source} → ${next.source}`);
  if (prev.requirement !== next.requirement) c.push(`Requirement: "${prev.requirement || '—'}" → "${next.requirement || '—'}"`);
  if (prev.date !== next.date) c.push(`Date: ${prev.date} → ${next.date}`);
  if (prev.contactPerson !== next.contactPerson) c.push(`Contact: "${prev.contactPerson || '—'}" → "${next.contactPerson || '—'}"`);
  if (prev.phone !== next.phone) c.push(`Phone: ${prev.phone || '—'} → ${next.phone || '—'}`);
  if (prev.email !== next.email) c.push(`Email: ${prev.email || '—'} → ${next.email || '—'}`);
  if (prev.status !== next.status) c.push(`Status: ${prev.status ? STAT_LABELS[prev.status] : '—'} → ${next.status ? STAT_LABELS[next.status] : '—'}`);
  if (prev.nextAction !== next.nextAction) c.push(`Next Action: "${prev.nextAction || '—'}" → "${next.nextAction || '—'}"`);
  if (prev.followUpDate !== next.followUpDate) c.push(`Follow-up: ${prev.followUpDate || '—'} → ${next.followUpDate || '—'}`);
  if (Number(prev.expectedRevenue || 0) !== Number(next.expectedRevenue || 0)) {
    c.push(`Expected Rev: ${fmtINR(Number(prev.expectedRevenue || 0))} → ${fmtINR(Number(next.expectedRevenue || 0))}`);
  }
  if (Number(prev.actualRevenue || 0) !== Number(next.actualRevenue || 0)) {
    c.push(`Actual Rev: ${fmtINR(Number(prev.actualRevenue || 0))} → ${fmtINR(Number(next.actualRevenue || 0))}`);
  }
  if (prev.remarks !== next.remarks) c.push(`Remarks: "${prev.remarks || '—'}" → "${next.remarks || '—'}"`);
  return c.length ? c.join(' · ') : 'Lead details updated';
}

function LeadForm({ f, setF, onSubmit, onCancel, isEdit, readOnly }: { f:F; setF: React.Dispatch<React.SetStateAction<F>>; onSubmit:(e:React.FormEvent)=>void; onCancel:()=>void; isEdit:boolean; readOnly?:boolean; }) {
  const s = (k: keyof F) => (v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="font-bold text-xs">Date</Label>
          <Input type="date" value={f.date} onChange={e=>s('date')(e.target.value)} disabled={readOnly}/>
          {f.date && <div className="text-[10px] text-indigo-650 font-bold mt-0.5">{fmtDateWithDay(f.date)}</div>}
        </div>
        <div className="space-y-1"><Label className="font-bold text-xs">Lead Type</Label><Select value={f.leadType} onValueChange={s('leadType')} disabled={readOnly}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="school">School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="student">Student</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
      </div>
      <div className="space-y-1"><Label className="font-bold text-xs">Organization / Person Name</Label><Input placeholder="e.g. ABC Matric School" value={f.organization} onChange={e=>s('organization')(e.target.value)} required disabled={readOnly}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="font-bold text-xs">Contact Person</Label><Input placeholder="Principal Kumar" value={f.contactPerson} onChange={e=>s('contactPerson')(e.target.value)} disabled={readOnly}/></div>
        <div className="space-y-1"><Label className="font-bold text-xs">Phone</Label><Input placeholder="9876543210" value={f.phone} onChange={e=>s('phone')(e.target.value)} disabled={readOnly}/></div>
      </div>
      <div className="space-y-1"><Label className="font-bold text-xs">Email</Label><Input type="email" placeholder="contact@school.com" value={f.email} onChange={e=>s('email')(e.target.value)} disabled={readOnly}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="font-bold text-xs">Source</Label><Select value={f.source} onValueChange={s('source')} disabled={readOnly}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cold-call">Cold Call</SelectItem><SelectItem value="referral">Referral</SelectItem><SelectItem value="instagram">Instagram</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="website">Website</SelectItem><SelectItem value="event">Event</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
        <div className="space-y-1"><Label className="font-bold text-xs">Requirement</Label><Input placeholder="e.g. IoT Workshop" value={f.requirement} onChange={e=>s('requirement')(e.target.value)} disabled={readOnly}/></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="font-bold text-xs">Status</Label><Select value={f.status} onValueChange={s('status')} disabled={readOnly}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{(Object.keys(STAT_LABELS) as LeadStatus[]).map(k=><SelectItem key={k} value={k}>{STAT_LABELS[k]}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1">
          <Label className="font-bold text-xs">Follow-up Date</Label>
          <Input type="date" value={f.followUpDate} onChange={e=>s('followUpDate')(e.target.value)} disabled={readOnly}/>
          {f.followUpDate && <div className="text-[10px] text-amber-655 font-bold mt-0.5">{fmtDateWithDay(f.followUpDate)}</div>}
        </div>
      </div>
      <div className="space-y-1"><Label className="font-bold text-xs">Next Action</Label><Input placeholder="e.g. Send Proposal" value={f.nextAction} onChange={e=>s('nextAction')(e.target.value)} disabled={readOnly}/></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="font-bold text-xs">Expected Revenue (₹)</Label><Input type="number" placeholder="15000" value={f.expectedRevenue} onChange={e=>s('expectedRevenue')(e.target.value===''?'':Number(e.target.value))} disabled={readOnly}/></div>
        <div className="space-y-1"><Label className="font-bold text-xs">Actual Revenue (₹)</Label><Input type="number" placeholder="0" value={f.actualRevenue} onChange={e=>s('actualRevenue')(e.target.value===''?'':Number(e.target.value))} disabled={readOnly}/></div>
      </div>
      <div className="space-y-1"><Label className="font-bold text-xs">Remarks</Label><Input placeholder="e.g. Interested, follow up required" value={f.remarks} onChange={e=>s('remarks')(e.target.value)} disabled={readOnly}/></div>
      {!readOnly && <div className="flex gap-2 pt-1"><Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">{isEdit?'Update Lead':'Add Lead'}</Button><Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button></div>}
    </form>
  );
}

interface Props { profileRef: DocumentReference | null; leads: EZLead[]; readOnly?: boolean; }

export function EZCirkitLeadTracker({ profileRef, leads, readOnly }: Props) {
  const { user } = useFirebase();
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];
  const [showAdd, setShowAdd] = useState(false);
  const [addF, setAddF] = useState<F>(blank(today));
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const fmtShortDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const kpis = useMemo(() => ({ total:leads.length, won:leads.filter(l=>l.status==='won').length, schools:leads.filter(l=>l.leadType==='school').length, colleges:leads.filter(l=>l.leadType==='college').length, students:leads.filter(l=>l.leadType==='student').length, totalExpected:leads.reduce((s,l)=>s+(Number(l.expectedRevenue)||0),0), totalActual:leads.reduce((s,l)=>s+(Number(l.actualRevenue)||0),0) }), [leads]);
  
  const sortedAndFiltered = useMemo(() => {
    const res = leads.filter(l => {
      if (filter === 'all') return true;
      if (filter.startsWith('type-')) {
        return l.leadType === filter.replace('type-', '');
      }
      if (filter.startsWith('status-')) {
        return l.status === filter.replace('status-', '');
      }
      return true;
    });

    const getCreatedTime = (l: EZLead) => {
      if (l.createdAt) return new Date(l.createdAt).getTime();
      if (l.history && l.history.length > 0) return new Date(l.history[0].timestamp).getTime();
      return new Date(l.date || 0).getTime();
    };

    const getLastActiveTime = (l: EZLead) => {
      const times: number[] = [];
      if (l.updatedAt) {
        const t = new Date(l.updatedAt).getTime();
        if (!isNaN(t)) times.push(t);
      }
      if (l.createdAt) {
        const t = new Date(l.createdAt).getTime();
        if (!isNaN(t)) times.push(t);
      }
      if (l.history && l.history.length > 0) {
        const lastEntry = l.history[l.history.length - 1];
        if (lastEntry && lastEntry.timestamp) {
          const t = new Date(lastEntry.timestamp).getTime();
          if (!isNaN(t)) times.push(t);
        }
      }
      if (l.date) {
        const t = new Date(l.date).getTime();
        if (!isNaN(t)) times.push(t);
      }
      return times.length > 0 ? Math.max(...times) : 0;
    };
    
    if (sortBy === 'date-desc') {
      return [...res].sort((a, b) => getLastActiveTime(b) - getLastActiveTime(a));
    }
    if (sortBy === 'date-asc') {
      return [...res].sort((a, b) => getCreatedTime(a) - getCreatedTime(b));
    }
    if (sortBy === 'name') {
      return [...res].sort((a, b) => (a.organization || '').localeCompare(b.organization || ''));
    }
    if (sortBy === 'revenue') {
      return [...res].sort((a, b) => (b.expectedRevenue || 0) - (a.expectedRevenue || 0));
    }
    return res;
  }, [leads, filter, sortBy]);

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const allDisplayedSelected = sortedAndFiltered.every(l => selectedLeadIds.includes(l.id));
    if (allDisplayedSelected) {
      const displayedIds = sortedAndFiltered.map(l => l.id);
      setSelectedLeadIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      const newSelections = new Set([...selectedLeadIds, ...sortedAndFiltered.map(l => l.id)]);
      setSelectedLeadIds(Array.from(newSelections));
    }
  };

  const exportToExcel = (selectedLeads: EZLead[]) => {

    const getDayName = (dateStr: string) => {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length !== 3) return '';
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const titleCase = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // ── Column definitions ─────────────────────────────────────────────────
    const COLS = [
      { header: 'Date',                   key: 'date',     wch: 13 },
      { header: 'Day',                    key: 'day',      wch: 11 },
      { header: 'Lead Type',              key: 'type',     wch: 11 },
      { header: 'Organization',           key: 'org',      wch: 26 },
      { header: 'Contact Person',         key: 'contact',  wch: 18 },
      { header: 'Phone',                  key: 'phone',    wch: 14 },
      { header: 'Email',                  key: 'email',    wch: 26 },
      { header: 'Source',                 key: 'source',   wch: 13 },
      { header: 'Requirement',            key: 'req',      wch: 22 },
      { header: 'Status',                 key: 'status',   wch: 14 },
      { header: 'Next Action',            key: 'action',   wch: 22 },
      { header: 'Follow-up Date',         key: 'fud',      wch: 15 },
      { header: 'Follow-up Day',          key: 'fuday',    wch: 13 },
      { header: 'Expected Revenue (INR)', key: 'exp',      wch: 20 },
      { header: 'Actual Revenue (INR)',   key: 'act',      wch: 18 },
      { header: 'Remarks',               key: 'remarks',  wch: 30 },
      { header: 'History & Activity Logs', key: 'history', wch: 55 },
    ];

    // ── Build data rows ────────────────────────────────────────────────────
    const dataRows = selectedLeads.map(l => {
      const historyStr = (l.history || [])
        .map((h, i) =>
          `${i + 1}. [${h.timestamp.split('T')[0]} ${getDayName(h.timestamp.split('T')[0]).slice(0, 3)}] ${h.changedBy}: ${h.note}`
        )
        .join('\n');

      return {
        date:    l.date || '',
        day:     getDayName(l.date),
        type:    titleCase(l.leadType || ''),
        org:     l.organization || '',
        contact: l.contactPerson || '',
        phone:   l.phone || '',
        email:   l.email || '',
        source:  titleCase(l.source || ''),
        req:     l.requirement || '',
        status:  titleCase(l.status || ''),
        action:  l.nextAction || '',
        fud:     l.followUpDate || '',
        fuday:   getDayName(l.followUpDate),
        exp:     l.expectedRevenue || 0,
        act:     l.actualRevenue || 0,
        remarks: l.remarks || '',
        history: historyStr || '',
      };
    });

    // ── Build worksheet manually for full control ──────────────────────────
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = {};

    const numCols = COLS.length;
    const lastColLetter = XLSX.utils.encode_col(numCols - 1);

    // Row 1 – Report title
    ws['A1'] = { v: 'FoundersOS – Leads Pipeline Report', t: 's' };
    // Row 2 – Metadata subtitle
    ws['A2'] = {
      v: `Generated: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}   |   Total Leads: ${selectedLeads.length}`,
      t: 's'
    };
    // Row 3 – blank spacer
    ws['A3'] = { v: '', t: 's' };

    // Row 4 – Column headers
    COLS.forEach((col, ci) => {
      const addr = XLSX.utils.encode_cell({ r: 3, c: ci });
      ws[addr] = { v: col.header, t: 's' };
    });

    // Rows 5+ – Data
    dataRows.forEach((row, ri) => {
      COLS.forEach((col, ci) => {
        const addr = XLSX.utils.encode_cell({ r: ri + 4, c: ci });
        const val = row[col.key as keyof typeof row];
        ws[addr] = {
          v: val,
          t: typeof val === 'number' ? 'n' : 's',
        };
      });
    });

    // Sheet range
    ws['!ref'] = `A1:${lastColLetter}${dataRows.length + 4}`;

    // Column widths
    ws['!cols'] = COLS.map(c => ({ wch: c.wch }));

    // Freeze rows 1-4 (keep header row visible while scrolling)
    ws['!freeze'] = { xSplit: 0, ySplit: 4 };

    // Merges: title and subtitle span all columns
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }, // title row
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } }, // subtitle row
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Leads Report');

    // Download
    XLSX.writeFile(wb, `FoundersOS_Leads_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = (selectedLeads: EZLead[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>crabster Technology lead report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 24px; }
            h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; color: #0f172a; }
            .subtitle { font-size: 11px; color: #64748b; margin-bottom: 24px; font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 9px; color: #475569; }
            .org { font-weight: 700; color: #0f172a; }
            .history-item { margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #e2e8f0; }
            .history-item:last-child { border-bottom: none; }
            .history-meta { font-size: 9px; font-weight: bold; color: #6366f1; }
            .history-note { margin-top: 2px; color: #334155; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; text-transform: uppercase; }
            .status-won { background-color: #ecfdf5; color: #047857; }
            .status-lost { background-color: #fff1f2; color: #be123c; }
            .status-other { background-color: #f1f5f9; color: #475569; }
            
            @media print {
              @page {
                margin: 0;
              }
              body {
                margin: 1.6cm;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">
            <div>
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">crabster Technology report</h1>
              <div class="subtitle" style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600;">
                Generated on ${new Date().toLocaleDateString()} · Total Selected: ${selectedLeads.length} leads
              </div>
            </div>
            <div style="font-size: 10px; font-weight: 500; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: right; margin-top: 4px;">
              powered by FoundersOS
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 80px;">Date</th>
                <th>Organization & Contact</th>
                <th>Status & Type</th>
                <th style="width: 100px;">Revenue</th>
                <th>Next Action & Remarks</th>
                <th>History & Activity Logs</th>
              </tr>
            </thead>
            <tbody>
              ${selectedLeads.map(l => `
                <tr>
                  <td><strong>${fmtDateWithDay(l.date)}</strong><br/><span style="color:#64748b; font-size:9px;">Source: ${l.source}</span></td>
                  <td>
                    <div class="org">${l.organization}</div>
                    <div style="font-size: 10px; color:#475569; margin-top:2px;">${l.requirement || ''}</div>
                    <div style="font-size: 9px; color:#64748b; margin-top:4px;">
                      ${l.contactPerson ? `Contact: ${l.contactPerson}` : ''}
                      ${l.phone ? ` · Phone: ${l.phone}` : ''}
                      ${l.email ? ` · Email: ${l.email}` : ''}
                    </div>
                  </td>
                  <td>
                    <span class="badge ${l.status === 'won' ? 'status-won' : l.status === 'lost' ? 'status-lost' : 'status-other'}">${l.status.replace('-', ' ')}</span>
                    <br/>
                    <span style="font-size: 9px; font-weight: 700; color:#475569; display:block; margin-top:4px;">Type: ${l.leadType}</span>
                  </td>
                  <td>
                    <span style="color:#4f46e5; font-weight:bold;">Exp: ${l.expectedRevenue > 0 ? '₹' + Number(l.expectedRevenue).toLocaleString('en-IN') : '—'}</span>
                    <br/>
                    <span style="color:#059669; font-weight:bold;">Act: ${l.actualRevenue > 0 ? '₹' + Number(l.actualRevenue).toLocaleString('en-IN') : '—'}</span>
                  </td>
                  <td>
                    ${l.nextAction ? `<div style="margin-bottom: 4px;"><strong>Next Action:</strong> ${l.nextAction}</div>` : ''}
                    ${l.followUpDate ? `<div style="margin-bottom: 4px;"><strong>Follow-up Date:</strong> <span style="color: #b45309; font-weight: 600;">${fmtDateWithDay(l.followUpDate)}</span></div>` : ''}
                    ${l.remarks ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dotted #e2e8f0; font-style: italic; color: #475569;">${l.remarks}</div>` : ''}
                  </td>
                  <td>
                    ${(l.history || []).length === 0 ? '<span style="color:#94a3b8;">No history logs</span>' : (l.history || []).map(h => `
                      <div class="history-item">
                        <span class="history-meta">${h.timestamp.split('T')[0]} by ${h.changedBy}</span>
                        <div class="history-note">${h.note}</div>
                      </div>
                    `).join('')}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="text-align: center; font-size: 9px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            powered by FoundersOS
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = "crabster Technology lead report";
  };

  const mkSnap = (f: F) => ({
    date: f.date,
    leadType: f.leadType,
    organization: f.organization,
    contactPerson: f.contactPerson,
    phone: f.phone,
    email: f.email,
    source: f.source,
    requirement: f.requirement,
    status: f.status,
    nextAction: f.nextAction,
    followUpDate: f.followUpDate,
    expectedRevenue: Number(f.expectedRevenue) || 0,
    actualRevenue: Number(f.actualRevenue) || 0,
    remarks: f.remarks
  });
  const mkEntry = (note: string, f: F): LeadHistoryEntry => ({ id:Math.random().toString(36).substr(2,6), timestamp:new Date().toISOString(), changedBy:user?.email||'System', note, snapshot:mkSnap(f) });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !addF.organization) return;
    const nowStr = new Date().toISOString();
    const lead: EZLead = {
      id: Math.random().toString(36).substr(2,9),
      date: addF.date,
      leadType: addF.leadType,
      organization: addF.organization,
      contactPerson: addF.contactPerson,
      phone: addF.phone,
      email: addF.email,
      source: addF.source,
      requirement: addF.requirement,
      status: addF.status,
      nextAction: addF.nextAction,
      followUpDate: addF.followUpDate,
      expectedRevenue: Number(addF.expectedRevenue)||0,
      actualRevenue: Number(addF.actualRevenue)||0,
      remarks: addF.remarks,
      history: [mkEntry('Lead created', addF)],
      createdAt: nowStr,
      updatedAt: nowStr
    };
    setDocumentNonBlocking(profileRef, { ezLeads:[...leads,lead] }, { merge:true });
    setAddF(blank(today)); setShowAdd(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Add Lead Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div><h2 className="text-base font-black text-slate-900">Add New Lead</h2><p className="text-xs text-muted-foreground">Track from first contact to close.</p></div>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={()=>setShowAdd(false)}><X className="w-4 h-4"/></Button>
            </div>
            <div className="p-5"><LeadForm f={addF} setF={setAddF} onSubmit={handleAdd} onCancel={()=>setShowAdd(false)} isEdit={false}/></div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:'Total Leads',value:kpis.total,sub:`${kpis.won} won`,icon:Users,color:'text-indigo-600',bg:''},{label:'Schools',value:kpis.schools,sub:`${kpis.colleges} colleges`,icon:Target,color:'text-blue-600',bg:'bg-blue-50/20 border-blue-100'},{label:'Student Leads',value:kpis.students,sub:'direct inquiries',icon:TrendingUp,color:'text-emerald-600',bg:'bg-emerald-50/20 border-emerald-100'},{label:'Expected Revenue',value:fmtINR(kpis.totalExpected),sub:`Actual: ${fmtINR(kpis.totalActual)}`,icon:IndianRupee,color:'text-amber-600',bg:'bg-amber-50/20 border-amber-100'}].map(({label,value,sub,icon:Icon,color,bg})=>(
          <Card key={label} className={`border-2 shadow-sm ${bg}`}><CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0"><CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</CardTitle><Icon className={`w-4 h-4 ${color}`}/></CardHeader><CardContent><div className={`text-2xl font-code font-black ${color}`}>{value}</div><p className="text-[10px] text-muted-foreground font-medium mt-0.5">{sub}</p></CardContent></Card>
        ))}
      </div>

      {/* Pipeline Table */}
      <Card className="border shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div><CardTitle className="text-base font-black text-slate-900">Lead Pipeline</CardTitle><CardDescription>Click any lead to view details, edit, and see version history.</CardDescription></div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex gap-1.5 items-center mr-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-indigo-200 text-indigo-700 hover:bg-indigo-50/50 h-8 font-bold text-xs gap-1"
                  onClick={() => {
                    const targets = selectedLeadIds.length > 0 
                      ? leads.filter(l => selectedLeadIds.includes(l.id)) 
                      : sortedAndFiltered;
                    if (targets.length === 0) return alert('No leads to export');
                    exportToPDF(targets);
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  PDF {selectedLeadIds.length > 0 ? `(${selectedLeadIds.length})` : '(All)'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-emerald-250 text-emerald-750 hover:bg-emerald-50/50 h-8 font-bold text-xs gap-1"
                  onClick={() => {
                    const targets = selectedLeadIds.length > 0 
                      ? leads.filter(l => selectedLeadIds.includes(l.id)) 
                      : sortedAndFiltered;
                    if (targets.length === 0) return alert('No leads to export');
                    exportToExcel(targets);
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel {selectedLeadIds.length > 0 ? `(${selectedLeadIds.length})` : '(All)'}
                </Button>
              </div>
              <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue placeholder="All Leads" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leads</SelectItem>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 my-1 select-none">Lead Type</div>
                  <SelectItem value="type-school">School</SelectItem>
                  <SelectItem value="type-college">College</SelectItem>
                  <SelectItem value="type-student">Student</SelectItem>
                  <SelectItem value="type-other">Other</SelectItem>
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 my-1 select-none">Lead Status</div>
                  {(Object.keys(STAT_LABELS) as LeadStatus[]).map(s => (
                    <SelectItem key={s} value={`status-${s}`}>{STAT_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 text-xs w-36">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date (Newest)</SelectItem>
                  <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="revenue">Expected Rev (High)</SelectItem>
                </SelectContent>
              </Select>
              {!readOnly&&<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 h-8" onClick={()=>setShowAdd(true)}><Plus className="w-3.5 h-3.5"/>Add Lead</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedAndFiltered.length===0?(
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3"><AlertCircle className="w-9 h-9 text-indigo-200"/><p className="text-sm font-semibold">No leads found. {!readOnly&&'Click "Add Lead" to get started.'}</p></div>
          ):(
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-10 text-center">
                      <input 
                        type="checkbox" 
                        checked={sortedAndFiltered.length > 0 && sortedAndFiltered.every(l => selectedLeadIds.includes(l.id))}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer mt-1"
                      />
                    </TableHead>
                    {['Date','Type','Organization','Contact','Status','Remarks','Exp. Rev','Act. Rev','Follow-up'].map(h=><TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFiltered.map(l=>(
                    <TableRow key={l.id} className="hover:bg-indigo-50/30 cursor-pointer transition-colors" onClick={()=>router.push(`/lead/${l.id}`)}>
                      <TableCell className="w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedLeadIds.includes(l.id)}
                          onChange={() => toggleSelectLead(l.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer mt-1"
                        />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">{fmtShortDate(l.date)}</TableCell>
                      <TableCell><Badge className={`border text-[9px] font-black uppercase ${TYPE_CLR[l.leadType]}`}>{l.leadType}</Badge></TableCell>
                      <TableCell className="font-bold py-3 max-w-[130px]">
                        <div className="text-slate-900 truncate">{l.organization}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{l.requirement}</div>
                        {(l.createdAt || (l.history && l.history.length > 0 ? l.history[0].timestamp : null)) && (
                          <div className="text-[9px] text-slate-400 font-medium">
                            Created: {new Date(l.createdAt || l.history[0].timestamp).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })} at {formatTime(l.createdAt || l.history[0].timestamp)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[100px]"><div className="font-medium truncate">{l.contactPerson||'—'}</div>{l.phone&&<div className="flex items-center gap-0.5 text-[10px] text-slate-400"><Phone className="w-2.5 h-2.5"/>{l.phone}</div>}{l.email&&<div className="flex items-center gap-0.5 text-[10px] text-slate-400 truncate"><Mail className="w-2.5 h-2.5"/>{l.email}</div>}</TableCell>
                      <TableCell><Badge className={`border text-[9px] font-black whitespace-nowrap ${STAT_CLR[l.status]}`}>{STAT_LABELS[l.status]}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[250px] min-w-[200px]">
                        <div className="break-words whitespace-normal font-medium text-slate-700 leading-normal">{l.remarks||'—'}</div>
                        {(l.history||[]).length>0&& (
                          <div className="text-[9px] text-indigo-400 flex items-center gap-0.5 mt-1 flex-wrap font-semibold">
                            <History className="w-2.5 h-2.5 shrink-0"/>
                            <span>{l.history.length} updates</span>
                            <span className="text-slate-400 text-[8px] ml-1 font-medium">
                              (Mod: {new Date(l.updatedAt || l.history[l.history.length - 1].timestamp).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })} at {formatTime(l.updatedAt || l.history[l.history.length - 1].timestamp)})
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-code font-bold text-indigo-700 whitespace-nowrap">{l.expectedRevenue>0?fmtINR(l.expectedRevenue):'—'}</TableCell>
                      <TableCell className="font-code font-bold text-emerald-700 whitespace-nowrap">{l.actualRevenue>0?fmtINR(l.actualRevenue):'—'}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">{l.followUpDate?<div className="flex items-center gap-0.5"><Calendar className="w-3 h-3 text-amber-500"/>{fmtShortDate(l.followUpDate)}</div>:'—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
