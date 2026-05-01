import React from 'react';
import { RealtimeMessaging } from '../../components/messages/RealtimeMessaging';

export default function ControllerMessagesPage() {
  return (
    <RealtimeMessaging
      title="Communications"
      subtitle="Real-time messaging. Controllers can message the chairman only."
    />
  );
}

