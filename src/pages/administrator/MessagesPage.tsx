import React from 'react';
import { RealtimeMessaging } from '../../components/messages/RealtimeMessaging';

export default function AdministratorMessagesPage() {
  return (
    <RealtimeMessaging
      title="Internal Messages"
      subtitle="Real-time messaging. Administrator can message the chairman only."
    />
  );
}
