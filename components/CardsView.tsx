import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlayCircle, CheckCircle, FolderOpen, ChevronDown, ChevronUp, FileText, Edit3, Shield, Zap, Search, Star, Heart, Activity } from 'lucide-react';

type TabType = 'patterns' | 'parts' | 'anchors';

export const CardsView: React.FC = () => {
  const {
    patterns, parts, anchors,
    startMeditationGeneration, acceptPattern,
    insights, updatePatternNote,
    updatePart, updateAnchor
  } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('patterns');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const activePatterns = patterns.filter(p => p.status === 'active');
  const pendingPatterns = patterns.filter(p => p.status === 'pending');

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
    setEditingNoteId(null);
  };

  const handleEditNote = (pattern: any) => {
    setEditingNoteId(pattern.id);
    setNoteText(pattern.userNotes || "");
  };

  const saveNote = (id: string) => {
    updatePatternNote(id, noteText);
    setEditingNoteId(null);
  };

  const handleGenerate = (patternTitle: string) => {
    startMeditationGeneration(patternTitle, "Balanced & Integrated", 15);
  };

  return (
    <div className="min-h-screen px-4 pt-16 pb-32 overflow-y-auto bg-gradient-liquid app-text-primary">
      <div className="flex items-center justify-center gap-2 mb-8 opacity-70">
        <Search size={16} className="app-text-secondary" />
        <h1 className="text-xs font-bold tracking-[0.2em] app-text-secondary uppercase">Clinical Registry</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex p-1 bg-white/30 backdrop-blur-sm rounded-xl mb-8 border border-white/20 shadow-inner">
        {(['patterns', 'parts', 'anchors'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setExpandedId(null); }}
            className={`
              flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all
              ${activeTab === tab
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'patterns' && (
        <>
          {/* Pending Section */}
          {pendingPatterns.length > 0 && (
            <div className="mb-10 animate-fade-in">
              <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-4 pl-2">Detection Pending</h2>
              <div className="space-y-4">
                {pendingPatterns.map((pattern) => (
                  <div key={pattern.id} className="glass-card bg-amber-50/70 border border-amber-200 rounded-xl p-6 backdrop-blur-md shadow-md">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-amber-800">{pattern.title}</h3>
                      <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-1 rounded">New</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed mb-6">{pattern.description}</p>
                    <button
                      onClick={() => acceptPattern(pattern.id)}
                      className="w-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-700 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Confirm Pattern
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Active Section - File Aesthetic */}
      {activeTab === 'patterns' && (
        <div className="space-y-2">
          {activePatterns.length === 0 && pendingPatterns.length === 0 && (
            <div className="text-center py-20 opacity-30 app-text-secondary">
              <FolderOpen size={48} className="mx-auto mb-4" />
              <p>Patterns Empty. Keep speaking to the Stream.</p>
            </div>
          )}

          {activePatterns.map((pattern) => {
            const isExpanded = expandedId === pattern.id;
            const relatedInsights = insights.filter(i => pattern.insights.includes(i.id));

            return (
              <div key={pattern.id} className="transition-all duration-300">
                {/* File Tab / Header */}
                <div
                  onClick={() => toggleExpand(pattern.id)}
                  className={`
                    relative z-10 cursor-pointer rounded-t-xl border-t border-x border-gray-200 p-5 flex justify-between items-center glass-card shadow-sm
                    ${isExpanded ? 'bg-white/90' : 'bg-white/70 hover:bg-white/90 mb-2 rounded-b-xl border-b'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pattern.color }}></div>
                    <div>
                      <h2 className="text-lg font-medium text-slate-700">{pattern.title}</h2>
                      <p className="text-[10px] app-text-secondary uppercase tracking-wider">File #{pattern.id.slice(-6)} • {pattern.observationCount} Observations</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={20} className="app-text-secondary" /> : <ChevronDown size={20} className="app-text-secondary" />}
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="bg-white/80 border-x border-b border-gray-200 rounded-b-xl p-6 mb-4 -mt-[1px] animate-fade-in relative overflow-hidden shadow-md">
                    {/* Decorative lines */}
                    <div className="absolute top-0 left-6 w-[1px] h-full bg-gray-200 pointer-events-none"></div>

                    <p className="text-slate-700 text-sm leading-relaxed pl-8 mb-8 border-l-2 border-gray-300 ml-[-1px]">
                      {pattern.description}
                    </p>

                    {/* User Notes */}
                    <div className="pl-8 mb-8">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs uppercase app-text-secondary font-bold tracking-wider">Field Notes</h4>
                        <button onClick={() => handleEditNote(pattern)} className="app-text-secondary hover:text-slate-800"><Edit3 size={12} /></button>
                      </div>

                      {editingNoteId === pattern.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            className="w-full bg-gray-100 p-3 rounded text-sm text-slate-700 border border-gray-300 focus:outline-none"
                            value={noteText}
                            onChange={e => setNoteText(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveNote(pattern.id)} className="text-xs bg-indigo-500 px-3 py-1 rounded text-white">Save</button>
                            <button onClick={() => setEditingNoteId(null)} className="text-xs px-3 py-1 app-text-secondary">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-100/50 p-4 rounded border border-gray-200">
                          {pattern.userNotes ? (
                            <p className="text-sm text-slate-600 italic font-serif">"{pattern.userNotes}"</p>
                          ) : (
                            <p className="text-xs text-slate-500 italic">No notes added.</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Evidence List */}
                    <div className="pl-8 mb-8">
                      <h4 className="text-xs uppercase app-text-secondary font-bold tracking-wider mb-3">Evidence Log</h4>
                      <div className="space-y-3">
                        {relatedInsights.length > 0 ? relatedInsights.map(i => (
                          <div key={i.id} className="flex gap-3 text-xs text-slate-600">
                            <FileText size={12} className="mt-1 flex-shrink-0" />
                            <p>"{i.text.substring(0, 60)}..." <span className="text-slate-400 block mt-1">{new Date(i.timestamp).toLocaleDateString()}</span></p>
                          </div>
                        )) : (
                          <p className="text-xs text-slate-500">No linked logs accessible.</p>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="pl-8">
                      <button
                        onClick={() => handleGenerate(pattern.title)}
                        className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors text-indigo-700 shadow-sm"
                      >
                        <PlayCircle size={16} /> Generate Targeted Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'parts' && (
        <div className="space-y-4">
          {parts.length === 0 ? (
            <div className="text-center py-20 opacity-30 app-text-secondary">
              <Shield size={48} className="mx-auto mb-4" />
              <p>No IFS Parts registered yet.</p>
            </div>
          ) : (
            parts.map(part => (
              <div key={part.id} className="glass-card bg-white/70 border border-gray-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                {/* Visual relationship indicator */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-1000"
                    style={{ width: `${part.relationshipScore * 10}%` }}
                  />
                </div>

                <div className="flex justify-between items-start mb-6 pt-2">
                  <div>
                    <h3 className="text-xl font-medium text-slate-800 tracking-tight">{part.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider text-indigo-600 font-bold px-2 py-0.5 bg-indigo-50 rounded-md">{part.role}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Seen {new Date(part.lastAccessed).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase text-slate-400 font-bold mb-1">Relationship</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Heart
                          key={s}
                          size={12}
                          className={s <= (part.relationshipScore / 2) ? "fill-rose-400 text-rose-400" : "text-slate-200"}
                          onClick={() => updatePart(part.id, { relationshipScore: s * 2 })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] uppercase text-slate-400 font-bold mb-1 flex items-center gap-1">
                      <Activity size={10} /> Somatic Loc
                    </p>
                    <p className="text-xs text-slate-700 font-medium">{part.somaticLocation || "Unknown"}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] uppercase text-slate-400 font-bold mb-1 flex items-center gap-1">
                      <Shield size={10} /> State
                    </p>
                    <p className="text-xs text-slate-700 font-medium truncate">{part.relationshipScore > 7 ? "Integrated" : "Blended"}</p>
                  </div>
                </div>

                {part.originStory && (
                  <div className="mb-6 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100/50">
                    <p className="text-[9px] uppercase text-indigo-400 font-bold mb-2">Internal Dialogue / Story</p>
                    <p className="text-sm text-slate-600 italic leading-relaxed">"{part.originStory}"</p>
                  </div>
                )}

                <button
                  onClick={() => startMeditationGeneration(`Working with ${part.name}`, "Compassionate Integration", 20, 'IFS', { IFS_Part_Label: part.name, IFS_Somatic: part.somaticLocation })}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <PlayCircle size={18} /> Resume Integration
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'anchors' && (
        <div className="space-y-4">
          {anchors.length === 0 ? (
            <div className="text-center py-20 opacity-30 app-text-secondary">
              <Zap size={48} className="mx-auto mb-4" />
              <p>No Somatic Anchors anchored yet.</p>
            </div>
          ) : (
            anchors.map(anchor => (
              <div key={anchor.id} className="glass-card bg-white border border-slate-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-400/30 group-hover:bg-emerald-400 transition-colors"></div>

                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Zap size={16} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">{anchor.type}</span>
                      <p className="text-[10px] text-slate-400">{new Date(anchor.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={s <= anchor.efficacyRating ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                        onClick={() => updateAnchor(anchor.id, { efficacyRating: s })}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed mb-6 font-medium">
                  {anchor.description}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => startMeditationGeneration("Reinforcing Body Anchor", "Stable & Centered", 10, 'SOMATIC_AGENCY', { SOM_Trigger: anchor.description })}
                    className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={14} /> Recall Anchor
                  </button>
                  <button
                    className="px-4 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-colors border border-slate-100"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};