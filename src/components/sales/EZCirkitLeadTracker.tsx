'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmtINR } from '@/lib/utils/formatters';
import { Trash2, AlertCircle, Phone, Mail, Calendar, Target, TrendingUp, Users, IndianRupee, Plus, X, Clock, History } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useFirebase } from '@/firebase';
import type { DocumentReference } from 'firebase/firestore';

export type LeadType = 'school' | 'college' | 'student' | 'other';
export type LeadStatus = 'new-lead' | 'contacted' | 'meeting-scheduled' | 'proposal-sent' | 'follow-up' | 'negotiation' | 'won' | 'lost' | 'on-hold';
export type LeadSource = 'cold-call' | 'referral' | 'instagram' | 'whatsapp' | 'website' | 'event' | 'other';

export interface LeadHistoryEntry {
  id: string; timestamp: string; changedBy: string; note: string;
  snapshot: { status: LeadStatus; nextAction: string; followUpDate: string; remarks: string; expectedRevenue: number; actualRevenue: number; };
}

export interface EZLead {
  id: string; date: string; leadType: LeadType; organization: string;
  contactPerson: string; phone: string; email: string; source: LeadSource;
  requirement: string; status: LeadStatus; nextAction: string;
  followUpDate: string; expectedRevenue: number; actualRevenue: number;
  remarks: string; history: LeadHistoryEntry[];
}

const TYPE_CLR: Record<string,string> = { school:'bg-blue-50 text-blue-700 border-blue-100', college:'bg-purple-50 text-purple-700 border-purple-100', student:'bg-emerald-50 text-emerald-700 border-emerald-100', other:'bg-slate-50 text-slate-600 border-slate-200' };
const STAT_CLR: Record<string,string> = { 'new-lead':'bg-slate-100 text-slate-700 border-slate-200', contacted:'bg-blue-50 text-blue-700 border-blue-100', 'meeting-scheduled':'bg-indigo-50 text-indigo-700 border-indigo-100', 'proposal-sent':'bg-amber-50 text-amber-700 border-amber-100', 'follow-up':'bg-cyan-50 text-cyan-700 border-cyan-100', negotiation:'bg-orange-50 text-orange-700 border-orange-100', won:'bg-emerald-50 text-emerald-700 border-emerald-100', lost:'bg-rose-50 text-rose-700 border-rose-100', 'on-hold':'bg-gray-50 text-gray-600 border-gray-200' };
const STAT_LABELS: Record<LeadStatus,string> = { 'new-lead':'New Lead', contacted:'Contacted', 'meeting-scheduled':'Meeting Scheduled', 'proposal-sent':'Proposal Sent', 'follow-up':'Follow-up', negotiation:'Negotiation', won:'Won', lost:'Lost', 'on-hold':'On Hold' };

interface F { date:string; leadType:LeadType; organization:string; contactPerson:string; phone:string; email:string; source:LeadSource; requirement:string; status:LeadStatus; nextAction:string; followUpDate:string; expectedRevenue:number|''; actualRevenue:number|''; remarks:string; }
const blank = (d:string): F => ({ date:d, leadType:'school', organization:'', contactPerson:'', phone:'', email:'', source:'cold-call', requirement:'', status:'new-lead', nextAction:'', followUpDate:'', expectedRevenue:'', actualRevenue:'', remarks:'' });

function diffNote(prev: Partial<EZLead>, next: Partial<EZLead>): string {
  const c: string[] = [];
  if (prev.status !== next.status) c.push(`Status: ${STAT_LABELS[prev.status!]} → ${STAT_LABELS[next.status!]}`);
  if (prev.nextAction !== next.nextAction) c.push('Next Action updated');
  if (prev.remarks !== next.remarks) c.push('Remarks updated');
  if (prev.followUpDate !== next.followUpDate) c.push(`Follow-up: ${next.followUpDate}`);
  if (prev.expectedRevenue !== next.expectedRevenue) c.push(`Expected: ${fmtINR(next.expectedRevenue as number)}`);
  if (prev.actualRevenue !== next.actualRevenue) c.push(`Actual: ${fmtINR(next.actualRevenue as number)}`);
  return c.length ? c.join(' · ') : 'Lead updated';
}

