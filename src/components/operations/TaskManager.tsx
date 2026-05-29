'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit2, AlertCircle, CheckCircle2, Clock, CircleDot, Users, ListChecks, AlertTriangle } from 'lucide-react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, doc, serverTimestamp, where } from 'firebase/firestore';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedToUid: string;
  assignedToName: string;
  assignedToEmail: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: any;
  category: string;
}

export interface Employee {
  id: string;
  uid: string;
  name: string;
  email: string;
  department: string;
  role: string;
  isActive: boolean;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-slate-100 text-slate-600 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-100',
  high: 'bg-amber-50 text-amber-700 border-amber-100',
  urgent: 'bg-rose-50 text-rose-700 border-rose-100',
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600 border-slate-200',
  'in-progress': 'bg-indigo-50 text-indigo-700 border-indigo-100',
  review: 'bg-purple-50 text-purple-700 border-purple-100',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  todo: <CircleDot className="w-3 h-3" />,
  'in-progress': <Clock className="w-3 h-3" />,
  review: <AlertTriangle className="w-3 h-3" />,
  done: <CheckCircle2 className="w-3 h-3" />,
};

interface TaskManagerProps {
  userId: string;
  companyProfileId: string;
  employees: Employee[];
  initialAssigneeUid?: string;
  userRole?: string;
  currentUserUid?: string;
}

