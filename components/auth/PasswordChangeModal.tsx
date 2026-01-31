
import React from 'react';
import { KeyRound, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface PasswordChangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    pwdError: string;
    pwdSuccess: string;
    currentPwd: string;
    setCurrentPwd: (val: string) => void;
    newPwd: string;
    setNewPwd: (val: string) => void;
    onSubmit: (e: React.FormEvent) => void;
    t: any; // Translations
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
    isOpen, onClose, pwdError, pwdSuccess, currentPwd, setCurrentPwd, newPwd, setNewPwd, onSubmit, t
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-w-sm w-full relative border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.changePassword}</h3>
                </div>
                <form onSubmit={onSubmit} className="space-y-4">
                    {pwdError && (
                        <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                            <AlertTriangle className="w-4 h-4" /> {pwdError}
                        </div>
                    )}
                    {pwdSuccess && (
                        <div className="bg-green-50 text-green-600 text-xs p-3 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                            <ShieldCheck className="w-4 h-4" /> {pwdSuccess}
                        </div>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">{t.currentPassword}</label>
                        <input
                            type="password"
                            value={currentPwd}
                            onChange={e => setCurrentPwd(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">{t.newPassword}</label>
                        <input
                            type="password"
                            value={newPwd}
                            onChange={e => setNewPwd(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            required
                        />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-100 dark:bg-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-slate-600 dark:text-slate-300"
                        >
                            {t.cancel}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            {t.update}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordChangeModal;
