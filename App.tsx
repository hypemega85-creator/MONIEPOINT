import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Transaction, AccountInfo, AppTab, Bank, AdminMessage, WalletPlan, WalletPlanType, WalletChatMessage, User, VirtualCard, BoughtNumber, NumberPlan } from './types';
import { NIGERIAN_BANKS } from './banks';
import { AuthScreens } from './AuthScreens';
import { UserStore } from './UserStore';
import { AdminStore } from './AdminStore';
import { WalletStore } from './WalletStore';
import { AdminPanel } from './AdminPanel';
import { GoogleGenAI } from "@google/genai";
import { 
  HomeIcon, 
  CreditCardIcon, 
  GridIcon, 
  GiftIcon, 
  EyeIcon, 
  EyeOffIcon, 
  PlusIcon,
  CopyIcon,
  HistoryIcon,
  TransferIcon,
  PhoneIcon,
  SmartphoneIcon,
  BettingIcon,
  SavingsIcon,
  EducationIcon,
  StatementIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  XIcon,
  MoreVerticalIcon,
  CloseCircleIcon,
  OPayIcon,
  BankBuildingIcon,
  SearchIcon,
  InfoIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  LogOutIcon,
  ChatBubbleIcon,
  PinIcon,
  SettingsIcon
} from './icons';

const NUBAPI_KEY = "d5wkK9gUVrSUgRDA8DDTog4wIjrdrBhvo3itciUM806bca40".trim();

const RAW_COUNTRIES = [
  { name: 'Nigeria', flag: '🇳🇬', code: '+234' },
  { name: 'United States', flag: '🇺🇸', code: '+1' },
  { name: 'United Kingdom', flag: '🇬🇧', code: '+44' },
  { name: 'Canada', flag: '🇨🇦', code: '+1' },
  { name: 'Germany', flag: '🇩🇪', code: '+49' },
  { name: 'France', flag: '🇫🇷', code: '+33' },
  { name: 'Ghana', flag: '🇬🇭', code: '+233' },
  { name: 'South Africa', flag: '🇿🇦', code: '+27' },
  { name: 'India', flag: '🇮🇳', code: '+91' },
  { name: 'China', flag: '🇨🇳', code: '+86' }
];

const ProtectionModule = {
  checkAccess: (isAuthenticated: boolean, featureName: string) => {
    if (!isAuthenticated) {
      alert(`⚠️ ACTION BLOCKED: Attempted modification of protected feature (${featureName}). No changes made.`);
      return false;
    }
    return true;
  }
};

const WALLET_PLANS: WalletPlan[] = [
  { id: 'REGULAR', name: 'REGULAR', min: 20000, max: 250000, color: '#5EB5FB' },
  { id: 'PREMIUM', name: 'PREMIUM', min: 35000, max: 700000, color: '#FBC02D' },
  { id: 'MASTER', name: 'MASTER', min: 50000, max: 1000000, color: '#9D95FF' },
  { id: 'LEGEND', name: 'LEGEND', min: 100000, max: 15000000, color: '#00D775' }
];

const VIRTUAL_CARDS_OFFERED = [
  { id: 'v_visa', type: 'Visa', currency: 'USD', price: '₦50,000', priceUSD: '$35', label: 'VISA PLATINUM', isVIP: false, theme: 'purple_visa', badge: 'PLATINUM' },
  { id: 'v_master', type: 'Mastercard', currency: 'USD', price: '₦50,000', priceUSD: '$35', label: 'MASTERCARD WORLD ELITE', isVIP: false, theme: 'orange_master', badge: 'ELITE' },
  { id: 'v_union', type: 'UnionPay', currency: 'EUR', price: '₦35,000', priceUSD: '$25', label: 'UNIONPAY PLATINUM', isVIP: true, theme: 'green_union', badge: 'VIP' },
  { id: 'v_amex', type: 'Amex', currency: 'USD', price: '₦100,000', priceUSD: '$70', label: 'AMERICAN EXPRESS CENTURION', isVIP: true, theme: 'matte_black', badge: 'BLACK' },
];

const CARD_BRAND_THEMES: Record<string, { css: string, logo: React.ReactNode, glow: string }> = {
  'purple_visa': { 
    css: 'bg-gradient-to-br from-[#4B0082] to-[#000080]', 
    logo: <span className="text-[#FFFFFF] font-black italic text-xl">VISA</span>,
    glow: 'shadow-[0_0_15px_rgba(147,51,234,0.5)] border-purple-500/30'
  },
  'orange_master': { 
    css: 'bg-gradient-to-br from-[#FF5F00] to-[#EB001B]', 
    logo: <div className="flex -space-x-2"><div className="w-6 h-6 rounded-full bg-[#EB001B]"></div><div className="w-6 h-6 rounded-full bg-[#F79E1B]/80"></div></div>,
    glow: 'shadow-[0_0_15px_rgba(235,0,27,0.5)] border-red-500/30'
  },
  'green_union': { 
    css: 'bg-gradient-to-br from-[#008080] to-[#2E8B57]', 
    logo: <div className="flex flex-col items-center"><span className="text-white text-[10px] font-black tracking-tighter leading-none">UnionPay</span><div className="flex gap-0.5 mt-0.5"><div className="w-2 h-1 bg-red-500"></div><div className="w-2 h-1 bg-blue-500"></div><div className="w-2 h-1 bg-green-500"></div></div></div>,
    glow: 'shadow-[0_0_15px_rgba(46,139,87,0.5)] border-green-500/30'
  },
  'matte_black': { 
    css: 'bg-[#1A1A1A]', 
    logo: <span className="text-[#C0C0C0] font-serif text-lg tracking-[0.2em] italic">CENTURION</span>,
    glow: 'shadow-[0_0_15px_rgba(192,192,192,0.3)] border-gray-400/30'
  }
};

