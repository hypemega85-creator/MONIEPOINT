import { WalletChatMessage, WalletPlanType, VirtualCard, BoughtNumber, NumberPlan, WalletPlan } from './types';
import { UserStore } from './UserStore';

const CHAT_KEY = 'mp_wallet_chats';

// Re-declaring for store internal logic with requested plan values
const STORE_WALLET_PLANS: WalletPlan[] = [
  { id: 'REGULAR', name: 'REGULAR', min: 20000, max: 250000, color: '#5EB5FB' },
  { id: 'PREMIUM', name: 'PREMIUM', min: 35000, max: 700000, color: '#FBC02D' },
  { id: 'MASTER', name: 'MASTER', min: 50000, max: 1000000, color: '#9D95FF' },
  { id: 'LEGEND', name: 'LEGEND', min: 100000, max: 15000000, color: '#00D775' }
];

export const WalletStore = {
  getMessages(userId: string): WalletChatMessage[] {
    const data = localStorage.getItem(CHAT_KEY);
    const allMessages: WalletChatMessage[] = data ? JSON.parse(data) : [];
    return allMessages.filter(m => 
      m.from === userId || 
      m.to === userId || 
      (m.to === 'admin' && m.from === userId) || 
      (m.from === 'admin' && m.to === userId) ||
      (m.from === 'system' && m.to === userId)
    );
  },

  getAllPending(): WalletChatMessage[] {
    const data = localStorage.getItem(CHAT_KEY);
    const allMessages: WalletChatMessage[] = data ? JSON.parse(data) : [];
    return allMessages.filter(m => m.type === 'file' && m.status === 'pending');
  },

  sendMessage(
    userId: string, 
    content: string, 
    type: 'text' | 'file' | 'voice' | 'ai' = 'text', 
    fileData?: string, 
    plan?: WalletPlanType, 
    purchaseType?: 'card' | 'number' | 'wallet',
    purchaseContext?: { item: string, price: string, theme: string } | any
  ) {
    const data = localStorage.getItem(CHAT_KEY);
    const allMessages: WalletChatMessage[] = data ? JSON.parse(data) : [];
    
    // Filter history for this user only
    const userHistory = allMessages.filter(m => (m.from === userId || m.to === userId));

    const newMsg: WalletChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from: userId,
      to: 'admin',
      content,
      type,
      status: type === 'file' ? 'pending' : undefined,
      purchaseType,
      purchaseItem: purchaseContext?.item,
      purchasePrice: purchaseContext?.price,
      purchaseCountry: purchaseContext?.country,
      purchaseCountryFlag: purchaseContext?.flag,
      purchasePlan: purchaseContext?.plan,
      countdown: type === 'file' ? 300 : undefined,
      timestamp: Date.now(),
      fileData,
      plan,
      seen: false
    };

    allMessages.push(newMsg);
    localStorage.setItem(CHAT_KEY, JSON.stringify(allMessages));

    // Logic for Virtual Card Purchase
    if (purchaseType === 'card' && content === "I WANT TO PURCHASE THIS CARD") {
      const alreadySent = userHistory.some(m => m.from === 'system' && m.content.includes("Card Selected:"));
      if (!alreadySent) {
        const cardName = purchaseContext?.item || "Premium Card";
        const cardPrice = purchaseContext?.price || "₦50,000";
        const cardAutoReply = `Card Selected: ${cardName}\nPrice: ${cardPrice}\nPayment Details:\nBank Account: 9123565629\nPALMPAY\nETIM`;
        setTimeout(() => this.systemReply(userId, cardAutoReply), 1000);
      }
    }

    // Logic for Phone Number Purchase Auto-Replies
    if (purchaseType === 'number') {
        const isInitialTrigger = (content === "I WANT TO PURCHASE A PHONE NUMBER");
        const userContextHistory = userHistory.filter(m => m.purchaseType === 'number');

        if (isInitialTrigger) {
            const alreadySentIntro = userContextHistory.some(m => 
                m.from === 'admin' && m.content.includes("THANKS FOR CONTACTING US") && m.purchaseItem === purchaseContext?.item
            );
            
            if (!alreadySentIntro) {
                const item = purchaseContext?.item || "Pending Selection";
                const price = purchaseContext?.price ? `₦${purchaseContext.price.toLocaleString()}` : "₦5,000";
                const phoneAutoReply = `THANKS FOR CONTACTING US\nTHE NUMBER THE SELECTED: ${item}\nTHE PRICE: ${price}\n\nTHE Payment Details":\nBank Account: 9123565629\nPALMPAY\nETIM`;
                setTimeout(() => this.adminReplyWithContext(userId, phoneAutoReply, 'number', purchaseContext?.item), 1000);
            }
        } else if (type === 'text') {
            const alreadySentFollowUp = userContextHistory.some(m => m.from === 'admin' && m.content === "UPLOAD PAYMENT RECEIPT FOR VERIFICATION");
            const hasSentIntro = userContextHistory.some(m => m.from === 'admin' && m.content.includes("THANKS FOR CONTACTING US"));
            if (hasSentIntro && !alreadySentFollowUp) {
                setTimeout(() => this.adminReplyWithContext(userId, "UPLOAD PAYMENT RECEIPT FOR VERIFICATION", 'number', purchaseContext?.item), 1000);
            }
        }
    }

    // Wallet Funding Initiation - Updated with exact requested auto-reply content
    if (purchaseType === 'wallet' && content === "I WANT TO FUND MY WALLET") {
      const alreadySentPlans = userHistory.some(m => m.from === 'system' && m.content.includes("SELECT A PLAN:"));
      if (!alreadySentPlans) {
        const planText = `SELECT A PLAN:

1️⃣ REGULAR
₦20,000 ➝ Wallet Balance ₦250,000

2️⃣ PREMIUM
₦35,000 ➝ Wallet Balance ₦700,000

3️⃣ MASTER
₦50,000 ➝ Wallet Balance ₦1,000,000

4️⃣ LEGEND
₦100,000 ➝ Wallet Balance ₦15,000,000


Payment Details:
Bank Account: 9123565629
Bank Name: PALMPAY
Account Name: ETIM`;
        
        setTimeout(() => this.systemReply(userId, planText), 800);
      }
    }

    // File Upload Notification (Trigger ONE notification only)
    if (type === 'file') {
      const alreadyNotified = userHistory.some(m => m.from === 'system' && m.content.includes("Payment screenshot received"));
      if (!alreadyNotified) {
         setTimeout(() => this.systemReply(userId, "📥 Payment screenshot received. Your transaction is under review."), 1200);
      }
    }

    return newMsg;
  },

  adminReply(userId: string, content: string) {
    const data = localStorage.getItem(CHAT_KEY);
    const allMessages: WalletChatMessage[] = data ? JSON.parse(data) : [];
    const newMsg: WalletChatMessage = {
      id: `msg_${Date.now()}_adm`,
      from: 'admin',
      to: userId,
      content,
      type: 'text',
      timestamp: Date.now(),
      seen: false
    };
    allMessages.push(newMsg);
    localStorage.setItem(CHAT_KEY, JSON.stringify(allMessages));
  },

  systemReply(userId: string, content: string) {
    const data = localStorage.getItem(CHAT_KEY);
    const allMessages: WalletChatMessage[] = data ? JSON.parse(data) : [];
    const newMsg: WalletChatMessage = {
      id: `msg_${Date.now()}_sys`,
      from: 'system',
      to: userId,
      content,
      type: 'text',
      timestamp: Date.now(),
      seen: false
    };
    allMessages.push(newMsg);
    localStorage.setItem(CHAT_KEY, JSON.stringify(allMessages));
  },

  adminReplyWithContext(userId: string, content: string, purchaseType: 'card' | 'number' | 'wallet', purchaseItem?: string) {
    const data = localStorage.getItem(CHAT_KEY);
    const allMessages: WalletChatMessage[] = data ? JSON.parse(data) : [];
    const newMsg: WalletChatMessage = {
      id: `msg_${Date.now()}_adm_ctx`,
      from: 'admin',
      to: userId,
      content,
      type: 'text',
      purchaseType,
      purchaseItem,
      timestamp: Date.now(),
      seen: false
    };
    allMessages.push(newMsg);
    localStorage.setItem(CHAT_KEY, JSON.stringify(allMessages));
  },

  updateMessageStatus(msgId: string, status: 'approved' | 'rejected', notes?: string) {
    const data = localStorage.getItem(CHAT_KEY);
    const allMessages: WalletChatMessage[] = data ? JSON.parse(data) : [];
    const index = allMessages.findIndex(m => m.id === msgId);
    
    if (index > -1) {
      const originalMsg = allMessages[index];
      allMessages[index].status = status;
      allMessages[index].notes = notes;
      
      const users = UserStore.getUsers();
      const user = users.find(u => u.user_id === originalMsg.from);
      
      if (user) {
        if (status === 'approved') {
          if (originalMsg.purchaseType === 'wallet') {
            // Find the most recent plan mentioned in the chat history for this user
            const userChats = allMessages.filter(m => m.from === user.user_id || m.to === user.user_id);
            const lastPlanMention = userChats
              .filter(m => m.type === 'text' && m.from === user.user_id)
              .reverse()
              .find(m => ['REGULAR', 'PREMIUM', 'MASTER', 'LEGEND'].some(p => m.content.toUpperCase().includes(p)));

            let planId: WalletPlanType = 'REGULAR';
            if (lastPlanMention) {
               const found = STORE_WALLET_PLANS.find(p => lastPlanMention.content.toUpperCase().includes(p.id));
               if (found) planId = found.id;
            } else if (originalMsg.plan) {
               planId = originalMsg.plan;
            }

            const planToApply = STORE_WALLET_PLANS.find(p => p.id === planId) || STORE_WALLET_PLANS[0];
            const updatedBalance = user.wallet_balance + planToApply.max;
            
            UserStore.updateUser(user.user_id, { wallet_balance: updatedBalance });
            this.systemReply(user.user_id, `🎉 Success! Your wallet has been funded with the ${planToApply.name} plan (+₦${planToApply.max.toLocaleString()}).`);
            allMessages.push({ id: `sys_anim_${Date.now()}`, from: 'system', to: user.user_id, content: `🎉 Success! Your wallet has been funded.`, type: 'animation', timestamp: Date.now(), seen: false });
          } else if (originalMsg.purchaseType === 'number') {
            const plan = originalMsg.purchasePlan || 'REGULAR';
            const days = plan === 'VIP' ? 90 : 30;
            const newNum: BoughtNumber = {
              id: `num_${Date.now()}`,
              country: originalMsg.purchaseCountry || 'Global',
              countryFlag: originalMsg.purchaseCountryFlag || '🌐',
              code: originalMsg.purchaseItem?.split(' ')[0] || '',
              number: originalMsg.purchaseItem || 'Unknown',
              plan: plan,
              purchasedAt: Date.now(),
              expiresAt: Date.now() + (days * 24 * 60 * 60 * 1000),
              status: 'active',
              platforms: ['WhatsApp', 'Facebook', 'Instagram', 'TikTok', 'PayPal']
            };
            const updatedNums = [...(user.boughtNumbers || []), newNum];
            UserStore.updateUser(user.user_id, { boughtNumbers: updatedNums });
            this.systemReply(user.user_id, `YOUR NUMBER IS NOW OFFICIAL ✅`);
            allMessages.push({ id: `sys_anim_${Date.now()}`, from: 'system', to: user.user_id, content: 'YOUR NUMBER IS NOW OFFICIAL ✅', type: 'animation', timestamp: Date.now(), seen: false });
          } else if (originalMsg.purchaseType === 'card') {
            const newCard: VirtualCard = {
              id: `card_${Date.now()}`,
              type: originalMsg.purchaseItem?.includes('Mastercard') ? 'Mastercard' : 'Visa',
              currency: 'USD',
              number: `4500 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
              expiry: '12/28',
              cvv: String(Math.floor(100 + Math.random() * 899)),
              isVIP: originalMsg.purchaseItem?.includes('UnionPay') || originalMsg.purchaseItem?.includes('Centurion'),
              isLocked: false,
              theme: originalMsg.purchaseItem?.includes('Visa') ? 'purple_visa' : originalMsg.purchaseItem?.includes('Mastercard') ? 'orange_master' : originalMsg.purchaseItem?.includes('UnionPay') ? 'green_union' : 'matte_black',
              status: 'active',
              purchasedAt: Date.now(),
              balance: 0,
              label: originalMsg.purchaseItem || 'Premium Card'
            } as any;
            const updatedCards = [...(user.virtualCards || []), newCard];
            UserStore.updateUser(user.user_id, { virtualCards: updatedCards });
            this.systemReply(user.user_id, "CARD VERIFIED – YOU CAN USE IT ✅");
            this.systemReply(user.user_id, "Your details are now unlocked. You can view full card information.");
            allMessages.push({ id: `sys_anim_${Date.now()}`, from: 'system', to: user.user_id, content: 'CARD VERIFIED – YOU CAN USE IT ✅', type: 'animation', timestamp: Date.now(), seen: false });
          }
        } else {
          if (originalMsg.purchaseType === 'wallet') {
            this.systemReply(user.user_id, "⚠️ Payment verification failed. Please upload a clearer screenshot.");
            allMessages.push({ id: `sys_rej_${Date.now()}`, from: 'system', to: user.user_id, content: '⚠️ Payment verification failed. Please upload a clearer screenshot.', type: 'animation', timestamp: Date.now(), seen: false, isDeclined: true });
          } else {
            this.systemReply(user.user_id, "Payment failed. Please upload again.");
            allMessages.push({ id: `sys_rej_gen_${Date.now()}`, from: 'system', to: user.user_id, content: 'Payment failed. Please upload again.', type: 'animation', timestamp: Date.now(), seen: false, isDeclined: true });
          }
        }
      }
      
      localStorage.setItem(CHAT_KEY, JSON.stringify(allMessages));
    }
  },

  markAsSeen(userId: string) {
    const data = localStorage.getItem(CHAT_KEY);
    const allMessages: WalletChatMessage[] = data ? JSON.parse(data) : [];
    const updated = allMessages.map(m => {
      if (m.to === userId && (m.from === 'admin' || m.from === 'system')) {
        return { ...m, seen: true };
      }
      return m;
    });
    localStorage.setItem(CHAT_KEY, JSON.stringify(updated));
  }
};