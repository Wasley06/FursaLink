import React from 'react';
import { AdministratorMetrics } from '../../components/administrator/AdministratorMetrics';

export default function AdministratorDashboardPage() {
  return (
    <AdministratorMetrics
      title="Administrator Dashboard"
      subtitle="Statistics overview, real-time filters, and approval performance metrics."
      icon="dashboard"
    />
  );
}

