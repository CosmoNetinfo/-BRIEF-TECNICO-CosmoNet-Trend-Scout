import { useState, useCallback } from 'react';
import { 
  Telescope, 
  TrendingUp, 
  Newspaper, 
  Lightbulb, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  ExternalLink,
  ChevronRight,
  Search,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { fetchNewsForTopic } from './services/newsService.js';
import { fetchTrendingKeywords } from './services/keywordService.js';
import { generateArticleIdeas } from './services/groqService.js';
import { saveIdeaToPiano } from './services/firebaseService.js';
import { TOPICS } from './config/sources.js';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SITE_CONTEXT = 'cosmonet.info — blog italiano su AI, Linux, Open Source, Gaming, WordPress';

export default function App() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [phase, setPhase] = useState('');
  const [result, setResult] = useState(null);
  const [news, setNews] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());
  const [error, setError] = useState('');

  const handleAnalyze = useCallback(async () => {
    if (!selectedTopic) return;

    setStatus('loading');
    setError('');
    setResult(null);
    setNews([]);
    setSavedIds(new Set());

    const topic = TOPICS.find(t => t.id === selectedTopic);

    try {
      setPhase(`🔭 Raccolta news su ${topic.label}...`);
      const fetchedNews = await fetchNewsForTopic(selectedTopic);
      setNews(fetchedNews);

      setPhase('🎯 Analisi keyword e domande degli utenti...');
      const { keywords, peopleAlsoAsk } = await fetchTrendingKeywords(
        topic.label,
        'cosmonet.info'
      );

      setPhase('✨ L\'IA sta generando il tuo piano editoriale...');
      const ideas = await generateArticleIdeas({
        news: fetchedNews,
        keywords,
        peopleAlsoAsk,
        topic: topic.label,
        siteContext: SITE_CONTEXT,
      });

      setResult(ideas);
      setStatus('done');

    } catch (e) {
      console.error(e);
      setError(e.message);
      setStatus('error');
    }
  }, [selectedTopic]);

  async function handleSaveOne(article) {
    try {
      await saveIdeaToPiano(article, selectedTopic);
      setSavedIds(prev => new Set([...prev, article.title]));
    } catch (e) {
      alert('Errore salvataggio: ' + e.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <Telescope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">CosmoNet Trend Scout</h1>
              <p className="text-xs text-slate-500 font-medium italic">"Su cosa devo scrivere questa settimana?"</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Live Analysis</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Topic Selector */}
        <div className="card-premium mb-8 text-center sm:text-left">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Scegli un settore da esplorare
          </h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            {TOPICS.map(topic => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={cn(
                  "px-5 py-3 rounded-2xl font-bold transition-all duration-300 border-2 cursor-pointer active:scale-95",
                  selectedTopic === topic.id 
                    ? `bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200`
                    : "bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/30"
                )}
              >
                {topic.label}
              </button>
            ))}
            
            <button
              onClick={handleAnalyze}
              disabled={!selectedTopic || status === 'loading'}
              className="sm:ml-4 btn-premium btn-indigo px-8"
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analisi in corso...
                </>
              ) : (
                <>
                  Analizza Ora
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error State */}
        {status === 'error' && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <h3 className="text-red-900 font-bold mb-1">Qualcosa è andato storto</h3>
              <p className="text-red-700 text-sm whitespace-pre-wrap">{error}</p>
              <button 
                onClick={handleAnalyze}
                className="mt-4 text-sm font-bold text-red-700 hover:text-red-900 underline"
              >
                Riprova l'analisi
              </button>
            </div>
          </div>
        )}

        {/* Loading Phase */}
        {status === 'loading' && (
          <div className="card-premium mb-8 animate-pulse text-center py-12">
            <div className="bg-indigo-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
            <p className="text-slate-600 font-medium tracking-tight text-lg">{phase}</p>
            <p className="text-slate-400 text-sm mt-2">L'IA sta consultando news e segnali di traffico dall'Italia.</p>
          </div>
        )}

        {/* Results */}
        {status === 'done' && result && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Insight Box */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[32px] p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 rounded-full -ml-10 -mb-10 blur-2xl" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 opacity-90 uppercase tracking-widest text-[10px] font-bold">
                  <Lightbulb className="w-4 h-4" />
                  Consiglio Strategico della Settimana
                </div>
                <p className="text-xl sm:text-2xl font-medium leading-relaxed italic">
                  "{result.insight_editoriale}"
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* News Panel */}
              <div className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight text-sm">
                    <Newspaper className="w-4 h-4 text-slate-400" />
                    News Raccolte
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {news.length} SORGENTI
                  </span>
                </div>
                <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-sm h-[600px] overflow-y-auto">
                  <div className="divide-y divide-slate-50">
                    {news.map((n, i) => (
                      <a 
                        key={i} 
                        href={n.link} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-5 block hover:bg-slate-50 group transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                            {n.source}
                          </span>
                          <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                          {n.title}
                        </h4>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ideas Grid */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight text-sm">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Suggerimenti Editoriali
                  </h3>
                  <span className="text-xs font-medium text-slate-500">
                    Generati da {result.articles.length} intersezioni
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {result.articles.map((article, i) => {
                    const isSaved = savedIds.has(article.title);
                    
                    return (
                      <div key={i} className="card-premium relative overflow-hidden group">
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1.5",
                          article.urgenza === 'alta' ? 'bg-rose-500' : 
                          article.urgenza === 'media' ? 'bg-amber-400' : 'bg-slate-300'
                        )} />

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                          <div className="space-y-4 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={cn(
                                "pill",
                                article.urgenza === 'alta' ? 'pill-danger' : 
                                article.urgenza === 'media' ? 'pill-warning' : 'bg-slate-50 border-slate-200 text-slate-500'
                              )}>
                                {article.urgenza === 'alta' ? 'Alta Urgenza' : 
                                 article.urgenza === 'media' ? 'Media Urgenza' : 'Bassa Urgenza'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {article.tipo}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-xl font-bold text-slate-900 mb-2 leading-tight">
                                {article.title}
                              </h4>
                              <p className="text-sm text-slate-500 italic mb-4 leading-relaxed line-clamp-2">
                                {article.rationale}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                                <Search className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-bold text-slate-700">{article.keyword_principale}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <TrendingUp className="w-3 h-3" />
                                Traffico Stimato: <span className="text-slate-600">{article.stima_traffico}</span>
                              </div>
                            </div>
                          </div>

                          <div className="sm:shrink-0 flex sm:flex-col gap-2">
                            <button
                              disabled={isSaved}
                              onClick={() => handleSaveOne(article)}
                              className={cn(
                                "btn-premium flex-1 sm:flex-none",
                                isSaved 
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                  : "btn-indigo"
                              )}
                            >
                              {isSaved ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  Salvato
                                </>
                              ) : (
                                <>
                                  <Plus className="w-4 h-4" />
                                  Piano
                                </>
                              )}
                            </button>
                            <button className="btn-premium btn-ghost border border-slate-100 bg-white">
                              Ignora
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Keyword Grid */}
            <div className="card-premium border-2 border-indigo-50 bg-white shadow-xl shadow-indigo-100/20">
              <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                Keyword Trending per cosmonet.info
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {result.trending_keywords.map((kw, i) => (
                  <div key={i} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all hover:-translate-y-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                      {kw.volume_stimato} vol.
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                    </div>
                    <div className="font-bold text-slate-800 mb-3 break-words">
                      {kw.keyword}
                    </div>
                    <div className={cn(
                       "text-[9px] font-black uppercase px-2 py-0.5 rounded inline-block",
                       kw.competizione === 'bassa' ? 'bg-emerald-100 text-emerald-700' :
                       kw.competizione === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    )}>
                      Comp. {kw.competizione}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Idle State */}
        {status === 'idle' && (
          <div className="text-center py-20 px-4">
            <div className="bg-white w-24 h-24 rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-8 border border-slate-100 rotate-3">
              <Telescope className="w-12 h-12 text-indigo-600" />
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Sintonizzati con i Trend</h3>
            <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-lg">
              Seleziona un settore sopra per scoprire su cosa scrivere oggi. 
              Analizziamo news, subreddit e query reali per darti suggerimenti ad alto traffico.
            </p>
          </div>
        )}

      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-100 text-center">
        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
          CosmoNet Trend Scout &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
