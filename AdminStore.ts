import { AuditLog, AdminMessage, WebhookPayload, Transaction } from './types';
import { UserStore } from './UserStore';
import { WalletStore } from './WalletStore';

const AUDIT_LOGS_KEY = 'mp_audit_logs';
const MESSAGES_KEY = 'mp_admin_messages';
const TRANSACTIONS_KEY = 'mp_transactions';

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
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs.slice(0, 1000))); 
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
  },

  async processBankWebhook(payload: WebhookPayload) {
    const transactionsData = localStorage.getItem(TRANSACTIONS_KEY);
    let allTransactions: Transaction[] = transactionsData ? JSON.parse(transactionsData) : [];
    
    const txIndex = allTransactions.findIndex(tx => 
      tx.transaction_id === payload.transaction_id || 
      tx.bank_reference === payload.bank_reference
    );

    if (txIndex === -1) {
      console.warn("Webhook received for unknown transaction:", payload.transaction_id);
      return { success: false, error: "Transaction not found" };
    }

    const tx = allTransactions[txIndex];
    if (tx.status !== 'PENDING') {
      return { success: false, error: "Transaction already processed" };
    }

    const users = UserStore.getUsers();
    // In this app, the sender's name is usually stored in tx.details or we match the wallet
    const sender = users.find(u => u.full_name === "Jerry Robot Timothy"); 

    if (!sender) return { success: false, error: "Sender not found" };

    if (payload.status === 'SUCCESS') {
      allTransactions[txIndex].status = 'SUCCESS';
      this.logAction('BANK-WEBHOOK', 'TRANSFER_SUCCESS', tx.id, `Confirmed SUCCESS for ${tx.bank_reference}`);
      WalletStore.systemReply(sender.user_id, `✅ External Transfer Successful!\nAmount: ₦${tx.amount.toLocaleString()}\nRecipient: ${tx.title}\nRef: ${tx.bank_reference}`);
    } else if (payload.status === 'FAILED' || payload.status === 'REVERSED') {
      allTransactions[txIndex].status = payload.status;
      
      const refundAmount = tx.amount + 20.00; 
      const newBalance = sender.wallet_balance + refundAmount;
      UserStore.updateUser(sender.user_id, { wallet_balance: newBalance });
      
      this.logAction('BANK-WEBHOOK', 'TRANSFER_REVERSED', tx.id, `Refunded ₦${refundAmount} due to ${payload.status}`);
      WalletStore.systemReply(sender.user_id, `⚠️ Transfer Failed.\n₦${refundAmount.toLocaleString()} has been reversed to your wallet.\nRef: ${tx.bank_reference}`);
    }

    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(allTransactions));
    return { success: true };
  }
};