export function TaskManager({ userId, companyProfileId, employees, initialAssigneeUid, userRole, currentUserUid }: TaskManagerProps) {
  const firestore = useFirestore();
  const today = new Date().toISOString().split('T')[0];

  const tasksRef = useMemoFirebase(() => {
    if (!firestore || !userId || !companyProfileId) return null;
    return collection(firestore, 'users', userId, 'companyProfiles', companyProfileId, 'tasks');
  }, [firestore, userId, companyProfileId]);

  const tasksQuery = useMemoFirebase(() => {
    if (!tasksRef) return null;
    return query(tasksRef, orderBy('createdAt', 'desc'));
  }, [tasksRef]);

  const { data: tasksRaw } = useCollection(tasksQuery);
  const tasks = tasksRaw || [];

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  // Pre-fill assignee if passed from Chat
  React.useEffect(() => {
    if (initialAssigneeUid) {
      setAssignedTo(initialAssigneeUid);
    }
  }, [initialAssigneeUid]);

  const kpis = useMemo(() => {
    const done = tasks.filter((t: any) => t.status === 'done').length;
    const inProgress = tasks.filter((t: any) => t.status === 'in-progress').length;
    const overdue = tasks.filter((t: any) => t.dueDate && t.dueDate < today && t.status !== 'done').length;
    return { total: tasks.length, done, inProgress, overdue };
  }, [tasks, today]);

  const filtered = useMemo(() => (tasks as any[]).filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterAssignee !== 'all' && t.assignedToUid !== filterAssignee) return false;
    return true;
  }), [tasks, filterStatus, filterAssignee]);

  const resetForm = () => {
    setTitle(''); setDescription(''); setAssignedTo(''); setPriority('medium');
    setStatus('todo'); setDueDate(''); setCategory(''); setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasksRef || !title) return;
    const emp = employees.find(em => em.uid === assignedTo);
    const payload: any = {
      title, description, category, priority, status, dueDate,
      assignedToUid: assignedTo || '',
      assignedToName: emp?.name || 'Unassigned',
      assignedToEmail: emp?.email || '',
    };
    if (assignedTo) {
      payload.assignedAt = new Date().toISOString();
    }
    if (status === 'done') {
      payload.completedAt = new Date().toISOString();
    } else {
      payload.completedAt = null;
    }

    if (editingId) {
      setDocumentNonBlocking(doc(tasksRef, editingId), payload, { merge: true });
    } else {
      addDocumentNonBlocking(tasksRef, { ...payload, createdAt: serverTimestamp() });
    }
    resetForm();
  };

  const handleEdit = (t: any) => {
    setEditingId(t.id); setTitle(t.title); setDescription(t.description || '');
    setAssignedTo(t.assignedToUid || ''); setPriority(t.priority); setStatus(t.status);
    setDueDate(t.dueDate || ''); setCategory(t.category || '');
  };

  const handleDelete = (id: string) => {
    if (!tasksRef) return;
    deleteDocumentNonBlocking(doc(tasksRef, id));
    if (editingId === id) resetForm();
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    if (!tasksRef) return;
    const updatePayload: any = { status: newStatus };
    if (newStatus === 'done') {
      updatePayload.completedAt = new Date().toISOString();
    } else {
      updatePayload.completedAt = null;
    }
    setDocumentNonBlocking(doc(tasksRef, taskId), updatePayload, { merge: true });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: kpis.total, icon: ListChecks, color: 'text-teal-600', bg: '' },
          { label: 'In Progress', value: kpis.inProgress, icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50/20 border-indigo-100' },
          { label: 'Completed', value: kpis.done, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/20 border-emerald-100' },
          { label: 'Overdue', value: kpis.overdue, icon: AlertTriangle, color: 'text-rose-600', bg: kpis.overdue > 0 ? 'bg-rose-50/20 border-rose-100' : '' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className={`border-2 shadow-sm ${bg}`}>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</CardTitle>
              <Icon className={`w-4 h-4 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-code font-black ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        {userRole !== 'employee' && (
          <Card className="border shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
              {editingId ? 'Edit Task' : 'Assign New Task'}
            </CardTitle>
            <CardDescription>Create and assign tasks to team members.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="space-y-1">
                <Label className="font-bold text-xs">Task Title</Label>
                <Input placeholder="e.g. Call 10 schools today" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Description</Label>
                <textarea
                  className="w-full text-sm p-2.5 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  rows={2}
                  placeholder="Optional details..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="font-bold text-xs">Assign To</Label>
                <Select value={assignedTo} onValueChange={setAssignedTo}>
                  <SelectTrigger><SelectValue placeholder="Select team member..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">— Unassigned —</SelectItem>
                    {employees.filter(e => e.isActive).map(emp => (
                      <SelectItem key={emp.uid} value={emp.uid}>{emp.name} ({emp.role || 'Employee'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Priority</Label>
                  <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Category</Label>
                  <Input placeholder="e.g. Sales, Marketing" value={category} onChange={e => setCategory(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Due Date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                  {editingId ? 'Update Task' : 'Assign Task'}
                </Button>
                {editingId && <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>}
              </div>
            </form>
          </CardContent>
          </Card>
        )}

        {/* Task Board */}
        <Card className={`border shadow-sm bg-white overflow-hidden ${userRole === 'employee' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
          <CardHeader className="pb-3 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-black text-slate-900">Task Board</CardTitle>
                <CardDescription>All assigned tasks. Change status inline.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Members" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.uid} value={emp.uid}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                <AlertCircle className="w-9 h-9 text-teal-200" />
                <p className="text-sm font-semibold">No tasks found. Create and assign your first task.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      {['Task', 'Assignee', 'Priority', 'Status', 'Due', ...(userRole !== 'employee' ? [''] : [])].map(h => (
                        <TableHead key={h} className="font-black text-[10px] uppercase text-slate-500 whitespace-nowrap">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t: any) => {
                      const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done';
                      return (
                        <TableRow key={t.id} className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                          <TableCell className="py-3 max-w-[180px]">
                            <div className="font-bold text-slate-900 truncate">{t.title}</div>
                            {t.category && <div className="text-[10px] text-muted-foreground font-medium">{t.category}</div>}
                            {t.description && <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{t.description}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center text-[10px] font-black text-teal-700 shrink-0">
                                {(t.assignedToName || 'U').charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium text-slate-700 truncate max-w-[80px]">{t.assignedToName || 'Unassigned'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`border text-[9px] font-black uppercase ${PRIORITY_COLORS[t.priority as TaskPriority]}`}>{t.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={t.status} 
                              onValueChange={(v: any) => handleStatusChange(t.id, v)}
                              disabled={userRole === 'employee' && t.assignedToUid !== currentUserUid}
                            >
                              <SelectTrigger className="h-7 text-[10px] font-black border-0 p-0 bg-transparent w-28 focus:ring-0">
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border font-black text-[9px] ${STATUS_COLORS[t.status as TaskStatus]}`}>
                                  {STATUS_ICONS[t.status as TaskStatus]}
                                  <span className="uppercase">{t.status.replace('-', ' ')}</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="todo">To Do</SelectItem>
                                <SelectItem value="in-progress">In Progress</SelectItem>
                                <SelectItem value="review">In Review</SelectItem>
                                <SelectItem value="done">Done</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className={`text-xs font-mono whitespace-nowrap ${isOverdue ? 'text-rose-600 font-black' : 'text-slate-500'}`}>
                            {t.dueDate || '—'}{isOverdue && ' ⚠'}
                          </TableCell>
                          {userRole !== 'employee' && (
                            <TableCell className="pr-4">
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-teal-600 rounded-full" onClick={() => handleEdit(t)}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(t.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
