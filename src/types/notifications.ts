export type NotificationKind = 'info' | 'success' | 'warning' | 'danger';

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message?: string;
  kind?: NotificationKind;
  targetPath?: string;
  read?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

