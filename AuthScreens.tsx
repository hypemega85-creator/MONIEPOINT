import React, { useState } from 'react';
import { UserStore } from './UserStore';
import { ShieldCheckIcon, EyeIcon, EyeOffIcon, ArrowLeftIcon } from './icons';

interface AuthProps {
  onLoginSuccess: (fullName: string, walletId: string, balance: number, isAdmin?: boolean) => void;
}

export const AuthScreens: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [walletId, setWalletId] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successDialog, setSuccessDialog] = useState<{ id: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const lockout = UserStore.checkLockout(walletId);
    if (lockout.locked) {
      setError(`Account locked. Try again in ${lockout.remaining} minutes.`);
      return;
    }

    // Updated Admin ID to ADMIN2004
    if (walletId === 'ADMIN2004') {
      const isAdminValid = await UserStore.verifyAdminPassword(password);
      if (isAdminValid) {
        UserStore.clearAttempts(walletId);
        onLoginSuccess('System Administrator', 'ADMIN', 0, true);
        return;
      } else {
        UserStore.recordFailedAttempt(walletId);
        setError('Invalid Admin Credentials');
        return;
      }
    }

    const users = UserStore.getUsers();
    const user = users.find(u => u.user_id === walletId);
    const hash = await UserStore.hashPassword(password);

    if (user && UserStore.constantTimeCompare(user.password_hashed, hash)) {
      if (user.account_status === 'disabled') {
        setError('This account has been permanently disabled.');
        return;
      }
      if (user.account_status === 'suspended') {
        if (user.suspensionUntil && user.suspensionUntil > Date.now()) {
          const diff = Math.ceil((user.suspensionUntil - Date.now()) / (60 * 60 * 1000));
          setError(`Account suspended. Remaining time: ${diff} hours.`);
          return;
        } else {
          UserStore.updateUser(user.user_id, { account_status: 'active' });
        }
      }

      UserStore.clearAttempts(walletId);
      UserStore.updateUser(user.user_id, { isOnline: true, lastLogin: Date.now() });
      onLoginSuccess(user.full_name, user.user_id, user.wallet_balance, false);
    } else {
      UserStore.recordFailedAttempt(walletId);
      setError('Invalid Wallet ID or Password');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const newWalletId = UserStore.generateWalletId();
    const passwordHash = await UserStore.hashPassword(password);
    
    UserStore.saveUser({
      user_id: newWalletId,
      full_name: fullName,
      password_hashed: passwordHash,
      wallet_balance: 50.00,
      role: 'user'
    });

    setSuccessDialog({ id: newWalletId });
  };

  if (successDialog) {
    return (
      <div className="fixed inset-0 z-[600] bg-[#050C1F] flex flex-col items-center justify-center p-6 animate-fade-in">
        <div className="w-20 h-20 bg-[#00D775]/10 rounded-full flex items-center justify-center mb-6">
          <ShieldCheckIcon className="w-10 h-10 text-[#00D775]" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
        <p className="text-white/60 text-center mb-8">Your unique Wallet ID is:</p>
        <div className="bg-[#111F35] border border-white/10 px-8 py-4 rounded-2xl mb-10">
          <span className="text-3xl font-black text-[#FBC02D] tracking-widest">{successDialog.id}</span>
        </div>
        <button 
          onClick={() => { setSuccessDialog(null); setView('login'); setWalletId(successDialog.id); }}
          className="w-full bg-[#FBC02D] text-[#050C1F] py-4 rounded-xl font-bold"
        >
          Proceed to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#050C1F] p-6 animate-fade-in">
      <div className="flex items-center gap-2 mt-8 mb-12">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <span className="text-[#0066F5] font-black text-2xl">M</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-white font-black text-2xl leading-none tracking-tighter">Moniepoint</h1>
          <p className="text-white/60 text-[8px] font-bold tracking-widest uppercase mt-0.5">Secure Banking</p>
        </div>
      </div>

      <div className="flex-grow">
        <h2 className="text-3xl font-bold mb-2">{view === 'login' ? 'Welcome back' : 'Create Account'}</h2>
        <p className="text-white/40 mb-8">{view === 'login' ? 'Enter your details to continue' : 'Join the most reliable banking experience'}</p>

        <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-4">
          {view === 'register' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/30 px-1">Full Name</label>
              <input 
                required
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#111F35] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-[#FBC02D]/40 transition-all font-bold"
                placeholder="John Doe"
              />
            </div>
          )}

          {view === 'login' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/30 px-1">Wallet ID</label>
              <input 
                required
                type="text" 
                value={walletId}
                onChange={(e) => setWalletId(e.target.value.toUpperCase())}
                className="w-full bg-[#111F35] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-[#FBC02D]/40 transition-all font-bold"
                placeholder="MP-123456"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-white/30 px-1">Password</label>
            <div className="relative">
              <input 
                required
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111F35] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-[#FBC02D]/40 transition-all font-bold"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
              >
                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {view === 'register' && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-white/30 px-1">Confirm Password</label>
              <input 
                required
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#111F35] border border-white/5 rounded-2xl px-5 py-4 text-white outline-none focus:border-[#FBC02D]/40 transition-all font-bold"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-xs font-bold px-1 py-2">{error}</p>}

          <button 
            type="submit" 
            className="w-full bg-[#FBC02D] text-[#050C1F] py-4 rounded-xl font-bold text-lg mt-4 active:scale-95 transition-transform"
          >
            {view === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center">
        <p className="text-white/40 text-sm">
          {view === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
          <button 
            onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }}
            className="text-[#FBC02D] font-bold"
          >
            {view === 'login' ? 'Register here' : 'Login here'}
          </button>
        </p>
      </div>
    </div>
  );
};