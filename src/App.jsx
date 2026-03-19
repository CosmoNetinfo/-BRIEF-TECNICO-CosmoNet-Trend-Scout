import { useState, useCallback, useEffect } from 'react';
import { 
  Telescope, TrendingUp, Newspaper, Lightbulb,
  ArrowRight, CheckCircle2, Plus, ExternalLink,
  ChevronRight, Search, AlertCircle, Loader2,
  Sparkles, BookOpen, Clock, RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { fetchNewsForTopic } from './services/newsService.js';
import { fetchTrendingKeywords } from './services/keywordService.js';
import { generateArticleIdeas } from './services/groqService.js';
import { saveIdeaToPiano, fetchPianoEditoriale } from './services/firebaseService.js';
import { TOPICS } from './config/sources.js';

function cn(...inputs) { return twMerge(clsx(inputs)); }

const SITE_CONTEXT = 'cosmonet.info — blog italiano su AI, Linux, Open Source, Gaming, WordPress';
const LS_KEY = 'trend_scout_last_analysis';

const STATUS_TABS = [
  { id: 'da_scrivere',  label: 'Da Scrivere',  color: 'bg-slate-100 text-slate-700'   },
  { id: 'programmato',  label: 'Programmato',   color: 'bg-amber-100 text-amber-700'   },
  { id: 'pubblicato',   label: 'Pubblicato',    color: 'bg-emerald-100 text-emerald-700'},
];

const DIFF_MAP = {
  alta:  'bg-rose-100 text-rose-700',
  media: 'bg-amber-100 text-amber-700',
  bassa: 'bg-slate-100 text-slate-600',
};

export default function App() {
  const [activeTab, setActiveTab]         = useState('analisi');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [status, setStatus]               = useState('idle');
  const [phase, setPhase]                 = useState('');
  const [result, setResult]               = useState(null);
  const [news, setNews]                   = useState([]);
  const [savedIds, setSavedIds]           = useState(new Set());
  const [error, setError]                 = useState('');
  const [lastAnalysisDate, setLastAnalysisDate] = useState(null);

  // Piano
  const [piano, setPiano]         = useState([]);
  const [pianoLoading, setPianoLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('da_scrivere');

  // Load last analysis from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const { result: r, news: n, topic, savedIds: ids, date } = JSON.parse(saved);
        setResult(r); setNews(n || []); setSelectedTopic(topic);
        setSavedIds(new Set(ids || [])); setLastAnalysisDate(date); setStatus('done');
      }
    } catch { /* ignore */ }
  }, []);

  const loadPiano = useCallback(async () => {
    setPianoLoading(true);
    const items = await fetchPianoEditoriale(100);
    setPiano(items);
    setPianoLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'piano') loadPiano();
  }, [activeTab, loadPiano]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedTopic) return;
    setStatus('loading'); setError(''); setResult(null); setNews([]); setSavedIds(new Set());
    const topic = TOPICS.find(t => t.id === selectedTopic);
    try {
      setPhase(`🔭 Raccolta news su ${topic.label}...`);
      const fetchedNews = await fetchNewsForTopic(selectedTopic);
      setNews(fetchedNews);

      setPhase('🎯 Analisi keyword e domande degli utenti...');
      const { keywords, peopleAlsoAsk } = await fetchTrendingKeywords(topic.label, 'cosmonet.info');

      setPhase('✨ L\'IA sta generando il tuo piano editoriale...');
      const ideas = await generateArticleIdeas({
        news: fetchedNews, keywords, peopleAlsoAsk,
        topic: topic.label, siteContext: SITE_CONTEXT,
      });

      const date = new Date().toISOString();
      setResult(ideas); setLastAnalysisDate(date); setStatus('done');
      localStorage.setItem(LS_KEY, JSON.stringify({ result: ideas, news: fetchedNews, topic: selectedTopic, savedIds: [], date }));
    } catch (e) {
      setError(e.message); setStatus('error');
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
    } catch (e) { alert('Errore salvataggio: ' + e.message); }
  }

  function clearAnalysis() {
    localStorage.removeItem(LS_KEY);
    setResult(null); setNews([]); setSavedIds(new Set()); setStatus('idle'); setLastAnalysisDate(null);
  }

  const filteredPiano = piano.filter(i => (i.status || 'da_scrivere') === statusFilter);

  const pianoCountByStatus = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.id] = piano.filter(i => (i.status || 'da_scrivere') === tab.id).length;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
                <Telescope className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">CosmoNet Trend Scout</h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium italic leading-tight">"Su cosa devo scrivere questa settimana?"</p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Live</span>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-0">
            {[{ id: 'analisi', label: 'Analisi Trend', icon: Sparkles }, { id: 'piano', label: 'Piano Editoriale', icon: BookOpen }].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-sm font-bold transition-all border-b-2 cursor-pointer whitespace-nowrap",
                  activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ── TAB: ANALISI ── */}
        {activeTab === 'analisi' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Topic Selector */}
            <div className="card-premium">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                  Scegli un settore
                </h2>
                {lastAnalysisDate && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    {new Date(lastAnalysisDate).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                    <button onClick={clearAnalysis} className="text-rose-400 hover:text-rose-500 underline font-medium">Reset</button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {TOPICS.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic.id)}
                    className={cn(
                      "px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl font-bold text-sm transition-all duration-200 border-2 cursor-pointer active:scale-95",
                      selectedTopic === topic.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                        : "bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30"
                    )}
                  >
                    {topic.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 sm:mt-5">
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedTopic || status === 'loading'}
                  className="btn-premium btn-indigo w-full sm:w-auto px-8"
                >
                  {status === 'loading' ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Analisi in corso...</>
                  ) : (
                    <>Analizza Ora<ArrowRight className="w-5 h-5" /></>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-red-900 font-bold mb-1">Qualcosa è andato storto</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                  <button onClick={handleAnalyze} className="mt-3 text-sm font-bold text-red-700 underline">Riprova</button>
                </div>
              </div>
            )}

            {/* Loading */}
            {status === 'loading' && (
              <div className="card-premium text-center py-14">
                <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
                </div>
                <p className="text-slate-600 font-medium text-base sm:text-lg">{phase}</p>
                <p className="text-slate-400 text-sm mt-2">L'IA sta consultando news e segnali di traffico.</p>
              </div>
            )}

            {/* Results */}
            {status === 'done' && result && (
              <div className="space-y-6 sm:space-y-8">
                {/* Insight */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3 opacity-90 uppercase tracking-widest text-[10px] font-bold">
                      <Lightbulb className="w-3.5 h-3.5" />Consiglio Strategico
                    </div>
                    <p className="text-lg sm:text-2xl font-medium leading-relaxed italic">"{result.insight_editoriale}"</p>
                  </div>
                </div>

                {/* News + Ideas grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
                  {/* News */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight text-xs">
                        <Newspaper className="w-4 h-4 text-slate-400" />News Raccolte
                      </h3>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{news.length}</span>
                    </div>
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm max-h-[400px] lg:max-h-[600px] overflow-y-auto">
                      <div className="divide-y divide-slate-50">
                        {news.map((n, i) => (
                          <a key={i} href={n.link} target="_blank" rel="noreferrer" className="p-4 block hover:bg-slate-50 group transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{n.source}</span>
                              <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">{n.title}</h4>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ideas */}
                  <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight text-xs">
                        <Lightbulb className="w-4 h-4 text-amber-500" />Suggerimenti
                      </h3>
                      <span className="text-xs text-slate-500">{savedIds.size}/{result.articles.length} salvati</span>
                    </div>
                    <div className="space-y-3">
                      {result.articles.map((article, i) => {
                        const isSaved = savedIds.has(article.title);
                        return (
                          <div key={i} className="card-premium relative overflow-hidden !p-4 sm:!p-6">
                            <div className={cn("absolute left-0 top-0 bottom-0 w-1",
                              article.urgenza === 'alta' ? 'bg-rose-500' :
                              article.urgenza === 'media' ? 'bg-amber-400' : 'bg-slate-300'
                            )} />
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="space-y-3 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={cn("pill text-[9px]",
                                    article.urgenza === 'alta' ? 'pill-danger' :
                                    article.urgenza === 'media' ? 'pill-warning' : 'bg-slate-50 border-slate-200 text-slate-500')}>
                                    {article.urgenza === 'alta' ? '🔴 Alta' : article.urgenza === 'media' ? '🟡 Media' : '⚪ Bassa'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{article.tipo}</span>
                                </div>
                                <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">{article.title}</h4>
                                <p className="text-xs sm:text-sm text-slate-500 italic leading-relaxed line-clamp-2">{article.rationale}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg">
                                    <Search className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-700">{article.keyword_principale}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                    <TrendingUp className="w-3 h-3" />
                                    <span className="text-slate-600">{article.stima_traffico}</span>
                                  </div>
                                </div>
                              </div>
                              <button
                                disabled={isSaved}
                                onClick={() => handleSaveOne(article)}
                                className={cn("btn-premium shrink-0 text-sm", isSaved ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "btn-indigo")}
                              >
                                {isSaved ? <><CheckCircle2 className="w-4 h-4" />Salvato</> : <><Plus className="w-4 h-4" />Piano</>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="card-premium border-2 border-indigo-50">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-5 flex items-center gap-3">
                    <div className="bg-amber-100 p-1.5 rounded-xl"><TrendingUp className="w-4 h-4 text-amber-600" /></div>
                    Keyword Trending
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {result.trending_keywords.map((kw, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          {kw.volume_stimato}<ChevronRight className="w-3 h-3 text-slate-300" />
                        </div>
                        <div className="font-bold text-slate-800 text-sm mb-2 break-words leading-snug">{kw.keyword}</div>
                        <div className={cn("text-[9px] font-black uppercase px-1.5 py-0.5 rounded inline-block",
                          kw.competizione === 'bassa' ? 'bg-emerald-100 text-emerald-700' :
                          kw.competizione === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>
                          {kw.competizione}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Idle */}
            {status === 'idle' && (
              <div className="text-center py-16 px-4">
                <div className="bg-white w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-6 border border-slate-100 rotate-3">
                  <Telescope className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">Sintonizzati con i Trend</h3>
                <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
                  Seleziona un settore per scoprire su cosa scrivere oggi.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PIANO EDITORIALE ── */}
        {activeTab === 'piano' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500" />
                Piano Editoriale
              </h2>
              <button onClick={loadPiano} disabled={pianoLoading} className="btn-premium btn-ghost border border-slate-200 text-sm">
                <RefreshCw className={cn("w-4 h-4", pianoLoading && "animate-spin")} />
                <span className="hidden sm:inline">Aggiorna</span>
              </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {STATUS_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-2",
                    statusFilter === tab.id
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-200"
                  )}
                >
                  {tab.label}
                  <span className={cn("ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black",
                    statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                    {pianoCountByStatus[tab.id] || 0}
                  </span>
                </button>
              ))}
            </div>

            {pianoLoading ? (
              <div className="card-premium text-center py-12">
                <Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Caricamento...</p>
              </div>
            ) : filteredPiano.length === 0 ? (
              <div className="card-premium text-center py-12">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-bold text-slate-700 mb-1">Nessun articolo</h3>
                <p className="text-slate-400 text-sm">
                  {statusFilter === 'da_scrivere' ? 'Aggiungi articoli dall\'analisi trend.' :
                   statusFilter === 'programmato'  ? 'Nessun articolo programmato.' :
                   'Nessun articolo pubblicato ancora.'}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="sm:hidden space-y-3">
                  {filteredPiano.map(item => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                      <h4 className="font-bold text-slate-800 text-sm leading-snug mb-3">{item.title}</h4>
                      <div className="flex flex-wrap gap-2">
                        {item.kw && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                            <Search className="w-2.5 h-2.5" />{item.kw}
                          </span>
                        )}
                        {item.cat && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{item.cat}</span>
                        )}
                        {item.diff && (
                          <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded", DIFF_MAP[item.diff] || 'bg-slate-100 text-slate-600')}>{item.diff}</span>
                        )}
                        <span className="text-[10px] text-slate-400">{item.source === 'trend-scout' ? '🔭 Scout' : '✏️ Manuale'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden sm:block bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm">
                  <table className="zebra-table">
                    <thead>
                      <tr>
                        <th>Titolo</th>
                        <th>Keyword</th>
                        <th>Categoria</th>
                        <th>Difficoltà</th>
                        <th>Fonte</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPiano.map(item => (
                        <tr key={item.id}>
                          <td className="font-semibold text-slate-800">
                            <div className="max-w-sm line-clamp-2">{item.title}</div>
                          </td>
                          <td>
                            {item.kw && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium whitespace-nowrap">
                                <Search className="w-3 h-3" />{item.kw}
                              </span>
                            )}
                          </td>
                          <td><span className="text-xs font-bold uppercase tracking-widest text-slate-500">{item.cat || '—'}</span></td>
                          <td>
                            {item.diff && (
                              <span className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded whitespace-nowrap", DIFF_MAP[item.diff] || 'bg-slate-100 text-slate-600')}>
                                {item.diff}
                              </span>
                            )}
                          </td>
                          <td><span className="text-xs text-slate-400 whitespace-nowrap">{item.source === 'trend-scout' ? '🔭 Scout' : '✏️ Manuale'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-8 border-t border-slate-100 text-center mt-6">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">
          CosmoNet Trend Scout &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
