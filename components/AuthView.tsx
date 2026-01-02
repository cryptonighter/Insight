import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';
import { Lock, Mail, User, ArrowRight, AlertCircle, Loader2, ScanFace } from 'lucide-react';

export const AuthView: React.FC = () => {
    const { syncWithSupabase } = useApp();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
            }
            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

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
                        {isLogin ? 'Welcome Back' : 'Join The Network'}
                    </h2>
                    <p className="mt-2 text-sm text-primary/60 font-mono tracking-widest uppercase">
                        Identity Verification Required
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-primary/30 rounded-none py-3 pl-12 pr-4 focus:outline-none focus:border-primary text-primary placeholder-primary/20 transition-all font-mono uppercase"
                                    placeholder="USER@NET.WORK"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-primary/30 rounded-none py-3 pl-12 pr-4 focus:outline-none focus:border-primary text-primary placeholder-primary/20 transition-all font-mono"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-xs text-center border border-red-500/50 p-2 bg-red-900/20">{error}</div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-4 px-4 border border-primary/50 text-sm font-bold rounded-none text-black bg-primary hover:bg-primary-dim focus:outline-none focus:border-primary uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(74,222,128,0.2)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5)]"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    {isLogin ? 'Authenticate' : 'Register Protocol'}
                                    <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-primary/20"></div>
                        <span className="flex-shrink-0 mx-4 text-primary/30 text-[10px] uppercase tracking-widest">OR ACCESS WITH</span>
                        <div className="flex-grow border-t border-primary/20"></div>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-primary/30 text-xs font-bold rounded-none text-primary bg-transparent hover:bg-primary/10 uppercase tracking-widest transition-all"
                    >
                        <span className="flex items-center gap-2">
                            <ScanFace className="w-4 h-4" />
                            Google Identity
                        </span>
                    </button>

                    <div className="text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-xs text-primary/50 hover:text-primary transition-colors uppercase tracking-widest underline decoration-primary/30 underline-offset-4"
                        >
                            {isLogin ? "Need Access? Register" : "Has Access? Login"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
