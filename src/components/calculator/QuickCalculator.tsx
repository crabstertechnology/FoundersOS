'use client';

import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calculator, Delete, RotateCcw, Equal } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function QuickCalculator() {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNext, setWaitingForNext] = useState(false);

  const handleDigit = (digit: string) => {
    if (waitingForNext) {
      setDisplay(digit);
      setWaitingForNext(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleOperator = (op: string) => {
    const current = parseFloat(display);
    if (prevValue === null) {
      setPrevValue(current);
    } else if (operator) {
      const result = calculate(prevValue, current, operator);
      setPrevValue(result);
      setDisplay(String(result));
    }
    setOperator(op);
    setWaitingForNext(true);
  };

  const calculate = (a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEqual = () => {
    const current = parseFloat(display);
    if (operator && prevValue !== null) {
      const result = calculate(prevValue, current, operator);
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setWaitingForNext(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForNext(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
          <Calculator className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 shadow-2xl border-2 border-primary/10 rounded-2xl bg-white" align="end">
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 text-center">Quick Math</div>
          <Input 
            readOnly 
            value={display} 
            className="text-right text-xl font-code font-bold h-12 bg-muted/30 border-none pointer-events-none" 
          />
          <div className="grid grid-cols-4 gap-1.5">
            <Button variant="ghost" className="h-10 font-bold text-destructive hover:bg-destructive/10" onClick={handleClear}><RotateCcw className="w-4 h-4" /></Button>
            <Button variant="ghost" className="h-10 font-bold" onClick={handleBackspace}><Delete className="w-4 h-4" /></Button>
            <Button variant="secondary" className="h-10 font-bold" onClick={() => handleOperator('/')}>÷</Button>
            <Button variant="secondary" className="h-10 font-bold" onClick={() => handleOperator('*')}>×</Button>
            
            {[7, 8, 9].map(n => (
              <Button key={n} variant="outline" className="h-10 font-bold" onClick={() => handleDigit(String(n))}>{n}</Button>
            ))}
            <Button variant="secondary" className="h-10 font-bold" onClick={() => handleOperator('-')}>-</Button>
            
            {[4, 5, 6].map(n => (
              <Button key={n} variant="outline" className="h-10 font-bold" onClick={() => handleDigit(String(n))}>{n}</Button>
            ))}
            <Button variant="secondary" className="h-10 font-bold" onClick={() => handleOperator('+')}>+</Button>
            
            {[1, 2, 3].map(n => (
              <Button key={n} variant="outline" className="h-10 font-bold" onClick={() => handleDigit(String(n))}>{n}</Button>
            ))}
            <Button variant="primary" className="h-10 font-bold row-span-2" onClick={handleEqual}><Equal className="w-4 h-4" /></Button>
            
            <Button variant="outline" className="h-10 font-bold col-span-2" onClick={() => handleDigit('0')}>0</Button>
            <Button variant="outline" className="h-10 font-bold" onClick={() => handleDigit('.')}>.</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
