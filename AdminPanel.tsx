import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserStore } from './UserStore';
import { AdminStore } from './AdminStore';
import { WalletStore } from './WalletStore';
import { User, AuditLog, UserStatus, WalletChatMessage, VirtualCard, BoughtNumber } from './types';
import { 
  ShieldCheckIcon, 
  SearchIcon, 
  PlusIcon, 
  LogOutIcon, 
  HistoryIcon,
  GridIcon,
  XIcon,
  SettingsIcon,
  BlockIcon,
  CreditCardIcon,
  PhoneIcon,
  ChatBubbleIcon,
  SmartphoneIcon,
  PlusIcon as AddIcon,
  ChevronRightIcon,
  InfoIcon,
  ArrowDownIcon,
  MoreVerticalIcon,
  CopyIcon
} from './icons';

interface AdminPanelProps {
  onLogout: () => void;
}

type AdminSection = 'overview' | 'users' | 'transactions' | 'virtual-cards' | 'phone-numbers' | 'chat' | 'logs';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [allMessages, setAllMessages] = useState<WalletChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Sort state
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Chat state
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshData = () => {
    const fetchedUsers = UserStore.getUsers();
    setUsers(fetchedUsers);
    setAuditLogs(AdminStore.getAuditLogs());
    
    // Aggregating all messages for the terminal and chat systems
    const aggregatedMessages: WalletChatMessage[] = fetchedUsers.flatMap(u => WalletStore.getMessages(u.user_id));
    const uniqueMessages = Array.from(new Map(aggregatedMessages.map(m => [m.id, m])).values());
    setAllMessages(uniqueMessages.sort((a, b) => b.timestamp - a.timestamp));
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeSection === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, activeChatUserId]);

  const handleStatusUpdate = (msgId: string, status: 'approved' | 'rejected', notes?: string) => {
    WalletStore.updateMessageStatus(msgId, status, notes);
    AdminStore.logAction('SYS-ADMIN', `${status.toUpperCase()}_TX`, msgId, `Transaction marked as ${status}. ${notes ? 'Notes: ' + notes : ''}`);
    refreshData();
  };

  const handleManualCredit = (userId: string) => {
    const amount = prompt("Enter amount to inject into wallet (₦):");
    if (amount && !isNaN(parseFloat(amount))) {
      const u = users.find(x => x.user_id === userId);
      if (u) {
        UserStore.updateUser(userId, { wallet_balance: u.wallet_balance + parseFloat(amount) });
        WalletStore.systemReply(userId, `💉 Manual Asset Injection: +₦${parseFloat(amount).toLocaleString()} added by Admin.`);
        AdminStore.logAction('SYS-ADMIN', 'MANUAL_CREDIT', userId, `Injected ₦${amount}`);
        refreshData();
      }
    }
  };

  const handleSendAdminMessage = () => {
    if (!activeChatUserId || !adminReplyText.trim()) return;
    WalletStore.adminReply(activeChatUserId, adminReplyText);
    setAdminReplyText('');
    refreshData();
  };

  const filteredUsers = useMemo(() => {
    const search = searchQuery.toLowerCase();
    return users.filter(u => 
      u.full_name.toLowerCase().includes(search) || 
      u.user_id.toLowerCase().includes(search)
    ).sort((a, b) => {
      let valA: any = a.full_name;
      let valB: any = b.full_name;
      if (sortField === 'balance') { valA = a.wallet_balance; valB = b.wallet_balance; }
      if (sortField === 'status') { valA = a.account_status; valB = b.account_status; }
      
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, searchQuery, sortField, sortDirection]);

  const pendingTransactions = useMemo(() => allMessages.filter(m => m.type === 'file' && m.status === 'pending'), [allMessages]);

  const renderOverview = () => (
    <div className="space-y-10 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatBox label="System Liquidity" value={`₦${users.reduce((acc, u) => acc + u.wallet_balance, 0).toLocaleString()}`} highlight />
        <StatBox label="Registered Nodes" value={users.length} />
        <StatBox label="Awaiting Verification" value={pendingTransactions.length} highlight={pendingTransactions.length > 0} />
        <StatBox label="Online Terminals" value={users.filter(u => u.isOnline).length} highlight={users.filter(u => u.isOnline).length > 0} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#0D0E14] border border-white/5 rounded-[32px] p-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#5EB5FB] mb-6">Recent Logged Operations</h3>
          <div className="space-y-4">
            {auditLogs.slice(0, 6).map(log => (
              <div key={log.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-[#FBC02D]"></div>
                  <div>
                    <p className="text-[11px] font-bold text-white uppercase">{log.action}</p>
                    <p className="text-[10px] text-white/30 truncate max-w-[200px]">{log.details}</p>
                  </div>
                </div>
                <p className="text-[9px] font-mono text-white/20">{new Date(log.timestamp).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0D0E14] border border-white/5 rounded-[32px] p-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00D775] mb-6">Pending Asset Uplinks</h3>
          <div className="space-y-4">
            {pendingTransactions.length === 0 ? (
               <p className="text-xs text-white/20 text-center py-10 uppercase font-black tracking-widest italic">All systems verified</p>
            ) : pendingTransactions.slice(0, 4).map(msg => (
              <div key={msg.id} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 overflow-hidden"><img src={msg.fileData} className="w-full h-full object-cover" /></div>
                    <div>
                       <p className="text-xs font-black text-white">{msg.purchaseType?.toUpperCase()}</p>
                       <p className="text-[9px] text-white/40 uppercase font-bold">{users.find(u => u.user_id === msg.from)?.full_name}</p>
                    </div>
                 </div>
                 <button onClick={() => setActiveSection('transactions')} className="p-2 text-[#5EB5FB] hover:bg-[#5EB5FB]/10 rounded-xl transition-all"><ChevronRightIcon className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactionsTerminal = () => (
    <div className="animate-fade-in space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black tracking-tighter text-white uppercase">Verification Terminal</h2>
          <p className="text-[10px] font-black text-[#5EB5FB] tracking-widest uppercase mt-1">Reviewing active asset applications</p>
        </div>
        <div className="flex gap-4">
           <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FBC02D]/10 text-[#FBC02D] text-[9px] font-black uppercase tracking-widest border border-[#FBC02D]/20">
             {pendingTransactions.length} Pending
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {allMessages.filter(m => m.type === 'file').length === 0 ? (
          <div className="py-40 text-center opacity-20"><HistoryIcon className="w-20 h-20 mx-auto mb-4" /><p className="text-sm font-black uppercase tracking-widest">No verification data found</p></div>
        ) : allMessages.filter(m => m.type === 'file').map(msg => (
          <div key={msg.id} className={`bg-[#0D0E14] border rounded-[32px] p-8 flex flex-col lg:flex-row gap-10 transition-all ${msg.status === 'pending' ? 'border-[#FBC02D]/30 shadow-[0_0_30px_rgba(251,192,45,0.05)]' : 'border-white/5'}`}>
            <div className="w-full lg:w-64 shrink-0 group relative cursor-zoom-in" onClick={() => window.open(msg.fileData)}>
               <div className="aspect-[3/4] bg-black rounded-2xl border border-white/10 overflow-hidden relative">
                  <img src={msg.fileData} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <span className="text-[10px] font-black text-white uppercase tracking-widest border-2 border-white/60 px-4 py-2 rounded-full">Expand Evidence</span>
                  </div>
               </div>
            </div>
            
            <div className="flex-grow flex flex-col justify-between py-2">
               <div>
                  <div className="flex justify-between items-start mb-6">
                     <div>
                        <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-2">{users.find(u => u.user_id === msg.from)?.full_name || 'Anonymous User'}</h3>
                        <p className="text-[10px] font-mono text-[#5EB5FB] uppercase tracking-widest">{msg.from}</p>
                     </div>
                     <div className="text-right">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${msg.status === 'pending' ? 'bg-[#FBC02D] text-black shadow-[0_0_15px_rgba(251,192,45,0.3)]' : msg.status === 'approved' ? 'bg-[#00D775]/20 text-[#00D775]' : 'bg-red-500/20 text-red-500'}`}>
                           {msg.status?.toUpperCase() || 'UNSET'}
                        </span>
                        {msg.status === 'pending' && <p className="text-[10px] text-[#FBC02D] font-bold mt-2 animate-pulse uppercase tracking-tighter">Time Limit: 05:00</p>}
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-8">
                     <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Request Type</p>
                        <p className="text-sm font-black text-white">{msg.purchaseType?.toUpperCase() || 'SYSTEM TOP-UP'}</p>
                     </div>
                     <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-2">Target Asset</p>
                        <p className="text-sm font-black text-white truncate">{msg.purchaseItem || 'N/A'}</p>
                     </div>
                  </div>
               </div>

               {msg.status === 'pending' ? (
                  <div className="flex gap-4">
                     <button onClick={() => handleStatusUpdate(msg.id, 'approved')} className="flex-[2] py-5 bg-[#00D775] text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-[#00D775]/80 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,215,117,0.3)]">Authorize Node</button>
                     <button onClick={() => { const note = prompt("Reason for decline:"); if(note) handleStatusUpdate(msg.id, 'rejected', note); }} className="flex-1 py-5 border border-red-500/30 text-red-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-red-500/5 active:scale-95 transition-all">Decline Node</button>
                     <button className="px-6 py-5 border border-white/10 text-white/40 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:text-white transition-all">Wait</button>
                  </div>
               ) : (
                 <div className="p-6 bg-white/[0.01] rounded-3xl border border-white/5 border-dashed">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Finalization Details</p>
                    <p className="text-[11px] text-white/60 leading-relaxed italic">{msg.notes || 'Asset successfully provisioned to entity profile.'}</p>
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUsersTable = () => (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="relative flex-grow max-w-md">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-5 h-5" />
            <input 
               value={searchQuery} 
               onChange={e => setSearchQuery(e.target.value)} 
               placeholder="Search by Identity Name or Node ID..." 
               className="w-full bg-[#0D0E14] border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-sm text-white outline-none focus:border-[#5EB5FB]/50 transition-all font-bold" 
            />
         </div>
         <div className="flex gap-4">
            <button className="px-6 py-3.5 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 hover:border-white/20 transition-all">Export Nodes</button>
         </div>
      </div>

      <div className="bg-[#0D0E14] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
         <table className="w-full text-left">
            <thead>
               <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">
                  <th className="px-10 py-6 cursor-pointer hover:text-white transition-colors" onClick={() => { setSortField('name'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Entity Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-10 py-6">Node ID</th>
                  <th className="px-10 py-6 cursor-pointer hover:text-white transition-colors" onClick={() => { setSortField('balance'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Asset Balance {sortField === 'balance' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-10 py-6 cursor-pointer hover:text-white transition-colors" onClick={() => { setSortField('status'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>Protocol Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-10 py-6 text-right">Shell Operations</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
               {filteredUsers.map(u => (
                  <tr key={u.user_id} className="group hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={() => setSelectedUserId(u.user_id)}>
                     <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border transition-all ${u.isOnline ? 'bg-[#00D775]/10 text-[#00D775] border-[#00D775]/20 shadow-[0_0_15px_rgba(0,215,117,0.1)]' : 'bg-white/5 text-white/20 border-white/10'}`}>
                              {u.full_name.substring(0, 2).toUpperCase()}
                           </div>
                           <span className="text-sm font-black text-white tracking-tight">{u.full_name}</span>
                        </div>
                     </td>
                     <td className="px-10 py-6 text-xs font-mono text-white/40">{u.user_id}</td>
                     <td className="px-10 py-6 text-sm font-black text-white tabular-nums">₦{u.wallet_balance.toLocaleString()}</td>
                     <td className="px-10 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.account_status === 'active' ? 'bg-[#00D775]/10 text-[#00D775]' : 'bg-red-500/10 text-red-500'}`}>
                           {u.account_status}
                        </span>
                     </td>
                     <td className="px-10 py-6 text-right">
                        <button className="p-3 bg-white/5 rounded-2xl text-white/20 group-hover:text-[#5EB5FB] group-hover:bg-[#5EB5FB]/10 transition-all"><SettingsIcon className="w-5 h-5" /></button>
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );

  const renderCardModules = () => (
    <div className="animate-fade-in space-y-8">
       <div className="flex justify-between items-center">
          <h2 className="text-xl font-black uppercase tracking-tighter">Active Card Modules</h2>
          <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Module Cluster Alpha</span>
       </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {users.filter(u => (u.virtualCards?.length || 0) > 0).map(u => (
             u.virtualCards?.map(card => (
                <div key={card.id} className="bg-[#0D0E14] border border-white/5 rounded-[32px] p-8 flex flex-col gap-6 relative overflow-hidden group">
                   <div className="flex justify-between items-start z-10">
                      <div>
                         <p className="text-[9px] font-black text-[#5EB5FB] uppercase tracking-[0.3em] mb-1">{card.label}</p>
                         <h4 className="text-lg font-black text-white truncate">{u.full_name}</h4>
                         <p className="text-[9px] font-mono text-white/20 mt-1 uppercase">{card.id}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${card.status === 'active' ? 'bg-[#00D775]/10 text-[#00D775]' : 'bg-[#FBC02D]/10 text-[#FBC02D]'}`}>
                         {card.status}
                      </span>
                   </div>
                   <div className="bg-black/40 rounded-2xl p-5 border border-white/5 z-10">
                      <div className="flex justify-between text-[11px] font-mono text-white/60 mb-2"><span>{card.number}</span><span>{card.expiry}</span></div>
                      <div className="flex justify-between text-[11px] font-mono text-white/60"><span>CVV: {card.cvv}</span><span>{card.currency}</span></div>
                   </div>
                   <div className="flex gap-3 z-10">
                      <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all">Freeze Cluster</button>
                      <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-white/20 hover:text-red-500 transition-all"><BlockIcon className="w-5 h-5" /></button>
                   </div>
                   <div className={`absolute -right-10 -bottom-10 w-40 h-40 rounded-full blur-[60px] opacity-10 ${card.theme === 'purple_visa' ? 'bg-purple-500' : card.theme === 'orange_master' ? 'bg-orange-500' : card.theme === 'green_union' ? 'bg-green-500' : 'bg-white'}`}></div>
                </div>
             ))
          ))}
       </div>
    </div>
  );

  const renderPhoneServices = () => (
    <div className="animate-fade-in space-y-8">
       <h2 className="text-xl font-black uppercase tracking-tighter">ID Service Registry</h2>
       <div className="bg-[#0D0E14] border border-white/5 rounded-[40px] overflow-hidden">
          <table className="w-full text-left">
             <thead>
                <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase text-white/30 tracking-widest">
                   <th className="px-10 py-6">Identity Holder</th>
                   <th className="px-10 py-6">Global Number</th>
                   <th className="px-10 py-6">Protocol Type</th>
                   <th className="px-10 py-6">Expiry Countdown</th>
                   <th className="px-10 py-6 text-right">Operations</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {users.filter(u => (u.boughtNumbers?.length || 0) > 0).map(u => (
                   u.boughtNumbers?.map(num => {
                      const daysLeft = Math.max(0, Math.ceil((num.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
                      return (
                        <tr key={num.id} className="hover:bg-white/[0.02] transition-colors">
                           <td className="px-10 py-6"><span className="text-sm font-black text-white">{u.full_name}</span></td>
                           <td className="px-10 py-6">
                              <div className="flex items-center gap-3">
                                 <span className="text-lg">{num.countryFlag}</span>
                                 <span className="text-xs font-mono font-bold text-white/80">{num.number}</span>
                              </div>
                           </td>
                           <td className="px-10 py-6">
                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${num.plan === 'VIP' ? 'bg-[#FBC02D] text-black shadow-[0_0_10px_rgba(251,192,45,0.2)]' : 'bg-[#00D775]/10 text-[#00D775]'}`}>
                                 {num.plan}
                              </span>
                           </td>
                           <td className="px-10 py-6 text-sm font-black text-white">{daysLeft} Days Remaining</td>
                           <td className="px-10 py-6 text-right">
                              <button className="text-[10px] font-black uppercase text-[#5EB5FB] hover:underline underline-offset-4 tracking-widest">Wipe Node</button>
                           </td>
                        </tr>
                      );
                   })
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderCommunications = () => {
    const userList = Array.from(new Set(allMessages.map(m => m.from === 'admin' ? m.to : m.from))).filter(id => id !== 'admin' && id !== 'system');
    const activeChatMsgs = allMessages.filter(m => m.from === activeChatUserId || m.to === activeChatUserId).sort((a, b) => a.timestamp - b.timestamp);

    return (
      <div className="flex h-[calc(100vh-12rem)] bg-[#0D0E14] border border-white/5 rounded-[40px] overflow-hidden animate-fade-in">
        <div className="w-96 border-r border-white/5 flex flex-col shrink-0 bg-white/[0.01]">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
             <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Node Clusters</h3>
             <div className="bg-[#5EB5FB]/20 p-1.5 rounded-lg"><SmartphoneIcon className="w-4 h-4 text-[#5EB5FB]" /></div>
          </div>
          <div className="flex-grow overflow-y-auto scrollbar-hide">
            {userList.map(id => {
              const u = users.find(x => x.user_id === id);
              const lastMsg = allMessages.find(m => m.from === id || m.to === id);
              const isActive = activeChatUserId === id;
              return (
                <button key={id} onClick={() => setActiveChatUserId(id)} className={`w-full p-8 text-left border-b border-white/5 transition-all hover:bg-white/5 relative ${isActive ? 'bg-[#5EB5FB]/10' : ''}`}>
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#5EB5FB] shadow-[0_0_15px_#5EB5FB]"></div>}
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-black text-white truncate max-w-[180px] uppercase tracking-tight">{u?.full_name || id}</p>
                    <p className="text-[8px] font-mono text-white/20">{new Date(lastMsg?.timestamp || 0).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                  <p className="text-[10px] text-white/40 truncate uppercase tracking-tighter leading-relaxed">
                    {lastMsg?.type === 'file' ? '📥 Incoming Attachment' : lastMsg?.content || 'No uplink data'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-grow flex flex-col bg-black/10 relative">
          {activeChatUserId ? (
            <>
              <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#0D0E14]/80 backdrop-blur-md">
                <div className="flex items-center gap-5">
                   <div className="w-12 h-12 rounded-[20px] bg-gradient-to-br from-[#5EB5FB]/20 to-[#0A162B] border border-[#5EB5FB]/20 flex items-center justify-center font-black text-sm text-[#5EB5FB]">
                      {users.find(x=>x.user_id === activeChatUserId)?.full_name.substring(0,2).toUpperCase()}
                   </div>
                   <div>
                      <p className="text-sm font-black text-white uppercase tracking-tight">{users.find(x=>x.user_id === activeChatUserId)?.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <div className="w-1.5 h-1.5 rounded-full bg-[#00D775] animate-pulse"></div>
                         <p className="text-[9px] text-[#00D775] font-black tracking-[0.2em] uppercase">Tunnel Active</p>
                      </div>
                   </div>
                </div>
                <div className="flex gap-4">
                   <button onClick={() => handleManualCredit(activeChatUserId)} className="bg-[#00D775] text-black text-[9px] font-black uppercase px-5 py-2.5 rounded-xl shadow-[0_0_15px_rgba(0,215,117,0.3)] transition-transform active:scale-95">Fund Injection</button>
                   <button onClick={() => { if(confirm('Terminate account uplink?')) { UserStore.updateUser(activeChatUserId, { account_status: 'disabled' }); refreshData(); } }} className="p-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"><BlockIcon className="w-5 h-5" /></button>
                </div>
              </header>

              <div className="flex-grow overflow-y-auto p-10 space-y-8 scrollbar-hide">
                {activeChatMsgs.map(m => (
                  <div key={m.id} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-6 rounded-[28px] relative ${m.from === 'admin' ? 'bg-[#1E293B] text-white shadow-xl' : m.from === 'system' ? 'bg-black/60 border border-white/5 text-[#FBC02D]' : 'bg-[#0D0E14] border border-white/5 text-[#5EB5FB]'}`}>
                      {m.type === 'file' ? (
                         <div className="space-y-3">
                           <div className="rounded-2xl overflow-hidden border border-white/10"><img src={m.fileData} className="w-full max-h-80 object-contain bg-black/40" /></div>
                           <p className="text-[8px] font-black uppercase text-white/30 tracking-widest text-center">Protocol: Visual Evidence Packet</p>
                         </div>
                      ) : m.type === 'voice' ? (
                         <div className="flex items-center gap-4 py-1">
                            <div className="w-8 h-8 rounded-full bg-[#5EB5FB]/20 flex items-center justify-center"><SmartphoneIcon className="w-4 h-4 text-[#5EB5FB]" /></div>
                            <div className="flex-grow h-1 bg-white/10 rounded-full overflow-hidden"><div className="w-1/3 h-full bg-[#5EB5FB]"></div></div>
                            <span className="text-[10px] font-mono opacity-40">VOICE</span>
                         </div>
                      ) : <p className="text-xs leading-relaxed font-medium">{m.content}</p>}
                      <p className="text-[8px] font-mono text-white/20 mt-3 text-right">{new Date(m.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-8 bg-[#0D0E14] border-t border-white/5">
                <div className="flex gap-5 bg-black/40 rounded-3xl p-2 pl-8 items-center border border-white/10 shadow-inner">
                  <input 
                    value={adminReplyText} 
                    onChange={e => setAdminReplyText(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSendAdminMessage()} 
                    placeholder="Transmit encrypted reply node..." 
                    className="flex-grow bg-transparent text-xs outline-none text-white py-4 font-bold" 
                  />
                  <button onClick={handleSendAdminMessage} className="bg-[#5EB5FB] text-black p-4 rounded-[20px] shadow-[0_0_20px_rgba(94,181,251,0.4)] hover:shadow-[0_0_30px_rgba(94,181,251,0.6)] active:scale-95 transition-all"><AddIcon className="w-5 h-5 rotate-90" /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center opacity-10 text-center px-20">
              <ChatBubbleIcon className="w-32 h-32 mb-8" />
              <h3 className="text-2xl font-black uppercase tracking-[0.5em]">Terminal Uplink Offline</h3>
              <p className="text-sm font-bold uppercase tracking-widest mt-4">Select an interface node to establish communication tunnel</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#07080C] text-[#E0E0E0] font-sans overflow-hidden select-none">
      <aside className="w-72 border-r border-[#1E2028] bg-[#0D0E14] flex flex-col shrink-0 z-20 shadow-[20px_0_40px_rgba(0,0,0,0.5)]">
        <div className="p-10 border-b border-[#1E2028] mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl"><span className="text-[#050C1F] font-black text-2xl">M</span></div>
          <div><h1 className="text-sm font-black tracking-tighter text-white uppercase">Moniepoint</h1><p className="text-[8px] font-black text-[#5EB5FB] uppercase tracking-[0.4em]">Auth-Root</p></div>
        </div>
        
        <nav className="flex-grow px-6 space-y-1">
          <SidebarItem active={activeSection === 'overview'} icon={<GridIcon className="w-5 h-5" />} label="Terminal Deck" onClick={() => setActiveSection('overview')} />
          <SidebarItem active={activeSection === 'users'} icon={<HistoryIcon className="w-5 h-5" />} label="Entity Registry" onClick={() => setActiveSection('users')} />
          <SidebarItem active={activeSection === 'transactions'} icon={<SmartphoneIcon className="w-5 h-5" />} label="Asset Uplinks" onClick={() => setActiveSection('transactions')} badge={pendingTransactions.length} />
          <SidebarItem active={activeSection === 'virtual-cards'} icon={<CreditCardIcon className="w-5 h-5" />} label="Card Modules" onClick={() => setActiveSection('virtual-cards')} />
          <SidebarItem active={activeSection === 'phone-numbers'} icon={<PhoneIcon className="w-5 h-5" />} label="ID Service Logs" onClick={() => setActiveSection('phone-numbers')} />
          <SidebarItem active={activeSection === 'chat'} icon={<ChatBubbleIcon className="w-5 h-5" />} label="Comms Hub" onClick={() => setActiveSection('chat')} />
          <SidebarItem active={activeSection === 'logs'} icon={<SettingsIcon className="w-5 h-5" />} label="Audit Matrix" onClick={() => setActiveSection('logs')} />
        </nav>

        <div className="p-10">
          <button onClick={onLogout} className="flex items-center gap-4 text-red-500 font-black uppercase text-[10px] tracking-[0.2em] w-full px-6 py-5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-[24px] transition-all group">
            <LogOutIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            Terminate
          </button>
        </div>
      </aside>

      <main className="flex-grow overflow-y-auto bg-[#07080C] relative scrollbar-hide">
        <header className="h-24 border-b border-[#1E2028] px-12 flex items-center justify-between sticky top-0 bg-[#07080C]/90 backdrop-blur-2xl z-10">
          <h2 className="text-xs font-black uppercase tracking-[0.6em] text-white/40">{activeSection} System</h2>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 bg-[#111F35] px-6 py-2.5 rounded-full border border-[#5EB5FB]/20 shadow-[0_0_20px_rgba(94,181,251,0.05)]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00D775] animate-pulse shadow-[0_0_10px_#00D775]"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Secured Node</span>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-[#5EB5FB] uppercase tracking-[0.2em]">Authorized Access</p>
              <p className="text-xs font-black text-white tracking-tight">Root_Protocol_01</p>
            </div>
          </div>
        </header>

        <div className="p-12 max-w-7xl mx-auto pb-40">
          {activeSection === 'overview' && renderOverview()}
          {activeSection === 'transactions' && renderTransactionsTerminal()}
          {activeSection === 'users' && renderUsersTable()}
          {activeSection === 'virtual-cards' && renderCardModules()}
          {activeSection === 'phone-numbers' && renderPhoneServices()}
          {activeSection === 'chat' && renderCommunications()}
          
          {activeSection === 'logs' && (
            <div className="animate-fade-in space-y-8">
               <div className="flex justify-between items-center">
                  <h2 className="text-xl font-black uppercase tracking-tighter">Audit Matrix</h2>
                  <button onClick={() => { if(confirm('Clear history?')) { localStorage.removeItem('mp_audit_logs'); refreshData(); } }} className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline">Purge Logs</button>
               </div>
               <div className="bg-[#0D0E14] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="bg-white/[0.02] border-b border-white/5 text-[10px] font-black uppercase text-white/30 tracking-widest">
                       <th className="px-10 py-6">Timestamp</th><th className="px-10 py-6">Protocol Action</th><th className="px-10 py-6">Target Segment</th><th className="px-10 py-6">Log Metadata</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {auditLogs.length === 0 ? (
                        <tr><td colSpan={4} className="px-10 py-20 text-center text-xs font-black uppercase text-white/10 tracking-[0.3em]">No matrix records available</td></tr>
                     ) : auditLogs.map(log => (
                       <tr key={log.id} className="text-[10px] text-white/60 hover:bg-white/[0.01] transition-colors">
                         <td className="px-10 py-5 font-mono text-[#FBC02D]">{new Date(log.timestamp).toLocaleString()}</td>
                         <td className="px-10 py-5 font-black uppercase text-white tracking-widest">{log.action}</td>
                         <td className="px-10 py-5 font-mono text-[#5EB5FB]">{log.targetId}</td>
                         <td className="px-10 py-5 opacity-40">{log.details}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}
        </div>
      </main>

      {selectedUserId && (
        <div className="fixed inset-0 z-[600] flex justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-lg" onClick={() => setSelectedUserId(null)}></div>
          <div className="relative w-full max-w-xl h-full bg-[#0D0E14] border-l border-white/10 shadow-[-40px_0_80px_rgba(0,0,0,0.8)] animate-slide-in-right p-12 overflow-y-auto scrollbar-hide">
             <header className="flex justify-between items-center mb-16">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-[#5EB5FB] to-[#0A162B] border-2 border-white/10 flex items-center justify-center font-black text-2xl text-white shadow-2xl">
                      {users.find(u => u.user_id === selectedUserId)?.full_name.substring(0,2).toUpperCase()}
                   </div>
                   <div>
                      <h3 className="text-2xl font-black text-white tracking-tighter leading-none mb-2">{users.find(u => u.user_id === selectedUserId)?.full_name}</h3>
                      <div className="flex items-center gap-3">
                         <p className="text-[11px] text-[#5EB5FB] font-mono font-bold tracking-widest">{selectedUserId}</p>
                         <button onClick={() => { navigator.clipboard.writeText(selectedUserId); alert('ID Copied'); }} className="text-white/20 hover:text-white transition-colors"><CopyIcon className="w-3.5 h-3.5" /></button>
                      </div>
                   </div>
                </div>
                <button onClick={() => setSelectedUserId(null)} className="p-4 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all hover:bg-white/10"><XIcon className="w-8 h-8" /></button>
             </header>
             
             <div className="space-y-12">
                <div className="grid grid-cols-2 gap-6">
                   <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] group hover:border-[#5EB5FB]/40 transition-all">
                      <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em] mb-3">Asset Pool</p>
                      <p className="text-3xl font-black text-white tracking-tighter">₦{users.find(u => u.user_id === selectedUserId)?.wallet_balance.toLocaleString()}</p>
                   </div>
                   <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[32px] group hover:border-[#00D775]/40 transition-all">
                      <p className="text-[10px] font-black uppercase text-white/20 tracking-[0.3em] mb-3">Node Protocol</p>
                      <p className={`text-xl font-black uppercase tracking-tight ${users.find(u => u.user_id === selectedUserId)?.account_status === 'active' ? 'text-[#00D775]' : 'text-red-500'}`}>
                         {users.find(u => u.user_id === selectedUserId)?.account_status}
                      </p>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-[0.5em] text-[#FBC02D] mb-6 px-2">Root Overrides</h4>
                   <div className="grid grid-cols-1 gap-4">
                      <button onClick={() => handleManualCredit(selectedUserId)} className="w-full py-5 bg-[#5EB5FB] text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#5EB5FB]/90 transition-all flex items-center justify-center gap-4 shadow-2xl">
                         <AddIcon className="w-5 h-5" /> Manual Fund Injection
                      </button>
                      <div className="flex gap-4">
                         <button onClick={() => { const u = users.find(x => x.user_id === selectedUserId); if (u) { UserStore.updateUser(selectedUserId, { account_status: u.account_status === 'active' ? 'suspended' : 'active' }); refreshData(); } }} className={`flex-grow py-5 border rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${users.find(u => u.user_id === selectedUserId)?.account_status === 'active' ? 'border-red-500/30 text-red-500 hover:bg-red-500/5' : 'border-[#00D775]/30 text-[#00D775] hover:bg-[#00D775]/5'}`}>
                            {users.find(u => u.user_id === selectedUserId)?.account_status === 'active' ? <><BlockIcon className="w-5 h-5" /> Suspend Node</> : <><ShieldCheckIcon className="w-5 h-5" /> Restore Node</>}
                         </button>
                         <button onClick={() => { if(confirm('Permanently deallocate node?')) { UserStore.updateUser(selectedUserId, { account_status: 'disabled' }); setSelectedUserId(null); refreshData(); } }} className="px-8 py-5 border border-white/5 rounded-2xl text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all">
                            <XIcon className="w-6 h-6" />
                         </button>
                      </div>
                      <button onClick={() => { setActiveSection('chat'); setActiveChatUserId(selectedUserId); setSelectedUserId(null); }} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/60 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-4">
                         <ChatBubbleIcon className="w-5 h-5" /> Establish Uplink Tunnel
                      </button>
                   </div>
                </div>

                {(users.find(u => u.user_id === selectedUserId)?.notes?.length || 0) > 0 && (
                   <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[32px]">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-6">Internal Cache Notes</h4>
                      <div className="space-y-4">
                         {users.find(u => u.user_id === selectedUserId)?.notes.map((note, i) => (
                            <div key={i} className="p-4 bg-black/40 rounded-xl text-xs text-white/60 border-l-2 border-[#FBC02D]">{note}</div>
                         ))}
                      </div>
                   </div>
                )}
                
                <button onClick={() => { const note = prompt('Add node note:'); if(note) { const u = users.find(x=>x.user_id===selectedUserId); UserStore.updateUser(selectedUserId, { notes: [...(u?.notes || []), note] }); refreshData(); } }} className="w-full py-3 text-[10px] font-black text-white/20 uppercase tracking-widest hover:text-white transition-colors">+ New Matrix Entry</button>
             </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } } 
        .animate-slide-in-right { animation: slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

const SidebarItem = ({ active, icon, label, onClick, badge }: any) => (
  <button onClick={onClick} className={`flex items-center gap-5 px-6 py-5 w-full transition-all rounded-[24px] mb-2 relative group ${active ? 'bg-[#5EB5FB] text-black shadow-[0_10px_30px_rgba(94,181,251,0.2)]' : 'hover:bg-white/5 text-white/40 hover:text-white'}`}>
    <span className="shrink-0">{icon}</span>
    <span className={`text-[11px] font-black uppercase tracking-widest transition-all ${active ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>{label}</span>
    {badge > 0 && (
      <span className={`absolute right-6 px-2 py-1 rounded-lg text-[9px] font-black animate-pulse ${active ? 'bg-black text-white' : 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]'}`}>
        {badge}
      </span>
    )}
  </button>
);

const StatBox = ({ label, value, highlight }: any) => (
  <div className="bg-[#0D0E14] border border-white/5 p-10 rounded-[40px] shadow-2xl relative overflow-hidden group hover:border-white/10 transition-all">
    <div className={`absolute -right-12 -top-12 w-32 h-32 rounded-full blur-[50px] opacity-10 transition-all group-hover:scale-150 ${highlight ? 'bg-[#5EB5FB]' : 'bg-white'}`}></div>
    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-6">{label}</p>
    <p className={`text-3xl font-black tracking-tighter tabular-nums ${highlight ? 'text-[#5EB5FB]' : 'text-white'}`}>{value}</p>
  </div>
);
