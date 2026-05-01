import React from 'react';
import { AdministratorMetrics } from '../../components/administrator/AdministratorMetrics';

export default function AdministratorAnalyticsPage() {
  return (
    <AdministratorMetrics
      title="Analytics & Reporting"
      subtitle="Approval success rates, distributions, and monthly trends (updates live)."
      icon="analytics"
    />
  );
}

