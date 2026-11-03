'use client';

import React from 'react';
import { CapTableTracker } from './CapTableTracker';

interface CapTableAndExitHubProps {
  userId: string;
  companyProfileId: string;
  readOnly?: boolean;
  defaultSection?: 'cap-table' | 'exit';
}

export function CapTableAndExitHub({
  userId,
  companyProfileId,
  readOnly,
  defaultSection = 'cap-table'
}: CapTableAndExitHubProps) {
  return (
    <div className="w-full">
      <CapTableTracker
        userId={userId}
        companyProfileId={companyProfileId}
        readOnly={readOnly}
        defaultView={defaultSection === 'exit' ? 'exit' : 'registry'}
      />
    </div>
  );
}