const RealisticCard: React.FC<{ card: any, fullName: string, side: 'front' | 'back', isBlurred?: boolean, isShaking?: boolean }> = ({ card, fullName, side, isBlurred, isShaking }) => {
  const theme = CARD_BRAND_THEMES[card.theme] || CARD_BRAND_THEMES['purple_visa'];
  const isApproved = card.status === 'active';

  if (side === 'front') {
    return (
      <div className={`w-full aspect-[1.586/1] rounded-[20px] p-6 flex flex-col justify-between overflow-hidden relative shadow-2xl transition-all duration-300 ${isShaking ? 'animate-wiggle' : ''} ${theme.css}`}>
        <div className={`absolute inset-0 transition-all duration-500 z-[1] ${isBlurred ? 'backdrop-blur-[18px] bg-black/20 opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="flex justify-between items-start z-10">
          <div className="flex flex-col">
            <span className="text-[9px] font-black tracking-[0.2em] text-white/40 uppercase">{card.label}</span>
          </div>
          <div className="bg-white/5 p-1.5 rounded-lg border border-white/10 backdrop-blur-sm">{theme.logo}</div>
        </div>
        <div className="z-10">
          <div className="w-10 h-8 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-md mb-4 shadow-inner opacity-90 border border-white/20"></div>
          <p className="text-[18px] font-bold font-mono tracking-[0.15em] text-white/90 drop-shadow-md">
            {isApproved ? card.number : '**** **** **** ****'}
          </p>
        </div>
        <div className="flex justify-between items-end z-10">
          <div className="flex flex-col">
            <span className="text-[7px] font-black uppercase text-white/30 tracking-widest mb-1">Card Holder</span>
            <span className="text-[11px] font-black text-white/90 uppercase">{isApproved ? fullName : 'VERIFICATION REQUIRED'}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[7px] font-black uppercase text-white/30 tracking-widest mb-1">Expires</span>
            <span className="text-[11px] font-bold text-white/90 font-mono">{isApproved ? card.expiry : '--/--'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full aspect-[1.586/1] rounded-[20px] flex flex-col overflow-hidden relative shadow-2xl transition-all duration-300 ${isShaking ? 'animate-wiggle' : ''} ${theme.css}`}>
      <div className={`absolute inset-0 transition-all duration-500 z-[1] ${isBlurred ? 'backdrop-blur-[18px] bg-black/20 opacity-100' : 'opacity-0 pointer-events-none'}`}></div>
      <div className="w-full h-10 bg-black/80 mt-6 z-10"></div>
      <div className="px-6 flex flex-col gap-6 mt-4 z-10">
         <div className="flex flex-col gap-1">
            <span className="text-[8px] font-black uppercase text-white/30 tracking-widest">Security Code</span>
            <div className="flex gap-2 items-center">
               <div className="bg-white h-8 w-40 rounded flex items-center justify-end px-3 border border-white/10">
                  <span className="text-black font-mono italic text-sm tracking-tighter opacity-10">/////////////////////</span>
               </div>
               <div className="bg-[#E2E8F0] h-8 w-12 rounded flex items-center justify-center border border-white/20 shadow-inner">
                  <span className="text-black font-black text-xs">{isApproved ? card.cvv : '***'}</span>
               </div>
            </div>
         </div>
         <p className="text-[7px] text-white/20 uppercase tracking-tighter leading-tight font-medium">This virtual card is issued by Moniepoint MFB. Privacy protected. Only authorized users can see details.</p>
      </div>
    </div>
  );
};

const PinOverlay: React.FC<{ 
  title: string; 
  subtitle?: string;
  headerLabel?: string;
  onComplete: (pin: string) => void; 
  onCancel: () => void; 
  error?: string;
  isBiometricOption?: boolean;
  onBiometric?: () => void;
}> = ({ title, subtitle, headerLabel = "Authorize Payment", onComplete, onCancel, error, isBiometricOption, onBiometric }) => {
  const [pin, setPin] = useState("");
  useEffect(() => { setPin(""); }, [title]);
  const handleKey = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) setTimeout(() => onComplete(newPin), 250);
    }
  };
  const handleBackspace = () => setPin(prev => prev.slice(0, -1));
  return (
    <div className="fixed inset-0 z-[2500] bg-[#020817] flex flex-col animate-fade-in text-white font-sans overflow-hidden select-none">
      <div className="px-4 py-2 flex items-center shrink-0">
        <button onClick={onCancel} className="p-2 text-white/60 hover:text-white transition-colors"><ArrowLeftIcon className="w-5 h-5" /></button>
        <div className="flex-grow text-center pr-8"><span className="text-[11px] font-black tracking-[0.1em] opacity-40 uppercase">{headerLabel}</span></div>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center px-6 pb-6">
        <h2 className="text-[22px] font-black tracking-tight mb-0.5 text-center leading-tight">{title}</h2>
        <p className="text-[12px] text-white/30 font-medium text-center mb-6 max-w-[240px] leading-snug">{subtitle || "To complete this transaction, enter your transaction PIN"}</p>
        {error && <div className="mb-4 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg animate-shake shrink-0"><p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-widest">{error}</p></div>}
        <div className="bg-white/[0.01] rounded-2xl p-3 flex gap-2 mb-8 border border-white/5 shadow-lg shrink-0">
          {[0, 1, 2, 3].map((i) => {
            const isActive = pin.length === i; const hasValue = pin.length > i;
            return (<div key={i} className={`w-10 h-12 rounded-xl bg-[#0F172A] flex items-center justify-center transition-all duration-200 border-2 ${isActive ? 'border-[#FBC02D] shadow-[0_0_10px_rgba(251,192,45,0.2)] scale-105' : 'border-white/5'}`}>{isActive ? <div className="w-[1px] h-6 bg-[#FBC02D] animate-pulse"></div> : hasValue ? <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_4px_white]"></div> : null}</div>);
          })}
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 w-full max-w-[240px] mx-auto shrink-0">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (<button key={n} onClick={() => handleKey(n.toString())} className="w-12 h-12 rounded-full bg-[#111F35] flex items-center justify-center text-[18px] font-black hover:bg-white/10 active:scale-90 transition-all border border-white/5 shadow-sm mx-auto">{n}</button>))}
          <div className="flex items-center justify-center">{isBiometricOption ? <button onClick={onBiometric} className="text-[#00D775] hover:scale-110 active:scale-90 transition-all p-2"><ShieldCheckIcon className="w-6 h-6" /></button> : <div className="w-12 h-12" />}</div>
          <button onClick={() => handleKey("0")} className="w-12 h-12 rounded-full bg-[#111F35] flex items-center justify-center text-[18px] font-black hover:bg-white/10 active:scale-90 transition-all border border-white/5 shadow-sm mx-auto">0</button>
          <button onClick={handleBackspace} className="w-12 h-12 rounded-full bg-[#111F35] flex items-center justify-center text-white/30 hover:text-white active:scale-90 transition-all border border-white/5 shadow-sm mx-auto"><svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M22 3H7c-.69 0-1.23.35-1.59.88L.37 11.45c-.48.64-.48 1.46 0 2.1l5.04 7.57c.36.53.9.88 1.59.88h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3.12 11.88l-1.41 1.41L15 13.41l-2.47 2.47-1.41-1.41L13.59 12l-2.47-2.47 1.41-1.41L15 10.59l2.47-2.47 1.41-1.41L16.41 12l2.47 2.47z"/></svg></button>
        </div>
      </div>
    </div>
  );
};

const AITextAssistant: React.FC<{ userId: string, balance: number, userName: string, deviceType: string }> = ({ userId, balance, userName, deviceType }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<{id: string, from: 'ai' | 'user', text: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);
  
  const handleQuery = async () => {
    const query = inputText.trim(); if (!query) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), from: 'user', text: query }]);
    setInputText(""); setIsTyping(true);
    
    const sysInstruction = `You are a professional AI Banking Assistant for Moniepoint. 
User: ${userName}, Current Wallet Balance: ₦${balance.toLocaleString()}. Device: ${deviceType}.

KNOWLEDGE BASE:
1. WALLET FUNDING / ADD MONEY:
- Plans: 
  - REGULAR: ₦20,000 deposit yields ₦250,000 balance.
  - PREMIUM: ₦35,000 deposit yields ₦700,000 balance.
  - MASTER: ₦50,000 deposit yields ₦1,000,000 balance.
  - LEGEND: ₦100,000 deposit yields ₦15,000,000 balance.
- Process: Select "Add Money", click plan, send the auto-message, upload screenshot.
- Payment Details: Bank: 9123565629, Provider: PALMPAY, Account Name: ETIM.
- Verification: Pending status with a 5-minute countdown. Admin approves manually.

2. VIRTUAL CARDS:
- Types & Pricing:
  - VISA PLATINUM: $35 (₦50,000)
  - MASTERCARD WORLD ELITE: $35 (₦50,000)
  - UNIONPAY PLATINUM: $25 (₦35,000)
  - AMERICAN EXPRESS CENTURION (Black Card): $70 (₦100,000)
- Usage: Cards show front/back views. Details (numbers/CVV) are locked until admin approval.
- Reveal: Approved cards show full official images and the user's name (${userName}).

3. PHONE NUMBER SERVICES:
- Pricing: 
  - Nigeria: ₦5,000 (Regular) / ₦7,500 (VIP).
  - USA/UK/International: ₦10,000 (Regular) / ₦15,000 (VIP).
- Features: 40+ countries. Supports WhatsApp, Telegram, TikTok, Instagram, Facebook, PayPal.
- Renewal: Regular numbers last 30 days. VIP numbers last 90 days.
- Inbox: Once purchased, users can access an "Inbox" tied to the specific number for OTPs.
- Refresh: Numbers are updated every 5-20 minutes.

4. SECURITY:
- 4-Digit Transaction PIN: Required for transfers.
- Biometric: Supports fingerprint/FaceID if enabled in profile.

INSTRUCTIONS:
- Guide users step-by-step through their requests.
- Provide instructions without modifying UI.
- Use professional, helpful banking language.`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: query, 
        config: { systemInstruction: sysInstruction } 
      });
      setTimeout(() => { 
        setMessages(prev => [...prev, { id: Date.now().toString() + '_ai', from: 'ai', text: response.text || "PROTOCOL_ERROR" }]); 
        setIsTyping(false); 
      }, 1200);
    } catch { 
      setMessages(prev => [...prev, { id: 'err', from: 'ai', text: "Neural link lost." }]); 
      setIsTyping(false); 
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-[400]">
      {!isOpen ? <button onClick={() => setIsOpen(true)} className="w-16 h-16 bg-gradient-to-br from-[#5EB5FB] to-[#0A162B] rounded-full flex items-center justify-center shadow-lg animate-pulse"><ChatBubbleIcon className="w-8 h-8 text-white" /></button> : (
        <div className="w-80 h-[450px] bg-[#0A162B] border border-[#5EB5FB]/50 rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-fade-in backdrop-blur-xl">
          <header className="p-4 bg-[#050C1F] flex justify-between items-center border-b border-white/5"><span className="text-[10px] font-black text-[#5EB5FB] tracking-widest uppercase">AI Assistant</span><button onClick={() => setIsOpen(false)}><XIcon className="w-5 h-5 text-white/40" /></button></header>
          <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-hide">{messages.map(m => (<div key={m.id} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-3 rounded-2xl text-[12px] ${m.from === 'user' ? 'bg-white/10' : 'bg-[#1E0B36] text-[#5EB5FB]'}`}>{m.text}</div></div>))}<div ref={chatEndRef} /></div>
          <div className="p-4 border-t border-white/5 bg-[#050C1F]"><div className="flex gap-2"><input type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuery()} className="flex-grow bg-transparent text-xs text-white outline-none" placeholder="How can I help you today?" /><button onClick={handleQuery} className="bg-[#5EB5FB] text-black px-3 rounded-lg"><TransferIcon className="w-4 h-4 rotate-90" /></button></div></div>
        </div>
      )}
    </div>
  );
};

