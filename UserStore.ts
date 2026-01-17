import { User, UserStatus } from './types';

const USERS_KEY = 'users';
const OLD_USERS_KEY = 'mp_users';
const LOCKOUT_KEY_PREFIX = 'mp_lockout_';
const ATTEMPTS_KEY_PREFIX = 'mp_attempts_';
const ADMIN_CONFIG_KEY = 'mp_admin_config';

// Security constants
const PBKDF2_ITERATIONS = 100000;
const SALT = "mp_fintech_secure_v4_2024";

export const UserStore = {
  // Security Kill-Switch: Validates that a string is a cryptographic hash
  isSecureHash(str: string): boolean {
    // Expecting 64-character (SHA-256) or 128-character (SHA-512/derived) hex strings
    return typeof str === 'string' && (str.length === 64 || str.length === 128) && /^[a-f0-9]+$/i.test(str);
  },

  async deriveKey(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passwordKey,
      512
    );

    const hashArray = Array.from(new Uint8Array(derivedBits));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  async hashPassword(password: string): Promise<string> {
    // Prevent hashing of already hashed content to avoid double-hashing errors
    if (this.isSecureHash(password)) return password;
    return await this.deriveKey(password, SALT + "_pwd");
  },

  async hashPin(pin: string): Promise<string> {
    if (this.isSecureHash(pin)) return pin;
    return await this.deriveKey(pin, SALT + "_pin");
  },

  // Security comparison to prevent timing attacks
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  },

  getUsers(): User[] {
    const data = localStorage.getItem(USERS_KEY);
    const oldData = localStorage.getItem(OLD_USERS_KEY);
    
    if (oldData) {
      try {
        const parsedOld = JSON.parse(oldData);
        const currentUsers = data ? JSON.parse(data) : [];
        
        const migrated: User[] = parsedOld.map((u: any) => ({
          user_id: u.user_id || u.walletId,
          full_name: u.full_name || u.fullName,
          password_hashed: u.password_hashed || u.passwordHash,
          transactionPinHashed: u.transactionPinHashed,
          isBiometricEnabled: u.isBiometricEnabled,
          pinAttempts: u.pinAttempts || 0,
          pinLockoutUntil: u.pinLockoutUntil,
          wallet_balance: u.wallet_balance !== undefined ? u.wallet_balance : u.balance,
          account_status: u.account_status || u.status || 'active',
          created_at_date_time: u.created_at_date_time || u.registrationDate || Date.now(),
          role: u.role || 'user',
          device_info: u.device_info || u.deviceInfo || { type: 'Unknown', version: '1.0', lastActive: Date.now() },
          suspensionUntil: u.suspensionUntil,
          notes: u.notes || [],
          lastLogin: u.lastLogin,
          isOnline: !!u.isOnline
        }));

        const merged = [...currentUsers];
        migrated.forEach(m => {
          if (!merged.find(u => u.user_id === m.user_id)) {
            merged.push(m);
          }
        });

        localStorage.setItem(USERS_KEY, JSON.stringify(merged));
        localStorage.removeItem(OLD_USERS_KEY);
        return merged;
      } catch (e) {
        console.error("Migration error:", e);
      }
    }
    
    return data ? JSON.parse(data) : [];
  },

  saveUser(user: Partial<User> & { user_id: string; full_name: string; password_hashed: string }) {
    // KILL-SWITCH: Block non-hashed passwords
    if (!this.isSecureHash(user.password_hashed)) {
      console.error("SECURITY BLOCKED: Plain-text password storage is forbidden.");
      alert("⚠️ SECURITY BLOCKED: System attempted to store an insecure credential. Operation terminated.");
      return;
    }

    const users = this.getUsers();
    const existingIndex = users.findIndex(u => u.user_id === user.user_id);
    
    const newUser: User = {
      account_status: 'active',
      notes: [],
      isOnline: false,
      created_at_date_time: Date.now(),
      role: 'user',
      pinAttempts: 0,
      device_info: {
        type: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
        version: '1.4.2-rel',
        lastActive: Date.now()
      },
      ...user,
      user_id: user.user_id,
      full_name: user.full_name,
      password_hashed: user.password_hashed,
      wallet_balance: user.wallet_balance ?? 50.00
    };

    if (existingIndex > -1) {
      users[existingIndex] = { ...users[existingIndex], ...user };
    } else {
      users.push(newUser);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  updateUser(user_id: string, updates: Partial<User>) {
    // KILL-SWITCH checks for updates
    if (updates.password_hashed && !this.isSecureHash(updates.password_hashed)) {
      console.error("SECURITY BLOCKED: Plain-text password update forbidden.");
      return;
    }
    if (updates.transactionPinHashed && !this.isSecureHash(updates.transactionPinHashed)) {
      console.error("SECURITY BLOCKED: Plain-text PIN update forbidden.");
      return;
    }

    const users = this.getUsers();
    const index = users.findIndex(u => u.user_id === user_id);
    if (index > -1) {
      users[index] = { ...users[index], ...updates };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  },

  async verifyPin(user_id: string, pin: string): Promise<{ success: boolean; error?: string }> {
    const users = this.getUsers();
    const user = users.find(u => u.user_id === user_id);
    if (!user || !user.transactionPinHashed) return { success: false, error: "PIN not set" };

    if (user.pinLockoutUntil && user.pinLockoutUntil > Date.now()) {
      return { success: false, error: "Too many incorrect attempts. Please try again later." };
    }

    const hashedInput = await this.hashPin(pin);
    if (this.constantTimeCompare(user.transactionPinHashed, hashedInput)) {
      this.updateUser(user_id, { pinAttempts: 0, pinLockoutUntil: undefined });
      return { success: true };
    } else {
      const attempts = (user.pinAttempts || 0) + 1;
      const updates: Partial<User> = { pinAttempts: attempts };
      if (attempts >= 5) {
        updates.pinLockoutUntil = Date.now() + 10 * 60 * 1000;
      }
      this.updateUser(user_id, updates);
      return { success: false, error: attempts >= 5 ? "Too many incorrect attempts. Please try again later." : "Incorrect PIN" };
    }
  },

  // Security utility for admin verification with bootstrapping logic
  async verifyAdminPassword(password: string): Promise<boolean> {
    const configData = localStorage.getItem(ADMIN_CONFIG_KEY);
    let adminConfig = configData ? JSON.parse(configData) : null;
    
    // Bootstrap Admin Credentials if not present in database (localStorage)
    if (!adminConfig || !adminConfig.hash) {
      const initialHash = await this.hashPassword("ADMIN2026");
      adminConfig = { hash: initialHash, updatedAt: Date.now() };
      localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(adminConfig));
    }

    const inputHash = await this.hashPassword(password);
    return this.constantTimeCompare(inputHash, adminConfig.hash);
  },

  isWeakPin(pin: string): boolean {
    const weak = ['0000', '1111', '1234', '1122'];
    return weak.includes(pin);
  },

  async isBiometricSupported(): Promise<boolean> {
    if (!window.PublicKeyCredential) return false;
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  generateWalletId(): string {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `MP-${num}`;
  },

  checkLockout(user_id: string): { locked: boolean; remaining?: number } {
    const until = localStorage.getItem(LOCKOUT_KEY_PREFIX + user_id);
    if (!until) return { locked: false };
    
    const remaining = parseInt(until) - Date.now();
    if (remaining > 0) return { locked: true, remaining: Math.ceil(remaining / 60000) };
    
    localStorage.removeItem(LOCKOUT_KEY_PREFIX + user_id);
    localStorage.removeItem(ATTEMPTS_KEY_PREFIX + user_id);
    return { locked: false };
  },

  recordFailedAttempt(user_id: string) {
    const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY_PREFIX + user_id) || '0') + 1;
    localStorage.setItem(ATTEMPTS_KEY_PREFIX + user_id, attempts.toString());
    
    if (attempts >= 5) {
      const lockUntil = Date.now() + 10 * 60 * 1000;
      localStorage.setItem(LOCKOUT_KEY_PREFIX + user_id, lockUntil.toString());
    }
  },

  clearAttempts(user_id: string) {
    localStorage.removeItem(ATTEMPTS_KEY_PREFIX + user_id);
    localStorage.removeItem(LOCKOUT_KEY_PREFIX + user_id);
  }
};