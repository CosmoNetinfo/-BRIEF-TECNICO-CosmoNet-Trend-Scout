import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase.js';
import { Telescope, Loader2, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // App.jsx will re-render automatically via onAuthStateChanged in main.jsx
    } catch (err) {
      const messages = {
        'auth/invalid-credential':    'Email o password non corretti.',
        'auth/user-not-found':        'Nessun account trovato con questa email.',
        'auth/wrong-password':        'Password non corretta.',
        'auth/too-many-requests':     'Troppi tentativi. Riprova tra qualche minuto.',
        'auth/invalid-email':         'Indirizzo email non valido.',
      };
      setError(messages[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-200 mb-4">
            <Telescope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">CosmoNet Trend Scout</h1>
          <p className="text-sm text-slate-500 mt-1">Accedi per continuare</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tuaemail@cosmonet.info"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl transition-colors cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Crea il tuo account dalla Firebase Console.
        </p>
      </div>
    </div>
  );
}
