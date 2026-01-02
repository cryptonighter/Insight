import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';
import { Lock, Mail, User, ArrowRight, AlertCircle, Loader2, ScanFace } from 'lucide-react';

export const AuthView: React.FC = () => {
    const { syncWithSupabase } = useApp();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (error: any) {
            setError(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-mono relative overflow-hidden">
            {/* Ambient Background */}
            <div className="fixed top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow"></div>

            <div className="max-w-md w-full space-y-8 relative z-10">
                <div className="text-center">
                    <div className="bg-primary/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-primary/30">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-white tracking-tighter uppercase">
                        Authentication
                    </h2>
                    <p className="mt-2 text-sm text-primary/60 font-mono tracking-widest uppercase">
                        Identity Verification Required
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    {error && (
                        <div className="text-red-500 text-xs text-center border border-red-500/50 p-2 bg-red-900/20">{error}</div>
                    )}

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="group relative w-full flex justify-center py-4 px-4 border border-primary/50 text-sm font-bold rounded-none text-black bg-primary hover:bg-primary-dim focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5)]"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                CONNECTING...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <ScanFace className="w-5 h-5" />
                                Init Session
                            </span>
                        )}
                    </button>
                    <div className="text-center text-[10px] text-zinc-600 uppercase tracking-[0.2em] mt-4">
                        Secure Connection // Ends-to-End Encrypted
                    </div>
                </div>
            </div>
        </div>
    );
};
```
