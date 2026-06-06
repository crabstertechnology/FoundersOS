'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Edit2, AlertCircle, CheckCircle2, Clock, CircleDot, Users, ListChecks, AlertTriangle, X, CalendarDays, Tag, User2, FileText, Plus } from 'lucide-react';
import { useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, doc, serverTimestamp, where } from 'firebase/firestore';
import { fmtDateWithDay } from '@/lib/utils/formatters';

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
  mobile?: string;
  address?: string;
  position?: string;
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
  const isAdmin = (userRole || '').toLowerCase() === 'admin';
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
  const [showFormModal, setShowFormModal] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Pre-fill assignee if passed from Chat
  React.useEffect(() => {
    if (initialAssigneeUid) {
      setAssignedTo(initialAssigneeUid);
    }
  }, [initialAssigneeUid]);

  // Load view preference on mount
  React.useEffect(() => {
    const savedView = localStorage.getItem('taskBoardViewPreference');
    if (savedView === 'board' || savedView === 'list') {
      setViewMode(savedView);
    }
  }, []);

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
    setShowFormModal(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tasksRef || !title) return;
    const isFounder = assignedTo === userId;
    const emp = employees.find(em => em.uid === assignedTo);
    const payload: any = {
      title, description, category, priority, status, dueDate,
      assignedToUid: assignedTo || '',
      assignedToName: isFounder ? 'Founder' : (emp?.name || 'Unassigned'),
      assignedToEmail: isFounder ? '' : (emp?.email || ''),
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
    setShowFormModal(true);
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

      {/* Assign New Task Modal */}
      {showFormModal && userRole !== 'employee' && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => resetForm()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-base font-black text-slate-900">{editingId ? 'Edit Task' : 'Assign New Task'}</h2>
                <p className="text-xs text-muted-foreground">Define task details and assign to a team member.</p>
              </div>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => resetForm()}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Task Title</Label>
                  <Input placeholder="e.g. Call 10 schools today" value={title} onChange={e => setTitle(e.target.value)} required className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Description</Label>
                  <textarea
                    className="w-full text-xs p-2.5 rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none font-medium text-slate-700 bg-slate-50/50"
                    rows={3}
                    placeholder="Optional details..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-bold text-xs">Assign To</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Select team member..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">— Unassigned —</SelectItem>
                      {userId && (
                        <SelectItem value={userId}>Founder (Admin)</SelectItem>
                      )}
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
                      <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
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
                      <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
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
                    <Input placeholder="e.g. Sales, Marketing" value={category} onChange={e => setCategory(e.target.value)} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-xs">Due Date</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t mt-4">
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-9">
                    {editingId ? 'Save Changes' : 'Create Task'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => resetForm()}>Cancel</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Task Board */}
      <Card className="border shadow-sm bg-white overflow-hidden w-full">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-black text-slate-900">Task Board</CardTitle>
              <CardDescription>Visual workspace for all assigned tasks.</CardDescription>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {/* View Mode Toggle */}
              <div className="flex border rounded-lg overflow-hidden bg-slate-50/50 mr-1 p-0.5">
                <button
                  onClick={() => {
                    setViewMode('board');
                    localStorage.setItem('taskBoardViewPreference', 'board');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    viewMode === 'board'
                      ? 'bg-white shadow-sm text-teal-700'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Board
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    localStorage.setItem('taskBoardViewPreference', 'list');
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    viewMode === 'list'
                      ? 'bg-white shadow-sm text-teal-700'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  List
                </button>
              </div>

              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="All Members" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {userId && (
                    <SelectItem value={userId}>Founder (Admin)</SelectItem>
                  )}
                  {employees.map(emp => (
                    <SelectItem key={emp.uid} value={emp.uid}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {viewMode === 'list' && (
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
              )}

              {userRole !== 'employee' && (
                <Button 
                  size="sm" 
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 h-8"
                  onClick={() => {
                    resetForm();
                    setShowFormModal(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign Task
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
              <AlertCircle className="w-9 h-9 text-teal-200" />
              <p className="text-sm font-semibold">No tasks found. Create and assign your first task.</p>
            </div>
          ) : viewMode === 'board' ? (
            /* Elaborate Kanban Board View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50/50 min-h-[500px]">
              {(['todo', 'in-progress', 'review', 'done'] as TaskStatus[]).map(colStatus => {
                const statusTasks = filtered.filter((t: any) => t.status === colStatus);
                const colLabels: Record<TaskStatus, string> = {
                  todo: 'To Do',
                  'in-progress': 'In Progress',
                  review: 'In Review',
                  done: 'Done',
                };
                const colColors: Record<TaskStatus, string> = {
                  todo: 'bg-slate-100 text-slate-800 border-slate-200',
                  'in-progress': 'bg-indigo-50 text-indigo-700 border-indigo-200',
                  review: 'bg-purple-100 text-purple-800 border-purple-200',
                  done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                };
                
                return (
                  <div key={colStatus} className="flex flex-col gap-3 bg-slate-100/35 rounded-xl p-3 border border-slate-200/55 min-h-[250px] md:min-h-[450px]">
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/40">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${colColors[colStatus]}`}>
                          {colLabels[colStatus]}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">({statusTasks.length})</span>
                      </div>
                    </div>
                    
                    {/* Column Cards */}
                    <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[550px] pr-1">
                      {statusTasks.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-[10px] font-bold border border-dashed border-slate-200 rounded-lg bg-white/50 select-none">
                          No tasks here
                        </div>
                      ) : (
                        statusTasks.map((t: any) => {
                          const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done';
                          
                          return (
                            <div
                              key={t.id}
                              className={`group relative bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-teal-500/30 transition-all cursor-pointer flex flex-col gap-2 ${isOverdue ? 'border-rose-200 bg-rose-50/5' : ''}`}
                              onClick={() => setSelectedTask(t)}
                            >
                              {/* Tags & Priority Row */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 min-w-0">
                                  <Badge className={`border text-[8px] font-black uppercase shrink-0 ${PRIORITY_COLORS[t.priority as TaskPriority]}`}>
                                    {t.priority}
                                  </Badge>
                                  {t.category && (
                                    <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[80px]">
                                      {t.category}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Quick status move arrows */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                  {colStatus !== 'todo' && (
                                    <button 
                                      className="p-1 hover:bg-slate-100 rounded text-slate-450 hover:text-slate-800 transition-colors font-bold text-xs"
                                      onClick={() => {
                                        const order: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
                                        const idx = order.indexOf(colStatus);
                                        handleStatusChange(t.id, order[idx - 1]);
                                      }}
                                      title="Move Left"
                                    >
                                      &larr;
                                    </button>
                                  )}
                                  {colStatus !== 'done' && (
                                    <button 
                                      className="p-1 hover:bg-slate-100 rounded text-slate-450 hover:text-slate-800 transition-colors font-bold text-xs"
                                      onClick={() => {
                                        const order: TaskStatus[] = ['todo', 'in-progress', 'review', 'done'];
                                        const idx = order.indexOf(colStatus);
                                        handleStatusChange(t.id, order[idx + 1]);
                                      }}
                                      title="Move Right"
                                    >
                                      &rarr;
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Title */}
                              <div className="font-bold text-slate-900 text-xs leading-snug group-hover:text-teal-650 transition-colors">
                                {t.title}
                              </div>
                              
                              {/* Description */}
                              {t.description && (
                                <div className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                  {t.description}
                                </div>
                              )}
                              
                              {/* Footer Details */}
                              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 mt-1">
                                {/* Assignee */}
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="w-5 h-5 bg-teal-50 rounded-full flex items-center justify-center text-[8px] font-black text-teal-700 shrink-0 border border-teal-100">
                                    {(t.assignedToName || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-600 truncate max-w-[80px]">
                                    {t.assignedToName || 'Unassigned'}
                                  </span>
                                </div>
                                
                                {/* Due date */}
                                {t.dueDate ? (
                                  <div className={`flex items-center gap-1 text-[9px] font-bold shrink-0 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`}>
                                    <CalendarDays className="w-3 h-3 shrink-0" />
                                    <span>{fmtDateWithDay(t.dueDate)}</span>
                                  </div>
                                ) : (
                                  <span className="text-[9px] text-slate-350">—</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Desktop/Mobile List View */
            <>
              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-slate-100 bg-white">
                {filtered.map((t: any) => {
                  const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done';
                  return (
                    <div 
                      key={t.id} 
                      className={`p-4 flex flex-col gap-3 transition-colors cursor-pointer hover:bg-slate-50/50 ${isOverdue ? 'bg-rose-50/20' : ''}`}
                      onClick={() => setSelectedTask(t)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="font-bold text-sm text-slate-900 leading-snug truncate">{t.title}</div>
                          {t.category && <span className="inline-block bg-slate-100 text-slate-700 border border-slate-200 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">{t.category}</span>}
                        </div>
                        <Badge className={`border text-[8px] font-black uppercase shrink-0 ${PRIORITY_COLORS[t.priority as TaskPriority]}`}>{t.priority}</Badge>
                      </div>
                      
                      {t.description && (
                        <div className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                          {t.description}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 bg-teal-100 rounded-full flex items-center justify-center text-[9px] font-black text-teal-700 shrink-0">
                            {(t.assignedToName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600 truncate">{t.assignedToName || 'Unassigned'}</span>
                        </div>

                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <Select 
                            value={t.status} 
                            onValueChange={(v: any) => handleStatusChange(t.id, v)}
                            disabled={userRole === 'employee' && t.assignedToUid !== currentUserUid}
                          >
                            <SelectTrigger className="h-6 text-[10px] font-black border-0 p-0 bg-transparent w-20 focus:ring-0">
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border font-black text-[8px] ${STATUS_COLORS[t.status as TaskStatus]}`}>
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

                          {userRole !== 'employee' && (
                            <div className="flex items-center gap-0.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-teal-600 rounded-full" onClick={() => handleEdit(t)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              {isAdmin && (
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(t.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
                        <TableRow key={t.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${isOverdue ? 'bg-rose-50/30' : ''}`} onClick={() => setSelectedTask(t)}>
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
                            {t.dueDate ? fmtDateWithDay(t.dueDate) : '—'}{isOverdue && ' ⚠'}
                          </TableCell>
                          {userRole !== 'employee' && (
                            <TableCell className="pr-4" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-teal-600 rounded-full" onClick={() => handleEdit(t)}>
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                {isAdmin && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-full" onClick={() => handleDelete(t.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Slide-Over */}
      {selectedTask && (() => {
        const t = selectedTask;
        const isOverdue = t.dueDate && t.dueDate < today && t.status !== 'done';
        const createdAt = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString() : '—';
        const completedAt = t.completedAt ? new Date(t.completedAt).toLocaleString() : null;
        const assignedAt = t.assignedAt ? new Date(t.assignedAt).toLocaleDateString() : null;
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-200"
              onClick={() => setSelectedTask(null)}
            />
            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className={`px-6 py-5 border-b flex items-start justify-between gap-3 ${isOverdue ? 'bg-rose-50' : 'bg-slate-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${STATUS_COLORS[t.status as TaskStatus]}`}>
                      {STATUS_ICONS[t.status as TaskStatus]}
                      {t.status.replace('-', ' ')}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${PRIORITY_COLORS[t.priority as TaskPriority]}`}>
                      {t.priority}
                    </span>
                    {isOverdue && <span className="text-[9px] font-black text-rose-600 uppercase">⚠ Overdue</span>}
                  </div>
                  <h2 className="text-base font-black text-slate-900 leading-snug">{t.title}</h2>
                  {t.category && <p className="text-[10px] text-teal-600 font-bold uppercase mt-0.5">{t.category}</p>}
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <FileText className="w-3 h-3" /> Description
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3 border min-h-[60px]">
                    {t.description || <span className="text-slate-400 italic">No description provided.</span>}
                  </p>
                </div>

                {/* Assignee */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <User2 className="w-3 h-3" /> Assigned To
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 border">
                    <div className="w-9 h-9 bg-teal-100 rounded-full flex items-center justify-center text-sm font-black text-teal-700 shrink-0">
                      {(t.assignedToName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{t.assignedToName || 'Unassigned'}</div>
                      {t.assignedToEmail && <div className="text-xs text-slate-500">{t.assignedToEmail}</div>}
                      {assignedAt && <div className="text-[10px] text-slate-400 mt-0.5">Assigned on {assignedAt}</div>}
                    </div>
                  </div>
                </div>

                {/* Dates grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <CalendarDays className="w-3 h-3" /> Due Date
                    </div>
                    <div className={`text-sm font-bold px-3 py-2 rounded-lg border ${isOverdue ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      {t.dueDate || '—'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <Clock className="w-3 h-3" /> Created
                    </div>
                    <div className="text-xs font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      {createdAt}
                    </div>
                  </div>
                </div>

                {/* Completed */}
                {completedAt && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Completed At
                    </div>
                    <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                      {completedAt}
                    </div>
                  </div>
                )}

                {/* Update status inline */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <Tag className="w-3 h-3" /> Update Status
                  </div>
                  <Select
                    value={t.status}
                    onValueChange={(v: any) => { handleStatusChange(t.id, v); setSelectedTask({ ...t, status: v }); }}
                    disabled={userRole === 'employee' && t.assignedToUid !== currentUserUid}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">In Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Footer actions (admin/manager only) */}
              {userRole !== 'employee' && (
                <div className="px-6 py-4 border-t bg-slate-50 flex gap-2">
                  <Button
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1"
                    onClick={() => { handleEdit(t); setSelectedTask(null); }}
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit Task
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs gap-1"
                      onClick={() => { handleDelete(t.id); setSelectedTask(null); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}
