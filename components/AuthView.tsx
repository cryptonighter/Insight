import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useApp } from '../context/AppContext';
import { Lock, Mail, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

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
            // Successful auth will trigger the onAuthStateChange listener usually,
            // or we manually reload/sync.
            // For now, let's assume we reload window to reset context cleanly
            window.location.reload();
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-liquid p-6 app-text-primary">
            <div className="bg-white/40 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-2xl w-full max-w-md animate-fade-in relative overflow-hidden">

                {/* Decoration */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 to-purple-400"></div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100/50 mb-4 text-indigo-600">
                        <Lock size={20} />
                    </div>
                    <h1 className="text-2xl font-light text-slate-800 tracking-wide mb-2">
                        {isLogin ? 'Welcome Back' : 'Begin Your Journey'}
                    </h1>
                    <p className="text-sm text-slate-500">
                        {isLogin ? 'Sign in to access your growth journal.' : 'Create a secure space for your mind.'}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider ml-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white/50 border border-white/60 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 text-slate-700 placeholder-slate-400 transition-all"
                                placeholder="you@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-white/50 border border-white/60 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 text-slate-700 placeholder-slate-400 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex items-center gap-2">
                            <AlertCircle size={14} />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (
                            isLogin ? <>Sign In <ArrowRight size={18} /></> : <>Create Account <ArrowRight size={18} /></>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
};
