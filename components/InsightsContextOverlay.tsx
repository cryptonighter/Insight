/**
 * InsightsContextOverlay - Full-screen overlay sliding from left
 * Displays user insights, aspects to work on, and allows editing
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Sparkles, Target, MessageSquare, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { cn } from '@/utils';

interface InsightsContextOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

interface InsightItem {
    id: string;
    text: string;
    createdAt: Date;
    source: 'session' | 'manual';
}

interface AspectItem {
    id: string;
    text: string;
    active: boolean;
}

export const InsightsContextOverlay: React.FC<InsightsContextOverlayProps> = ({
    isOpen,
    onClose
}) => {
    const { meditations, activeResolution } = useApp();

    // Local state for insights and aspects
    const [insights, setInsights] = useState<InsightItem[]>([]);
    const [aspects, setAspects] = useState<AspectItem[]>([]);
    const [activeTab, setActiveTab] = useState<'insights' | 'aspects'>('insights');
    const [newItemText, setNewItemText] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    // Load insights from meditation history
    useEffect(() => {
        if (isOpen) {
            // Extract insights from past meditations
            const extractedInsights: InsightItem[] = meditations
                .filter(m => m.feedback?.user_feedback || m.transcript)
                .map(m => ({
                    id: m.id,
                    text: m.feedback?.user_feedback || m.transcript?.slice(0, 200) || '',
                    createdAt: new Date(m.startedAt || Date.now()),
                    source: 'session' as const
                }))
                .filter(i => i.text.length > 0)
                .slice(0, 10);

            setInsights(prev => {
                // Merge with existing manual insights
                const manualInsights = prev.filter(p => p.source === 'manual');
                return [...extractedInsights, ...manualInsights];
            });

            // Load aspects from resolution or default
            if (activeResolution?.statement) {
                setAspects(prev => prev.length > 0 ? prev : [
                    { id: '1', text: 'Self-awareness', active: true },
                    { id: '2', text: 'Emotional regulation', active: false },
                    { id: '3', text: 'Stress management', active: true },
                ]);
            }
        }
    }, [isOpen, meditations, activeResolution]);

    // Add new item
    const handleAddItem = () => {
        if (!newItemText.trim()) return;

        if (activeTab === 'insights') {
            setInsights(prev => [...prev, {
                id: Date.now().toString(),
                text: newItemText.trim(),
                createdAt: new Date(),
                source: 'manual'
            }]);
        } else {
            setAspects(prev => [...prev, {
                id: Date.now().toString(),
                text: newItemText.trim(),
                active: true
            }]);
        }
        setNewItemText('');
    };

    // Delete item
    const handleDelete = (id: string) => {
        if (activeTab === 'insights') {
            setInsights(prev => prev.filter(i => i.id !== id));
        } else {
            setAspects(prev => prev.filter(a => a.id !== id));
        }
    };

    // Toggle aspect active state
    const toggleAspect = (id: string) => {
        setAspects(prev => prev.map(a =>
            a.id === id ? { ...a, active: !a.active } : a
        ));
    };

    // Start editing
    const startEdit = (id: string, text: string) => {
        setEditingId(id);
        setEditText(text);
    };

    // Save edit
    const saveEdit = () => {
        if (!editingId || !editText.trim()) return;

        if (activeTab === 'insights') {
            setInsights(prev => prev.map(i =>
                i.id === editingId ? { ...i, text: editText.trim() } : i
            ));
        } else {
            setAspects(prev => prev.map(a =>
                a.id === editingId ? { ...a, text: editText.trim() } : a
            ));
        }
        setEditingId(null);
        setEditText('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                    />

                    {/* Overlay Panel */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 left-0 w-full max-w-sm bg-background-dark border-r border-white/10 z-50 flex flex-col"
                    >
                        {/* Header */}
                        <header className="flex items-center justify-between px-6 pt-safe-top py-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white">Your Context</h2>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </header>

                        {/* Tabs */}
                        <div className="flex px-6 py-3 gap-2 border-b border-white/5">
                            <button
                                onClick={() => setActiveTab('insights')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    activeTab === 'insights'
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-surface/50 text-white/60 hover:text-white/80'
                                )}
                            >
                                <Sparkles className="w-4 h-4" />
                                Insights
                            </button>
                            <button
                                onClick={() => setActiveTab('aspects')}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                                    activeTab === 'aspects'
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-surface/50 text-white/60 hover:text-white/80'
                                )}
                            >
                                <Target className="w-4 h-4" />
                                Aspects
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                            {activeTab === 'insights' ? (
                                insights.length > 0 ? (
                                    insights.map(insight => (
                                        <div
                                            key={insight.id}
                                            className="bg-surface/50 border border-white/5 rounded-xl p-4 group"
                                        >
                                            {editingId === insight.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-primary/50"
                                                        rows={3}
                                                        autoFocus
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setEditingId(null)} className="flex-1 py-1.5 rounded-lg bg-surface text-white/60 text-xs">Cancel</button>
                                                        <button onClick={saveEdit} className="flex-1 py-1.5 rounded-lg bg-primary text-black text-xs font-bold">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-white/80 leading-relaxed">{insight.text}</p>
                                                    <div className="flex items-center justify-between mt-3">
                                                        <span className="text-[10px] text-white/30">
                                                            {insight.source === 'session' ? 'From session' : 'Manual'}
                                                        </span>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => startEdit(insight.id, insight.text)} className="p-1.5 rounded hover:bg-white/10">
                                                                <Edit2 className="w-3 h-3 text-white/40" />
                                                            </button>
                                                            <button onClick={() => handleDelete(insight.id)} className="p-1.5 rounded hover:bg-red-500/20">
                                                                <Trash2 className="w-3 h-3 text-red-400/60" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-white/30">
                                        <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">No insights yet</p>
                                        <p className="text-xs mt-1">They'll appear after your sessions</p>
                                    </div>
                                )
                            ) : (
                                aspects.length > 0 ? (
                                    aspects.map(aspect => (
                                        <div
                                            key={aspect.id}
                                            className={cn(
                                                "flex items-center justify-between p-4 rounded-xl border transition-all group cursor-pointer",
                                                aspect.active
                                                    ? 'bg-primary/10 border-primary/30'
                                                    : 'bg-surface/30 border-white/5 hover:border-white/10'
                                            )}
                                            onClick={() => toggleAspect(aspect.id)}
                                        >
                                            {editingId === aspect.id ? (
                                                <input
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    onBlur={saveEdit}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                                    className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <span className={cn("text-sm", aspect.active ? 'text-white' : 'text-white/60')}>
                                                    {aspect.text}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); startEdit(aspect.id, aspect.text); }}
                                                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10"
                                                >
                                                    <Edit2 className="w-3 h-3 text-white/40" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(aspect.id); }}
                                                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-400/60" />
                                                </button>
                                                {aspect.active && (
                                                    <Check className="w-4 h-4 text-primary" />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-white/30">
                                        <Target className="w-8 h-8 mx-auto mb-3 opacity-50" />
                                        <p className="text-sm">No aspects added</p>
                                        <p className="text-xs mt-1">Add areas you want to work on</p>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Add new item */}
                        <div className="px-6 py-4 border-t border-white/10">
                            <div className="flex gap-2">
                                <input
                                    value={newItemText}
                                    onChange={(e) => setNewItemText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                    placeholder={activeTab === 'insights' ? 'Add an insight...' : 'Add an aspect...'}
                                    className="flex-1 bg-surface/50 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/50"
                                />
                                <button
                                    onClick={handleAddItem}
                                    disabled={!newItemText.trim()}
                                    className="px-4 rounded-lg bg-primary text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default InsightsContextOverlay;
