
import { AuditLog, AdminMessage } from './types';

const AUDIT_LOGS_KEY = 'mp_audit_logs';
const MESSAGES_KEY = 'mp_admin_messages';

export const AdminStore = {
  getAuditLogs(): AuditLog[] {
    const data = localStorage.getItem(AUDIT_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  },

  logAction(adminId: string, action: string, targetId: string, details: string) {
    const logs = this.getAuditLogs();
    logs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      adminId,
      action,
      targetId,
      details,
      timestamp: Date.now()
    });
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 1000))); // Keep last 1000
  },

  getMessages(): AdminMessage[] {
    const data = localStorage.getItem(MESSAGES_KEY);
    return data ? JSON.parse(data) : [];
  },

  sendMessage(recipientId: string | 'all', message: string, autoHide: boolean = false) {
    const msgs = this.getMessages();
    msgs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      recipientId,
      message,
      timestamp: Date.now(),
      delivered: false,
      autoHide
    });
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
  },

  getPendingMessages(userId: string): AdminMessage[] {
    const msgs = this.getMessages();
    return msgs.filter(m => (m.recipientId === userId || m.recipientId === 'all') && !m.delivered);
  },

  markAsDelivered(msgId: string) {
    const msgs = this.getMessages();
    const index = msgs.findIndex(m => m.id === msgId);
    if (index > -1) {
      msgs[index].delivered = true;
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
    }
  }
};
