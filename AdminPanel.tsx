import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserStore } from './UserStore';
import { AdminStore } from './AdminStore';
import { WalletStore } from './WalletStore';
import { User, AuditLog, WalletChatMessage } from './types';
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
  ChatBubbleIcon, 
  SmartphoneIcon, 
  ChevronRightIcon, 
  TransferIcon, 
  MoreVerticalIcon, 
  ArrowDownIcon 
} from './icons';

interface AdminPanelProps {
  onLogout: () => void;
}

type AdminSection = 'dashboard' | 'identities' | 'uplinks' | 'communications' | 'logs';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [users, setUsers] = useState<User[]>([]);
  const [allMessages, setAllMessages] = useState<WalletChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Wallet Adjustment Tool State
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [showWalletTool, setShowWalletTool] = useState(false);

  // Chat/Tunnel state
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const refreshData = () => {
    const fetchedUsers = UserStore.getUsers();
    setUsers(fetchedUsers);
    setAuditLogs(AdminStore.getAuditLogs());
    
    const aggregatedMessages: WalletChatMessage[] = fetchedUsers.flatMap(u => WalletStore.getMessages(u.user_id));
    const uniqueMessages = Array.from(new Map(aggregatedMessages.map(m => [m.id, m])).values());
    setAllMessages(uniqueMessages.sort((a, b) => b.timestamp - a.timestamp));
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 4000);
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (activeSection === 'communications' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages, activeChatUserId, activeSection]);

  const handleWalletAdjustment = (type: 'credit' | 'debit') => {
    const targetId = activeChatUserId || selectedUserId;
    if (!targetId) return;
    const amount = parseFloat(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (!adjustmentReason.trim()) {
      alert("Please provide a reason for this adjustment.");
      return;
    }

    const u = users.find(x => x.user_id === targetId);
    if (u) {
      const newBal = type === 'credit' ? u.wallet_balance + amount : Math.max(0, u.wallet_balance - amount);
      UserStore.updateUser(targetId, { wallet_balance: newBal });
      
      const logMsg = `[${type.toUpperCase()}] ₦${amount.toLocaleString()} - Reason: ${adjustmentReason}`;
      WalletStore.systemReply(targetId, `🛠 Admin Adjustment: ${type === 'credit' ? '+' : '-'}₦${amount.toLocaleString()}. Reason: ${adjustmentReason}`);
      AdminStore.logAction('ADMIN-CORE', `WALLET_${type.toUpperCase()}`, targetId, logMsg);
      
      setAdjustmentAmount('');
      setAdjustmentReason('');
      setShowWalletTool(false);
      refreshData();
      alert(`Successfully ${type}ed ₦${amount.toLocaleString()}`);
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
    );
  }, [users, searchQuery]);

  const chatSidebarUsers = useMemo(() => {
    const search = chatSearch.toLowerCase();
    return users.filter(u => 
      u.full_name.toLowerCase().includes(search) || 
      u.user_id.toLowerCase().includes(search)
    ).sort((a, b) => {
      const lastA = allMessages.find(m => m.from === a.user_id || m.to === a.user_id)?.timestamp || 0;
      const lastB = allMessages.find(m => m.from === b.user_id || m.to === b.user_id)?.timestamp || 0;
      return lastB - lastA;
    });
  }, [users, allMessages, chatSearch]);

  const stats = useMemo(() => ({
    total: users.length,
    liquidity: users.reduce((acc, u) => acc + u.wallet_balance, 0),
    pending: allMessages.filter(m => m.type === 'file' && m.status === 'pending').length,
    online: users.filter(u => u.isOnline).length
  }), [users, allMessages]);

  const renderDashboard = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active Nodes" value={stats.total} icon={<GridIcon className="w-5 h-5" />} />
        <MetricCard label="System Liquidity" value={`₦${stats.liquidity.toLocaleString()}`} icon={<TransferIcon className="w-5 h-5" />} color="text-sky-400" />
        <MetricCard label="Awaiting Signal" value={stats.pending} icon={<ArrowDownIcon className="w-5 h-5" />} highlight={stats.pending > 0} />
        <MetricCard label="Live Terminals" value={stats.online} icon={<SmartphoneIcon className="w-5 h-5" />} color="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0D121F] border border-white/5 rounded-3xl p-6">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
             <HistoryIcon className="w-4 h-4" /> Protocol Matrix Logs
           </h3>
           <div className="space-y-4">
              {auditLogs.slice(0, 5).map(log => (
                <div key={log.id} className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                   <div className="w-1 h-8 bg-sky-500 rounded-full"></div>
                   <div className="min-w-0 flex-grow">
                      <div className="flex justify-between">
                         <p className="text-[11px] font-bold text-white uppercase">{log.action}</p>
                         <span className="text-[9px] font-mono text-white/20">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] text-white/40 truncate uppercase tracking-tighter">{log.details}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-[#0D121F] border border-white/5 rounded-3xl p-6">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
             <ChatBubbleIcon className="w-4 h-4" /> Recent Conversations
           </h3>
           <div className="space-y-3">
              {allMessages.slice(0, 5).map(msg => (
                <button key={msg.id} onClick={() => { setActiveChatUserId(msg.from === 'admin' ? msg.to : msg.from); setActiveSection('communications'); }} className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center font-black text-xs text-sky-500">
                         {users.find(u => u.user_id === (msg.from === 'admin' ? msg.to : msg.from))?.full_name.substring(0,2).toUpperCase()}
                      </div>
                      <div className="text-left">
                         <p className="text-[11px] font-black text-white uppercase">{users.find(u => u.user_id === (msg.from === 'admin' ? msg.to : msg.from))?.full_name}</p>
                         <p className="text-[9px] text-white/30 truncate max-w-[150px]">{msg.content}</p>
                      </div>
                   </div>
                   <ChevronRightIcon className="w-5 h-5 text-white/20 group-hover:text-white" />
                </button>
              ))}
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#070B14] text-white font-sans overflow-hidden select-none antialiased">
      {/* PROFESSIONAL COLLAPSIBLE SIDEBAR */}
      <aside className={`transition-all duration-300 border-r border-white/5 bg-[#0A0F1D] flex flex-col shrink-0 z-50 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-6 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg"><span className="text-black font-black text-xl">M</span></div>
          {isSidebarOpen && <h1 className="text-sm font-black tracking-tighter uppercase animate-fade-in">Command</h1>}
        </div>
        
        <nav className="flex-grow px-3 space-y-2">
          <SidebarItem active={activeSection === 'dashboard'} icon={<GridIcon className="w-5 h-5" />} label="Terminal" collapsed={!isSidebarOpen} onClick={() => setActiveSection('dashboard')} />
          <SidebarItem active={activeSection === 'identities'} icon={<HistoryIcon className="w-5 h-5" />} label="Identities" collapsed={!isSidebarOpen} onClick={() => setActiveSection('identities')} />
          <SidebarItem active={activeSection === 'uplinks'} icon={<ShieldCheckIcon className="w-5 h-5" />} label="Uplinks" collapsed={!isSidebarOpen} onClick={() => setActiveSection('uplinks')} badge={stats.pending} />
          <SidebarItem active={activeSection === 'communications'} icon={<ChatBubbleIcon className="w-5 h-5" />} label="Tunnels" collapsed={!isSidebarOpen} onClick={() => setActiveSection('communications')} />
          <SidebarItem active={activeSection === 'logs'} icon={<SettingsIcon className="w-5 h-5" />} label="Matrix" collapsed={!isSidebarOpen} onClick={() => setActiveSection('logs')} />
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={onLogout} className="flex items-center gap-4 w-full p-4 hover:bg-rose-500/10 rounded-2xl text-rose-500 font-bold uppercase text-[10px] tracking-widest transition-all">
             <LogOutIcon className="w-5 h-5 shrink-0" />
             {isSidebarOpen && <span className="animate-fade-in">Terminate</span>}
          </button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col min-w-0 bg-[#070B14] overflow-hidden">
        <header className="h-16 border-b border-white/5 px-6 flex items-center justify-between sticky top-0 bg-[#070B14]/80 backdrop-blur-xl z-40">
           <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg transition-all active:scale-90"><MoreVerticalIcon className="w-5 h-5 rotate-90" /></button>
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 hidden sm:block">{activeSection} phase</h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                 <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest leading-none mb-1">Root Access</p>
                 <p className="text-xs font-bold text-white tracking-tight">ADMIN_MATRIX_01</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-900 border-2 border-white/20 shadow-xl"></div>
           </div>
        </header>

        <div className="flex-grow overflow-y-auto p-4 sm:p-8 scrollbar-hide">
           {activeSection === 'dashboard' && renderDashboard()}
           
           {activeSection === 'identities' && (
              <div className="space-y-6 animate-fade-in">
                 <div className="flex flex-col sm:flex-row gap-4 justify-between bg-[#0D121F] p-4 rounded-3xl border border-white/5 shadow-xl">
                    <div className="relative w-full sm:max-w-md">
                       <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 w-4 h-4" />
                       <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search node registry..." className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-6 text-xs text-white outline-none focus:border-sky-500/50 transition-all font-bold" />
                    </div>
                 </div>

                 <div className="bg-[#0D121F] border border-white/5 rounded-3xl overflow-x-auto shadow-xl scrollbar-hide">
                    <table className="w-full text-left min-w-[800px]">
                       <thead className="bg-black/40 text-[9px] font-black uppercase text-white/30 tracking-widest border-b border-white/5">
                          <tr>
                             <th className="px-6 py-5">Node Identity</th>
                             <th className="px-6 py-5">Uplink ID</th>
                             <th className="px-6 py-5">Balance</th>
                             <th className="px-6 py-5">Protocol</th>
                             <th className="px-6 py-5 text-right">Shell Control</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {filteredUsers.map(u => (
                             <tr key={u.user_id} className="group hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => setSelectedUserId(u.user_id)}>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${u.isOnline ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-white/20 border-white/10'}`}>
                                         {u.full_name.substring(0,2).toUpperCase()}
                                      </div>
                                      <div>
                                         <p className="text-[13px] font-bold text-white uppercase truncate max-w-[150px] leading-tight mb-1">{u.full_name}</p>
                                         <span className={`text-[8px] font-black uppercase tracking-widest ${u.isOnline ? 'text-emerald-500' : 'text-white/20'}`}>{u.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-mono text-white/20 uppercase tracking-tighter">{u.user_id}</td>
                                <td className="px-6 py-4 text-sm font-bold text-white tabular-nums tracking-tight">₦{u.wallet_balance.toLocaleString()}</td>
                                <td className="px-6 py-4">
                                   <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${u.account_status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                      {u.account_status}
                                   </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100">
                                      <button onClick={(e) => { e.stopPropagation(); setActiveChatUserId(u.user_id); setActiveSection('communications'); }} className="p-2.5 bg-sky-500/10 text-sky-500 rounded-xl hover:bg-sky-500 hover:text-black transition-all active:scale-90"><ChatBubbleIcon className="w-4 h-4" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); setSelectedUserId(u.user_id); }} className="p-2.5 bg-white/5 text-white/40 rounded-xl hover:bg-white/10 hover:text-white transition-all"><SettingsIcon className="w-4 h-4" /></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           )}

           {activeSection === 'uplinks' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                 {allMessages.filter(m => m.type === 'file').map(msg => (
                    <div key={msg.id} className={`bg-[#0D121F] border rounded-3xl p-6 space-y-4 ${msg.status === 'pending' ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'border-white/5'}`}>
                       <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/40 border border-white/10 group relative cursor-pointer" onClick={() => window.open(msg.fileData)}>
                          <img src={msg.fileData} className="w-full h-full object-contain" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><span className="text-[10px] font-black uppercase text-white tracking-widest border border-white/20 px-4 py-2 rounded-lg">Expand payload</span></div>
                       </div>
                       <div className="flex justify-between items-start">
                          <div className="min-w-0">
                             <h4 className="text-sm font-black text-white uppercase tracking-tight truncate leading-tight mb-1">{users.find(u => u.user_id === msg.from)?.full_name}</h4>
                             <p className="text-[9px] font-bold text-sky-500 uppercase tracking-widest">{msg.purchaseType || 'GENERAL'} REQUEST</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${msg.status === 'pending' ? 'bg-amber-500 text-black' : 'bg-emerald-500/20 text-emerald-500'}`}>{msg.status}</span>
                       </div>
                       {msg.status === 'pending' && (
                          <div className="flex gap-2 pt-2">
                             <button onClick={() => WalletStore.updateMessageStatus(msg.id, 'approved')} className="flex-grow py-3 bg-emerald-500 text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all">Authorize</button>
                             <button onClick={() => { const r = prompt('Decline reason:'); if(r) WalletStore.updateMessageStatus(msg.id, 'rejected', r); }} className="px-4 py-3 border border-rose-500/30 text-rose-500 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-rose-500/10 active:scale-95 transition-all">Refuse</button>
                          </div>
                       )}
                    </div>
                 ))}
                 {allMessages.filter(m => m.type === 'file').length === 0 && <div className="col-span-full py-40 text-center opacity-10 select-none"><SmartphoneIcon className="w-24 h-24 mx-auto mb-6" /><p className="text-2xl font-black uppercase tracking-widest">No signals detected</p></div>}
              </div>
           )}

           {activeSection === 'communications' && (
              <div className="flex h-full bg-[#0D121F] border border-white/5 rounded-3xl overflow-hidden animate-fade-in shadow-2xl relative">
                 {/* Chat User Sidebar with Search */}
                 <div className="w-full sm:w-80 border-r border-white/5 flex flex-col shrink-0 bg-black/20 hidden sm:flex">
                    <div className="p-6 border-b border-white/5 space-y-4">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30">Secure Tunnels</h3>
                       <div className="relative">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <input 
                            value={chatSearch} 
                            onChange={e => setChatSearch(e.target.value)} 
                            placeholder="Find node identity..." 
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[11px] text-white outline-none focus:border-sky-500/50" 
                          />
                       </div>
                    </div>
                    <div className="flex-grow overflow-y-auto scrollbar-hide">
                       {chatSidebarUsers.map(u => {
                          const lastMsg = allMessages.find(m => m.from === u.user_id || m.to === u.user_id);
                          return (
                            <button key={u.user_id} onClick={() => setActiveChatUserId(u.user_id)} className={`w-full p-6 text-left border-b border-white/5 hover:bg-white/[0.04] transition-all relative ${activeChatUserId === u.user_id ? 'bg-sky-500/10' : ''}`}>
                               {activeChatUserId === u.user_id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 shadow-[0_0_10px_#0ea5e9]"></div>}
                               <div className="flex justify-between items-center mb-1">
                                  <p className="text-xs font-bold text-white uppercase truncate pr-2">{u.full_name}</p>
                                  <div className={`w-1.5 h-1.5 rounded-full ${u.isOnline ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-white/10'}`}></div>
                               </div>
                               <p className="text-[9px] text-white/20 truncate italic uppercase tracking-tighter leading-tight">{lastMsg?.content || 'Awaiting synchronization'}</p>
                            </button>
                          );
                       })}
                    </div>
                 </div>

                 {/* Chat Content Area */}
                 <div className="flex-grow flex flex-col bg-black/10 relative min-w-0">
                    {activeChatUserId ? (
                       <>
                          <header className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0D121F]/60 backdrop-blur-xl z-20">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center font-black text-xs text-sky-500 shadow-lg">
                                   {users.find(x=>x.user_id===activeChatUserId)?.full_name.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                   <h3 className="text-xs font-black text-white uppercase leading-tight">{users.find(x=>x.user_id===activeChatUserId)?.full_name}</h3>
                                   <p className="text-[8px] font-mono text-emerald-500/60 uppercase tracking-widest mt-0.5">Encrypted Tunnel • {activeChatUserId}</p>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => setShowWalletTool(!showWalletTool)} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border ${showWalletTool ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
                                   Asset Engine
                                </button>
                                <button onClick={() => { setSelectedUserId(activeChatUserId); }} className="px-4 py-2 bg-white/5 border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-white/10 hover:text-white transition-all">Node Info</button>
                             </div>
                          </header>

                          {/* IN-CHAT WALLET TOOL */}
                          {showWalletTool && (
                            <div className="absolute top-16 left-0 right-0 z-30 bg-[#141B2D] border-b border-white/10 p-6 animate-fade-in shadow-2xl">
                               <div className="max-w-xl mx-auto space-y-4">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-[#FBC02D]">Wallet Adjustment: {users.find(u => u.user_id === activeChatUserId)?.full_name}</p>
                                  <div className="flex flex-col sm:flex-row gap-3">
                                     <input 
                                       type="number" 
                                       value={adjustmentAmount} 
                                       onChange={e => setAdjustmentAmount(e.target.value)}
                                       placeholder="Amount (₦)" 
                                       className="flex-[2] bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-sky-500/50" 
                                     />
                                     <input 
                                       type="text" 
                                       value={adjustmentReason} 
                                       onChange={e => setAdjustmentReason(e.target.value)}
                                       placeholder="Reason..." 
                                       className="flex-[3] bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-sky-500/50" 
                                     />
                                  </div>
                                  <div className="flex gap-3 pt-1">
                                     <button onClick={() => handleWalletAdjustment('credit')} className="flex-1 py-3 bg-emerald-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Credit Node</button>
                                     <button onClick={() => handleWalletAdjustment('debit')} className="flex-1 py-3 bg-rose-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">Debit Node</button>
                                     <button onClick={() => setShowWalletTool(false)} className="px-4 py-3 bg-white/5 text-white/40 rounded-xl font-black text-[10px] uppercase tracking-widest hover:text-white transition-all">Cancel</button>
                                  </div>
                               </div>
                            </div>
                          )}

                          <div className="flex-grow overflow-y-auto p-6 space-y-8 scrollbar-hide bg-[#070B14]/40">
                             {allMessages.filter(m => m.from === activeChatUserId || m.to === activeChatUserId).sort((a,b)=>a.timestamp-b.timestamp).map(m => (
                                <div key={m.id} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                   <div className={`max-w-[85%] p-4 rounded-2xl border ${m.from === 'admin' ? 'bg-[#1D2B44] border-white/10 text-white shadow-xl' : m.from === 'system' ? 'bg-black/70 border-white/5 text-[#FBC02D] italic' : 'bg-[#0D121F] border-white/5 text-sky-400 shadow-lg'}`}>
                                      {m.type === 'file' ? <img src={m.fileData} className="rounded-xl w-full mb-3" /> : <p className="text-[13px] leading-relaxed font-medium">{m.content}</p>}
                                      <span className="block text-[8px] font-mono text-white/20 mt-2 text-right uppercase tracking-widest">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                   </div>
                                </div>
                             ))}
                             <div ref={chatEndRef} />
                          </div>
                          
                          <div className="p-4 bg-[#0D121F] border-t border-white/5 shadow-2xl">
                             <div className="flex gap-3 items-center bg-black/60 rounded-2xl p-1 pl-5 border border-white/10 focus-within:border-sky-500/50 transition-all">
                                <input value={adminReplyText} onChange={e=>setAdminReplyText(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') handleSendAdminMessage(); }} placeholder="Type an encrypted response..." className="flex-grow bg-transparent text-xs outline-none text-white py-3 font-bold placeholder:text-white/20" />
                                <button onClick={handleSendAdminMessage} className="bg-sky-500 text-black p-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"><TransferIcon className="w-5 h-5 rotate-90" /></button>
                             </div>
                          </div>
                       </>
                    ) : (
                       <div className="flex-grow flex flex-col items-center justify-center opacity-5 select-none animate-pulse">
                          <ChatBubbleIcon className="w-32 h-32 mb-8" />
                          <h2 className="text-4xl font-black uppercase tracking-[0.5em]">Session Idle</h2>
                          <p className="mt-4 text-sm font-black uppercase tracking-widest">Select a node identity to begin terminal sync</p>
                       </div>
                    )}
                 </div>
              </div>
           )}

           {activeSection === 'logs' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                 <div className="bg-[#0D121F] border border-white/5 rounded-3xl p-10 h-[450px] flex flex-col justify-between shadow-2xl overflow-hidden relative group">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Registry Density</h4>
                    <div className="flex-grow flex items-end gap-3 px-6 pt-10">
                       {[20, 50, 30, 80, 40, 60, 100, 45, 90, 70].map((h, i) => (
                          <div key={i} className="flex-grow group/bar relative">
                             <div style={{height: `${h}%`}} className="w-full bg-gradient-to-t from-sky-500/10 to-sky-500 rounded-t-xl opacity-20 group-hover/bar:opacity-100 transition-all duration-500"></div>
                          </div>
                       ))}
                    </div>
                 </div>
                 <div className="bg-[#0D121F] border border-white/5 rounded-3xl p-10 h-[450px] flex flex-col justify-between shadow-2xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-white/30">Node Matrix</h4>
                    <div className="flex-grow flex items-center justify-center p-10">
                       <svg viewBox="0 0 200 100" className="w-full overflow-visible">
                          <path d="M0,80 Q25,0 50,70 T100,20 T150,80 T200,40" fill="none" stroke="#FBC02D" strokeWidth="4" strokeLinecap="round" className="drop-shadow-[0_0_15px_#FBC02D]" />
                       </svg>
                    </div>
                 </div>
              </div>
           )}
        </div>
      </main>

      {/* NODE DETAIL OVERLAY */}
      {selectedUserId && (
         <div className="fixed inset-0 z-[600] flex justify-end">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedUserId(null)}></div>
            <div className="relative w-full max-w-lg h-full bg-[#0D121F] border-l border-white/10 animate-slide-in-right p-8 sm:p-12 overflow-y-auto scrollbar-hide shadow-[-40px_0_100px_rgba(0,0,0,0.5)]">
               <div className="flex justify-between items-center mb-12">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Identity Card</h3>
                  <button onClick={() => setSelectedUserId(null)} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all active:scale-90"><XIcon className="w-6 h-6" /></button>
               </div>

               <div className="space-y-10">
                  <div className="flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl shadow-inner">
                     <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-900 flex items-center justify-center font-black text-4xl text-white shadow-xl">
                        {users.find(u => u.user_id === selectedUserId)?.full_name.substring(0,2).toUpperCase()}
                     </div>
                     <div>
                        <h4 className="text-xl font-black text-white uppercase tracking-tight">{users.find(u => u.user_id === selectedUserId)?.full_name}</h4>
                        <p className="text-xs text-sky-500 font-mono mt-1 tracking-widest">{selectedUserId}</p>
                     </div>
                  </div>

                  <div className="bg-[#141B2D] border border-sky-500/20 rounded-3xl p-6 space-y-4 shadow-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#FBC02D] mb-2 flex items-center gap-2">
                       <TransferIcon className="w-4 h-4" /> Global Adjustment
                    </p>
                    <div className="space-y-3">
                       <input 
                         type="number" 
                         value={adjustmentAmount} 
                         onChange={e => setAdjustmentAmount(e.target.value)}
                         placeholder="Enter Amount (₦)" 
                         className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-sky-500/50" 
                       />
                       <input 
                         type="text" 
                         value={adjustmentReason} 
                         onChange={e => setAdjustmentReason(e.target.value)}
                         placeholder="Protocol Justification..." 
                         className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-medium outline-none focus:border-sky-500/50" 
                       />
                       <div className="grid grid-cols-2 gap-3 pt-2">
                          <button onClick={() => handleWalletAdjustment('credit')} className="py-3 bg-emerald-500 text-black rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all">Credit Node</button>
                          <button onClick={() => handleWalletAdjustment('debit')} className="py-3 bg-rose-500 text-black rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all">Deduct Node</button>
                       </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Stored Asset</p>
                        <p className="text-2xl font-bold text-white tracking-tight">₦{users.find(u => u.user_id === selectedUserId)?.wallet_balance.toLocaleString()}</p>
                     </div>
                     <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Phase Status</p>
                        <p className={`text-xl font-black uppercase tracking-tight ${users.find(u => u.user_id === selectedUserId)?.account_status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {users.find(u => u.user_id === selectedUserId)?.account_status}
                        </p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <button onClick={() => { setActiveChatUserId(selectedUserId); setActiveSection('communications'); setSelectedUserId(null); }} className="w-full py-5 bg-sky-500 text-black rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-sky-500/10">
                        <ChatBubbleIcon className="w-5 h-5" /> Start Tunnel Signal
                     </button>
                     <button onClick={() => { const u = users.find(x => x.user_id === selectedUserId); if (u) { UserStore.updateUser(selectedUserId, { account_status: u.account_status === 'active' ? 'suspended' : 'active' }); refreshData(); } }} className={`w-full py-4 border rounded-2xl font-bold uppercase text-[10px] tracking-widest transition-all ${users.find(u => u.user_id === selectedUserId)?.account_status === 'active' ? 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10' : 'border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10'}`}>
                        {users.find(u => u.user_id === selectedUserId)?.account_status === 'active' ? 'Freeze Identity' : 'Resume Identity'}
                     </button>
                  </div>

                  <div className="p-6 bg-black/40 rounded-3xl space-y-4 shadow-inner border border-white/5">
                     <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Audit Trail</p>
                        <button onClick={() => { const note = prompt('Add system entry:'); if(note) { const u = users.find(x=>x.user_id===selectedUserId); UserStore.updateUser(selectedUserId, { notes: [...(u?.notes || []), note] }); refreshData(); } }} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-sky-500 transition-all"><PlusIcon className="w-4 h-4" /></button>
                     </div>
                     <div className="space-y-4 max-h-60 overflow-y-auto scrollbar-hide">
                        {users.find(u => u.user_id === selectedUserId)?.notes.map((n, i) => (
                           <div key={i} className="p-4 bg-white/[0.02] border-l-2 border-sky-500 rounded-r-xl text-xs text-white/60 leading-relaxed italic">{n}</div>
                        ))}
                        {(users.find(u => u.user_id === selectedUserId)?.notes.length === 0) && <p className="text-center py-10 text-[10px] font-black uppercase text-white/10 tracking-[0.4em] italic">No active logs</p>}
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      <style>{`
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } } 
        .animate-slide-in-right { animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

const SidebarItem = ({ active, icon, label, onClick, badge, collapsed }: any) => (
  <button onClick={onClick} className={`flex items-center gap-4 px-4 py-4 w-full transition-all rounded-2xl relative group ${active ? 'bg-sky-500 text-black shadow-lg shadow-sky-500/20' : 'hover:bg-white/5 text-white/40 hover:text-white'}`}>
    <span className="shrink-0 transition-transform group-active:scale-90">{icon}</span>
    {!collapsed && <span className="text-[11px] font-black uppercase tracking-widest animate-fade-in">{label}</span>}
    {badge > 0 && (
      <span className={`absolute ${collapsed ? 'right-2 top-2' : 'right-4'} px-1.5 py-0.5 rounded-md text-[8px] font-black animate-pulse ${active ? 'bg-black text-white' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/40'}`}>
        {badge}
      </span>
    )}
  </button>
);

const MetricCard = ({ label, value, color, icon, highlight }: any) => (
  <div className="bg-[#0D121F] border border-white/5 p-6 rounded-3xl shadow-xl relative overflow-hidden group hover:border-white/15 transition-all">
    <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-[40px] opacity-10 transition-all group-hover:scale-150 ${color ? 'bg-current' : 'bg-white'} ${color}`}></div>
    <div className="flex justify-between items-start mb-6">
       <p className="text-[10px] font-black uppercase tracking-widest text-white/30">{label}</p>
       <div className={`text-white/20 group-hover:scale-110 transition-transform ${color}`}>{icon}</div>
    </div>
    <p className={`text-2xl font-black tabular-nums truncate ${highlight ? 'text-amber-500' : 'text-white'} ${color}`}>{value}</p>
  </div>
);
