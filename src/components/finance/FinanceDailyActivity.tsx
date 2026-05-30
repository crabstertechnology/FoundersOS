import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  X, CheckSquare, Square, CheckCircle2, Clock, Users, Edit, MessageSquare
} from 'lucide-react';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, where, serverTimestamp } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';

interface FinanceDailyActivityProps {
  profileRef: DocumentReference | null;
  activities?: any[];
  readOnly?: boolean;
}

export function FinanceDailyActivity({ profileRef, readOnly }: FinanceDailyActivityProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  // Load company profile for strategic plan
  const { data: profile } = useDoc(profileRef);

  const [feedback, setFeedback] = useState(profile?.financeDailyFeedback || '');

  useEffect(() => {
    if (profile?.financeDailyFeedback !== undefined) {
      setFeedback(profile.financeDailyFeedback);
    }
  }, [profile?.financeDailyFeedback]);

  const handleSaveFeedback = async (val: string) => {
    setFeedback(val);
    if (!profileRef) return;
    await setDocumentNonBlocking(profileRef, { financeDailyFeedback: val }, { merge: true });
  };

  // Get admin UID from path or current user
  const adminUid = profileRef?.parent?.parent?.id || user?.uid || '';

  // Load employees
  const employeesRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'employees');
  }, [firestore]);

  const employeesQuery = useMemoFirebase(() => {
    if (!employeesRef || !adminUid) return null;
    return query(employeesRef, where('adminUid', '==', adminUid));
  }, [employeesRef, adminUid]);

  const { data: rawEmployeesData } = useCollection(employeesQuery) || {};
  const employees = useMemo(() => (rawEmployeesData || []).map((e: any) => ({
    id: e.id, uid: e.uid || e.id, name: e.name || 'Unknown',
    email: e.email || '', department: e.department || '',
    role: e.role || 'Employee', isActive: e.isActive !== false,
  })), [rawEmployeesData]);

  const assigneesList = useMemo(() => {
    const list = [...employees];
    if (user && !list.some(e => e.uid === user.uid)) {
      list.unshift({
        id: user.uid,
        uid: user.uid,
        name: `${user.displayName || 'You'} (Founder)`,
        email: user.email || '',
        department: 'Executive',
        role: 'Founder',
        isActive: true
      });
    }
    return list;
  }, [employees, user]);

  // Load tasks
  const tasksRef = useMemoFirebase(() => {
    if (!firestore || !profileRef) return null;
    return collection(profileRef, 'tasks');
  }, [firestore, profileRef]);

  const tasksQuery = useMemoFirebase(() => {
    if (!tasksRef) return null;
    return query(tasksRef);
  }, [tasksRef]);

  const { data: tasksRaw } = useCollection(tasksQuery);

  // All Finance Tasks
  const allFinanceTasks = useMemo(() => {
    if (!tasksRaw) return [];
    return tasksRaw.filter((t: any) => t.category?.toLowerCase() === 'finance');
  }, [tasksRaw]);

  // Total stats
  const totalStats = useMemo(() => {
    const total = allFinanceTasks.length;
    const completed = allFinanceTasks.filter((t: any) => t.status === 'done').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [allFinanceTasks]);

  // Recommended tasks (from AI Strategic Plan)
  const recommendedTasks = useMemo(() => {
    const daily = profile?.strategicPlan?.dailyTasks || [];
    return daily.filter((t: any) => t.category?.toLowerCase() === 'finance');
  }, [profile?.strategicPlan?.dailyTasks]);

  // Find already assigned tasks by title
  const assignedTasksMap = useMemo(() => {
    const map = new Map<string, any>();
    allFinanceTasks.forEach((t: any) => {
      map.set(t.title, t);
    });
    return map;
  }, [allFinanceTasks]);

  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  const handleAssignTask = async (task: any, assigneeUid: string) => {
    if (!firestore || !profileRef) return;
    const assignee = assigneesList.find(a => a.uid === assigneeUid);
    const assignedTask = assignedTasksMap.get(task.title);

    try {
      if (assignedTask?.id) {
        const taskDocRef = doc(profileRef, 'tasks', assignedTask.id);
        await setDocumentNonBlocking(taskDocRef, {
          assignedToUid: assigneeUid,
          assignedToName: assignee?.name || 'Unassigned',
          assignedToEmail: assignee?.email || '',
          assignedAt: new Date().toISOString()
        }, { merge: true });
      } else {
        const tasksCollectionRef = collection(profileRef, 'tasks');
        const payload = {
          title: task.title,
          description: task.description,
          priority: task.priority || 'medium',
          status: 'todo',
          dueDate: new Date().toISOString().split('T')[0],
          assignedToUid: assigneeUid,
          assignedToName: assignee?.name || 'Unassigned',
          assignedToEmail: assignee?.email || '',
          category: 'Finance',
          createdAt: serverTimestamp(),
          assignedAt: new Date().toISOString()
        };
        await addDocumentNonBlocking(tasksCollectionRef, payload);
      }
      setAssigningTaskId(null);

      // Trigger browser notification
      if (Notification.permission === 'granted') {
        const notification = new Notification(`New Finance Task Assigned`, {
          body: `${task.title} assigned to you. Click to view.`,
          icon: '/favicon.ico'
        });
        notification.onclick = () => {
          window.focus();
          const event = new CustomEvent('navigate-app', { 
            detail: { tab: 'finance', sub: 'activity' } 
          });
          window.dispatchEvent(event);
        };
      }
    } catch (err) {
      console.error('Error assigning task:', err);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!firestore || !profileRef) return;
    const taskDocRef = doc(profileRef, 'tasks', taskId);
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    const payload: any = { status: newStatus };
    if (newStatus === 'done') {
      payload.completedAt = new Date().toISOString();
    } else {
      payload.completedAt = null;
    }
    await setDocumentNonBlocking(taskDocRef, payload, { merge: true });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* STRATEGIC EXECUTION PORTAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Strategic Tasks Checklist (col-span-2) */}
        <Card className="border-2 border-indigo-100 bg-white shadow-sm overflow-hidden lg:col-span-2 flex flex-col justify-between">
          <div>
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    Strategic Finance Actions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Team-wide strategic execution tasks mapped to your 12-month goals.
                  </CardDescription>
                </div>
                {totalStats.total > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-black text-slate-700">{totalStats.completed}/{totalStats.total} Done</span>
                    <span className="text-xs font-black text-indigo-600">({totalStats.pct}%)</span>
                  </div>
                )}
              </div>
              {totalStats.total > 0 && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3 border">
                  <div className="h-full bg-indigo-700 transition-all duration-500" style={{ width: `${totalStats.pct}%` }} />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {allFinanceTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Clock className="w-8 h-8 text-indigo-200" />
                  <p className="text-xs font-semibold">No strategic Finance tasks assigned currently.</p>
                  <p className="text-[10px] text-slate-400 font-medium">Assign recommended tasks from the AI recommendations panel on the right.</p>
                </div>
              ) : (
                allFinanceTasks.map((task: any) => {
                  const isDone = task.status === 'done';
                  const isMe = task.assignedToUid === user?.uid;
                  return (
                    <div key={task.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-start gap-3 flex-1">
                        <button 
                          disabled={readOnly}
                          onClick={() => handleToggleTaskStatus(task.id, task.status)}
                          className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0"
                        >
                          {isDone ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                        <div className="space-y-1.5 flex-1">
                          <div>
                            <h4 className={`text-sm font-bold text-slate-800 ${isDone ? 'line-through text-slate-400 font-normal' : ''}`}>
                              {task.title}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                              {task.description}
                            </p>
                          </div>

                          <div className="pt-0.5">
                            <input
                              type="text"
                              className="w-full max-w-md text-[11px] px-2.5 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50/30 placeholder:text-slate-400 font-semibold"
                              placeholder="Notes/feedback on this task..."
                              defaultValue={task.feedback || ''}
                              onBlur={async (e) => {
                                if (!firestore || !profileRef || !task.id) return;
                                const taskDocRef = doc(profileRef, 'tasks', task.id);
                                await setDocumentNonBlocking(taskDocRef, { feedback: e.target.value }, { merge: true });
                              }}
                              disabled={readOnly}
                            />
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold pt-0.5">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>
                              {isMe ? 'Assigned to Me' : `Assigned to: ${task.assignedToName}`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`border text-[9px] uppercase font-bold shrink-0 ${
                        task.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        task.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {task.priority || 'medium'}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </div>
        </Card>

        {/* AI Recommendations Panel (col-span-1) */}
        <Card className="border-2 border-dashed border-slate-200 bg-slate-50/30 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-600 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                AI Recommended Tasks
              </CardTitle>
              <CardDescription className="text-xs">
                Log and assign tactical daily steps to team members.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-150">
              {recommendedTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs font-semibold leading-relaxed">
                  No AI recommended daily tasks found. Create a roadmap in the Central Console.
                </div>
              ) : (
                recommendedTasks.map((task: any, idx: number) => {
                  const assignedTask = assignedTasksMap.get(task.title);
                  const isAssigned = !!assignedTask;
                  const isAssigning = assigningTaskId === task.title;

                  return (
                    <div key={idx} className="p-3.5 space-y-2 hover:bg-slate-50/50 transition-all">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 leading-snug">{task.title}</h4>
                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{task.description}</p>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Badge className={`border text-[8px] uppercase font-bold ${
                          task.priority === 'urgent' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                          task.priority === 'high' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {task.priority}
                        </Badge>

                        {isAssigning ? (
                          <div className="flex gap-1 items-center bg-white border p-1 rounded-lg shadow-sm">
                            <Select onValueChange={(uid) => handleAssignTask(task, uid)}>
                              <SelectTrigger className="h-7 text-[10px] w-28">
                                <SelectValue placeholder="Member..." />
                              </SelectTrigger>
                              <SelectContent>
                                {assigneesList.map(a => (
                                  <SelectItem key={a.uid} value={a.uid}>{a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setAssigningTaskId(null)} 
                              className="h-7 w-7 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : isAssigned ? (
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[8px] font-bold py-1 px-2 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Assigned to: {assignedTask.assignedToName || 'Assigned'}
                            </Badge>
                            <Button
                              size="sm"
                              disabled={readOnly}
                              onClick={() => setAssigningTaskId(task.title)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg h-7 px-2.5 gap-1 border border-slate-200"
                            >
                              <Edit className="w-3 h-3 text-slate-500" />
                              Edit
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            disabled={readOnly}
                            onClick={() => setAssigningTaskId(task.title)}
                            className="bg-slate-900 hover:bg-slate-950 text-white font-bold text-[10px] rounded-lg h-7 px-2.5 gap-1"
                          >
                            <Users className="w-3 h-3" />
                            Assign
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Feedback Section */}
      <Card className="border-2 border-indigo-100 bg-white shadow-sm mt-6">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Performance Feedback & Notes
          </CardTitle>
          <CardDescription className="text-xs">
            Reflect on how today's Finance activities went. The AI will analyze this feedback during adaptation to optimize your strategy.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <textarea
            className="w-full text-xs font-semibold p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-slate-50/30"
            rows={3}
            placeholder="Type your notes or feedback here (e.g. Completed today's runway updates but need help audit-testing the spreadsheet formulas)..."
            value={feedback}
            onChange={(e) => handleSaveFeedback(e.target.value)}
            disabled={readOnly}
          />
          <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Saved automatically in real-time
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
