'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  X, CheckSquare, Square, CheckCircle2, Clock, Users, Edit, MessageSquare, Save
} from 'lucide-react';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, where, serverTimestamp } from 'firebase/firestore';
import type { DocumentReference } from 'firebase/firestore';

export interface DailyActivity {
  id: string; date: string; callsMade: number; schoolsContacted: number; collegesContacted: number;
  meetings: number; proposalsSent: number; followUps: number; ordersClosed: number; notes: string;
}

interface EZCirkitDailyActivityProps {
  profileRef: DocumentReference | null;
  activities?: any[];
  readOnly?: boolean;
}

export function EZCirkitDailyActivity({ profileRef, readOnly }: EZCirkitDailyActivityProps) {
  const { user } = useUser();
  const firestore = useFirestore();

  // Load company profile for strategic plan
  const { data: profile } = useDoc(profileRef);

  const [feedback, setFeedback] = useState(profile?.salesDailyFeedback || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.salesDailyFeedback !== undefined) {
      setFeedback(profile.salesDailyFeedback);
    }
  }, [profile?.salesDailyFeedback]);

  const handleSaveFeedback = async () => {
    if (!profileRef) return;
    setIsSaving(true);
    const nowStr = new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    try {
      await setDocumentNonBlocking(profileRef, { 
        salesDailyFeedback: feedback,
        salesDailyFeedbackSavedAt: nowStr
      }, { merge: true });
    } catch (err) {
      console.error("Error saving sales daily feedback:", err);
    } finally {
      setIsSaving(false);
    }
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

  // All Sales & Product Tasks
  const allSalesTasks = useMemo(() => {
    if (!tasksRaw) return [];
    return tasksRaw.filter((t: any) => {
      const cat = t.category?.toLowerCase() || '';
      return cat === 'sales' || cat === 'product';
    });
  }, [tasksRaw]);

  // Current active week and month focus
  const currentWeekIndex = profile?.currentWeekIndex || 0;
  const currentMonthIndex = profile?.currentMonthIndex || 0;
  const currentMonthMilestone = profile?.strategicPlan?.monthlyMilestones?.[currentMonthIndex];
  const weeklyPlans = currentMonthMilestone?.weeklyPlans || profile?.strategicPlan?.weeklyPlans || [];
  const totalWeeks = weeklyPlans.length || 4;
  const totalMonths = profile?.strategicPlan?.monthlyMilestones?.length || 12;

  // Filter tasks belonging to current active week and month
  const currentWeekTasks = useMemo(() => {
    return allSalesTasks.filter((t: any) => {
      const wIdx = t.weekIndex !== undefined ? t.weekIndex : 0;
      const mIdx = t.monthIndex !== undefined ? t.monthIndex : 0;
      return wIdx === currentWeekIndex && mIdx === currentMonthIndex;
    });
  }, [allSalesTasks, currentWeekIndex, currentMonthIndex]);

  // Total stats for current week
  const totalStats = useMemo(() => {
    const total = currentWeekTasks.length;
    const completed = currentWeekTasks.filter((t: any) => t.status === 'done').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  }, [currentWeekTasks]);

  // Recommended tasks (from AI Strategic Plan, adapted to current active week)
  const recommendedTasks = useMemo(() => {
    const activeWeekPlan = weeklyPlans[currentWeekIndex];

    if (activeWeekPlan) {
      const actions = activeWeekPlan.salesActions || [];
      if (actions.length > 0) {
        return actions.map((act: string) => ({
          title: act,
          description: `Strategic action item scheduled for ${activeWeekPlan.week || 'this week'}.`,
          priority: 'high',
          category: 'Sales'
        }));
      }
    }

    // Fallback to dailyTasks
    const daily = profile?.strategicPlan?.dailyTasks || [];
    return daily.filter((t: any) => {
      const cat = t.category?.toLowerCase() || '';
      return cat === 'sales' || cat === 'product';
    });
  }, [profile?.strategicPlan?.dailyTasks, weeklyPlans, currentWeekIndex]);

  // Find already assigned tasks by title
  const assignedTasksMap = useMemo(() => {
    const map = new Map<string, any>();
    allSalesTasks.forEach((t: any) => {
      map.set(t.title, t);
    });
    return map;
  }, [allSalesTasks]);

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
          assignedAt: new Date().toISOString(),
          weekIndex: currentWeekIndex,
          monthIndex: currentMonthIndex
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
          category: 'Sales',
          createdAt: serverTimestamp(),
          assignedAt: new Date().toISOString(),
          weekIndex: currentWeekIndex,
          monthIndex: currentMonthIndex
        };
        await addDocumentNonBlocking(tasksCollectionRef, payload);
      }
      setAssigningTaskId(null);

      // Trigger browser notification
      if (Notification.permission === 'granted') {
        const notification = new Notification(`New Sales Task Assigned`, {
          body: `${task.title} assigned to you. Click to view.`,
          icon: '/favicon.ico'
        });
        notification.onclick = () => {
          window.focus();
          const event = new CustomEvent('navigate-app', { 
            detail: { tab: 'sales', sub: 'activity' } 
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

    // Sync to weekly actions
    const taskObj = currentWeekTasks.find(t => t.id === taskId);
    if (taskObj) {
      let updatedWeeklyActions = [...(profile?.completedWeeklyActions || [])];
      if (newStatus === 'done') {
        if (!updatedWeeklyActions.includes(taskObj.title)) {
          updatedWeeklyActions.push(taskObj.title);
        }
      } else {
        updatedWeeklyActions = updatedWeeklyActions.filter(a => a !== taskObj.title);
      }

      // Check if all weekly tasks for this month are completed, and if so, mark monthly milestone as completed!
      const currentMonthMilestone = profile?.strategicPlan?.monthlyMilestones?.[currentMonthIndex];
      const monthWeeklyPlans = currentMonthMilestone?.weeklyPlans || profile?.strategicPlan?.weeklyPlans || [];
      const allMonthWeeklyActions: string[] = [];
      monthWeeklyPlans.forEach((plan: any) => {
        (plan.financeActions || []).forEach((a: string) => allMonthWeeklyActions.push(a));
        (plan.salesActions || []).forEach((a: string) => allMonthWeeklyActions.push(a));
        (plan.opsActions || []).forEach((a: string) => allMonthWeeklyActions.push(a));
      });

      let updatedMilestones = [...(profile?.completedMonthlyMilestones || [])];
      const milestoneMonthName = currentMonthMilestone?.month || `Month ${currentMonthIndex + 1}`;

      const allCompleted = allMonthWeeklyActions.length > 0 && allMonthWeeklyActions.every(act => updatedWeeklyActions.includes(act));
      if (allCompleted) {
        if (!updatedMilestones.includes(milestoneMonthName)) {
          updatedMilestones.push(milestoneMonthName);
        }
      } else {
        updatedMilestones = updatedMilestones.filter(m => m !== milestoneMonthName);
      }

      // Check if this completes all tasks for the current week to auto-advance
      const updatedTasks = currentWeekTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      const total = updatedTasks.length;
      const completed = updatedTasks.filter((t: any) => t.status === 'done').length;

      let nextWeekIndex = currentWeekIndex;
      let nextMonthIndex = currentMonthIndex;
      if (newStatus === 'done' && total > 0 && completed === total) {
        const nextW = currentWeekIndex + 1;
        if (nextW < totalWeeks) {
          nextWeekIndex = nextW;
        } else {
          const nextM = currentMonthIndex + 1;
          if (nextM < totalMonths) {
            nextWeekIndex = 0;
            nextMonthIndex = nextM;
          }
        }
      }

      await setDocumentNonBlocking(profileRef, {
        completedWeeklyActions: updatedWeeklyActions,
        completedMonthlyMilestones: updatedMilestones,
        currentWeekIndex: nextWeekIndex,
        currentMonthIndex: nextMonthIndex
      }, { merge: true });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* STRATEGIC EXECUTION PORTAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Strategic Tasks Checklist (col-span-2) */}
        <Card className="border-2 border-indigo-100 bg-white shadow-sm overflow-hidden lg:col-span-2 flex flex-col justify-between">
          <div>
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    Strategic Sales & Product Actions
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Week {currentWeekIndex + 1} &bull; Month {currentMonthIndex + 1} execution tasks.
                  </CardDescription>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border">
                    <span className="text-[9px] font-black uppercase text-slate-500 pl-1.5 shrink-0">View Focus:</span>
                    <Select 
                      value={String(currentMonthIndex)} 
                      onValueChange={async (val) => {
                        if (profileRef) {
                          await setDocumentNonBlocking(profileRef, { currentMonthIndex: Number(val) }, { merge: true });
                        }
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-6 text-[10px] w-24 bg-white border-none shadow-none font-bold">
                        <SelectValue placeholder="Month..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: totalMonths }).map((_, mIdx) => (
                          <SelectItem key={mIdx} value={String(mIdx)}>Month {mIdx + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select 
                      value={String(currentWeekIndex)} 
                      onValueChange={async (val) => {
                        if (profileRef) {
                          await setDocumentNonBlocking(profileRef, { currentWeekIndex: Number(val) }, { merge: true });
                        }
                      }}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-6 text-[10px] w-24 bg-white border-none shadow-none font-bold">
                        <SelectValue placeholder="Week..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: totalWeeks }).map((_, wIdx) => (
                          <SelectItem key={wIdx} value={String(wIdx)}>Week {wIdx + 1}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {totalStats.total > 0 && (
                    <div className="flex items-center gap-1.5 shrink-0 bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100">
                      <span className="text-xs font-black text-slate-700">{totalStats.completed}/{totalStats.total} Done</span>
                      <span className="text-xs font-black text-indigo-600">({totalStats.pct}%)</span>
                    </div>
                  )}
                </div>
              </div>
              {totalStats.total > 0 && (
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3 border">
                  <div className="h-full bg-indigo-700 transition-all duration-500" style={{ width: `${totalStats.pct}%` }} />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {currentWeekTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <Clock className="w-8 h-8 text-indigo-200" />
                  <p className="text-xs font-semibold">No strategic Sales or Product tasks assigned for Week {currentWeekIndex + 1}.</p>
                  <p className="text-[10px] text-slate-400 font-semibold">Assign recommended tasks from the AI recommendations panel on the right.</p>
                </div>
              ) : (
                currentWeekTasks.map((task: any) => {
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
            Reflect on how today's Sales & Product activities went. The AI will analyze this feedback during adaptation to optimize your strategy.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <textarea
            className="w-full text-xs font-semibold p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-slate-50/30"
            rows={3}
            placeholder="Type your notes or feedback here (e.g. Conducted 3 sales meetings, but need to improve workshop proposal templates for quicker sign-offs)..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={readOnly}
          />
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
              {profile?.salesDailyFeedbackSavedAt ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Last saved: {profile.salesDailyFeedbackSavedAt}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-350" />
                  <span>No feedback saved yet.</span>
                </>
              )}
            </div>
            {!readOnly && (
              <Button
                onClick={handleSaveFeedback}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-[11px] gap-1 px-3 rounded-md shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save Feedback'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
