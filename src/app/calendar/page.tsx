'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Clock, Plus, Trash2, 
  AlertCircle, CheckCircle2, User, ListChecks, Calendar, Video, X, 
  MapPin, AlignLeft, Info, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUser, useDoc, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, collection, query, where } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

interface Meeting {
  id: string;
  uid: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  duration?: number; // minutes
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedToUid: string;
  assignedToName: string;
  assignedToEmail: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'review' | 'done';
  dueDate: string; // YYYY-MM-DD
  category: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-50 text-slate-600 border-slate-200',
  medium: 'bg-blue-50 text-blue-700 border-blue-150',
  high: 'bg-amber-50 text-amber-700 border-amber-150',
  urgent: 'bg-rose-50 text-rose-700 border-rose-150',
};

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700 border-slate-200',
  'in-progress': 'bg-indigo-50 text-indigo-700 border-indigo-150',
  review: 'bg-purple-50 text-purple-700 border-purple-150',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-150',
};

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function CalendarPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  // Selected state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Meeting Form State
  const [isAdding, setIsAdding] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDesc, setMeetingDesc] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');
  const [meetingDuration, setMeetingDuration] = useState('30');

  // Retrieve employee record and adminUid to query correct company profile
  const employeeDocRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'employees', user.uid);
  }, [firestore, user?.uid]);

  const { data: employeeData, isLoading: isEmployeeLoading } = useDoc(employeeDocRef);

  const workspaceUserId = employeeData?.adminUid || user?.uid || '';

  // Firestore collection references
  const meetingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'calendarMeetings');
  }, [firestore]);

  const meetingsQuery = useMemoFirebase(() => {
    if (!meetingsRef || !user?.uid) return null;
    return query(meetingsRef, where('uid', '==', user.uid));
  }, [meetingsRef, user?.uid]);

  const { data: rawMeetings } = useCollection(meetingsQuery);
  const meetings = useMemo<Meeting[]>(() => {
    return (rawMeetings || []).map((m: any) => ({
      id: m.id,
      uid: m.uid || '',
      title: m.title || 'Untitled Meeting',
      description: m.description || '',
      date: m.date || '',
      time: m.time || '',
      duration: m.duration || 30,
      createdAt: m.createdAt || '',
    }));
  }, [rawMeetings]);

  const tasksRef = useMemoFirebase(() => {
    if (!firestore || !workspaceUserId) return null;
    return collection(firestore, 'users', workspaceUserId, 'companyProfiles', 'primary-startup', 'tasks');
  }, [firestore, workspaceUserId]);

  const tasksQuery = useMemoFirebase(() => {
    if (!tasksRef || !user?.uid) return null;
    return query(tasksRef, where('assignedToUid', '==', user.uid));
  }, [tasksRef, user?.uid]);

  const { data: rawTasks } = useCollection(tasksQuery);
  const tasks = useMemo<Task[]>(() => {
    return (rawTasks || []).map((t: any) => ({
      id: t.id,
      title: t.title || 'Untitled Task',
      description: t.description || '',
      assignedToUid: t.assignedToUid || '',
      assignedToName: t.assignedToName || '',
      assignedToEmail: t.assignedToEmail || '',
      priority: t.priority || 'medium',
      status: t.status || 'todo',
      dueDate: t.dueDate || '',
      category: t.category || '',
    }));
  }, [rawTasks]);

  // Calendar Math
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday...
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const allGridDays = useMemo(() => {
    const grid = [];
    // Padding start from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      grid.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i)
      });
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      });
    }

    // Padding end for grid balance
    const totalSlots = grid.length;
    const paddingEndCount = totalSlots % 7 === 0 ? 0 : 7 - (totalSlots % 7);
    for (let i = 1; i <= paddingEndCount; i++) {
      grid.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      });
    }
    return grid;
  }, [year, month, startDayOfWeek, daysInMonth, prevMonthDays]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  // Group events by date for dot indicators
  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    meetings.forEach(m => {
      if (m.date) {
        if (!map[m.date]) map[m.date] = [];
        map[m.date].push(m);
      }
    });
    return map;
  }, [meetings]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        if (!map[t.dueDate]) map[t.dueDate] = [];
        map[t.dueDate].push(t);
      }
    });
    return map;
  }, [tasks]);

  const selectedDateStr = toDateStr(selectedDate);

  const selectedDayEvents = useMemo(() => {
    const dayMeetings = meetingsByDate[selectedDateStr] || [];
    const dayTasks = tasksByDate[selectedDateStr] || [];
    return {
      meetings: dayMeetings,
      tasks: dayTasks,
      total: dayMeetings.length + dayTasks.length
    };
  }, [selectedDateStr, meetingsByDate, tasksByDate]);

  const handleAddMeetingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingsRef || !meetingTitle.trim() || !user?.uid) return;

    const payload = {
      uid: user.uid,
      title: meetingTitle.trim(),
      description: meetingDesc.trim(),
      date: selectedDateStr,
      time: meetingTime,
      duration: Number(meetingDuration) || 30,
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(meetingsRef, payload);
    
    // Reset Form
    setMeetingTitle('');
    setMeetingDesc('');
    setMeetingTime('10:00');
    setMeetingDuration('30');
    setIsAdding(false);
  };

  const handleDeleteMeeting = (meetingId: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, 'calendarMeetings', meetingId));
  };

  const isLoading = isUserLoading || isEmployeeLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-500 font-code uppercase tracking-widest text-xs">Loading Workspace Calendar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full border-2 shadow-sm p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <CardTitle className="text-lg font-black uppercase text-slate-800">Authentication Required</CardTitle>
          <CardDescription>You must be signed in to access your personal workspace calendar.</CardDescription>
          <Button onClick={() => router.push('/')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full">
            Go to Portal
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Calendar Header Bar */}
      <header className="h-16 border-b bg-white flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            className="h-9 w-9 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-800 font-code flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Calendar Workspace
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleJumpToToday}
            className="font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-100 h-9 rounded-lg"
          >
            Today
          </Button>
          <NotificationCenter />
        </div>
      </header>

      {/* Main content grid */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Calendar Left View (8 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border shadow-md bg-white overflow-hidden">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                    {monthNames[month]} {year}
                  </CardTitle>
                  <CardDescription>
                    Personalized meetings & task deadlines
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrevMonth}
                    className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextMonth}
                    className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              
              {/* Day header */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* Grid content */}
              <div className="grid grid-cols-7 gap-2">
                {allGridDays.map((cell, idx) => {
                  const cellDateStr = toDateStr(cell.date);
                  const isSelected = cell.isCurrentMonth && toDateStr(selectedDate) === cellDateStr;
                  const isToday = toDateStr(new Date()) === cellDateStr;
                  const hasMeetings = !!meetingsByDate[cellDateStr];
                  const hasTasks = !!tasksByDate[cellDateStr];

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedDate(cell.date);
                        if (!cell.isCurrentMonth) {
                          setCurrentMonth(cell.date);
                        }
                      }}
                      className={`min-h-[70px] md:min-h-[85px] p-2 rounded-xl flex flex-col justify-between items-start border text-left transition-all ${
                        !cell.isCurrentMonth 
                          ? 'bg-slate-50/50 border-slate-100 text-slate-350 hover:bg-slate-50' 
                          : isSelected 
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm ring-1 ring-indigo-200' 
                            : isToday
                              ? 'bg-indigo-950/5 border-indigo-200 text-indigo-950 hover:bg-slate-50 font-bold'
                              : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 text-slate-800'
                      }`}
                    >
                      <span className={`text-xs font-bold font-code rounded-full w-5 h-5 flex items-center justify-center ${
                        isToday && !isSelected ? 'bg-indigo-600 text-white shadow-xs' : ''
                      }`}>
                        {cell.day}
                      </span>
                      
                      {/* Event Dot Indicators */}
                      <div className="w-full flex flex-col gap-1 mt-2">
                        {cell.isCurrentMonth && hasMeetings && (
                          <div className="h-1.5 w-full bg-blue-500 rounded-full opacity-80" title="Meetings scheduled" />
                        )}
                        {cell.isCurrentMonth && hasTasks && (
                          <div className="h-1.5 w-full bg-amber-500 rounded-full opacity-80" title="Task deadlines" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Day View & Form Right View (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Day details */}
          <Card className="border shadow-md bg-white">
            <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-black text-slate-900">
                  {selectedDate.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </CardTitle>
                <CardDescription>
                  {selectedDayEvents.total} {selectedDayEvents.total === 1 ? 'event' : 'events'} listed
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAdding(!isAdding)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 rounded-lg shadow-sm"
              >
                {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {isAdding ? 'Close' : 'Add Meeting'}
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              
              {/* Inline Add Meeting Form */}
              {isAdding && (
                <Card className="border border-indigo-100 bg-indigo-50/10 p-4 rounded-xl animate-in slide-in-from-top-4 duration-300">
                  <form onSubmit={handleAddMeetingSubmit} className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">New Meeting details</h4>
                      <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-700">Meeting Title</Label>
                      <Input
                        placeholder="e.g. Sync with product team"
                        value={meetingTitle}
                        onChange={e => setMeetingTitle(e.target.value)}
                        required
                        className="bg-white border-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="font-bold text-xs text-slate-700">Start Time</Label>
                        <Input
                          type="time"
                          value={meetingTime}
                          onChange={e => setMeetingTime(e.target.value)}
                          required
                          className="bg-white border-slate-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="font-bold text-xs text-slate-700">Duration (mins)</Label>
                        <Input
                          type="number"
                          placeholder="30"
                          value={meetingDuration}
                          onChange={e => setMeetingDuration(e.target.value)}
                          required
                          className="bg-white border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="font-bold text-xs text-slate-700">Description (Optional)</Label>
                      <textarea
                        placeholder="Add dial-in details or agenda..."
                        value={meetingDesc}
                        onChange={e => setMeetingDesc(e.target.value)}
                        rows={2}
                        className="w-full text-sm p-2.5 rounded-md border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-sm">
                      Save Meeting
                    </Button>
                  </form>
                </Card>
              )}

              {/* Day events feed */}
              <div className="space-y-4">
                {selectedDayEvents.total === 0 ? (
                  <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
                    <Info className="w-8 h-8 opacity-40 text-slate-400" />
                    <p className="text-xs font-semibold">No scheduled meetings or deadlines for this date.</p>
                  </div>
                ) : (
                  <>
                    {/* Meetings segment */}
                    {selectedDayEvents.meetings.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-blue-500" /> Scheduled Meetings
                        </h4>
                        
                        <div className="space-y-2">
                          {selectedDayEvents.meetings.map(m => (
                            <div key={m.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 flex justify-between items-start gap-4">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <h5 className="font-bold text-slate-900 text-sm truncate">{m.title}</h5>
                                {m.description && (
                                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{m.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-400 font-mono">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    {m.time || 'All Day'}
                                  </span>
                                  <span>•</span>
                                  <span>{m.duration} mins</span>
                                </div>
                              </div>
                              
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteMeeting(m.id)}
                                className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task Deadlines segment */}
                    {selectedDayEvents.tasks.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center gap-1.5">
                          <ListChecks className="w-3.5 h-3.5 text-amber-500" /> Task Deadlines
                        </h4>

                        <div className="space-y-2">
                          {selectedDayEvents.tasks.map(t => (
                            <div key={t.id} className="border-2 border-amber-100/60 rounded-xl p-4 bg-amber-50/10 flex flex-col gap-2">
                              <div className="flex justify-between items-start gap-2">
                                <div className="space-y-0.5">
                                  <h5 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                    {t.title}
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  </h5>
                                  {t.category && (
                                    <span className="text-[9px] font-bold text-amber-600 uppercase font-code bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">{t.category}</span>
                                  )}
                                </div>
                                <Badge className={`border text-[8px] font-black uppercase scale-90 ${STATUS_COLORS[t.status] || ''}`}>
                                  {t.status}
                                </Badge>
                              </div>

                              {t.description && (
                                <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
                              )}

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                  <User className="w-3 h-3" />
                                  <span>Assigned to: <span className="font-semibold text-slate-600">{t.assignedToName || 'You'}</span></span>
                                </div>
                                <Badge className={`border text-[8px] font-black uppercase ${PRIORITY_COLORS[t.priority] || ''}`}>
                                  {t.priority}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
