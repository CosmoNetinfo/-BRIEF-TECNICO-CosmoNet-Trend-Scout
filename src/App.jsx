import { useState, useCallback, useEffect } from 'react';
import {
  Telescope, TrendingUp, Newspaper, Lightbulb,
  ArrowRight, CheckCircle2, Plus, ExternalLink,
  ChevronRight, Search, AlertCircle, Loader2,
  Sparkles, BookOpen, Clock, RefreshCw, Zap,
  Save, Check, Copy
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase.js';

import { fetchNewsForTopic }    from './services/newsService.js';
import { fetchTrendingKeywords } from './services/keywordService.js';
import { generateArticleIdeas, analyzeManualBrief } from './services/groqService.js';
import { saveIdeaToPiano, fetchPianoEditoriale } from './services/firebaseService.js';
import { fetchWordPressPosts }  from './services/wordpressService.js';
import { TOPICS } from './config/sources.js';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const SITE_CONTEXT = 'cosmonet.info — blog italiano su AI, Linux, Open Source, Gaming, WordPress';
const LS_KEY = 'trend_scout_last_analysis';

// Status tabs for piano editoriale
const STATUS_TABS = [
  { id: 'da_scrivere', label: 'Da Scrivere', dot: 'bg-slate-400'   },
  { id: 'programmato', label: 'Programmato', dot: 'bg-amber-400'   },
  { id: 'pubblicato',  label: 'Pubblicato',  dot: 'bg-emerald-500' },
];

const DIFF_BADGE = {
  alta:  'bg-rose-100 text-rose-700',
  media: 'bg-amber-100 text-amber-700',
  bassa: 'bg-slate-100 text-slate-500',
};

export default function App() {
  const [activeTab, setActiveTab]   = useState('analisi');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle'); // idle|loading|done|error
  const [phase, setPhase]           = useState('');
  const [result, setResult]         = useState(null);
  const [news, setNews]             = useState([]);
  const [savedIds, setSavedIds]     = useState(new Set());
  const [copiedId, setCopiedId]     = useState(null);
  
  const [manualBrief, setManualBrief] = useState('');
  const [isGeneratingManual, setIsGeneratingManual] = useState(false);

  const [error, setError]           = useState('');
  const [lastDate, setLastDate]     = useState(null);

  // Piano
  const [piano, setPiano]           = useState([]);
  const [wpPosts, setWpPosts]       = useState([]);
  const [pianoLoading, setPianoLoading] = useState(false);
  const [wpLoading, setWpLoading]   = useState(false);
  const [statusFilter, setStatusFilter] = useState('da_scrivere');

  // Load last analysis
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { result: r, news: n, topic, savedIds: ids, date } = JSON.parse(saved);
        setResult(r); setNews(n || []); setSelectedTopic(topic);
        setSavedIds(new Set(ids || [])); setLastDate(date); setAnalysisStatus('done');
      }
    } catch { /* ignore */ }
  }, []);

  const loadPiano = useCallback(async () => {
    setPianoLoading(true);
    const items = await fetchPianoEditoriale(100);
    setPiano(items);
    setPianoLoading(false);
  }, []);

  const loadWordPress = useCallback(async () => {
    setWpLoading(true);
    const posts = await fetchWordPressPosts();
    setWpPosts(posts);
    setWpLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'piano') {
      loadPiano();
      loadWordPress();
    }
  }, [activeTab, loadPiano, loadWordPress]);

  // Analysis
  const handleAnalyze = useCallback(async () => {
    if (!selectedTopic) return;
    setAnalysisStatus('loading'); setError(''); setResult(null); setNews([]); setSavedIds(new Set());
    const topic = TOPICS.find(t => t.id === selectedTopic);
    try {
      setPhase(`🔭 Raccolta news su ${topic.label}...`);
      const fetchedNews = await fetchNewsForTopic(selectedTopic);
      setNews(fetchedNews);

      setPhase('🎯 Analisi keyword...');
      const { keywords, peopleAlsoAsk } = await fetchTrendingKeywords(topic.label, 'cosmonet.info');

      setPhase('✨ Generazione suggerimenti con AI...');
      const ideas = await generateArticleIdeas({
        news: fetchedNews, keywords, peopleAlsoAsk,
        topic: topic.label, siteContext: SITE_CONTEXT,
      });

      const date = new Date().toISOString();
      setResult(ideas); setLastDate(date); setAnalysisStatus('done');
      localStorage.setItem(LS_KEY, JSON.stringify({
        result: ideas, news: fetchedNews, topic: selectedTopic, savedIds: [], date,
      }));
    } catch (e) {
      setError(e.message); setAnalysisStatus('error');
    }
  }, [selectedTopic]);

  async function handleSaveOne(article) {
    try {
      await saveIdeaToPiano(article, selectedTopic);
      const updated = new Set([...savedIds, article.title]);
      setSavedIds(updated);
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        data.savedIds = [...updated];
        localStorage.setItem(LS_KEY, JSON.stringify(data));
      }
    } catch (e) { alert('Errore: ' + e.message); }
  }

  function clearAnalysis() {
    localStorage.removeItem(LS_KEY);
    setResult(null); setNews([]); setSavedIds(new Set()); setAnalysisStatus('idle'); setLastDate(null);
  }

  // Merge WP posts into piano for counts
  const pianoByStatus = STATUS_TABS.reduce((acc, tab) => {
    if (tab.id === 'da_scrivere') {
      acc[tab.id] = piano.filter(i => (i.status || 'da_scrivere') === tab.id).length;
    } else if (tab.id === 'programmato') {
      acc[tab.id] = wpPosts.filter(p => p.wpStatus === 'future').length;
    } else if (tab.id === 'pubblicato') {
      acc[tab.id] = wpPosts.filter(p => p.wpStatus === 'publish').length;
    }
    return acc;
  }, {});

  const filteredPiano = 
    statusFilter === 'da_scrivere' ? piano.filter(i => (i.status || 'da_scrivere') === 'da_scrivere') :
    statusFilter === 'programmato' ? wpPosts.filter(p => p.wpStatus === 'future') :
    statusFilter === 'pubblicato'  ? wpPosts.filter(p => p.wpStatus === 'publish') : [];

  const isLoading = statusFilter === 'da_scrivere' ? pianoLoading : wpLoading;

  const handleCopyBrief = (item) => {
    const title = item.title || item.wpTitle || '';
    const kw = item.kw || '';
    const diff = item.diff || 'Media';
    
    const briefText = `---
Argomento: ${title}
Keyword principale: ${kw}
Keyword secondarie: 
Volume stimato: 
Intento di ricerca: 
Difficoltà SEO: ${diff}
Competitor principali: 
Note per il brief: 
---`;
    
    navigator.clipboard.writeText(briefText);
    const id = item.id || item.wpId;
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleGenerateManual = async () => {
    if (!manualBrief.trim()) return;
    setIsGeneratingManual(true);
    try {
      const data = await analyzeManualBrief(manualBrief);
      const newItem = {
        title: data.title || manualBrief.slice(0, 50),
        kw: data.kw || '',
        diff: data.diff || 'Media',
        cat: data.cat || 'News',
        url: '', 
        source: 'manual',
        status: 'da_scrivere',
        date: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'pianoEditoriale'), newItem);
      const withId = { id: docRef.id, ...newItem };
      setPiano(prev => [withId, ...prev]);
      setManualBrief('');
      setStatusFilter('da_scrivere');
    } catch (err) {
      console.error('Error adding manual brief:', err);
    } finally {
      setIsGeneratingManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-xl">
                <Telescope className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm sm:text-base leading-tight">CosmoNet Trend Scout</div>
                <div className="text-[10px] text-slate-500 italic hidden sm:block">"Su cosa scrivere questa settimana?"</div>
              </div>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex">
            {[
              { id: 'analisi', label: 'Analisi', icon: Sparkles },
              { id: 'piano',   label: 'Piano',   icon: BookOpen  },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 cursor-pointer transition-colors",
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <tab.icon className="w-4 h-4" />{tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* ─── ANALISI TAB ─── */}
        {activeTab === 'analisi' && (
          <div className="space-y-6">

            {/* Topic selector card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Scegli il settore
                </h2>
                {lastDate && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(lastDate).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                    <button onClick={clearAnalysis} className="text-rose-400 hover:text-rose-500 ml-1 underline">reset</button>
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {TOPICS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-semibold border-2 cursor-pointer transition-all active:scale-95",
                      selectedTopic === t.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                        : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAnalyze}
                disabled={!selectedTopic || analysisStatus === 'loading'}
                className="btn-premium btn-indigo"
              >
                {analysisStatus === 'loading'
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Analisi in corso...</>
                  : <><Zap className="w-4 h-4" />Analizza Ora</>
                }
              </button>
            </div>

            {/* Error */}
            {analysisStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-start">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 text-sm">{error}</p>
                  <button onClick={handleAnalyze} className="text-xs text-red-600 underline mt-1">Riprova</button>
                </div>
              </div>
            )}

            {/* Loading */}
            {analysisStatus === 'loading' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600 font-medium">{phase}</p>
              </div>
            )}

            {/* Results */}
            {analysisStatus === 'done' && result && (
              <div className="space-y-6">
                {/* Insight banner */}
                <div className="bg-indigo-600 rounded-2xl p-5 text-white">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />Insight della Settimana
                  </div>
                  <p className="text-sm sm:text-base font-medium italic leading-relaxed">"{result.insight_editoriale}"</p>
                </div>

                {/* 2-col grid: news | ideas */}
                <div className="grid lg:grid-cols-12 gap-5">

                  {/* News sidebar */}
                  <div className="lg:col-span-4">
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Newspaper className="w-3.5 h-3.5" />News ({news.length})
                        </span>
                      </div>
                      <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                        {news.map((n, i) => (
                          <a key={i} href={n.link} target="_blank" rel="noreferrer"
                            className="flex items-start gap-2 p-3 hover:bg-slate-50 group transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-0.5">{n.source}</div>
                              <div className="text-xs font-medium text-slate-800 leading-snug group-hover:text-indigo-600 line-clamp-2">{n.title}</div>
                            </div>
                            <ExternalLink className="w-3 h-3 text-slate-300 shrink-0 mt-0.5 group-hover:text-indigo-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Article ideas */}
                  <div className="lg:col-span-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />Idee Articolo
                      </span>
                      <span className="text-xs text-slate-400">{savedIds.size}/{result.articles.length} salvati</span>
                    </div>
                    {result.articles.map((article, i) => {
                      const isSaved = savedIds.has(article.title);
                      const urgenzaColor =
                        article.urgenza === 'alta'  ? 'border-l-rose-500'  :
                        article.urgenza === 'media' ? 'border-l-amber-400' : 'border-l-slate-300';
                      return (
                        <div key={i} className={cn("bg-white rounded-2xl border border-slate-200 border-l-4 p-4 shadow-sm", urgenzaColor)}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded",
                                  article.urgenza === 'alta' ? 'bg-rose-100 text-rose-700' :
                                  article.urgenza === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                                  {article.urgenza}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">{article.tipo}</span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug mb-2">{article.title}</h4>
                              <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{article.rationale}</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[11px] font-bold">
                                  <Search className="w-3 h-3" />{article.keyword_principale}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                  <TrendingUp className="w-3 h-3" />{article.stima_traffico}
                                </span>
                              </div>
                            </div>
                            <button
                              disabled={isSaved}
                              onClick={() => handleSaveOne(article)}
                              className={cn("shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                                isSaved
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700")}
                            >
                              {isSaved ? <><CheckCircle2 className="w-3.5 h-3.5" />Salvato</> : <><Plus className="w-3.5 h-3.5" />Piano</>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Keywords */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <TrendingUp className="w-4 h-4 text-amber-500" />Keyword Trending
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {result.trending_keywords.map((kw, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all">
                        <div className="text-[10px] text-slate-400 font-bold mb-1 flex justify-between">
                          {kw.volume_stimato}<ChevronRight className="w-3 h-3" />
                        </div>
                        <div className="text-xs font-bold text-slate-800 mb-2 leading-snug">{kw.keyword}</div>
                        <span className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                          kw.competizione === 'bassa' ? 'bg-emerald-100 text-emerald-700' :
                          kw.competizione === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                          {kw.competizione}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Idle state */}
            {analysisStatus === 'idle' && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5 rotate-3">
                  <Telescope className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Seleziona un settore</h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto">Analizziamo news, Reddit e keyword reali per suggerire i migliori argomenti della settimana.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── PIANO TAB ─── */}
        {activeTab === 'piano' && (
          <div className="space-y-4">


            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />Piano Editoriale
              </h2>
              <button
                onClick={() => { loadPiano(); loadWordPress(); }}
                disabled={pianoLoading || wpLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-300 cursor-pointer transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", (pianoLoading || wpLoading) && "animate-spin")} />
                Aggiorna
              </button>
            </div>

            {/* Manual Brief Input (Dark Mode Style) */}
            <div className="bg-[#0b1120] rounded-2xl border border-slate-800 p-5 shadow-lg">
              <h3 className="text-cyan-400 font-black text-[11px] tracking-widest uppercase mb-4">
                Aggiungi Argomento Manualmente
              </h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <textarea
                    value={manualBrief}
                    onChange={(e) => setManualBrief(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.ctrlKey && e.key === 'Enter') {
                        e.preventDefault();
                        handleGenerateManual();
                      }
                    }}
                    placeholder="Es: Come usare Ollama su Linux... oppure incolla un brief dettagliato con dati verificati."
                    className="w-full bg-transparent border border-slate-700/50 rounded-xl p-4 text-slate-300 placeholder:text-slate-600 text-sm min-h-[90px] focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-y transition-colors"
                  />
                  <div className="absolute right-4 bottom-[-24px] text-right">
                    <span className="text-[10px] text-slate-600 font-medium tracking-wide">
                      Ctrl+Enter per generare &middot; Puoi incollare brief dettagliati con dati verificati
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleGenerateManual}
                  disabled={isGeneratingManual || !manualBrief.trim()}
                  className="px-8 bg-indigo-900/40 hover:bg-indigo-800/60 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-500/20 text-indigo-300 font-bold tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center min-h-[90px]"
                >
                  {isGeneratingManual ? <Loader2 className="w-5 h-5 animate-spin" /> : 'GENERA'}
                </button>
              </div>
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2 pt-6">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all",
                    statusFilter === tab.id
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", tab.dot)} />
                  {tab.label}
                  {tab.id !== 'da_scrivere'
                    ? <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black", statusFilter === tab.id ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
                        {wpLoading ? '…' : pianoByStatus[tab.id]}
                      </span>
                    : <span className={cn("ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black", statusFilter === tab.id ? "bg-white/20" : "bg-slate-100 text-slate-500")}>
                        {pianoByStatus[tab.id] || 0}
                      </span>
                  }
                </button>
              ))}
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Caricamento...</p>
              </div>
            ) : filteredPiano.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  {statusFilter !== 'da_scrivere' ? <Globe className="w-6 h-6 text-slate-400" /> : <BookOpen className="w-6 h-6 text-slate-400" />}
                </div>
                <p className="font-semibold text-slate-700 text-sm">Nessun contenuto</p>
                <p className="text-slate-400 text-xs mt-1">
                  {statusFilter === 'da_scrivere' && 'Aggiungi idee dall\'analisi trend.'}
                  {statusFilter === 'programmato'  && 'Nessun articolo in programmazione su WordPress.'}
                  {statusFilter === 'pubblicato'   && 'Nessun articolo pubblicato su WordPress.'}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="sm:hidden space-y-3">
                  {filteredPiano.map((item, i) => (
                    <div key={item.id || i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-bold text-slate-800 text-sm leading-snug flex-1">
                          {item.title || item.wpTitle || '—'}
                        </h4>
                        {statusFilter !== 'da_scrivere' && item.wpLink && (
                          <a href={item.wpLink} target="_blank" rel="noreferrer" className="shrink-0 text-blue-500">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.kw && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                            <Search className="w-2.5 h-2.5" />{item.kw}
                          </span>
                        )}
                        {item.cat && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.cat}</span>
                        )}
                        {item.diff && (
                          <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", DIFF_BADGE[item.diff] || 'bg-slate-100 text-slate-500')}>{item.diff}</span>
                        )}
                        {item.wpStatus && (
                          <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded",
                            item.wpStatus === 'publish' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')}>
                            {item.wpStatus === 'publish' ? '✓ Live' : '🕐 Scheduled'}
                          </span>
                        )}
                        {item.date && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      {filteredPiano.map((item, i) => {
                        const isWP = !!item.wpId;
                        const isPublished = isWP ? item.wpStatus === 'publish' : item.status === 'pubblicato';
                        const title = item.title || item.wpTitle || '—';
                        const dateObj = item.date ? new Date(item.date) : null;
                        const month = dateObj ? dateObj.toLocaleString('it-IT', { month: 'long' }) : '—';
                        const year = dateObj ? dateObj.getFullYear() : '';
                        
                        return (
                          <tr key={item.id || item.wpId || i} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-5 px-4 w-12 text-center align-top">
                              <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 w-4 h-4 mt-1" />
                            </td>
                            <td className="py-5 px-4 w-12 text-center align-top">
                              <span className="text-xs font-medium text-slate-400 mt-1 block">{i + 1}</span>
                            </td>
                            <td className="py-5 px-4 w-[40%] align-top">
                              <div className={cn("font-bold text-sm mb-2.5 line-clamp-2", isPublished ? "text-slate-400 line-through decoration-slate-300" : "text-slate-800")}>
                                {title}
                              </div>
                              <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold uppercase tracking-wider">
                                {isWP ? (
                                  <span className="flex items-center gap-1.5 text-emerald-600">
                                    <RefreshCw className="w-3 h-3" /> WP
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <BookOpen className="w-3 h-3" /> PIANO
                                  </span>
                                )}
                                
                                {item.wpLink ? (
                                  <a href={item.wpLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-500 hover:text-blue-700">
                                    <ExternalLink className="w-3 h-3" /> PUBBLICATO
                                  </a>
                                ) : (item.url || item.link) ? (
                                  <a href={item.url || item.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-500 hover:text-blue-700">
                                    <ExternalLink className="w-3 h-3" /> APRI FONTE
                                  </a>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-slate-400">
                                    <ExternalLink className="w-3 h-3" /> NESSUNA FONTE
                                  </span>
                                )}
                                
                                <button 
                                  onClick={() => handleCopyBrief(item)}
                                  className={cn("flex items-center gap-1.5 transition-colors", 
                                    (copiedId === (item.id || item.wpId)) ? "text-emerald-600 hover:text-emerald-700" : "text-indigo-500 hover:text-indigo-700"
                                  )}
                                >
                                  {(copiedId === (item.id || item.wpId)) ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  {(copiedId === (item.id || item.wpId)) ? 'COPIATO!' : 'COPIA BRIEF'}
                                </button>
                              </div>
                            </td>
                            <td className="py-5 px-4 align-top text-center w-[15%]">
                              <div className="flex flex-col items-center gap-2">
                                {item.cat ? (
                                  <span className="inline-block px-3 py-1 bg-emerald-50/80 text-emerald-700 font-bold text-[11px] rounded transition-colors border border-emerald-100/50">
                                    {item.cat}
                                  </span>
                                ) : <span className="text-slate-300 text-xs">—</span>}
                                <button className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[9px] uppercase tracking-wider rounded transition-colors w-full text-center">
                                  CHECK SEO
                                </button>
                              </div>
                            </td>
                            <td className="py-5 px-4 align-top text-center w-[5%]">
                              <span className="text-slate-300 text-sm mt-1 block">—</span>
                            </td>
                            <td className="py-5 px-4 text-center align-top w-[10%]">
                              {item.diff ? (
                                <span className={cn("inline-block px-2.5 py-1 font-black text-[10px] rounded", item.diff.toLowerCase() === 'bassa' ? "bg-emerald-50 text-emerald-600" : DIFF_BADGE[item.diff] || 'bg-slate-100 text-slate-500')}>
                                  {item.diff}
                                </span>
                              ) : <span className="text-slate-300 text-xs mt-1 block">—</span>}
                            </td>
                            <td className="py-5 px-4 text-center align-top w-[10%] text-slate-800">
                              {dateObj ? (
                                <>
                                  <div className="font-bold text-xs capitalize mb-1">{month}</div>
                                  <div className="text-[10px] text-slate-400 font-medium">{year}</div>
                                </>
                              ) : <span className="text-slate-300 text-xs mt-1 block">—</span>}
                            </td>
                            <td className="py-5 px-4 text-center align-top w-[10%]">
                              <span className={cn("inline-block px-3 py-1 font-bold text-[11px] rounded-full", 
                                isPublished ? "bg-emerald-50 text-emerald-600" :
                                (isWP && item.wpStatus === 'future') || item.status === 'programmato' ? "bg-amber-50 text-amber-600" :
                                "bg-slate-100 text-slate-500"
                              )}>
                                {isPublished ? 'Pubblicato' : (isWP && item.wpStatus === 'future') || item.status === 'programmato' ? 'Programmato' : 'Da Scrivere'}
                              </span>
                            </td>
                            <td className="py-5 px-4 text-right align-top w-[5%]">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                                  <Search className="w-3.5 h-3.5" />
                                </button>
                                {!isWP && (
                                  <button className="w-7 h-7 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors">
                                    <AlertCircle className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-6 border-t border-slate-100 text-center mt-6">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">
          CosmoNet Trend Scout &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
