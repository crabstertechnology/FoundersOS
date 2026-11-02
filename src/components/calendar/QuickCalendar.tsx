'use client';

import React, { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar as CalendarIcon, Clock, Plus, Trash2, 
  ChevronLeft, ChevronRight, Check, CalendarDays
} from 'lucide-react';
import { useUser, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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

const toDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function QuickCalendar() {
  const { user } = useUser();
  const firestore = useFirestore();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingTime, setMeetingTime] = useState('10:00');

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

  const todayStr = toDateStr(new Date());
  const selectedDateStr = toDateStr(selectedDate);

  const todayMeetings = useMemo(() => {
    return meetings.filter(m => m.date === todayStr);
  }, [meetings, todayStr]);

  const selectedDateMeetings = useMemo(() => {
    return meetings.filter(m => m.date === selectedDateStr);
  }, [meetings, selectedDateStr]);

  const meetingDates = useMemo(() => {
    return new Set(meetings.map(m => m.date));
  }, [meetings]);

  // Calendar Grid Calculation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const allGridDays = useMemo(() => {
    const grid = [];
    // Padding from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      grid.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Padding for next month to complete the row
    const total = grid.length;
    const paddingEnd = total % 7 === 0 ? 0 : 7 - (total % 7);
    for (let i = 1; i <= paddingEnd; i++) {
      grid.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return grid;
  }, [year, month, startDayOfWeek, daysInMonth, prevMonthDays]);

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

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingsRef || !user?.uid || !meetingTitle.trim()) return;

    await addDocumentNonBlocking(meetingsRef, {
      uid: user.uid,
      title: meetingTitle.trim(),
      description: '',
      date: selectedDateStr,
      time: meetingTime,
      duration: 30,
      createdAt: new Date().toISOString(),
    });

    setMeetingTitle('');
    setIsAdding(false);
  };

  const handleDeleteMeeting = (meetingId: string) => {
    if (!firestore || !meetingId) return;
    deleteDocumentNonBlocking(doc(firestore, 'calendarMeetings', meetingId));
  };

  const formattedSelectedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-xl h-9 w-9 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all shrink-0 cursor-pointer relative"
          title="Quick Calendar & Agenda"
          aria-label="Open Quick Calendar"
        >
          <CalendarIcon className="w-4 h-4 text-indigo-600" />
          {todayMeetings.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-indigo-600 text-white font-black text-[9px] rounded-full h-4 min-w-4 px-1 flex items-center justify-center border-2 border-white shadow-xs">
              {todayMeetings.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[340px] p-0 shadow-2xl border border-slate-200/90 rounded-2xl bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50"
      >
        {/* Header (No full page link) */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <CalendarIcon className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 leading-none">Founder Calendar</h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Quick Schedule &amp; Agenda</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleJumpToToday}
            className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100 cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Month Navigation */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between bg-white">
          <span className="text-xs font-extrabold text-slate-800 tracking-tight" style={{ fontFamily: "'Google Sans', sans-serif" }}>
            {MONTH_NAMES[month]} {year}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="px-3 pb-3 bg-white">
          {/* Weekday Names Header */}
          <div className="grid grid-cols-7 text-center mb-1">
            {WEEK_DAYS.map((wd) => (
              <div key={wd} className="text-[11px] font-bold text-slate-400 py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {allGridDays.map((cell, idx) => {
              const cellDateStr = toDateStr(cell.date);
              const isSelected = toDateStr(selectedDate) === cellDateStr;
              const isToday = todayStr === cellDateStr;
              const hasMeeting = meetingDates.has(cellDateStr);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDate(cell.date);
                    if (!cell.isCurrentMonth) {
                      setCurrentMonth(cell.date);
                    }
                  }}
                  className={`w-9 h-9 mx-auto rounded-xl text-xs flex flex-col items-center justify-center relative transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                      : isToday
                        ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 hover:bg-indigo-100'
                        : cell.isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100 font-medium'
                          : 'text-slate-300 hover:bg-slate-50 font-normal'
                  }`}
                >
                  <span className="leading-none">{cell.day}</span>
                  {hasMeeting && (
                    <span
                      className={`w-1 h-1 rounded-full mt-0.5 ${
                        isSelected ? 'bg-white' : 'bg-indigo-500'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Agenda Details */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                {formattedSelectedDate}
              </span>
              {selectedDateStr === todayStr && (
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  Today
                </span>
              )}
            </div>

            {!isAdding && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="h-6 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-md gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Event
              </Button>
            )}
          </div>

          {/* Quick Add Form - Clean 2-Row Layout with Full-Width Time Input */}
          {isAdding && (
            <form onSubmit={handleCreateMeeting} className="p-3 bg-white rounded-xl border border-indigo-100 shadow-xs space-y-2.5 animate-in fade-in duration-150">
              <Input
                placeholder="Meeting or event title..."
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                className="h-8 text-xs font-medium bg-slate-50/60 focus:bg-white"
                autoFocus
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="h-8 w-32 text-xs font-code bg-slate-50/60 focus:bg-white px-2"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(false)}
                    className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 px-3.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Meetings List with Delete Button */}
          <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5 scrollbar-thin">
            {selectedDateMeetings.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-medium py-1.5 text-center">
                No meetings scheduled for this date.
              </p>
            ) : (
              selectedDateMeetings.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-2 hover:border-indigo-200 transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {m.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                      <span className="font-code text-indigo-600 font-semibold">{m.time || '10:00'}</span>
                      <span>·</span>
                      <span>{m.duration || 30} mins</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(m.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Event"
                      aria-label="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer (No 'Open Scheduler') */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleJumpToToday}
            className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            Jump to Today
          </button>
          <span className="text-[10px] font-semibold text-slate-400">
            {selectedDateMeetings.length === 0 
              ? 'No events today' 
              : `${selectedDateMeetings.length} event${selectedDateMeetings.length > 1 ? 's' : ''}`}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
