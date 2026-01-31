import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, LogOut, Mail, Clock } from 'lucide-react';
import BrandLogo from './common/BrandLogo';

interface PendingLicenseScreenProps {
    onLogout: () => void;
    currentUser: any;
}

const PendingLicenseScreen: React.FC<PendingLicenseScreenProps> = ({ onLogout, currentUser }) => {
    return (
        <div className="min-h-screen w-full bg-[#0f172a] flex flex-col items-center justify-center relative overflow-hidden font-sans">
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center text-center">
                {/* Animated Brand */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="mb-12 scale-125"
                >
                    <BrandLogo variant="reach" size="lg" animated />
                </motion.div>

                {/* Status Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="w-full bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
                >
                    {/* Scanning Line Animation */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-scan-line opacity-50" />

                    <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 border border-cyan-500/30 rounded-full animate-ping opacity-20" />
                        <Clock className="w-8 h-8 text-cyan-400" />
                    </div>

                    <h1 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight">
                        Request Under Review
                    </h1>

                    <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                        Thanks {currentUser?.firstName}, we've received your request. <br />
                        Our team is currently reviewing your application details.
                    </p>

                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5 mb-8 text-left">
                        <div className="flex items-start gap-3">
                            <Mail className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-1">Status Update</p>
                                <p className="text-sm text-slate-300">
                                    You will receive an email at <span className="text-white font-bold">{currentUser?.email}</span> once your workspace is ready.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing Request...
                    </div>
                </motion.div>

                {/* Footer Actions */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8"
                >
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold text-sm px-6 py-3 rounded-full hover:bg-white/5"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

export default PendingLicenseScreen;
