'use client';

import React, { useState, useMemo, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtINR, fmtDateWithDay } from '@/lib/utils/formatters';
import { 
  ArrowLeft, Trash2, AlertCircle, Phone, Mail, Calendar, Target, 
  TrendingUp, Users, IndianRupee, Plus, X, Clock, History, Save,
  CheckCircle2, FileText, Send, User, MessageSquare,
  Bold, Italic, List, ListOrdered, Quote, Code, Eye, Edit2, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useFirebase, useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { EZLead, LeadHistoryEntry, LeadStatus, LeadType, LeadSource } from '@/components/sales/EZCirkitLeadTracker';
import { TYPE_CLR, STAT_CLR, STAT_LABELS, diffNote } from '@/components/sales/EZCirkitLeadTracker';

interface F {
  date: string;
  leadType: LeadType;
  organization: string;
  contactPerson: string;
  phone: string;
  email: string;
  source: LeadSource;
  requirement: string;
  status: LeadStatus;
  nextAction: string;
  followUpDate: string;
  expectedRevenue: number | '';
  actualRevenue: number | '';
  remarks: string;
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  // Retrieve employee record and adminUid to query correct company profile
  const employeeDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user?.uid]);

  const { data: employeeData, isLoading: isEmployeeLoading } = useDoc(employeeDocRef);

  const workspaceUserId = employeeData?.adminUid || user?.uid || '';
  const userRole = (employeeData?.role || 'admin').toLowerCase();
  const isReadOnly = userRole === 'employee' || userRole === 'visitor';

  const profileRef = useMemoFirebase(() => {
    if (!firestore || !workspaceUserId) return null;
    return doc(firestore, 'users', workspaceUserId, 'companyProfiles', 'primary-startup');
  }, [firestore, workspaceUserId]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  const leads: EZLead[] = useMemo(() => profile?.ezLeads || [], [profile]);
  
  // Find current lead
  const lead = useMemo(() => leads.find(l => l.id === id), [leads, id]);

  const [form, setForm] = useState<F>({
    date: '',
    leadType: 'school',
    organization: '',
    contactPerson: '',
    phone: '',
    email: '',
    source: 'cold-call',
    requirement: '',
    status: 'new-lead',
    nextAction: '',
    followUpDate: '',
    expectedRevenue: '',
    actualRevenue: '',
    remarks: '',
  });

  const [customNote, setCustomNote] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [expandedSnapshots, setExpandedSnapshots] = useState<Record<string, boolean>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleSnapshot = (entryId: string) => {
    setExpandedSnapshots(prev => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const insertFormat = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let replacement = prefix + selectedText + suffix;
    if (prefix === '- ' || prefix === '1. ' || prefix === '> ') {
      const before = text.substring(0, start);
      const needsNewLineBefore = before.length > 0 && !before.endsWith('\n');
      replacement = (needsNewLineBefore ? '\n' : '') + prefix + selectedText + suffix;
    }
    
    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setCustomNote(newValue);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + (prefix === '- ' || prefix === '1. ' || prefix === '> ' ? (text.substring(0, start).length > 0 && !text.substring(0, start).endsWith('\n') ? 1 : 0) : 0) + prefix.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  };

  const [isInitialized, setIsInitialized] = useState(false);

  // Reset initialization when switching leads
  useEffect(() => {
    setIsInitialized(false);
  }, [id]);

  // Sync form state when lead data is loaded (only once per lead to prevent overwriting user typing)
  useEffect(() => {
    if (lead && !isInitialized) {
      setForm({
        date: lead.date || '',
        leadType: lead.leadType || 'school',
        organization: lead.organization || '',
        contactPerson: lead.contactPerson || '',
        phone: lead.phone || '',
        email: lead.email || '',
        source: lead.source || 'cold-call',
        requirement: lead.requirement || '',
        status: lead.status || 'new-lead',
        nextAction: lead.nextAction || '',
        followUpDate: lead.followUpDate || '',
        expectedRevenue: lead.expectedRevenue !== undefined ? lead.expectedRevenue : '',
        actualRevenue: lead.actualRevenue !== undefined ? lead.actualRevenue : '',
        remarks: lead.remarks || '',
      });
      setIsInitialized(true);
    }
  }, [lead, isInitialized]);

  const setFormKey = (key: keyof F) => (val: any) => {
    setForm(prev => ({ ...prev, [key]: val }));
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
    remarks: f.remarks,
  });

  const mkEntry = (note: string, f: F): LeadHistoryEntry => ({
    id: Math.random().toString(36).substr(2, 6),
    timestamp: new Date().toISOString(),
    changedBy: user?.email || 'System',
    note,
    snapshot: mkSnap(f),
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !lead) return;

    const noteText = diffNote(lead, {
      date: form.date,
      leadType: form.leadType,
      organization: form.organization,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      source: form.source,
      requirement: form.requirement,
      status: form.status,
      nextAction: form.nextAction,
      followUpDate: form.followUpDate,
      expectedRevenue: Number(form.expectedRevenue) || 0,
      actualRevenue: Number(form.actualRevenue) || 0,
      remarks: form.remarks,
    });

    const updated: EZLead = {
      ...lead,
      date: form.date,
      leadType: form.leadType,
      organization: form.organization,
      contactPerson: form.contactPerson,
      phone: form.phone,
      email: form.email,
      source: form.source,
      requirement: form.requirement,
      status: form.status,
      nextAction: form.nextAction,
      followUpDate: form.followUpDate,
      expectedRevenue: Number(form.expectedRevenue) || 0,
      actualRevenue: Number(form.actualRevenue) || 0,
      remarks: form.remarks,
      history: [...(lead.history || []), mkEntry(noteText, form)],
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(profileRef, {
      ezLeads: leads.map(l => l.id === lead.id ? updated : l)
    }, { merge: true });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddCustomNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !lead || !customNote.trim()) return;

    const noteText = customNote.trim();

    const updated: EZLead = {
      ...lead,
      history: [...(lead.history || []), mkEntry(noteText, form)],
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(profileRef, {
      ezLeads: leads.map(l => l.id === lead.id ? updated : l)
    }, { merge: true });

    setCustomNote('');
    setNoteSuccess(true);
    setEditorTab('write');
    setTimeout(() => setNoteSuccess(false), 3000);
  };

  const handleDelete = () => {
    if (!profileRef || !lead || !window.confirm('Delete this lead and all its history permanently?')) return;
    setDocumentNonBlocking(profileRef, {
      ezLeads: leads.filter(l => l.id !== lead.id)
    }, { merge: true });
    router.push('/?tab=sales&sub=ezcirkit&ez=leads');
  };

  const handleDeleteHistoryEntry = (entryId: string) => {
    if (!profileRef || !lead || !window.confirm('Are you sure you want to delete this history entry?')) return;
    const updated: EZLead = {
      ...lead,
      history: (lead.history || []).filter(h => h.id !== entryId),
      updatedAt: new Date().toISOString()
    };
    setDocumentNonBlocking(profileRef, {
      ezLeads: leads.map(l => l.id === lead.id ? updated : l)
    }, { merge: true });
  };

  // Back button helper to keep leads tab open
  const handleBack = () => {
    router.push('/?tab=sales&sub=ezcirkit&ez=leads');
  };

  if (isEmployeeLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Clock className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-500 font-code uppercase tracking-widest text-xs">Loading Lead Profile...</p>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md bg-white border rounded-2xl shadow-lg p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Lead Not Found</h1>
          <p className="text-sm text-slate-500">
            The lead you are trying to view does not exist or has been deleted.
          </p>
          <Button onClick={handleBack} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full h-12">
            Back to Lead Tracker
          </Button>
        </div>
      </div>
    );
  }

  const leadCreatedAt = lead.createdAt || (lead.history && lead.history.length > 0 ? lead.history[0].timestamp : null);
  const leadUpdatedAt = lead.updatedAt || (lead.history && lead.history.length > 0 ? lead.history[lead.history.length - 1].timestamp : null);

  const formatTimestampWithDay = (tsStr: string | null | undefined) => {
    if (!tsStr) return '—';
    const d = new Date(tsStr);
    if (isNaN(d.getTime())) return tsStr;
    const datePart = d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} at ${timePart}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b h-16 flex items-center px-2 sm:px-4 md:px-8 justify-between shadow-sm">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack} 
            className="rounded-full hover:bg-slate-100 text-slate-600 font-bold text-xs gap-1.5 px-2.5 sm:px-3 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden min-[400px]:inline">Back</span>
          </Button>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Badge className={`border text-[9px] font-black uppercase shrink-0 ${TYPE_CLR[lead.leadType]}`}>
              {lead.leadType}
            </Badge>
            <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 truncate max-w-[80px] min-[400px]:max-w-[150px] sm:max-w-xs">
              {lead.organization}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsHistoryOpen(true)}
            className="text-indigo-600 hover:bg-indigo-50 border-indigo-200 h-9 font-bold text-xs gap-1 sm:gap-1.5 shadow-sm transition-all px-2.5 sm:px-3"
          >
            <History className="w-4 h-4" /> 
            <span className="hidden sm:inline">History & Logs</span>
            <span className="inline sm:hidden font-bold">Logs</span>
            {lead.history?.length > 0 && (
              <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-1.5 py-0.5 text-[9px] rounded-full scale-90">
                {lead.history.length}
              </Badge>
            )}
          </Button>

          {!isReadOnly && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              className="text-rose-600 hover:bg-rose-50 border-rose-200 h-9 font-bold text-xs gap-1.5 px-2.5 sm:px-3"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete Lead</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
        
        {/* Success Alerts */}
        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-sm font-bold">Lead details updated successfully!</div>
          </div>
        )}

        {/* Lead Summary Hero */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl font-black text-slate-900">{lead.organization}</span>
              <Badge className={`border text-[10px] font-black uppercase ${STAT_CLR[lead.status]}`}>
                {STAT_LABELS[lead.status]}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Requirement: <span className="font-semibold text-slate-800">{lead.requirement || '—'}</span>
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-medium pt-1.5 border-t border-slate-100 mt-2">
              {leadCreatedAt && (
                <span>
                  Created: <span className="text-slate-650 font-bold">{formatTimestampWithDay(leadCreatedAt)}</span>
                </span>
              )}
              {leadUpdatedAt && (
                <span>
                  Last Modified: <span className="text-slate-650 font-bold">{formatTimestampWithDay(leadUpdatedAt)}</span>
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 min-[400px]:gap-4 sm:flex items-center sm:gap-6 w-full sm:w-auto">
            <div className="text-center sm:text-right">
              <div className="text-[9px] min-[400px]:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expected Revenue</div>
              <div className="text-base min-[400px]:text-xl font-code font-black text-indigo-600">{lead.expectedRevenue > 0 ? fmtINR(lead.expectedRevenue) : '—'}</div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-center sm:text-right">
              <div className="text-[9px] min-[400px]:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actual Revenue</div>
              <div className="text-base min-[400px]:text-xl font-code font-black text-emerald-600">{lead.actualRevenue > 0 ? fmtINR(lead.actualRevenue) : '—'}</div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-center sm:text-right">
              <div className="text-[9px] min-[400px]:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Next Action</div>
              <div className="text-xs font-bold text-slate-700 max-w-[100px] min-[400px]:max-w-[150px] truncate">{lead.nextAction || '—'}</div>
            </div>
          </div>
        </div>

        <div className="w-full space-y-6">
          {/* Lead Profile Details Form */}
          <Card className="border shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-base font-black text-slate-900">Lead Profile Details</CardTitle>
              </div>
              <CardDescription>
                Review and update the lead details, contact details, and financials.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleUpdate} className="space-y-6">
                
                {/* Primary Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b pb-2">Primary Info</h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-6 space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Organization / Client Name</Label>
                      <Input 
                        value={form.organization} 
                        onChange={e => setFormKey('organization')(e.target.value)} 
                        required 
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Lead Type</Label>
                      <Select value={form.leadType} onValueChange={setFormKey('leadType')} disabled={isReadOnly}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="school">School</SelectItem>
                          <SelectItem value="college">College</SelectItem>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Source</Label>
                      <Select value={form.source} onValueChange={setFormKey('source')} disabled={isReadOnly}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cold-call">Cold Call</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="instagram">Instagram</SelectItem>
                          <SelectItem value="whatsapp">WhatsApp</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8 space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Requirement</Label>
                      <Input 
                        placeholder="e.g. IoT Basic Kits + 2-Day Workshop" 
                        value={form.requirement} 
                        onChange={e => setFormKey('requirement')(e.target.value)} 
                        disabled={isReadOnly}
                      />
                    </div>
                    <div className="md:col-span-4 space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Creation Date</Label>
                      <Input 
                        type="date" 
                        value={form.date} 
                        onChange={e => setFormKey('date')(e.target.value)} 
                        disabled={isReadOnly}
                      />
                      {form.date && (
                        <div className="text-[10px] text-indigo-650 font-bold mt-0.5">
                          {fmtDateWithDay(form.date)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b pb-2">Contact Person</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Contact Person Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="e.g. Principal Kumar" 
                          value={form.contactPerson} 
                          onChange={e => setFormKey('contactPerson')(e.target.value)} 
                          className="pl-10"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="e.g. 9876543210" 
                          value={form.phone} 
                          onChange={e => setFormKey('phone')(e.target.value)} 
                          className="pl-10"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="email" 
                          placeholder="e.g. info@school.com" 
                          value={form.email} 
                          onChange={e => setFormKey('email')(e.target.value)} 
                          className="pl-10"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deal Progression */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b pb-2">Status & Progression</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Lead Status</Label>
                      <Select value={form.status} onValueChange={setFormKey('status')} disabled={isReadOnly}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STAT_LABELS) as LeadStatus[]).map(k => (
                            <SelectItem key={k} value={k}>{STAT_LABELS[k]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Follow-up Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="date" 
                          value={form.followUpDate} 
                          onChange={e => setFormKey('followUpDate')(e.target.value)} 
                          className="pl-10"
                          disabled={isReadOnly}
                        />
                      </div>
                      {form.followUpDate && (
                        <div className="text-[10px] text-amber-650 font-bold mt-0.5">
                          {fmtDateWithDay(form.followUpDate)}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Next Action Description</Label>
                      <Input 
                        placeholder="e.g. Schedule meeting" 
                        value={form.nextAction} 
                        onChange={e => setFormKey('nextAction')(e.target.value)} 
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Financials & Remarks */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b pb-2">Financials & Notes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-3 space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Expected Revenue (₹)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">INR</span>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={form.expectedRevenue} 
                          onChange={e => setFormKey('expectedRevenue')(e.target.value === '' ? '' : Number(e.target.value))} 
                          className="pl-10"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Actual Revenue (₹)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">INR</span>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          value={form.actualRevenue} 
                          onChange={e => setFormKey('actualRevenue')(e.target.value === '' ? '' : Number(e.target.value))} 
                          className="pl-10"
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-6 space-y-1">
                      <Label className="font-bold text-xs text-slate-600">Remarks / Brief Summary</Label>
                      <Input 
                        placeholder="e.g. Reached out via cold call, highly interested in IoT curriculum." 
                        value={form.remarks} 
                        onChange={e => setFormKey('remarks')(e.target.value)} 
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {!isReadOnly && (
                  <div className="flex justify-end gap-3 border-t pt-6">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      onClick={handleBack} 
                      className="font-bold text-xs h-10 px-4"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 h-10 px-6"
                    >
                      <Save className="w-4 h-4" /> Save Changes
                    </Button>
                  </div>
                )}

              </form>
            </CardContent>
          </Card>
        </div>

      </main>

      {/* History & Logs Modal */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] xl:max-w-[85vw] w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl">
          <div className="p-6 border-b flex items-center justify-between bg-slate-50/50 pr-12">
            <div>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600 animate-pulse" />
                History & Activity Logs
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-500 mt-1">
                View updates, system snapshots, and log notes for <span className="text-indigo-600 font-bold">{lead.organization}</span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto lg:overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Left: Add Note & Rich Text Logger */}
            <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-full bg-slate-50/20">
              {!isReadOnly && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-black text-slate-900">Add Log Note</h3>
                    </div>
                    {/* Write/Preview Tabs */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEditorTab('write')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ${
                          editorTab === 'write'
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Edit2 className="w-2.5 h-2.5" /> Write
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTab('preview')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md flex items-center gap-1 transition-all ${
                          editorTab === 'preview'
                            ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Eye className="w-2.5 h-2.5" /> Preview
                      </button>
                    </div>
                  </div>

                  <form onSubmit={handleAddCustomNote} className="space-y-3">
                    {editorTab === 'write' ? (
                      <div className="border rounded-xl bg-white focus-within:ring-2 focus-within:ring-indigo-600 focus-within:ring-offset-2 overflow-hidden shadow-sm transition-all duration-200">
                        {/* Editor Toolbar */}
                        <div className="flex items-center gap-1 px-3 py-2 border-b bg-slate-50/50">
                          <button
                            type="button"
                            onClick={() => insertFormat('**', '**')}
                            title="Bold"
                            className="p-1.5 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertFormat('*', '*')}
                            title="Italic"
                            className="p-1.5 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-4 bg-slate-200 mx-1" />
                          <button
                            type="button"
                            onClick={() => insertFormat('- ')}
                            title="Bullet List"
                            className="p-1.5 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertFormat('1. ')}
                            title="Numbered List"
                            className="p-1.5 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-4 bg-slate-200 mx-1" />
                          <button
                            type="button"
                            onClick={() => insertFormat('> ')}
                            title="Blockquote"
                            className="p-1.5 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Quote className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => insertFormat('`', '`')}
                            title="Code"
                            className="p-1.5 hover:bg-slate-200/60 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <Code className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Textarea */}
                        <Textarea
                          ref={textareaRef}
                          placeholder="Write a status update, note a meeting summary, or list follow-up points... (Markdown supported!)"
                          value={customNote}
                          onChange={e => setCustomNote(e.target.value)}
                          required
                          className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[160px] max-h-[300px] text-xs font-medium resize-y p-3"
                        />
                      </div>
                    ) : (
                      <div className="border rounded-xl bg-white min-h-[200px] p-4 text-xs overflow-y-auto max-h-[300px]">
                        {!customNote.trim() ? (
                          <div className="text-slate-400 italic text-center py-10 font-medium">Nothing to preview. Start typing on the 'Write' tab!</div>
                        ) : (
                          <div className="prose prose-slate max-w-none text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                            <ReactMarkdown
                              components={{
                                p: ({ node, ...props }) => <p className="mb-1.5 last:mb-0 leading-relaxed font-semibold text-slate-800" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-extrabold text-slate-900" {...props} />,
                                em: ({ node, ...props }) => <em className="italic text-slate-700" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-0.5 my-1.5 pl-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-0.5 my-1.5 pl-1" {...props} />,
                                li: ({ node, ...props }) => <li className="text-slate-800 font-semibold list-item" {...props} />,
                                code: ({ node, ...props }) => <code className="bg-slate-100 font-mono text-[11px] px-1 py-0.5 rounded border text-indigo-600 font-semibold" {...props} />,
                                blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-indigo-300 pl-2.5 my-1 italic text-slate-600 font-medium" {...props} />,
                              }}
                            >
                              {customNote}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {noteSuccess ? '🎉 Note logged successfully!' : 'Appends to Timeline'}
                      </span>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold h-9 gap-1.5 shadow-sm rounded-lg px-4"
                      >
                        <Send className="w-3.5 h-3.5" /> Log Note
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Right: History & Logs Timeline */}
            <div className="lg:col-span-7 p-6 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-full bg-white">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Timeline & Logs
                </h3>
                <span className="text-[10px] bg-slate-100 border text-slate-600 font-bold px-2 py-0.5 rounded-full">
                  {(lead.history || []).length} Logs
                </span>
              </div>

              {(lead.history || []).length === 0 ? (
                <div className="text-center text-slate-400 py-16 text-xs font-semibold">
                  No history logs found for this lead.
                </div>
              ) : (
                <div className="relative border-l border-slate-100 pl-4 ml-2 space-y-6">
                  {[...(lead.history || [])].reverse().map((h, i) => {
                    const isCustomNote = !h.note.startsWith('Organization: ') && 
                                         !h.note.startsWith('Type: ') &&
                                         !h.note.startsWith('Source: ') &&
                                         !h.note.startsWith('Requirement: ') &&
                                         !h.note.startsWith('Lead details updated');
                    const hasSnapshot = !!h.snapshot;
                    const isSnapExpanded = !!expandedSnapshots[h.id];

                    return (
                      <div key={h.id} className="relative">
                        {/* Timeline point */}
                        <div className={`absolute -left-[21px] top-1.5 w-2 h-2 rounded-full border border-white ${
                          i === 0 ? 'bg-indigo-600 ring-2 ring-indigo-100' : 'bg-slate-300'
                        }`} />
                        
                        <div className="bg-slate-50/40 hover:bg-slate-50 border border-slate-100 hover:border-slate-200/80 rounded-xl p-3.5 transition-all duration-200 flex justify-between items-start gap-4">
                          <div className="space-y-2 flex-1 min-w-0">
                            {/* Header Info */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(h.timestamp).toLocaleString('en-IN', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md truncate max-w-[150px]" title={h.changedBy}>
                                {h.changedBy}
                              </span>
                            </div>

                            {/* Note content */}
                            <div className="text-xs text-slate-800 leading-relaxed font-semibold">
                              {isCustomNote ? (
                                <ReactMarkdown
                                  components={{
                                    p: ({ node, ...props }) => <p className="mb-1.5 last:mb-0 leading-relaxed font-semibold text-slate-800" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-extrabold text-slate-900" {...props} />,
                                    em: ({ node, ...props }) => <em className="italic text-slate-700" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-0.5 my-1 pl-1" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-0.5 my-1 pl-1" {...props} />,
                                    li: ({ node, ...props }) => <li className="text-slate-800 font-semibold list-item" {...props} />,
                                    code: ({ node, ...props }) => <code className="bg-slate-100 font-mono text-[11px] px-1 py-0.5 rounded border text-indigo-600 font-semibold" {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-2 border-indigo-300 pl-2.5 my-1 italic text-slate-600 font-medium" {...props} />,
                                  }}
                                >
                                  {h.note}
                                </ReactMarkdown>
                              ) : (
                                <span className="font-medium text-slate-600">{h.note}</span>
                              )}
                            </div>

                            {/* Snapshot Accordion */}
                            {hasSnapshot && (
                              <div className="pt-1.5">
                                <button
                                  type="button"
                                  onClick={() => toggleSnapshot(h.id)}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                                >
                                  {isSnapExpanded ? (
                                    <>
                                      <ChevronUp className="w-3 h-3" /> Hide Snapshot Data
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3" /> View Snapshot Data
                                    </>
                                  )}
                                </button>

                                {isSnapExpanded && h.snapshot && (
                                  <div className="mt-2 text-[10px] bg-white border border-slate-200/80 rounded-xl p-3 space-y-2 text-slate-600 font-medium shadow-sm animate-in slide-in-from-top-2 duration-250">
                                    <div className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 border-b pb-1.5 mb-1.5 flex items-center justify-between">
                                      <span>Data Snapshot</span>
                                      {h.snapshot.status && (
                                        <Badge className={`border text-[8px] font-black scale-90 ${STAT_CLR[h.snapshot.status]}`}>
                                          {STAT_LABELS[h.snapshot.status] || h.snapshot.status}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                                      {h.snapshot.organization && (
                                        <div><span className="text-slate-400">Org:</span> <span className="text-slate-800 font-bold">{h.snapshot.organization}</span></div>
                                      )}
                                      {h.snapshot.contactPerson && (
                                        <div><span className="text-slate-400">Contact:</span> <span className="text-slate-700">{h.snapshot.contactPerson}</span></div>
                                      )}
                                      {h.snapshot.phone && (
                                        <div><span className="text-slate-400">Phone:</span> <span className="text-slate-700 font-mono">📞 {h.snapshot.phone}</span></div>
                                      )}
                                      {h.snapshot.email && (
                                        <div><span className="text-slate-400">Email:</span> <span className="text-slate-700 font-mono truncate max-w-[150px] inline-block align-bottom">✉️ {h.snapshot.email}</span></div>
                                      )}
                                      {h.snapshot.requirement && (
                                        <div className="md:col-span-2"><span className="text-slate-400">Requirement:</span> <span className="text-slate-700">{h.snapshot.requirement}</span></div>
                                      )}
                                      {h.snapshot.expectedRevenue !== undefined && (
                                        <div><span className="text-slate-400">Expected:</span> <span className="font-bold text-indigo-600">{fmtINR(h.snapshot.expectedRevenue)}</span></div>
                                      )}
                                      {h.snapshot.actualRevenue !== undefined && (
                                        <div><span className="text-slate-400">Actual:</span> <span className="font-bold text-emerald-600">{fmtINR(h.snapshot.actualRevenue)}</span></div>
                                      )}
                                      {h.snapshot.followUpDate && (
                                        <div><span className="text-slate-400">Follow-up:</span> <span className="text-amber-600 font-mono">{fmtDateWithDay(h.snapshot.followUpDate)}</span></div>
                                      )}
                                      {h.snapshot.nextAction && (
                                        <div className="md:col-span-2"><span className="text-slate-400">Next Action:</span> <span className="text-slate-700 font-bold">{h.snapshot.nextAction}</span></div>
                                      )}
                                    </div>
                                    {h.snapshot.remarks && (
                                      <div className="text-[9px] text-slate-500 italic mt-1.5 border-t pt-1.5">
                                        "{h.snapshot.remarks}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {!isReadOnly && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full shrink-0 transition-colors" 
                              onClick={() => handleDeleteHistoryEntry(h.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
