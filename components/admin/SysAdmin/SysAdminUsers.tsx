import React, { useState, useEffect, useMemo } from 'react';
import { getReachLeads, updateReachCustomer, deleteReachCustomer, updateReachCustomerNotes } from '../../../services/supabase'; // Accessing reach_customers table
import {
    Users, Search, Building2, Clock, CheckCircle2, Zap,
    Edit2, Trash2, X, AlertCircle, Loader2, KeyRound, StickyNote
} from 'lucide-react';

const SysAdminUsers: React.FC = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        status: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    // Notes State
    const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
    const [selectedCustomerForNotes, setSelectedCustomerForNotes] = useState<any>(null);
    const [noteContent, setNoteContent] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    // Delete State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletePassword, setDeletePassword] = useState('');

    // Notifications
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Tab State
    const [activeTab, setActiveTab] = useState<'ALL' | 'REQUESTS'>('ALL');

    // Derived Counts
    const pendingLicenseCount = useMemo(() => users.filter(u => u.status === 'LICENSE_REQUEST').length, [users]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getReachLeads();
            setUsers(data || []);
        } catch (e) {
            console.error("Failed to load reach customers", e);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        let list = users;
        if (activeTab === 'REQUESTS') {
            list = list.filter(u => u.status === 'LICENSE_REQUEST');
        }
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            list = list.filter(u =>
                u.first_name?.toLowerCase().includes(s) ||
                u.last_name?.toLowerCase().includes(s) ||
                u.email?.toLowerCase().includes(s) ||
                u.company_name?.toLowerCase().includes(s)
            );
        }
        return list;
    }, [users, activeTab, searchTerm]);

    const handleEditClick = (user: any) => {
        setEditingUser(user);
        setEditForm({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
            company_name: user.company_name || '',
            status: user.status || ''
        });
        setIsEditModalOpen(true);
    };

    const handleSubmitEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSaving(true);
        try {
            await updateReachCustomer(editingUser.id, editForm);
            setNotification({ message: 'Record updated successfully', type: 'success' });
            setIsEditModalOpen(false);
            loadData();
        } catch (e) {
            console.error(e);
            setNotification({ message: 'Update failed', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setIsDeleteModalOpen(true);
        setDeletePassword('');
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        if (deletePassword !== 'sysadmin' && deletePassword !== 'admin123' && deletePassword !== '123') {
            alert("Incorrect SysAdmin password");
            return;
        }

        const originalUsers = [...users];
        setUsers(prev => prev.filter(u => u.id !== deletingId)); // Optimistic UI update

        try {
            await deleteReachCustomer(deletingId);
            setNotification({ message: 'Record deleted successfully from CRM.', type: 'success' });
            setIsDeleteModalOpen(false);
            // Optionally reload to ensure sync with DB
            loadData();
        } catch (e: any) {
            console.error(e);
            setUsers(originalUsers); // Rollback on failure
            setNotification({
                message: e.message || 'Delete failed. Check database permissions (RLS).',
                type: 'error'
            });
        }
    };

    const handleSaveNotes = async () => {
        if (!selectedCustomerForNotes) return;
        setIsSavingNotes(true);
        try {
            await updateReachCustomerNotes(selectedCustomerForNotes.id, noteContent);
            setNotification({ message: 'Notes updated successfully', type: 'success' });

            // Update local state
            setUsers(prev => prev.map(u =>
                u.id === selectedCustomerForNotes.id ? { ...u, notes: noteContent } : u
            ));

            setIsNotesModalOpen(false);
        } catch (e) {
            console.error("Failed to save notes", e);
            setNotification({ message: 'Failed to save notes', type: 'error' });
        } finally {
            setIsSavingNotes(false);
        }
    };



    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Users className="w-6 h-6 text-pink-500" /> Reach CRM
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Registry of all companies and users acquired via Reach.</p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by name, email, code..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-pink-500 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4">Company / Name</th>
                                <th className="px-6 py-4">Reach Code</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Joined</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Loading CRM data...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-lg">
                                                    {(user.company_name?.[0] || user.last_name?.[0] || user.first_name?.[0] || '?').toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold">{user.company_name || 'Individual'}</div>
                                                    <div className="text-slate-400 text-xs">{user.first_name} {user.last_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-pink-400">
                                            {user.reach_code || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            <div className="flex flex-col text-xs">
                                                <span>{user.email}</span>
                                                <span className="text-slate-500">{user.phone}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${user.status === 'provisioned' || user.status === 'PROVISIONED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : user.status === 'LICENSE_REQUEST' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-700/50 text-slate-400 border-slate-600/30'}`}>
                                                {user.status === 'provisioned' || user.status === 'PROVISIONED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                {user.status || 'NEW'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedCustomerForNotes(user);
                                                        setNoteContent(user.notes || '');
                                                        setIsNotesModalOpen(true);
                                                    }}
                                                    className={`p-2 rounded-lg transition-all ${user.notes ? 'bg-yellow-500/10 text-yellow-400' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                                    title="Customer Notes"
                                                >
                                                    <StickyNote className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                                    title="Edit Record"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(user.id)}
                                                    className="p-2 rounded-lg bg-red-500/5 text-red-500 hover:text-white hover:bg-red-500 transition-all"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT MODAL */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <Edit2 className="w-5 h-5 text-pink-500" /> Edit CRM Record
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
                        </div>

                        <form onSubmit={handleSubmitEdit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">First Name</label>
                                    <input
                                        type="text"
                                        value={editForm.first_name}
                                        onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Last Name</label>
                                    <input
                                        type="text"
                                        value={editForm.last_name}
                                        onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Company Name</label>
                                <input
                                    type="text"
                                    value={editForm.company_name}
                                    onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-all font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={editForm.phone}
                                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Lifecycle Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-pink-500 transition-all appearance-none"
                                >
                                    <option value="NEW">NEW</option>
                                    <option value="CONTACTED">CONTACTED</option>
                                    <option value="QUALIFIED">QUALIFIED</option>
                                    <option value="PROVISIONED">PROVISIONED</option>
                                    <option value="STALE">STALE</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full py-4 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-black shadow-xl shadow-pink-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SAVE CHANGES'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[120] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-[#0f172a] border border-red-500/30 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-xl shadow-red-600/30 ring-4 ring-[#0f172a]">
                            <Trash2 className="w-10 h-10 text-white" />
                        </div>

                        <div className="mt-10 text-center space-y-2">
                            <h3 className="text-xl font-black text-white">Delete Record?</h3>
                            <p className="text-sm text-slate-400">
                                This action is permanent and requires SysAdmin authorization.
                            </p>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 ml-1">SysAdmin Password</label>
                                <div className="relative">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                    <input
                                        type="password"
                                        autoFocus
                                        placeholder="Enter password..."
                                        value={deletePassword}
                                        onChange={e => setDeletePassword(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && confirmDelete()}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-red-500 font-mono"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5">Cancel</button>
                                <button
                                    onClick={confirmDelete}
                                    className="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                >
                                    DELETE
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NOTES MODAL */}
            {isNotesModalOpen && selectedCustomerForNotes && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <StickyNote className="w-5 h-5 text-yellow-400" /> Customer Notes
                            </h3>
                            <button onClick={() => setIsNotesModalOpen(false)} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 flex-1 flex flex-col gap-4">
                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shrink-0">
                                    {(selectedCustomerForNotes.company_name?.[0] || '?').toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{selectedCustomerForNotes.company_name}</h4>
                                    <p className="text-xs text-slate-400">{selectedCustomerForNotes.first_name} {selectedCustomerForNotes.last_name}</p>
                                </div>
                            </div>

                            <div className="flex-1 min-h-[200px]">
                                <label className="text-xs font-black uppercase text-slate-500 mb-2 block tracking-widest">Internal Notes</label>
                                <textarea
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                    placeholder="Add internal notes about this customer, request details, or follow-up status..."
                                    className="w-full h-full min-h-[200px] bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 outline-none resize-none leading-relaxed"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => setIsNotesModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 text-xs uppercase tracking-wider">Cancel</button>
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={isSavingNotes}
                                    className="px-6 py-2.5 rounded-xl font-bold text-black bg-yellow-400 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Save Notes</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOASTS */}
            {notification && (
                <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 z-[200] ${notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-500'
                    }`}>
                    {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-bold text-sm tracking-wide">{notification.message}</span>
                    <button onClick={() => setNotification(null)} className="ml-4 p-1 rounded-full hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
};
export default SysAdminUsers;
