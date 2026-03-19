'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calculator, Delete, RotateCcw, Equal } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function QuickCalculator() {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const calculate = useCallback((a: number, b: number, op: string) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default: return b;
    }
  }, []);

  const handleDigit = useCallback((digit: string) => {
    setDisplay(current => {
      if (waitingForNext) {
        setWaitingForNext(false);
        return digit;
      }
      if (digit === '.' && current.includes('.')) return current;
      return current === '0' && digit !== '.' ? digit : current + digit;
    });
  }, [waitingForNext]);

  const handleOperator = useCallback((op: string) => {
    const current = parseFloat(display);
    if (prevValue === null) {
      setPrevValue(current);
    } else if (operator && !waitingForNext) {
      const result = calculate(prevValue, current, operator);
      setPrevValue(result);
      setDisplay(String(result));
    }
    setOperator(op);
    setWaitingForNext(true);
  }, [display, prevValue, operator, waitingForNext, calculate]);

  const handleEqual = useCallback(() => {
    const current = parseFloat(display);
    if (operator && prevValue !== null) {
      const result = calculate(prevValue, current, operator);
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setWaitingForNext(true);
    }
  }, [display, operator, prevValue, calculate]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForNext(false);
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay(current => {
      if (current.length > 1) return current.slice(0, -1);
      return '0';
    });
  }, []);

  // Keyboard Support
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
      if (e.key === '.') handleDigit('.');
      if (['+', '-', '*', '/'].includes(e.key)) handleOperator(e.key);
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEqual();
      }
      if (e.key === 'Backspace') handleBackspace();
      if (e.key === 'Escape' || e.key.toLowerCase() === 'c') handleClear();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleDigit, handleOperator, handleEqual, handleClear, handleBackspace]);

  const getOperatorSymbol = (op: string | null) => {
    if (op === '/') return '÷';
    if (op === '*') return '×';
    return op;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="rounded-full h-10 w-10 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
          title="Quick Utility Calculator"
        >
          <Calculator className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 shadow-2xl border-2 border-primary/10 rounded-2xl bg-white" align="end">
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 text-center">Quick Math</div>
          
          <div className="bg-muted/30 rounded-lg p-2 space-y-1">
            <div className="h-4 text-[10px] font-code text-right text-muted-foreground overflow-hidden whitespace-nowrap">
              {prevValue !== null ? `${prevValue} ${getOperatorSymbol(operator)}` : '\u00A0'}
            </div>
            <div className="text-right text-xl font-code font-bold truncate">
              {display}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <Button variant="ghost" className="h-10 font-bold text-destructive hover:bg-destructive/10" onClick={handleClear}><RotateCcw className="w-3 h-3" /></Button>
            <Button variant="ghost" className="h-10 font-bold" onClick={handleBackspace}><Delete className="w-3 h-3" /></Button>
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
            <Button variant="default" className="h-10 font-bold row-span-2 bg-primary" onClick={handleEqual}><Equal className="w-4 h-4" /></Button>
            
            <Button variant="outline" className="h-10 font-bold col-span-2" onClick={() => handleDigit('0')}>0</Button>
            <Button variant="outline" className="h-10 font-bold" onClick={() => handleDigit('.')}>.</Button>
          </div>
          
          <div className="text-[8px] text-center text-muted-foreground font-medium uppercase tracking-tighter opacity-50">
            Supports Keyboard Input (Numpad, Enter, Backspace)
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
