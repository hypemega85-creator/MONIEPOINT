export interface Transaction {
  id: string;
  type: 'incoming' | 'outgoing';
  title: string;
  details: string;
  amount: number;
  date: string;
  timestamp: string;
  status?: 'SUCCESS' | 'FAILED' | 'REVERSED' | 'PENDING';
  bank_reference?: string;
  transaction_id?: string;
  recipient_account?: string;
  recipient_bank?: string;
}

export interface AccountInfo {
  accountNumber: string;
  accountName: string;
  balance: number;
  cashback: number;
  referrals: number;
}

export interface Bank {
  name: string;
  code: string;
}

export enum AppTab {
  HOME = 'home',
  CARD = 'card',
  SERVICES = 'services',
  REWARDS = 'rewards',
  TRANSFER = 'transfer'
}

export type UserStatus = 'active' | 'suspended' | 'disabled';

export interface VirtualCard {
  id: string;
  type: 'Visa' | 'Mastercard';
  currency: 'USD' | 'EUR' | 'NGN';
  number: string;
  expiry: string;
  cvv: string;
  isVIP: boolean;
  isLocked: boolean;
  theme: string;
  status: 'active' | 'pending';
  purchasedAt: number;
  balance: number;
  // Added label property to match usage in App and Admin panels
  label: string;
}

export type NumberPlan = 'REGULAR' | 'VIP';

export interface BoughtNumber {
  id: string;
  country: string;
  countryFlag: string;
  code: string;
  number: string;
  plan: NumberPlan;
  purchasedAt: number;
  expiresAt: number;
  status: 'active' | 'expired';
  platforms?: string[];
}

export interface User {
  user_id: string;
  full_name: string;
  password_hashed: string;
  transactionPinHashed?: string;
  isBiometricEnabled?: boolean;
  pinAttempts?: number;
  pinLockoutUntil?: number;
  wallet_balance: number;
  account_status: UserStatus;
  created_at_date_time: number;
  role: 'user' | 'admin';
  device_info: {
    type: string;
    version: string;
    lastActive: number;
  };
  suspensionUntil?: number;
  notes: string[];
  lastLogin?: number;
  isOnline: boolean;
  virtualCards?: VirtualCard[];
  boughtNumbers?: BoughtNumber[];
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  details: string;
  timestamp: number;
}

export interface AdminMessage {
  id: string;
  recipientId: string | 'all';
  message: string;
  timestamp: number;
  delivered: boolean;
  autoHide?: boolean;
}

export interface WebhookPayload {
  bank_reference: string;
  transaction_id: string;
  status: 'SUCCESS' | 'FAILED' | 'REVERSED';
  credited_amount: number;
  recipient_account: string;
  timestamp: string;
}

export type WalletPlanType = 'REGULAR' | 'PREMIUM' | 'MASTER' | 'LEGEND';

export interface WalletPlan {
  id: WalletPlanType;
  name: string;
  min: number;
  max: number;
  color: string;
}

export interface WalletChatMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  type: 'text' | 'file' | 'system' | 'animation' | 'voice' | 'ai';
  status?: 'pending' | 'approved' | 'rejected';
  purchaseType?: 'card' | 'number' | 'wallet';
  purchaseItem?: string;
  purchasePlan?: NumberPlan;
  purchasePrice?: number;
  purchaseCountry?: string;
  purchaseCountryFlag?: string;
  plan?: WalletPlanType;
  timestamp: number;
  countdown?: number; 
  fileData?: string; 
  seen: boolean;
  notes?: string;
  isDeclined?: boolean;
}