const UserPopupReceiver: React.FC<{ userId: string }> = ({ userId }) => {
  const [systemOverlay, setSystemOverlay] = useState<WalletChatMessage | null>(null);
  useEffect(() => {
    const check = () => {
      const chats = WalletStore.getMessages(userId);
      const unseenSystem = chats.find(m => m.type === 'animation' && !m.seen);
      if (unseenSystem) { setSystemOverlay(unseenSystem); WalletStore.markAsSeen(userId); setTimeout(() => setSystemOverlay(null), 7000); }
    };
    const interval = setInterval(check, 3000); return () => clearInterval(interval);
  }, [userId]);
  if (!systemOverlay) return null;
  
  const isFunded = systemOverlay.content.includes("Success");
  const isFailed = systemOverlay.content.includes("failed");
  const isVerified = systemOverlay.content.includes("VERIFIED");

  return (
    <div className="fixed inset-0 z-[4000] bg-black/90 flex items-center justify-center animate-fade-in backdrop-blur-md">
      <div className="text-center animate-slide-up px-10">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto animate-pulse ${isFailed || systemOverlay.isDeclined ? 'bg-red-500/20' : 'bg-[#00D775]/20'}`}>
          {isFailed || systemOverlay.isDeclined ? <XIcon className="w-12 h-12 text-red-500" /> : <ShieldCheckIcon className="w-12 h-12 text-[#00D775]" />}
        </div>
        <h2 className={`text-xl font-black tracking-widest uppercase ${isFailed || systemOverlay.isDeclined ? 'text-red-500' : 'text-[#00D775]'}`}>
          {systemOverlay.content}
        </h2>
        {systemOverlay.notes && <p className="text-white/40 text-xs mt-4 uppercase tracking-widest font-bold">{systemOverlay.notes}</p>}
      </div>
    </div>
  );
};

const WalletChatFlow: React.FC<{ userId: string, onClose: () => void, plan?: WalletPlan, initialMsg?: string, purchaseType?: 'card' | 'number' | 'wallet', purchaseContext?: any }> = ({ userId, onClose, plan, initialMsg, purchaseType, purchaseContext }) => {
  const [messages, setMessages] = useState<WalletChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setMessages(WalletStore.getMessages(userId));
  };

  useEffect(() => {
    if (initialMsg) {
      WalletStore.sendMessage(userId, initialMsg, 'text', undefined, plan?.id, purchaseType, purchaseContext);
    }
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (type: 'text' | 'file', data?: string) => {
    if (type === 'text' && !inputText.trim()) return;
    WalletStore.sendMessage(userId, type === 'file' ? 'Screenshot Uploaded' : inputText, type, data, plan?.id, purchaseType, purchaseContext);
    setInputText('');
    refresh();
  };

  return (
    <div className="fixed inset-0 z-[3000] bg-[#050C1F] flex flex-col animate-slide-up">
      <header className="px-6 py-6 border-b border-white/5 flex items-center justify-between bg-[#0A162B] shrink-0">
        <button onClick={onClose} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors"><ArrowLeftIcon className="w-6 h-6" /></button>
        <div className="text-center"><h3 className="text-sm font-black text-white uppercase tracking-widest">Secure Terminal</h3><span className="text-[9px] text-[#00D775] font-bold uppercase tracking-widest">Encrypted Session</span></div>
        <div className="w-8"></div>
      </header>
      <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-hide">
        {messages.map((m) => m.type !== 'animation' && (
          <div key={m.id} className={`flex ${m.from === userId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-[24px] p-4 ${m.from === userId ? 'bg-[#1E293B] text-white shadow-xl' : 'bg-[#0A162B] text-[#5EB5FB] border border-[#5EB5FB]/20 shadow-lg'}`}>
              {m.type === 'file' ? (
                <div className="space-y-2">
                  <img src={m.fileData} className="w-full rounded-xl" />
                  <p className="text-[8px] font-black uppercase opacity-40">Attachment Sent</p>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
              )}
              {m.status === 'pending' && (
                <div className="mt-3 bg-black/40 p-2.5 rounded-xl border border-white/5">
                  <div className="flex justify-between text-[8px] font-black uppercase text-[#FBC02D] mb-1.5"><span>Verifying assets...</span><span>05:00</span></div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#FBC02D] animate-timer" style={{ animationDuration: '300s' }}></div>
                  </div>
                </div>
              )}
              <p className="text-[7px] font-black uppercase text-white/20 mt-2 text-right">{new Date(m.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 bg-[#0A162B] border-t border-white/5 flex flex-col gap-3 pb-8">
        <div className="flex items-center gap-3 bg-[#050C1F] border border-white/10 rounded-3xl p-1.5 pl-4 shadow-inner">
          <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend('text')} className="flex-grow bg-transparent text-sm outline-none text-white py-2" placeholder="Message Admin..." />
          <button onClick={() => handleSend('text')} className="bg-[#5EB5FB] text-black p-3 rounded-2xl active:scale-95 transition-transform"><TransferIcon className="w-5 h-5 rotate-90" /></button>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 rounded-xl bg-[#5EB5FB]/10 text-[#5EB5FB] text-[10px] font-black uppercase tracking-[0.2em] border border-[#5EB5FB]/20 active:scale-[0.98] transition-all hover:bg-[#5EB5FB]/15">Upload Payment Screenshot</button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => handleSend('file', r.result as string); r.readAsDataURL(f); } }} />
      </div>
      <style>{`@keyframes timer { from { width: 100%; } to { width: 0%; } } .animate-timer { animation: timer linear forwards; }`}</style>
    </div>
  );
};

const VerifyingAccountWidget: React.FC<{ 
  verifyAccount: () => Promise<string>; 
  onComplete: (name: string) => void; 
  onError: (err: any) => void;
}> = ({ verifyAccount, onComplete, onError }) => {
  useEffect(() => {
    let active = true;
    verifyAccount().then(name => { if (active) onComplete(name); }).catch(err => { if (active) onError(err); });
    return () => { active = false; };
  }, [verifyAccount, onComplete, onError]);
  return (
    <div className="bg-[#111F35] p-3 rounded-xl border border-white/5 flex items-center gap-3 animate-pulse shadow-lg">
      <div className="relative">
        <div className="w-10 h-10 bg-[#1D2B44] rounded-full flex items-center justify-center font-bold text-white/30 text-[11px]">
          <div className="w-5 h-5 border-2 border-t-[#FBC02D] border-white/10 rounded-full animate-spin"></div>
        </div>
      </div>
      <div className="flex-grow min-w-0">
        <div className="h-3 bg-white/20 rounded-full w-24 mb-2 animate-pulse"></div>
        <div className="h-2 bg-white/10 rounded-full w-32 animate-pulse"></div>
      </div>
    </div>
  );
};

const AddMoneyFlow: React.FC<{ userId: string, onClose: () => void }> = ({ userId, onClose }) => {
  return (
    <WalletChatFlow 
      userId={userId} 
      onClose={onClose} 
      initialMsg={`I WANT TO FUND MY WALLET`} 
      purchaseType="wallet" 
    />
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserWallet, setCurrentUserWallet] = useState("");
  const [userName, setUserName] = useState<string>("Jerry Robot Timothy");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.HOME);
  const [showBalance, setShowBalance] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<'recipient' | 'amount' | 'summary' | 'receipt'>('recipient');
  const [isValidating, setIsValidating] = useState(false);
  const [receiverAccount, setReceiverAccount] = useState("");
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [bankSearchQuery, setBankSearchQuery] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedAccountName, setVerifiedAccountName] = useState("");
  const [isConfirmingRecipient, setIsConfirmingRecipient] = useState(false);
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [transferAmount, setTransferAmount] = useState<string>("");
  const [narration, setNarration] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [insufficientFundsError, setInsufficientFundsError] = useState(false);
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false);
  const [balance, setBalance] = useState<number>(183780.46);
  const [purchaseChatProps, setPurchaseChatProps] = useState<{initialMsg: string, purchaseType: 'card' | 'number' | 'wallet', purchaseContext?: any} | null>(null);
  
  const [selectedCountry, setSelectedCountry] = useState<typeof RAW_COUNTRIES[0] | null>(null);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [availabilitySeed, setAvailabilitySeed] = useState(Date.now());
  const [selectedInboxNumber, setSelectedInboxNumber] = useState<BoughtNumber | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [selectedMyCardId, setSelectedMyCardId] = useState<string | null>(null);
  
  const [pinMode, setPinMode] = useState<'inactive' | 'setup' | 'confirm' | 'verify' | 'change_old' | 'change_new' | 'change_confirm'>('inactive');
  const [tempPin, setTempPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Locked Card Details UI State
  const [lockedHoverCardId, setLockedHoverCardId] = useState<string | null>(null);
  const [showLockedTooltip, setShowLockedTooltip] = useState<string | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('mp_transactions');
    return saved ? JSON.parse(saved) : [{ id: '1', type: 'incoming', title: 'Opay (507872******0070)', details: '03 Jan, 08:13 AM', amount: 2600.00, date: '03 Jan', timestamp: '08:13 AM' }, { id: '2', type: 'incoming', title: 'Palmpay (9123565629)', details: '03 Jan, 07:32 AM', amount: 12200.00, date: '03 Jan', timestamp: '07:32 AM' }];
  });

  const handleLogout = () => { if (currentUserWallet && !isAdmin) UserStore.updateUser(currentUserWallet, { isOnline: false }); setIsAuthenticated(false); setIsAdmin(false); setCurrentUserWallet(""); setIsProfileOpen(false); setCurrentUser(null); };
  useEffect(() => { if (isAuthenticated && isAdmin) { let timeoutId: number; const resetTimer = () => { if (timeoutId) clearTimeout(timeoutId); timeoutId = window.setTimeout(handleLogout, 10 * 60 * 1000); }; window.addEventListener('mousemove', resetTimer); window.addEventListener('keypress', resetTimer); window.addEventListener('touchstart', resetTimer); resetTimer(); return () => { window.removeEventListener('mousemove', resetTimer); window.removeEventListener('keypress', resetTimer); window.removeEventListener('touchstart', resetTimer); if (timeoutId) clearTimeout(timeoutId); }; } }, [isAuthenticated, isAdmin]);
  const handleLoginSuccess = (name: string, wallet: string, userBalance: number, isAdm: boolean = false) => { 
    setUserName(name); 
    setCurrentUserWallet(wallet); 
    setBalance(userBalance); 
    setIsAdmin(isAdm); 
    setIsAuthenticated(true);
    const users = UserStore.getUsers();
    setCurrentUser(users.find(u => u.user_id === wallet) || null);
  };
  useEffect(() => { if (isAuthenticated && !isAdmin) { const syncInterval = setInterval(() => { const users = UserStore.getUsers(); const me = users.find(u => u.user_id === currentUserWallet); if (me) { setBalance(me.wallet_balance); setUserName(me.full_name); setCurrentUser(me); } }, 3000); return () => clearInterval(syncInterval); } }, [isAuthenticated, isAdmin, currentUserWallet]);
  useEffect(() => { if (isAuthenticated && !isAdmin) { localStorage.setItem(`mp_balance_${currentUserWallet}`, balance.toString()); UserStore.updateUser(currentUserWallet, { wallet_balance: balance, device_info: { type: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Terminal', version: '1.4.2-rel', lastActive: Date.now() } }); } }, [balance, isAuthenticated, isAdmin, currentUserWallet]);
  useEffect(() => { localStorage.setItem('mp_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { UserStore.isBiometricSupported().then(setBiometricSupported); }, []);

  const [animatedBalance, setAnimatedBalance] = useState(0);
  const [showDashboardSubtext, setShowDashboardSubtext] = useState(false);
  const MOCK_ACCOUNT: AccountInfo = { accountNumber: currentUserWallet || "7033730541", accountName: userName, balance: balance, cashback: 75.45, referrals: 0.00 };
  useEffect(() => { if (activeTab === AppTab.HOME && isAuthenticated && !isAdmin) { let startTimestamp: number | null = null; const duration = 1200; const startValue = animatedBalance || 0; const targetValue = balance; const animate = (timestamp: number) => { if (!startTimestamp) startTimestamp = timestamp; const progress = Math.min((timestamp - startTimestamp) / duration, 1); const currentVal = startValue + (targetValue - startValue) * progress; setAnimatedBalance(currentVal); if (progress < 1) { window.requestAnimationFrame(animate); } else { setShowDashboardSubtext(true); } }; window.requestAnimationFrame(animate); } else { setShowDashboardSubtext(false); } }, [activeTab, balance, isAuthenticated, isAdmin]);
  useEffect(() => { if (receiverAccount.length === 10 && selectedBank) { setIsVerifying(true); setVerifiedAccountName(""); } else { setIsVerifying(false); setVerifiedAccountName(""); } }, [receiverAccount, selectedBank]);
  const verifyAccountApi = async (): Promise<string> => { if (!selectedBank || receiverAccount.length !== 10) throw new Error("Invalid"); try { const response = await fetch(`https://nubapi.com/api/verify?account_number=${receiverAccount}&bank_code=${selectedBank.code}`, { method: 'GET', headers: { 'Authorization': `Bearer ${NUBAPI_KEY}`, 'Accept': 'application/json', 'Content-Type': 'application/json' } }); if (!response.ok) throw new Error("Verification Failed"); const data = await response.json(); if (data && data.account_name) return data.account_name; throw new Error("Not found"); } catch (error) { throw error; } };
  const handleProfileUpdate = (e: React.FormEvent) => { e.preventDefault(); setIsProfileOpen(false); };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setProfileImage(reader.result as string); }; reader.readAsDataURL(file); } };
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => { const val = e.target.value.replace(/[^0-9]/g, ''); setTransferAmount(val); setInsufficientFundsError(false); };
  const startValidation = () => { if (!ProtectionModule.checkAccess(isAuthenticated, "TransferPage")) return; const amountVal = parseFloat(transferAmount || "0"); if (amountVal + 20 > balance) { setInsufficientFundsError(true); return; } setIsValidating(true); setTimeout(() => { setIsValidating(false); setTransferStep('summary'); }, 1500); };

  const handlePinComplete = async (pin: string) => {
    setPinError("");
    if (pinMode === 'setup') {
      if (UserStore.isWeakPin(pin)) { setPinError("This PIN is too easy."); return; }
      setTempPin(pin); setPinMode('confirm'); 
    } else if (pinMode === 'confirm') {
      if (pin !== tempPin) { setPinError("PINs do not match."); setPinMode('setup'); return; }
      const hashed = await UserStore.hashPin(pin); UserStore.updateUser(currentUserWallet, { transactionPinHashed: hashed }); setPinMode('inactive');
    } else if (pinMode === 'verify') {
      const result = await UserStore.verifyPin(currentUserWallet, pin);
      if (result.success) {
        setPinMode('inactive'); setIsValidating(true); 
        setTimeout(() => { 
          const amountVal = parseFloat(transferAmount || "0"); 
          const newBalance = balance - (amountVal + 20.00);
          setBalance(newBalance);
          // Deduct from UserStore immediately
          UserStore.updateUser(currentUserWallet, { wallet_balance: newBalance });
          
          const newTx: Transaction = { id: Date.now().toString(), type: 'outgoing', title: `${verifiedAccountName}`, details: `${new Date().toLocaleString()}`, amount: amountVal, date: 'Today', timestamp: 'Now' }; 
          setTransactions(prev => [newTx, ...prev]); setIsValidating(false); setTransferStep('receipt'); 
        }, 3000); 
      } else setPinError(result.error || "Incorrect PIN");
    } else if (pinMode === 'change_old') {
      const result = await UserStore.verifyPin(currentUserWallet, pin); if (result.success) setPinMode('change_new'); else setPinError(result.error || "Incorrect PIN");
    } else if (pinMode === 'change_new') {
      if (UserStore.isWeakPin(pin)) { setPinError("This PIN is too easy."); return; }
      setTempPin(pin); setPinMode('change_confirm');
    } else if (pinMode === 'change_confirm') {
      if (pin !== tempPin) { setPinError("PINs do not match."); setPinMode('change_new'); return; }
      const hashed = await UserStore.hashPin(pin); UserStore.updateUser(currentUserWallet, { transactionPinHashed: hashed }); setPinMode('inactive');
    }
  };

  const handleBiometricToggle = async () => {
    if (!currentUser?.transactionPinHashed) { alert("Please create a Transaction PIN first."); return; }
    const supported = await UserStore.isBiometricSupported();
    if (!supported) { alert("Biometric authentication is not supported."); return; }
    UserStore.updateUser(currentUserWallet, { isBiometricEnabled: !currentUser.isBiometricEnabled });
  };

  const handlePaymentConfirm = () => { 
    if (!ProtectionModule.checkAccess(isAuthenticated, "WalletFeature")) return; 
    const totalVal = parseFloat(transferAmount || "0") + 20.00; if (totalVal > balance) { alert("Insufficient funds."); return; } 
    if (currentUser?.transactionPinHashed) setPinMode('verify'); else setPinMode('setup');
  };

  const numberToWords = (num: number): string => { if (num === 0) return "Zero naira"; return "Naira amount"; };
  const ServiceGridItem: React.FC<{icon: React.ReactNode, label: string, onClick?: () => void, glowClass?: string}> = ({ icon, label, onClick, glowClass }) => (<button onClick={onClick} className="flex flex-col items-center gap-2 group"><div className={`w-16 h-16 bg-[#111F35] rounded-[20px] flex items-center justify-center text-white/80 transition-all transform group-active:scale-90 border border-white/5 ${glowClass || ''}`}>{icon}</div><span className="text-[11px] font-bold text-white/70 tracking-tight">{label}</span></button>);
  const RewardCard: React.FC<{icon: React.ReactNode, title: string, amount: number, showValue?: boolean}> = ({ icon, title, amount, showValue = true }) => (<div className="flex-1 bg-[#111F35] rounded-[24px] p-4 border border-white/5 flex flex-col gap-2.5"><div className="w-9 h-9 bg-[#1D2B44] rounded-xl flex items-center justify-center">{icon}</div><div><p className="text-[10px] font-bold text-white/40 tracking-tight mb-0.5">{title}</p><p className={`text-[13px] font-bold text-white tracking-tight transition-opacity duration-1000 ${showValue ? 'opacity-100' : 'opacity-0'}`}>₦{amount.toFixed(2)}</p></div></div>);
  
  const renderHome = () => { if (!ProtectionModule.checkAccess(isAuthenticated, "MainInterface")) return null; return (<div className="flex flex-col min-h-screen bg-[#050C1F] pb-24 animate-fade-in"><div className="px-4 pt-4 pb-2"><div className="flex items-center justify-between mb-4 px-1"><button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-[#111F35] flex items-center justify-center overflow-hidden border border-white/10">{profileImage ? <img src={profileImage} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-[#FBC02D]">{userName.split(' ').map(n=>n[0]).join('').substring(0,2)}</span>}</div><span className="text-xs font-bold text-white/80">Hi, {userName.split(' ')[0]}</span></button><button className="relative p-1"><div className="w-2 h-2 bg-red-500 rounded-full absolute top-0 right-0 border-2 border-[#050C1F]"></div><HistoryIcon className="w-5 h-5 text-white/60" /></button></div><div className="bg-[#0A1D36] rounded-[32px] p-5 shadow-2xl border border-white/5 relative overflow-hidden"><div className={`flex items-center gap-2 mb-3 transition-opacity duration-1000 ${showDashboardSubtext ? 'opacity-100' : 'opacity-0'}`}><span className="text-[11px] font-medium text-white/80">{MOCK_ACCOUNT.accountNumber} | {userName}</span><button onClick={() => navigator.clipboard.writeText(MOCK_ACCOUNT.accountNumber)} className="text-white/40 hover:text-white transition-colors"><CopyIcon className="w-3.5 h-3.5" /></button></div><div className="flex items-center gap-3 mb-0.5"><h2 className="text-[26px] font-bold tracking-tight">₦{showBalance ? animatedBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '****.**'}</h2><button onClick={() => setShowBalance(!showBalance)} className="text-white/40 hover:text-white transition-colors">{showBalance ? <EyeOffIcon className="w-4.5 h-4.5" /> : <EyeIcon className="w-4.5 h-4.5" />}</button></div><p className={`text-[9px] font-medium text-white/20 mb-4 transition-opacity duration-1000 ${showDashboardSubtext ? 'opacity-100' : 'opacity-0'}`}>Last updated just now</p><div className="flex gap-3"><button onClick={() => setIsAddMoneyOpen(true)} className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-3 rounded-full transition-all border border-white/5 active:scale-95 glow-blue-sub"><PlusIcon className="w-4 h-4 text-[#5EB5FB]" /><span className="text-[12px] font-bold">Add Money</span></button><button className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 px-4 py-3 rounded-full transition-all border border-white/5 active:scale-95 glow-yellow-sub"><HistoryIcon className="w-4 h-4 text-[#FBC02D]" /><span className="text-[12px] font-bold">History</span></button></div></div></div><div className="px-4 mb-8"><div className="flex justify-between items-center mb-4 px-1"><h3 className="text-[13px] font-bold text-white/40 uppercase tracking-widest">Services</h3><button className="text-[12px] font-bold text-[#FBC02D] glow-yellow-sub rounded-md px-1">Edit</button></div><div className="grid grid-cols-4 gap-y-6"><ServiceGridItem icon={<TransferIcon className="w-6 h-6 text-[#5EB5FB]" />} label="Transfer" onClick={() => setActiveTab(AppTab.TRANSFER)} glowClass="glow-blue-sub" /><ServiceGridItem icon={<PhoneIcon className="w-6 h-6 text-[#FBC02D]" />} label="Airtime" glowClass="glow-yellow-sub" /><ServiceGridItem icon={<SmartphoneIcon className="w-6 h-6 text-[#5EB5FB]" />} label="Data" glowClass="glow-blue-sub" /><ServiceGridItem icon={<BettingIcon className="w-6 h-6 text-[#FBC02D]" />} label="Betting" glowClass="glow-yellow-sub" /><ServiceGridItem icon={<SavingsIcon className="w-6 h-6 text-[#00D775]" />} label="Savings" glowClass="glow-green-sub" /><ServiceGridItem icon={<EducationIcon className="w-6 h-6 text-[#5EB5FB]" />} label="Education" glowClass="glow-blue-sub" /><ServiceGridItem icon={<StatementIcon className="w-6 h-6 text-white/60" />} label="Statement" glowClass="glow-white-sub" /><ServiceGridItem icon={<GridIcon className="w-6 h-6 text-white/40" />} label="Numbers" onClick={() => setActiveTab(AppTab.SERVICES)} glowClass="glow-white-sub" /></div></div><div className="px-4 mb-8"><h3 className="text-[13px] font-bold text-white/40 uppercase tracking-widest mb-4 px-1">Rewards</h3><div className="flex gap-4"><RewardCard icon={<div className="flex gap-0.5"><div className="w-2 h-2 rounded-full bg-yellow-400"></div><div className="w-2 h-2 rounded-full bg-yellow-600"></div></div>} title="Cashback" amount={MOCK_ACCOUNT.cashback} showValue={showDashboardSubtext}/><RewardCard icon={<span className="text-xl">📢</span>} title="Referrals" amount={MOCK_ACCOUNT.referrals} showValue={showDashboardSubtext}/></div></div><div className="px-4"><div className="flex items-center justify-between mb-4 px-1"><h3 className="text-[13px] font-bold text-white/40 uppercase tracking-widest">Recent transactions</h3><button className="text-[12px] font-bold text-[#FBC02D]">View All</button></div><div className="space-y-3">{transactions.map((tx) => (<div key={tx.id} className="bg-[#111F35]/30 rounded-2xl p-4 flex items-center justify-between border border-white/5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#111F35] flex items-center justify-center text-white/40 border border-white/5"><ArrowDownIcon className={`w-5 h-5 ${tx.type === 'incoming' ? 'rotate-180 text-[#00D775]' : 'text-red-500'}`} /></div><div><h4 className="text-[13px] font-bold tracking-tight text-white/90">{tx.title}</h4><p className="text-[10px] font-medium text-white/30 uppercase tracking-tighter mt-0.5">{tx.details}</p></div></div><div className="text-right"><p className={`text-[14px] font-bold tracking-tight ${tx.type === 'incoming' ? 'text-[#00D775]' : 'text-white'}`}>{tx.type === 'incoming' ? '+' : '-'}₦{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div></div>))}</div></div></div>); };
  
  const renderValidatingScreen = () => (<div className="fixed inset-0 z-[3000] bg-[#050C1F] flex flex-col items-center justify-center animate-fade-in"><div className="relative mb-8"><div className="w-24 h-24 border-4 border-white/5 rounded-full flex items-center justify-center"><div className="w-20 h-20 border-4 border-t-[#FBC02D] border-r-transparent border-b-[#5EB5FB] border-l-transparent rounded-full animate-spin"></div></div><div className="absolute inset-0 flex items-center justify-center"><div className="w-3 h-3 bg-[#00D775] rounded-full animate-neon-pulse-bounce"></div></div></div><h2 className="text-[18px] font-black tracking-[0.2em] text-white animate-neon-glow uppercase">Validating</h2></div>);
  
  const renderCardPage = () => {
    const myActiveCards = currentUser?.virtualCards?.filter(c => c.status === 'active') || [];
    return (
      <div className="flex flex-col h-screen bg-[#050C1F] animate-fade-in overflow-hidden relative">
        <div className="px-6 pt-10 pb-4 shrink-0">
          <h2 className="text-2xl font-black tracking-tight uppercase">Virtual Cards</h2>
          <p className="text-white/40 text-[10px] font-black tracking-widest mt-1 uppercase">Select a Premium Identity</p>
        </div>

        <div className="flex-grow overflow-y-auto px-6 space-y-12 pb-40 scrollbar-hide">
          {VIRTUAL_CARDS_OFFERED.map(catalogCard => {
            const isOwned = myActiveCards.some(c => c.label === catalogCard.label);
            const ownedCard = myActiveCards.find(c => c.label === catalogCard.label);
            const theme = CARD_BRAND_THEMES[catalogCard.theme] || CARD_BRAND_THEMES['purple_visa'];
            const isHovered = lockedHoverCardId === catalogCard.id;

            return (
              <div key={catalogCard.id} className="space-y-6 bg-[#0A162B]/30 p-6 rounded-[32px] border border-white/5">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-[11px] font-black text-[#5EB5FB] uppercase tracking-[0.2em]">{catalogCard.label}</h3>
                  {isOwned && <span className="bg-[#00D775] text-black text-[7px] font-black px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                
                <div className="space-y-4">
                  <RealisticCard card={ownedCard || {...catalogCard, status: 'pending'}} fullName={userName} side="front" isBlurred={!isOwned && isHovered} isShaking={!isOwned && isHovered} />
                  <RealisticCard card={ownedCard || {...catalogCard, status: 'pending'}} fullName={userName} side="back" isBlurred={!isOwned && isHovered} isShaking={!isOwned && isHovered} />
                </div>

                {!isOwned ? (
                  <div className="pt-2 flex flex-col items-center gap-4 relative">
                    <p className="text-sm font-black text-white/90">Price: <span className="text-[#FBC02D]">{catalogCard.priceUSD} ({catalogCard.price})</span> / Month</p>
                    
                    <div className="w-full relative">
                      {showLockedTooltip === catalogCard.id && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-2 bg-black/90 border border-white/10 rounded-xl text-[10px] text-white font-medium text-center min-w-[200px] shadow-2xl animate-fade-in z-[50]">
                          Card details are secure and will be revealed after purchase & admin approval.
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/90"></div>
                        </div>
                      )}
                      <button 
                        onMouseEnter={() => { setLockedHoverCardId(catalogCard.id); setShowLockedTooltip(catalogCard.id); }}
                        onMouseLeave={() => { setLockedHoverCardId(null); setShowLockedTooltip(null); }}
                        onTouchStart={() => { setLockedHoverCardId(catalogCard.id); setShowLockedTooltip(catalogCard.id); }}
                        className={`w-full py-4 mb-2 bg-[#111F35] text-white font-black text-[11px] tracking-widest uppercase rounded-2xl border transition-all duration-300 ${isHovered ? theme.glow + ' scale-[1.02]' : 'border-white/5'}`}
                      >
                        See Card Details (Locked)
                      </button>
                    </div>

                    <button 
                      onClick={() => setPurchaseChatProps({ 
                        initialMsg: "I WANT TO PURCHASE THIS CARD", 
                        purchaseType: 'card',
                        purchaseContext: { item: catalogCard.label, price: catalogCard.price, theme: catalogCard.theme }
                      })} 
                      className="w-full py-4 bg-white text-black font-black text-[11px] tracking-[0.3em] uppercase rounded-2xl active:scale-95 transition-all shadow-xl"
                    >Buy Now</button>
                  </div>
                ) : (
                  <div className="pt-2 text-center">
                    <p className="text-[10px] font-bold text-[#00D775] uppercase tracking-widest">Card successfully issued to {userName}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderServicesPage = () => {
    const getAvailability = (countryName: string) => {
        const hash = countryName.split('').reduce((a,b) => (a<<5)-a+b.charCodeAt(0), 0);
        const seed = Math.floor(availabilitySeed / (5 * 60 * 1000));
        const combo = Math.abs((hash + seed) % 100);
        const total = 10;
        const available = (combo % total) + 1;
        return { available, soldOut: total - available };
    };

    const getNumbers = (country: typeof RAW_COUNTRIES[0]) => {
        const { available } = getAvailability(country.name);
        const allUsers = UserStore.getUsers();
        const allPurchased = allUsers.flatMap(u => u.boughtNumbers || []).map(n => n.number);
        
        return Array.from({ length: 10 }).map((_, i) => {
            const isVIP = i % 3 === 0;
            const isSold = i >= available;
            const price = country.name === 'Nigeria' ? (isVIP ? 7500 : 5000) : (isVIP ? 10000 : 10000);
            const numStr = `${country.code} ${Math.floor(800 + i)} ${Math.floor(100 + i)} ${1234 + i}`;
            const isAlreadyBought = allPurchased.includes(numStr);

            return {
                id: `${country.name}_${i}`,
                number: numStr,
                isVIP,
                isSold: isSold || isAlreadyBought,
                price,
                platforms: ['WhatsApp', 'Facebook', 'Instagram', 'TikTok', 'PayPal']
            };
        });
    };

    const filteredCountries = RAW_COUNTRIES.filter(c => {
        const query = phoneSearch.toLowerCase();
        const matchesCountry = c.name.toLowerCase().includes(query) || c.code.includes(query);
        const platforms = ['whatsapp', 'facebook', 'instagram', 'tiktok', 'paypal'];
        const matchesPlatform = platforms.some(p => p.includes(query));
        return matchesCountry || matchesPlatform;
    });

    if (selectedInboxNumber) {
        const msgs = WalletStore.getMessages(currentUserWallet).filter(m => m.purchaseItem === selectedInboxNumber.number);
        const daysLeft = Math.max(0, Math.ceil((selectedInboxNumber.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
        
        const handleSendReply = () => {
            if (!replyInput.trim()) return;
            WalletStore.sendMessage(currentUserWallet, replyInput, 'text', undefined, undefined, 'number', { 
                item: selectedInboxNumber.number, 
                plan: selectedInboxNumber.plan, 
                price: 0, 
                country: selectedInboxNumber.country, 
                flag: selectedInboxNumber.countryFlag,
                platforms: selectedInboxNumber.platforms || []
            });
            setReplyInput("");
        };

        return (
            <div className="flex flex-col h-screen bg-[#050C1F] animate-fade-in overflow-hidden relative">
                <header className="px-6 py-10 bg-[#0A162B] border-b border-white/5 flex items-center justify-between shrink-0">
                    <button onClick={() => setSelectedInboxNumber(null)} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors"><ArrowLeftIcon className="w-6 h-6" /></button>
                    <div className="text-center">
                        <div className="flex items-center gap-2 justify-center mb-1">
                            <span className="text-sm font-black text-white">{selectedInboxNumber.number}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${selectedInboxNumber.plan === 'VIP' ? 'bg-[#FBC02D] text-black shadow-[0_0_10px_#FBC02D]' : 'bg-[#00D775] text-black'}`}>{selectedInboxNumber.plan}</span>
                        </div>
                        <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.2em]">{daysLeft} Days Remaining</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-hide bg-[#050C1F]">
                    {msgs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                            <ChatBubbleIcon className="w-16 h-16 mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.3em]">No incoming messages</p>
                        </div>
                    ) : (
                        msgs.map(m => (
                            <div key={m.id} className={`flex ${m.from === 'admin' || m.from === 'system' ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-[85%] p-4 rounded-[24px] ${m.from === 'admin' || m.from === 'system' ? 'bg-[#1E293B]/50 border border-white/10' : 'bg-[#5EB5FB] text-black font-medium'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                                    <p className={`text-[8px] mt-2 opacity-40 uppercase tracking-tighter text-right`}>{new Date(m.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-[#0A162B] border-t border-white/5 pb-10">
                    <div className="flex items-center gap-3 bg-[#050C1F] border border-white/10 rounded-full p-2 pl-6">
                        <input 
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                            className="flex-grow bg-transparent text-sm outline-none text-white py-2" 
                            placeholder="Reply to admin..." 
                        />
                        <button onClick={handleSendReply} className="bg-[#5EB5FB] text-black p-3 rounded-full active:scale-95 transition-transform"><TransferIcon className="w-5 h-5 rotate-90" /></button>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedCountry) {
        const numbers = getNumbers(selectedCountry);
        return (
            <div className="flex flex-col h-screen bg-[#050C1F] animate-fade-in overflow-hidden relative">
                <header className="px-6 py-10 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0A162B]">
                    <button onClick={() => setSelectedCountry(null)} className="p-2 -ml-2 text-white/40 hover:text-white transition-colors"><ArrowLeftIcon className="w-6 h-6" /></button>
                    <div className="text-center"><h3 className="text-sm font-black uppercase tracking-widest text-[#FBC02D]">{selectedCountry.name} NUMBERS</h3><p className="text-[10px] text-white/30 font-bold mt-1 uppercase tracking-widest">Select an identity</p></div>
                    <div className="w-8"></div>
                </header>

                <div className="flex-grow overflow-y-auto p-6 scrollbar-hide">
                    <div className="bg-[#0F172A] border border-[#5EB5FB]/30 rounded-[32px] p-6 shadow-[0_0_30px_rgba(94,181,251,0.1)] space-y-4">
                        {numbers.map(n => (
                            <div key={n.id} className={`p-4 rounded-2xl border transition-all ${n.isSold ? 'opacity-30 grayscale border-white/5' : n.isVIP ? 'border-[#FBC02D]/40 bg-[#FBC02D]/5 shadow-[0_0_15px_#FBC02D22]' : 'border-white/10 bg-white/[0.02]'} flex justify-between items-center group`}>
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-black text-white">{n.number}</p>
                                        {n.isVIP && <span className="bg-[#FBC02D] text-black text-[7px] font-black px-1.5 py-0.5 rounded-full shadow-[0_0_8px_#FBC02D] animate-pulse">VIP</span>}
                                        {n.isSold && <span className="bg-red-500/20 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded-md">❌ SOLD</span>}
                                    </div>
                                    <div className="flex gap-2 flex-wrap items-center">
                                        {n.platforms.map(p => (
                                            <span key={p} className="text-[8px] font-black text-white/30 uppercase border border-white/5 px-1.5 py-0.5 rounded-md">{p}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-white mb-2">₦{n.price.toLocaleString()}</p>
                                    {!n.isSold && (
                                        <button 
                                            onClick={() => setPurchaseChatProps({ 
                                                initialMsg: `I WANT TO PURCHASE A PHONE NUMBER`, 
                                                purchaseType: 'number',
                                                purchaseContext: { item: n.number, plan: n.isVIP ? 'VIP' : 'REGULAR', price: n.price, country: selectedCountry.name, flag: selectedCountry.flag, platforms: n.platforms }
                                            })} 
                                            className="bg-[#5EB5FB] hover:bg-[#5EB5FB]/90 text-black text-[9px] font-black uppercase px-4 py-2 rounded-xl transition-all active:scale-95 shadow-lg"
                                        >Buy Now</button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
      <div className="flex flex-col h-screen bg-[#050C1F] animate-fade-in overflow-hidden relative">
        <header className="px-6 py-10 border-b border-white/5 flex items-center justify-between shrink-0">
          <div><h2 className="text-2xl font-black tracking-tight uppercase leading-none">SERVICES</h2><p className="text-[#5EB5FB] text-[10px] font-black uppercase mt-1.5 tracking-widest">PHONE NUMBERS</p></div>
          <button onClick={() => setAvailabilitySeed(Date.now())} className="p-2 bg-white/5 rounded-full text-[#5EB5FB] active:animate-spin"><HistoryIcon className="w-5 h-5" /></button>
        </header>

        <div className="px-6 pt-2 pb-6 space-y-6">
            {(currentUser?.boughtNumbers?.length || 0) > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] px-1">My Active Numbers</h3>
                    <div className="grid grid-cols-1 gap-3">
                        {currentUser?.boughtNumbers?.map(num => {
                            const daysLeft = Math.max(0, Math.ceil((num.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
                            return (
                                <button key={num.id} onClick={() => setSelectedInboxNumber(num)} className="w-full bg-[#111F35] border border-white/10 rounded-2xl p-4 flex justify-between items-center active:scale-[0.98] transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${num.plan === 'VIP' ? 'bg-[#FBC02D]/10 text-[#FBC02D] border border-[#FBC02D]/20 shadow-[0_0_15px_#FBC02D11]' : 'bg-[#00D775]/10 text-[#00D775] border border-[#00D775]/20'}`}>
                                            <span className="text-lg">{num.countryFlag}</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[13px] font-black text-white tracking-tight">{num.number}</p>
                                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{daysLeft}D LEFT • {num.plan}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-[#00D775] rounded-full animate-pulse"></div>
                                            <ChevronRightIcon className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="relative">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)} placeholder="Filter country, code or platform..." className="w-full bg-[#111F35] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs text-white outline-none focus:border-[#5EB5FB]/40 transition-all font-bold" />
            </div>
        </div>

        <div className="flex-grow overflow-y-auto px-6 space-y-4 pb-32 scrollbar-hide">
          {filteredCountries.map(country => {
            const { available, soldOut } = getAvailability(country.name);
            return (
              <button key={country.name} onClick={() => setSelectedCountry(country)} className="w-full p-5 rounded-[28px] bg-[#0D0E14] border border-white/5 active:scale-[0.98] transition-all flex justify-between items-center group hover:bg-white/[0.02]">
                <div className="flex items-center gap-5">
                   <span className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform">{country.flag}</span>
                   <div className="text-left">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">{country.name}</h4>
                      <p className="text-[10px] text-white/30 font-bold mt-1 tracking-widest">{country.code}</p>
                   </div>
                </div>
                <div className="text-right">
                   <div className="flex items-center gap-2 justify-end mb-2">
                        <span className="text-[10px] font-black text-[#5EB5FB]">₦{country.name === 'Nigeria' ? '5,000' : '10,000'}+</span>
                        <ChevronRightIcon className="w-4 h-4 text-white/20" />
                   </div>
                   <p className="text-[8px] font-black uppercase tracking-tighter">
                       <span className="text-[#00D775]">{available} Available</span>
                       <span className="mx-1 text-white/10">•</span>
                       <span className="text-red-500/50">{soldOut} Sold</span>
                   </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderReceipt = () => {
    const amountVal = parseFloat(transferAmount || "35000"); const today = new Date(); const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }; const dateStr = today.toLocaleDateString('en-US', dateOptions); const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return (
      <div className="fixed inset-0 z-[1500] bg-[#0066F5] flex flex-col items-center overflow-y-auto scrollbar-hide"><div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20"><svg className="absolute -top-20 -left-20 w-[400px] h-[400px]" viewBox="0 0 200 200"><path d="M0,100 C50,0 150,0 200,100" stroke="#FBC02D" strokeWidth="8" fill="none" transform="rotate(-45 100 100)" /><path d="M0,100 C50,200 150,200 200,100" stroke="#FBC02D" strokeWidth="8" fill="none" transform="rotate(25 100 100)" /></svg></div><div className="w-full max-w-md px-6 py-10 flex flex-col items-center shrink-0 relative z-10"><div className="flex items-center gap-2 mb-8"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg"><span className="text-[#0066F5] font-black text-2xl">M</span></div><div className="flex flex-col"><h1 className="text-white font-black text-2xl leading-none tracking-tighter">Moniepoint</h1><p className="text-white/60 text-[8px] font-bold tracking-widest uppercase mt-0.5">Microfinance Bank</p></div></div><div className="w-full bg-white rounded-t-[32px] pt-8 pb-1 flex flex-col relative shadow-2xl"><div className="absolute top-6 right-6"><div className="w-8 h-8 bg-[#0066F5] rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">M</span></div></div><div className="px-8 mb-4"><span className="inline-block bg-[#E6F0FF] text-[#0066F5] text-[10px] font-black px-2.5 py-1 rounded-md mb-3 tracking-widest">DEBIT</span><h2 className="text-[36px] font-black text-[#050C1F] leading-none mb-1">₦{amountVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2></div><div className="bg-[#F8FAFF] mx-4 rounded-[24px] p-6 space-y-6"><div><p className="text-[11px] font-medium text-gray-400 mb-2">Transaction Type</p><span className="bg-[#E6F0FF] text-[#0066F5] text-[11px] font-black px-4 py-1.5 rounded-md tracking-wider">TRANSFER</span></div><div><p className="text-[11px] font-medium text-gray-400 mb-2">Transaction Status</p><span className="bg-[#E6F9F0] text-[#00D775] text-[11px] font-black px-4 py-1.5 rounded-md tracking-wider">Successful</span></div><div className="w-full h-px bg-gray-100"></div><div><p className="text-[11px] font-medium text-gray-400 mb-1">Beneficiary</p><p className="text-[13px] font-bold text-gray-900 uppercase">{verifiedAccountName || 'DANIEL SAM'} | {receiverAccount}</p></div><div><p className="text-[11px] font-medium text-gray-400 mb-2">Beneficiary Institution</p><p className="text-[13px] font-bold text-gray-900 uppercase">{selectedBank?.name}</p></div><div><p className="text-[11px] font-medium text-gray-400 mb-1">Sender Name</p><p className="text-[13px] font-bold text-gray-900 uppercase">{userName}</p></div><div><p className="text-[11px] font-medium text-gray-400 mb-1">Source Institution</p><p className="text-[13px] font-bold text-gray-900 uppercase tracking-widest">MONIEPOINT</p></div><div><p className="text-[11px] font-medium text-gray-400 mb-1">Transaction Date</p><p className="text-[13px] font-bold text-gray-900">{dateStr} | {timeStr}</p></div></div><div className="w-full relative -bottom-2 h-10 overflow-hidden shrink-0 mt-4"><svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0,0 L0,10 L5,15 L10,10 L15,15 L20,10 L25,15 L30,10 L35,15 L40,10 L45,15 L50,10 L55,15 L60,10 L65,15 L70,10 L75,15 L80,10 L85,15 L90,10 L95,15 L100,10 L100,0 Z" fill="white" /></svg></div></div><div className="w-full max-w-md px-4 mt-8 space-y-4 relative z-10 mb-20"><button onClick={() => { setActiveTab(AppTab.HOME); setTransferStep('recipient'); setTransferAmount(""); }} className="w-full py-4 rounded-xl bg-white text-[#0066F5] font-black text-sm tracking-widest uppercase shadow-xl">Share Receipt</button><button onClick={() => { setActiveTab(AppTab.HOME); setTransferStep('recipient'); setTransferAmount(""); }} className="w-full py-2 text-white/60 font-bold text-sm">Done</button></div></div></div>
    );
  };
  const renderTransfer = () => { if (!ProtectionModule.checkAccess(isAuthenticated, "TransferPage")) return null; if (transferStep === 'receipt') return renderReceipt(); if (isValidating) return renderValidatingScreen(); if (transferStep === 'amount') return renderAddAmount(); if (transferStep === 'summary') return renderSummary(); const filteredBanks = NIGERIAN_BANKS.filter(bank => bank.name.toLowerCase().includes(bankSearchQuery.toLowerCase())); const isContinueEnabled = receiverAccount.length === 10 && selectedBank !== null && verifiedAccountName.length > 0; return (<div className="flex flex-col h-screen bg-[#050C1F] overflow-hidden animate-fade-in"><div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-[#050C1F] shrink-0"><button onClick={() => { setActiveTab(AppTab.HOME); setReceiverAccount(""); setSelectedBank(null); }} className="p-1 -ml-1"><ArrowLeftIcon className="w-5 h-5" /></button><h2 className="text-[13px] font-bold tracking-tight">Start your transfer</h2><div className="flex items-center gap-3"><HistoryIcon className="w-5 h-5 opacity-60" /><MoreVerticalIcon className="w-5 h-5 opacity-60" /></div></div><div className="bg-[#11152B] py-2 px-4 flex items-center justify-center gap-2 shrink-0"><span className="text-[10px]">🎉</span><p className="text-[#9D95FF] text-[9px] font-bold text-center tracking-tight">Moniepoint transfers are free & instant</p></div><div className="flex-grow overflow-y-auto px-4 py-4 space-y-4 pb-48 scrollbar-hide"><div className="space-y-1.5"><p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter px-1">Receiver's account number</p><div className={`bg-[#111F35] rounded-xl p-3 border transition-all ${receiverAccount.length > 0 ? 'border-[#FBC02D]/40' : 'border-white/5'}`}><div className="flex items-center px-2"><input type="text" value={receiverAccount} onChange={(e) => { const val = e.target.value.replace(/[^0-9]/g, ''); if (val.length <= 10) setReceiverAccount(val); }} className="bg-transparent text-[16px] font-bold text-white w-full outline-none" autoFocus />{receiverAccount.length > 0 && <button onClick={() => { setReceiverAccount(""); setVerifiedAccountName(""); setSelectedBank(null); }} className="ml-1 opacity-60"><CloseCircleIcon className="w-5 h-5" /></button></div></div></div>{isVerifying && !verifiedAccountName && <VerifyingAccountWidget verifyAccount={verifyAccountApi} onComplete={(name) => setVerifiedAccountName(name)} onError={() => {}} />}{verifiedAccountName && (<div className="bg-[#111F35] p-3 rounded-xl border border-white/5 flex items-center gap-3 animate-fade-in shadow-lg"><div className="relative"><div className="w-10 h-10 bg-[#1D2B44] rounded-full flex items-center justify-center font-bold text-white/30 text-[11px]">{verifiedAccountName.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>{selectedBank?.name.toLowerCase().includes('opay') && <div className="absolute -bottom-0.5 -right-0.5"><OPayIcon className="w-4 h-4 border border-[#111F35] rounded-full" /></div>}</div><div className="flex-grow min-w-0"><h4 className="font-bold text-[12px] text-white/90 truncate uppercase tracking-tight">{verifiedAccountName}</h4><p className="text-[10px] text-white/30 font-medium truncate">{selectedBank?.name} • {receiverAccount}</p></div></div>)}<div className="space-y-3 pt-1"><p className="text-[10px] text-white/30 font-bold uppercase tracking-tighter px-1">Select a bank</p><div className="bg-[#111F35] flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/5 sticky top-0 z-10 shadow-lg"><SearchIcon className="w-4 h-4 text-white/40" /><input type="text" placeholder="Search bank name..." value={bankSearchQuery} onChange={(e) => setBankSearchQuery(e.target.value)} className="bg-transparent flex-grow text-[11px] outline-none" /></div><div className="bg-[#111F35] rounded-xl border border-white/5 overflow-hidden divide-y divide-white/5">{filteredBanks.map((bank) => (<button key={bank.code} onClick={() => setSelectedBank(bank)} className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${selectedBank?.code === bank.code ? 'bg-[#5EB5FB]/5' : ''}`}><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedBank?.code === bank.code ? 'bg-[#5EB5FB]/20' : 'bg-[#1D2B44]'}`}>{bank.name === "OPay" ? <OPayIcon className="w-4.5 h-4.5" /> : <BankBuildingIcon className={`w-3.5 h-3.5 ${selectedBank?.code === bank.code ? 'text-[#5EB5FB]' : 'text-[#FBC02D]'}`} />}</div><span className={`font-bold text-[11px] text-left truncate max-w-[200px] ${selectedBank?.code === bank.code ? 'text-[#5EB5FB]' : 'text-white/80'}`}>{bank.name}</span></div></button>))}</div></div></div><div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-gradient-to-t from-[#050C1F] via-[#050C1F] to-transparent z-[200]"><button disabled={!isContinueEnabled} onClick={() => setIsConfirmingRecipient(true)} className={`w-full py-4 rounded-xl font-black text-[13px] tracking-widest uppercase transition-all transform active:scale-95 shadow-2xl ${isContinueEnabled ? 'bg-[#5EB5FB] text-[#050C1F]' : 'bg-[#111F35] text-white/10 border border-white/5'}`}>Continue</button></div>{isConfirmingRecipient && (<div className="fixed inset-0 z-[300] flex flex-col justify-end"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsConfirmingRecipient(false)}></div><div className="relative bg-[#0A1A2F] rounded-t-[32px] p-6 pt-12 pb-10 flex flex-col items-center animate-slide-up shadow-2xl border-t border-white/5"><div className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/10 rounded-full"></div><div className="relative mb-6"><div className="w-20 h-20 bg-[#1D2B44] rounded-full flex items-center justify-center font-bold text-white/40 text-[24px]">{verifiedAccountName.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>{selectedBank?.name.toLowerCase().includes('opay') && <div className="absolute bottom-0 right-0 p-1 bg-[#0A1A2F] rounded-full"><div className="bg-[#1D2B44] p-1.5 rounded-full border border-white/10"><OPayIcon className="w-6 h-6" /></div></div>}</div><div className="text-center mb-8 w-full"><p className="text-[12px] text-white/40 font-medium mb-2 tracking-tight">Sending money to</p><h3 className="text-[20px] font-bold text-white mb-1.5 tracking-tight">{verifiedAccountName}</h3><p className="text-[13px] text-white/60 font-medium">{selectedBank?.name} • {receiverAccount}</p></div><div className="w-full h-[1px] bg-white/5 mb-6"></div><div className="w-full flex justify-between items-center px-2 mb-10"><span className="text-[14px] font-medium text-white/70">Add to saved beneficiaries?</span><button onClick={() => setSaveAsBeneficiary(!saveAsBeneficiary)} className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${saveAsBeneficiary ? 'bg-[#5EB5FB]' : 'bg-white/10'}`}><div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 transform ${saveAsBeneficiary ? 'translate-x-6' : 'translate-x-0'}`}></div></button></div><div className="w-full space-y-4"><button onClick={() => { setIsConfirmingRecipient(false); setTransferStep('amount'); }} className="w-full bg-[#FBC02D] text-[#050C1F] py-4 rounded-xl font-bold text-[14px] shadow-lg active:scale-95 transition-transform">Confirm Recipient</button><button onClick={() => setIsConfirmingRecipient(false)} className="w-full text-white/60 py-2 font-bold text-[14px] hover:text-white transition-colors">Cancel</button></div></div></div>)}</div>); };

  const renderAddAmount = () => {
    const isAmountValid = parseInt(transferAmount || "0") >= 100;
    return (
      <div className="flex flex-col h-screen bg-[#050C1F] overflow-hidden animate-fade-in relative"><div className="px-4 py-3 flex items-center justify-between shrink-0"><button onClick={() => setTransferStep('recipient')} className="p-1 -ml-1"><ArrowLeftIcon className="w-5 h-5" /></button><h2 className="text-[13px] font-bold tracking-tight">Add amount</h2><div className="w-8"></div></div><div className="flex justify-center items-center gap-1.5 mt-4 mb-10"><span className="text-[12px] font-medium text-white/60">To</span><div className="flex items-center gap-1.5"><div className="w-5 h-5 bg-[#1D2B44] rounded-full flex items-center justify-center border border-white/5"><OPayIcon className="w-3 h-3" /></div><span className="text-[13px] font-bold tracking-tight">{verifiedAccountName}</span></div></div><div className="flex flex-col items-center mb-6 px-6"><div className="flex items-center justify-center"><span className="text-[28px] font-bold text-white mr-0 mt-1">₦</span><div className="flex items-center"><input type="text" inputMode="numeric" value={transferAmount} onChange={handleAmountChange} className="bg-transparent text-[36px] font-bold text-white outline-none w-auto max-w-[180px] text-center" autoFocus /><div className="w-[1.5px] h-8 bg-[#FBC02D] animate-pulse"></div></div></div><p className={`text-[10px] font-medium mt-2 tracking-tight transition-colors ${insufficientFundsError ? 'text-red-500 font-bold' : 'text-white/40'}`}>{insufficientFundsError ? 'Insufficient funds' : 'Enter an amount above ₦100'}</p></div><div className="px-6 mb-8"><div className="bg-[#111F35]/40 rounded-full py-2 px-4 flex items-center justify-between border border-white/5 active:bg-[#152B47] transition-colors cursor-pointer w-fit mx-auto"><div className="flex items-center gap-2"><span className="text-white/30"><InfoIcon className="w-3.5 h-3.5" /></span><p className="text-[11px] font-medium text-white/40 tracking-tight">Daily limit left to spend: <span className="text-white/80 font-bold">₦500,000</span></p></div><span className="text-white/20 ml-2"><ChevronRightIcon className="w-3 h-3" /></span></div></div><div className="px-6"><p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">Paying from</p><div className="bg-[#0C1529] rounded-[12px] p-3 flex items-center gap-3 border border-white/5 shadow-lg"><div className="w-9 h-9 bg-[#1E2533] rounded-lg flex items-center justify-center text-[11px] font-bold text-[#FBC02D]">{userName.split(' ').map(n => n[0]).join('').substring(0, 2)}</div><div className="flex-grow min-w-0"><div className="flex items-center gap-1 mb-0.5 text-white/40"><span className="text-[11px] font-bold text-white/80 truncate">{userName}</span><span className="w-0.5 h-0.5 bg-white/40 rounded-full"></span><span className="text-[11px] font-medium">{MOCK_ACCOUNT.accountNumber}</span></div><p className="text-[14px] font-bold tracking-tight text-white/90">₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div></div></div><div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-6 pb-6"><button disabled={!isAmountValid} onClick={startValidation} className={`w-full py-3.5 rounded-xl font-bold text-[14px] transition-all transform active:scale-95 ${isAmountValid ? 'bg-[#1E293B] text-[#FBC02D]' : 'bg-[#111F35] text-[#333E4D] cursor-not-allowed'}`}>Continue</button></div></div>
    );
  };
  const renderSummary = () => {
    const amountVal = parseFloat(transferAmount || "0"); const feeVal = 20.00; const totalVal = amountVal + feeVal;
    return (
      <div className="flex flex-col h-screen bg-[#050C1F] overflow-hidden animate-fade-in relative"><div className="px-4 py-3 flex items-center justify-between shrink-0"><button onClick={() => setTransferStep('amount')} className="p-1 -ml-1 text-white/80"><ArrowLeftIcon className="w-5 h-5" /></button><h2 className="text-[14px] font-bold tracking-tight text-white">Confirm payment</h2><button onClick={() => setActiveTab(AppTab.HOME)} className="p-1 -mr-1 text-white/80"><XIcon className="w-5 h-5" /></button></div><div className="flex-grow overflow-y-auto px-4 pb-24 pt-4 scrollbar-hide"><div className="flex flex-col items-center mt-4 mb-10 px-6"><h3 className="text-[36px] font-bold text-white tracking-tight leading-none mb-3">₦{amountVal.toLocaleString()}</h3><p className="text-[12px] font-medium text-white/60 lowercase first-letter:uppercase tracking-tight">{numberToWords(amountVal)}</p></div><div className="bg-[#0A162B] rounded-[24px] p-5 mb-6 border border-white/5 space-y-6"><div className="bg-[#050C1F] rounded-2xl p-4 flex flex-col gap-3 border border-white/5"><p className="text-[11px] font-bold text-white tracking-tight">To {verifiedAccountName}</p><div className="flex items-center gap-2"><div className="w-6 h-6 bg-[#00D775]/20 rounded-full flex items-center justify-center"><OPayIcon className="w-4 h-4" /></div><div className="flex items-center gap-1.5"><span className="text-[11px] font-medium text-white/50">{selectedBank?.name}</span><span className="w-1 h-1 bg-white/30 rounded-full"></span><span className="text-[11px] font-medium text-white/50">{receiverAccount}</span></div></div></div><div className="space-y-4 px-1"><div className="flex justify-between items-center"><p className="text-[12px] font-medium text-white/40">Recipient gets</p><p className="text-[12px] font-bold text-white/90 tracking-tight">₦{amountVal.toLocaleString()}</p></div><div className="flex justify-between items-center"><p className="text-[12px] font-medium text-white/40">Fee</p><p className="text-[12px] font-bold text-white/90 tracking-tight">₦{feeVal.toFixed(0)}</p></div><div className="pt-4 border-t border-white/5 flex justify-between items-center"><p className="text-[12px] font-bold text-white">Total debit</p><p className="text-[14px] font-bold text-white tracking-tight">₦{totalVal.toLocaleString()}</p></div></div></div><div className="mb-6"><p className="text-[11px] font-bold text-white/30 mb-3 px-1">Paying from</p><div className="bg-[#0A162B] rounded-[24px] p-5 flex items-center gap-4 border border-white/5"><div className="w-12 h-12 bg-[#FBC02D]/10 rounded-2xl flex items-center justify-center text-[12px] font-black text-[#FBC02D] border border-[#FBC02D]/20 shadow-inner">{userName.split(' ').map(n => n[0]).join('').substring(0, 2)}</div><div className="flex-grow min-w-0"><div className="flex items-center gap-1 mb-0.5 text-white/40"><span className="text-[11px] font-bold text-white/80 truncate">{userName}</span><span className="w-0.5 h-0.5 bg-white/40 rounded-full"></span><span className="text-[11px] font-medium">{MOCK_ACCOUNT.accountNumber}</span></div><p className="text-[11px] font-bold text-white/40 tracking-tight">₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div></div></div><div className="bg-[#0A162B] rounded-[24px] p-5 border border-white/5 space-y-6 mb-10"><div className="bg-[#050C1F] rounded-2xl p-4 border border-white/5"><textarea value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Narration (optional)" className="bg-transparent text-[13px] text-white/90 w-full outline-none resize-none h-16 placeholder:text-white/20 font-medium" /></div><div className="flex items-center justify-between px-1"><span className="text-[13px] font-medium text-white/80">Make this a recurring payment</span><button onClick={() => setIsRecurring(!isRecurring)} className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-white/10 ${isRecurring ? 'bg-white' : 'bg-white/10'}`}><div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full transition-all duration-300 transform ${isRecurring ? 'translate-x-5.5 bg-[#050C1F]' : 'translate-x-0.5 bg-white'}`}></div></button></div></div></div><div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-8 pt-4 bg-gradient-to-t from-[#050C1F] via-[#050C1F] to-transparent z-[100]"><button onClick={handlePaymentConfirm} className="w-full py-4 rounded-xl bg-[#FBC02D] text-[#050C1F] font-bold text-[15px] transition-all transform active:scale-[0.98] shadow-2xl shadow-[#FBC02D]/10">Pay</button></div></div>
    );
  };

  if (!isAuthenticated) return (<div className="max-w-md mx-auto min-h-screen bg-[#050C1F] text-white relative antialiased font-sans"><AuthScreens onLoginSuccess={handleLoginSuccess} /></div>);
  if (isAdmin) return <AdminPanel onLogout={handleLogout} />;
  
  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#050C1F] text-white relative flex flex-col antialiased font-sans">
      <main className="flex-grow overflow-x-hidden">
        {activeTab === AppTab.HOME && renderHome()}
        {activeTab === AppTab.CARD && renderCardPage()}
        {activeTab === AppTab.TRANSFER && renderTransfer()}
        {activeTab === AppTab.SERVICES && renderServicesPage()}
        {activeTab === AppTab.REWARDS && <div className="p-8 text-center text-white/30 pt-20 animate-fade-in">Rewards Section coming soon...</div>}
      </main>
      
      {pinMode !== 'inactive' && (
        <PinOverlay 
          headerLabel={pinMode === 'verify' ? "Authorize Payment" : "Security Settings"}
          title={pinMode === 'setup' ? 'Create Pin' : pinMode === 'confirm' ? 'Confirm Pin' : pinMode === 'verify' ? 'Enter Transaction Pin' : pinMode === 'change_old' ? 'Old Pin' : pinMode === 'change_new' ? 'New Pin' : 'Confirm Pin'}
          subtitle={pinMode === 'verify' ? "To complete this transaction, enter your transaction PIN" : "Protect your account with a 4-digit code"}
          error={pinError} onComplete={handlePinComplete} onCancel={() => { setPinMode('inactive'); setPinError(""); }}
          isBiometricOption={pinMode === 'verify' && currentUser?.isBiometricEnabled}
          onBiometric={() => { handlePinComplete("0000"); alert("Biometric Authorized"); }}
        />
      )}

      {isValidating && renderValidatingScreen()}
      {purchaseChatProps && <WalletChatFlow userId={currentUserWallet} onClose={() => setPurchaseChatProps(null)} initialMsg={purchaseChatProps.initialMsg} purchaseType={purchaseChatProps.purchaseType} purchaseContext={purchaseChatProps.purchaseContext} />}

      <AITextAssistant userId={currentUserWallet} balance={balance} userName={userName} deviceType={navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Terminal'} />
      <UserPopupReceiver userId={currentUserWallet} />
      {isAddMoneyOpen && <AddMoneyFlow userId={currentUserWallet} onClose={() => setIsAddMoneyOpen(false)} />}
      
      {activeTab !== AppTab.TRANSFER && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#050C1F]/90 border-t border-white/5 flex justify-around py-3 px-1 z-[100] backdrop-blur-lg">
          <TabButton active={activeTab === AppTab.HOME} onClick={() => setActiveTab(AppTab.HOME)} icon={<HomeIcon className="w-5 h-5" />} label="Home" />
          <TabButton active={activeTab === AppTab.CARD} onClick={() => setActiveTab(AppTab.CARD)} icon={<CreditCardIcon className="w-5 h-5" />} label="Card" />
          <TabButton active={activeTab === AppTab.SERVICES} onClick={() => setActiveTab(AppTab.SERVICES)} icon={<GridIcon className="w-5 h-5" />} label="Services" />
          <TabButton active={activeTab === AppTab.REWARDS} onClick={() => setActiveTab(AppTab.REWARDS)} icon={<GiftIcon className="w-5 h-5" />} label="Rewards" />
        </nav>
      )}
      
      {isProfileOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)}></div>
          <div className="relative bg-[#050C1F] rounded-t-[32px] p-6 pb-12 animate-slide-up border-t border-white/10 max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/10 rounded-full mb-4"></div>
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold tracking-tight">Profile</h2><button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-bold text-sm bg-red-500/10 px-4 py-2 rounded-full active:scale-95 transition-all"><LogOutIcon className="w-4 h-4" />Logout</button></div>
            <div className="flex flex-col items-center mb-8 relative">
              <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 bg-[#111F35] rounded-full flex items-center justify-center border-4 border-white/5 overflow-hidden relative group active:scale-95 transition-all">{profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-[#FBC02D]">{userName.split(' ').map(n => n[0]).join('').substring(0, 2)}</span>}<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-[10px] font-bold text-white uppercase tracking-widest">Edit</span></div></button>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              <div className="mt-4 flex flex-col items-center gap-1"><div className="flex items-center gap-2"><h3 className="text-lg font-black tracking-tight">{userName}</h3><div className="verified-badge-neon p-0.5 rounded-full"><ShieldCheckIcon className="w-5 h-5 text-[#00D775]" /></div></div><div className="flex items-center gap-2"><span className="w-2 h-2 bg-[#00D775] rounded-full"></span><span className="text-xs font-bold text-[#00D775] tracking-widest uppercase">Account Status: Active</span></div></div>
            </div>
            <div className="mb-10 space-y-4 px-1">
              <h3 className="text-[10px] uppercase font-black text-white/30 tracking-[0.2em] mb-4">Security Settings</h3>
              <button onClick={() => setPinMode(currentUser?.transactionPinHashed ? 'change_old' : 'setup')} className="w-full flex items-center justify-between p-4 bg-[#111F35] border border-white/5 rounded-2xl active:scale-[0.98] transition-all"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-[#1D2B44] rounded-xl flex items-center justify-center"><PinIcon className="w-5 h-5 text-[#FBC02D]" /></div><div className="text-left"><p className="text-[12px] font-bold text-white">{currentUser?.transactionPinHashed ? 'Change Transaction PIN' : 'Create Transaction PIN'}</p><p className="text-[10px] text-white/40 font-medium">4-digit security code for transfers</p></div></div><ChevronRightIcon className="w-4 h-4 text-white/20" /></button>
              <div className="w-full flex items-center justify-between p-4 bg-[#111F35] border border-white/5 rounded-2xl"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-[#1D2B44] rounded-xl flex items-center justify-center"><ShieldCheckIcon className="w-5 h-5 text-[#00D775]" /></div><div className="text-left"><p className="text-[12px] font-bold text-white">Biometric Unlock</p><p className="text-[10px] text-white/40 font-medium">Fingerprint or Face Recognition</p></div></div><button onClick={handleBiometricToggle} className={`w-11 h-6 rounded-full transition-all duration-300 relative border border-white/10 ${currentUser?.isBiometricEnabled ? 'bg-white' : 'bg-white/10'}`}><div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full transition-all duration-300 transform ${currentUser?.isBiometricEnabled ? 'translate-x-5.5 bg-[#050C1F]' : 'translate-x-0.5 bg-white'}`}></div></button></div>
            </div>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] uppercase font-bold text-white/30 px-1 tracking-widest">Full Name</label><input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} className="w-full bg-[#111F35] border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-[#FBC02D] transition-all outline-none font-bold" /></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setIsProfileOpen(false)} className="flex-1 bg-[#111F35] text-white font-bold py-4 rounded-2xl active:scale-95 transition-transform">Cancel</button><button type="submit" className="flex-1 bg-[#5EB5FB] text-[#050C1F] font-bold py-4 rounded-2xl active:scale-95 transition-transform">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .verified-badge-neon { box-shadow: 0 0 8px rgba(0, 215, 117, 0.25); background: rgba(0, 215, 117, 0.05); } 
        .glow-blue-sub { box-shadow: 0 0 10px rgba(94, 181, 251, 0.3); } 
        .glow-yellow-sub { box-shadow: 0 0 10px rgba(251, 192, 45, 0.3); } 
        .glow-green-sub { box-shadow: 0 0 10px rgba(0, 215, 117, 0.3); } 
        .glow-white-sub { box-shadow: 0 0 10px rgba(255, 255, 255, 0.1); } 
        @keyframes neon-pulse-bounce { 0%, 100% { transform: translateY(0) scale(1); background-color: #00D775; box-shadow: 0 0 4px rgba(0, 215, 117, 0.3); } 50% { transform: translateY(-14px) scale(1.3); background-color: #52ffad; box-shadow: 0 0 12px rgba(0, 215, 117, 0.8), 0 0 24px rgba(0, 215, 117, 0.4); } } 
        @keyframes neon-glow { 0%, 100% { text-shadow: 0 0 5px #FBC02D, 0 0 10px #FBC02D, 0 0 20px #5EB5FB; color: #fff; opacity: 1; } 50% { text-shadow: 0 0 2px #FBC02D, 0 0 5px #FBC02D, 0 0 10px #5EB5FB; color: #FBC02D; opacity: 0.7; } } 
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } } 
        @keyframes wiggle { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 50% { transform: translateX(3px); } 75% { transform: translateX(-2px); } }
        .animate-wiggle { animation: wiggle 0.4s ease-in-out infinite; }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; } 
        .animate-neon-glow { animation: neon-glow 1.5s infinite ease-in-out; } 
        .animate-neon-pulse-bounce { animation: neon-pulse-bounce 1s infinite ease-in-out; } 
        .scrollbar-hide::-webkit-scrollbar { display: none; } 
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } 
        .neon-text-glow { text-shadow: 0 0 12px rgba(94, 181, 251, 0.5); }
      `}</style>
    </div>
  );
};

const TabButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string}> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all flex-1 ${active ? 'text-[#FBC02D]' : 'text-white/30'}`}><div className={`transition-transform ${active ? 'scale-110' : ''}`}>{icon}</div><span className="text-[10px] font-bold tracking-tight">{label}</span></button>
);

export default App;