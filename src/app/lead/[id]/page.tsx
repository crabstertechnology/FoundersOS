'use client';

import React, { useState, useMemo, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fmtINR } from '@/lib/utils/formatters';
import { 
  ArrowLeft, Trash2, AlertCircle, Phone, Mail, Calendar, Target, 
  TrendingUp, Users, IndianRupee, Plus, X, Clock, History, Save,
  CheckCircle2, FileText, Send, User, MessageSquare
} from 'lucide-react';
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
      history: [...(lead.history || []), mkEntry(noteText, form)]
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

    const noteText = `Note added: ${customNote.trim()}`;

    const updated: EZLead = {
      ...lead,
      history: [...(lead.history || []), mkEntry(noteText, form)]
    };

    setDocumentNonBlocking(profileRef, {
      ezLeads: leads.map(l => l.id === lead.id ? updated : l)
    }, { merge: true });

    setCustomNote('');
    setNoteSuccess(true);
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
      history: (lead.history || []).filter(h => h.id !== entryId)
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

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b h-16 flex items-center px-4 md:px-8 justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBack} 
            className="rounded-full hover:bg-slate-100 text-slate-600 font-bold text-xs gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <Badge className={`border text-[9px] font-black uppercase ${TYPE_CLR[lead.leadType]}`}>
              {lead.leadType}
            </Badge>
            <h1 className="text-sm md:text-base font-black text-slate-900 truncate max-w-[200px] sm:max-w-xs">
              {lead.organization}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isReadOnly && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDelete}
              className="text-rose-600 hover:bg-rose-50 border-rose-200 h-9 font-bold text-xs gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Delete Lead
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
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-6">
            <div className="text-center sm:text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Expected Revenue</div>
              <div className="text-xl font-code font-black text-indigo-600">{lead.expectedRevenue > 0 ? fmtINR(lead.expectedRevenue) : '—'}</div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-center sm:text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Actual Revenue</div>
              <div className="text-xl font-code font-black text-emerald-600">{lead.actualRevenue > 0 ? fmtINR(lead.actualRevenue) : '—'}</div>
            </div>
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
            <div className="text-center sm:text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Next Action</div>
              <div className="text-xs font-bold text-slate-700 max-w-[150px] truncate">{lead.nextAction || '—'}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left / Center Column: Lead Profile Details Form */}
          <div className="lg:col-span-2 space-y-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="font-bold text-xs text-slate-600">Organization / Client Name</Label>
                        <Input 
                          value={form.organization} 
                          onChange={e => setFormKey('organization')(e.target.value)} 
                          required 
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
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
                        <div className="space-y-1">
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
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="font-bold text-xs text-slate-600">Requirement</Label>
                        <Input 
                          placeholder="e.g. IoT Basic Kits + 2-Day Workshop" 
                          value={form.requirement} 
                          onChange={e => setFormKey('requirement')(e.target.value)} 
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-bold text-xs text-slate-600">Creation Date</Label>
                        <Input 
                          type="date" 
                          value={form.date} 
                          onChange={e => setFormKey('date')(e.target.value)} 
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-600 border-b pb-2">Contact Person</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
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
                        <div className="space-y-1">
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
                      </div>
                      <div className="space-y-1">
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

          {/* Right Column: Update Feed & History */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Quick Note Logger */}
            {!isReadOnly && (
              <Card className="border shadow-sm bg-white overflow-hidden">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <CardTitle className="text-sm font-black text-slate-900">Add Log Note</CardTitle>
                  </div>
                  <CardDescription>
                    Add a call summary, progress note, or reminder to the timeline.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <form onSubmit={handleAddCustomNote} className="space-y-3">
                    <Input 
                      placeholder="e.g. Sent invoice copy via email today" 
                      value={customNote}
                      onChange={e => setCustomNote(e.target.value)}
                      required
                      className="text-xs"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {noteSuccess ? '🎉 Note logged!' : 'Appends to timeline'}
                      </span>
                      <Button 
                        type="submit" 
                        size="sm" 
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold h-8 gap-1"
                      >
                        <Send className="w-3 h-3" /> Log Note
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card className="border shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <CardTitle className="text-sm font-black text-slate-900">
                    Version History & Updates
                  </CardTitle>
                </div>
                <CardDescription>
                  {(lead.history || []).length} update logs recorded for this lead profile.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {(lead.history || []).length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-xs font-semibold">
                    No history logs found for this lead.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-100 pl-4 space-y-6">
                    {[...(lead.history || [])].reverse().map((h, i) => (
                      <div key={h.id} className="relative">
                        {/* Timeline node */}
                        <div className={`absolute -left-[23px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          i === 0 ? 'bg-indigo-600' : 'bg-slate-300'
                        }`} />
                        
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="text-xs font-bold text-slate-800 leading-tight">
                              {h.note}
                            </div>
                            <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(h.timestamp).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium">
                              Logged by: <span className="font-semibold">{h.changedBy}</span>
                            </div>
                            {h.snapshot && (
                              <div className="mt-2 text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1.5 text-slate-600 font-medium max-w-[280px]">
                                <div className="font-extrabold text-[9px] uppercase tracking-wider text-slate-400 border-b pb-1 mb-1 flex items-center justify-between">
                                  <span>Snapshot Data</span>
                                  {h.snapshot.status && (
                                    <Badge className={`border text-[8px] font-black scale-90 ${STAT_CLR[h.snapshot.status]}`}>
                                      {STAT_LABELS[h.snapshot.status] || h.snapshot.status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  {h.snapshot.organization && (
                                    <div><span className="text-slate-400">Org:</span> <span className="text-slate-800 font-bold">{h.snapshot.organization}</span></div>
                                  )}
                                  {h.snapshot.contactPerson && (
                                    <div><span className="text-slate-400">Contact:</span> <span className="text-slate-700">{h.snapshot.contactPerson}</span></div>
                                  )}
                                  {(h.snapshot.phone || h.snapshot.email) && (
                                    <div className="text-slate-500 font-mono text-[9px] flex flex-wrap gap-x-2 gap-y-0.5">
                                      {h.snapshot.phone && <span>📞 {h.snapshot.phone}</span>}
                                      {h.snapshot.email && <span className="truncate inline-block max-w-[150px]">✉️ {h.snapshot.email}</span>}
                                    </div>
                                  )}
                                  {h.snapshot.requirement && (
                                    <div><span className="text-slate-400">Req:</span> <span className="text-slate-700">{h.snapshot.requirement}</span></div>
                                  )}
                                  <div className="grid grid-cols-2 gap-2 text-[9px] pt-1 border-t border-dashed mt-1">
                                    {h.snapshot.expectedRevenue !== undefined && (
                                      <div><span className="text-slate-400">Exp:</span> <span className="font-bold text-indigo-600">{fmtINR(h.snapshot.expectedRevenue)}</span></div>
                                    )}
                                    {h.snapshot.actualRevenue !== undefined && (
                                      <div><span className="text-slate-400">Act:</span> <span className="font-bold text-emerald-600">{fmtINR(h.snapshot.actualRevenue)}</span></div>
                                    )}
                                    {h.snapshot.followUpDate && (
                                      <div className="col-span-2"><span className="text-slate-400">Follow-up:</span> <span className="text-amber-600 font-mono">{h.snapshot.followUpDate}</span></div>
                                    )}
                                  </div>
                                  {h.snapshot.nextAction && (
                                    <div className="text-[9px] bg-white border border-slate-100 rounded px-1.5 py-0.5 mt-1">
                                      <span className="text-slate-400">Next:</span> <span className="text-slate-600 font-semibold">{h.snapshot.nextAction}</span>
                                    </div>
                                  )}
                                  {h.snapshot.remarks && (
                                    <div className="text-[9px] text-slate-500 italic mt-0.5 truncate" title={h.snapshot.remarks}>
                                      "{h.snapshot.remarks}"
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {!isReadOnly && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full shrink-0" 
                              onClick={() => handleDeleteHistoryEntry(h.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

      </main>
    </div>
  );
}