function LeadForm({ f, setF, onSubmit, onCancel, isEdit, readOnly }: { f:F; setF: React.Dispatch<React.SetStateAction<F>>; onSubmit:(e:React.FormEvent)=>void; onCancel:()=>void; isEdit:boolean; readOnly?:boolean; }) {
  const s = (k: keyof F) => (v: any) => setF(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="font-bold text-xs">Date</Label><Input type="date" value={f.date} onChange={e=>s('date')(e.target.value)} disabled={readOnly}/></div>
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
        <div className="space-y-1"><Label className="font-bold text-xs">Follow-up Date</Label><Input type="date" value={f.followUpDate} onChange={e=>s('followUpDate')(e.target.value)} disabled={readOnly}/></div>
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
  const today = new Date().toISOString().split('T')[0];
  const [showAdd, setShowAdd] = useState(false);
  const [addF, setAddF] = useState<F>(blank(today));
  const [sel, setSel] = useState<EZLead | null>(null);
  const [editF, setEditF] = useState<F>(blank(today));
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (sel) setEditF({ date:sel.date, leadType:sel.leadType, organization:sel.organization, contactPerson:sel.contactPerson, phone:sel.phone, email:sel.email, source:sel.source, requirement:sel.requirement, status:sel.status, nextAction:sel.nextAction, followUpDate:sel.followUpDate, expectedRevenue:sel.expectedRevenue, actualRevenue:sel.actualRevenue, remarks:sel.remarks });
  }, [sel]);

  const kpis = useMemo(() => ({ total:leads.length, won:leads.filter(l=>l.status==='won').length, schools:leads.filter(l=>l.leadType==='school').length, colleges:leads.filter(l=>l.leadType==='college').length, students:leads.filter(l=>l.leadType==='student').length, totalExpected:leads.reduce((s,l)=>s+(Number(l.expectedRevenue)||0),0), totalActual:leads.reduce((s,l)=>s+(Number(l.actualRevenue)||0),0) }), [leads]);
  const filtered = useMemo(() => leads.filter(l=>(filterStatus==='all'||l.status===filterStatus)&&(filterType==='all'||l.leadType===filterType)), [leads,filterStatus,filterType]);

  const mkSnap = (f: F) => ({ status:f.status, nextAction:f.nextAction, followUpDate:f.followUpDate, remarks:f.remarks, expectedRevenue:Number(f.expectedRevenue)||0, actualRevenue:Number(f.actualRevenue)||0 });
  const mkEntry = (note: string, f: F): LeadHistoryEntry => ({ id:Math.random().toString(36).substr(2,6), timestamp:new Date().toISOString(), changedBy:user?.email||'System', note, snapshot:mkSnap(f) });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !addF.organization) return;
    const lead: EZLead = { id:Math.random().toString(36).substr(2,9), date:addF.date, leadType:addF.leadType, organization:addF.organization, contactPerson:addF.contactPerson, phone:addF.phone, email:addF.email, source:addF.source, requirement:addF.requirement, status:addF.status, nextAction:addF.nextAction, followUpDate:addF.followUpDate, expectedRevenue:Number(addF.expectedRevenue)||0, actualRevenue:Number(addF.actualRevenue)||0, remarks:addF.remarks, history:[mkEntry('Lead created',addF)] };
    setDocumentNonBlocking(profileRef, { ezLeads:[...leads,lead] }, { merge:true });
    setAddF(blank(today)); setShowAdd(false);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileRef || !sel) return;
    const note = diffNote(sel, { status:editF.status, nextAction:editF.nextAction, remarks:editF.remarks, followUpDate:editF.followUpDate, expectedRevenue:Number(editF.expectedRevenue)||0, actualRevenue:Number(editF.actualRevenue)||0 });
    const updated: EZLead = { ...sel, date:editF.date, leadType:editF.leadType, organization:editF.organization, contactPerson:editF.contactPerson, phone:editF.phone, email:editF.email, source:editF.source, requirement:editF.requirement, status:editF.status, nextAction:editF.nextAction, followUpDate:editF.followUpDate, expectedRevenue:Number(editF.expectedRevenue)||0, actualRevenue:Number(editF.actualRevenue)||0, remarks:editF.remarks, history:[...(sel.history||[]),mkEntry(note,editF)] };
    setDocumentNonBlocking(profileRef, { ezLeads:leads.map(l=>l.id===sel.id?updated:l) }, { merge:true });
    setSel(updated);
  };

  const handleDelete = (id: string) => {
    if (!profileRef || !window.confirm('Delete this lead and all its history?')) return;
    setDocumentNonBlocking(profileRef, { ezLeads:leads.filter(l=>l.id!==id) }, { merge:true });
    if (sel?.id===id) setSel(null);
  };

  const handleDeleteHistoryEntry = (entryId: string) => {
    if (!profileRef || !sel || !window.confirm('Are you sure you want to delete this history entry?')) return;
    const updated: EZLead = { ...sel, history: (sel.history || []).filter(h => h.id !== entryId) };
    setDocumentNonBlocking(profileRef, { ezLeads:leads.map(l=>l.id===sel.id?updated:l) }, { merge:true });
    setSel(updated);
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

      {/* Lead Detail + History Panel */}
      {sel && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={()=>setSel(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b shrink-0">
              <div className="flex items-center gap-3">
                <Badge className={`border text-[9px] font-black uppercase ${TYPE_CLR[sel.leadType]}`}>{sel.leadType}</Badge>
                <div><h2 className="text-base font-black text-slate-900">{sel.organization}</h2><p className="text-xs text-muted-foreground">{sel.contactPerson}{sel.phone&&` · ${sel.phone}`}</p></div>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly&&<Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:bg-rose-50 rounded-full" onClick={()=>handleDelete(sel.id)}><Trash2 className="w-3.5 h-3.5"/></Button>}
                <Button size="icon" variant="ghost" className="rounded-full" onClick={()=>setSel(null)}><X className="w-4 h-4"/></Button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-6">
              <LeadForm f={editF} setF={setEditF} onSubmit={handleUpdate} onCancel={()=>setSel(null)} isEdit={true} readOnly={readOnly}/>
              {(sel.history||[]).length>0&&(
                <div className="border-t pt-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2"><History className="w-3.5 h-3.5"/> Change History ({sel.history.length})</h3>
                  </div>
                  <div className="space-y-0">
                    {[...(sel.history||[])].reverse().map((h,i)=>(
                      <div key={h.id} className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${i===0?'bg-indigo-600':'bg-slate-300'}`}/>
                          {i<sel.history.length-1&&<div className="w-px flex-1 bg-slate-200 my-1"/>}
                        </div>
                        <div className="pb-4 flex-1 flex justify-between items-start gap-2">
                          <div>
                            <div className="font-bold text-slate-800">{h.note}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-2.5 h-2.5"/>{new Date(h.timestamp).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})} · {h.changedBy}</div>
                            <Badge className={`mt-1.5 border text-[8px] font-black ${STAT_CLR[h.snapshot.status]}`}>{STAT_LABELS[h.snapshot.status]}</Badge>
                            {h.snapshot.nextAction&&<p className="text-[10px] text-slate-500 mt-1">→ {h.snapshot.nextAction}</p>}
                          </div>
                          {!readOnly && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full shrink-0" onClick={() => handleDeleteHistoryEntry(h.id)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="All Types"/></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="school">School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="student">Student</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Status"/></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{(Object.keys(STAT_LABELS) as LeadStatus[]).map(s=><SelectItem key={s} value={s}>{STAT_LABELS[s]}</SelectItem>)}</SelectContent></Select>
              {!readOnly&&<Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 h-8" onClick={()=>setShowAdd(true)}><Plus className="w-3.5 h-3.5"/>Add Lead</Button>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length===0?(
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3"><AlertCircle className="w-9 h-9 text-indigo-200"/><p className="text-sm font-semibold">No leads found. {!readOnly&&'Click "Add Lead" to get started.'}</p></div>
          ):(
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow className="bg-slate-50">{['Date','Type','Organization','Contact','Status','Follow-up','Exp. Rev','Act. Rev','Remarks'].map(h=><TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {filtered.map(l=>(
                    <TableRow key={l.id} className="hover:bg-indigo-50/30 cursor-pointer transition-colors" onClick={()=>setSel(l)}>
                      <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">{l.date||'—'}</TableCell>
                      <TableCell><Badge className={`border text-[9px] font-black uppercase ${TYPE_CLR[l.leadType]}`}>{l.leadType}</Badge></TableCell>
                      <TableCell className="font-bold py-3 max-w-[130px]"><div className="text-slate-900 truncate">{l.organization}</div><div className="text-[10px] text-muted-foreground truncate">{l.requirement}</div></TableCell>
                      <TableCell className="text-xs text-slate-600 max-w-[100px]"><div className="font-medium truncate">{l.contactPerson||'—'}</div>{l.phone&&<div className="flex items-center gap-0.5 text-[10px] text-slate-400"><Phone className="w-2.5 h-2.5"/>{l.phone}</div>}{l.email&&<div className="flex items-center gap-0.5 text-[10px] text-slate-400 truncate"><Mail className="w-2.5 h-2.5"/>{l.email}</div>}</TableCell>
                      <TableCell><Badge className={`border text-[9px] font-black whitespace-nowrap ${STAT_CLR[l.status]}`}>{STAT_LABELS[l.status]}</Badge></TableCell>
                      <TableCell className="text-xs font-mono text-slate-500 whitespace-nowrap">{l.followUpDate?<div className="flex items-center gap-0.5"><Calendar className="w-3 h-3 text-amber-500"/>{l.followUpDate}</div>:'—'}</TableCell>
                      <TableCell className="font-code font-bold text-indigo-700 whitespace-nowrap">{l.expectedRevenue>0?fmtINR(l.expectedRevenue):'—'}</TableCell>
                      <TableCell className="font-code font-bold text-emerald-700 whitespace-nowrap">{l.actualRevenue>0?fmtINR(l.actualRevenue):'—'}</TableCell>
                      <TableCell className="text-xs text-slate-500 max-w-[100px]"><div className="truncate">{l.remarks||'—'}</div>{(l.history||[]).length>0&&<div className="text-[9px] text-indigo-400 flex items-center gap-0.5 mt-0.5"><History className="w-2.5 h-2.5"/>{l.history.length} updates</div>}</TableCell>
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
