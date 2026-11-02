'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface TreeNode {
  id: string;
  label: string;
  detail?: string;
  tag?: string;
  tagColor?: string;
  children?: TreeNode[];
}

interface TreeDiagramProps {
  title?: string;
  subtitle?: string;
  data: TreeNode;
  height?: number;
  className?: string;
}

export function TreeDiagram({
  title,
  subtitle,
  data,
  height = 360,
  className = '',
}: TreeDiagramProps) {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  // Render recursive tree rows/nodes with connected lines
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Node Box */}
        <div
          onClick={() => setSelectedNode(node)}
          className={`cursor-pointer px-3.5 py-2 rounded-xl border text-center transition-all duration-200 shadow-xs max-w-[200px] ${
            depth === 0
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-bold'
              : depth === 1
              ? 'bg-slate-900 text-white border-slate-800 font-semibold'
              : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400'
          } ${isSelected ? 'ring-2 ring-indigo-500 scale-105' : 'hover:scale-[1.02]'}`}
        >
          <div className="text-xs tracking-tight flex items-center justify-center gap-1.5">
            <span>{node.label}</span>
            {node.tag && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${node.tagColor || 'bg-white/20 text-white'}`}>
                {node.tag}
              </span>
            )}
          </div>
          {node.detail && (
            <div className={`text-[10px] mt-0.5 font-mono ${depth < 2 ? 'opacity-80' : 'text-slate-500'}`}>
              {node.detail}
            </div>
          )}
        </div>

        {/* Children branch connector */}
        {hasChildren && (
          <div className="flex flex-col items-center w-full">
            {/* Vertical connector line */}
            <div className="w-0.5 h-4 bg-slate-300" />

            {/* Horizontal line across children */}
            <div className="relative flex justify-center items-start pt-4 w-full">
              {node.children!.length > 1 && (
                <div className="absolute top-0 inset-x-8 h-0.5 bg-slate-300" />
              )}
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full">
                {node.children!.map((child) => (
                  <div key={child.id} className="flex flex-col items-center relative">
                    {/* Top vertical stub to join horizontal bar */}
                    {node.children!.length > 1 && (
                      <div className="w-0.5 h-4 bg-slate-300 -mt-4 mb-0" />
                    )}
                    {renderNode(child, depth + 1)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`border border-border/80 shadow-sm bg-card overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <CardHeader className="pb-3 border-b border-border/50 bg-slate-50/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              {title && <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">{title}</CardTitle>}
              {subtitle && <CardDescription className="text-xs text-muted-foreground mt-0.5">{subtitle}</CardDescription>}
            </div>
            {selectedNode && (
              <Badge variant="outline" className="text-xs font-mono bg-indigo-50 text-indigo-700 border-indigo-200">
                Selected: {selectedNode.label} {selectedNode.detail ? `(${selectedNode.detail})` : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
      )}

      <CardContent className="pt-6 pb-6 overflow-x-auto">
        <div style={{ minHeight: `${height}px` }} className="min-w-[500px] flex justify-center items-center py-4 select-none">
          {renderNode(data)}
        </div>
      </CardContent>
    </Card>
  );
}
