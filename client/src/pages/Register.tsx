import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password);
      navigate('/');
    } catch {
      setError('Kayıt başarısız. Bu e-posta zaten kullanımda olabilir.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#8b5cf6]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-[#00d4ff]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-tight text-white">
            Accessi<span className="text-[#00d4ff]">Scan</span>
          </span>
          <p className="text-gray-500 text-sm mt-1">Ücretsiz hesap oluştur</p>
        </div>

        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">E-posta</label>
              <input
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#00d4ff]/60 focus:ring-1 focus:ring-[#00d4ff]/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Şifre</label>
              <input
                type="password"
                placeholder="En az 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#00d4ff]/60 focus:ring-1 focus:ring-[#00d4ff]/20 transition-all"
                minLength={6}
                required
              />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <div className="w-4 h-4 mt-0.5 rounded border border-[#1e1e2e] bg-[#0a0a0f] flex-shrink-0" />
              <p className="text-xs text-gray-500">
                Kayıt olarak{' '}
                <span className="text-[#00d4ff]">Kullanım Koşulları</span>'nı kabul etmiş olursunuz.
                Başlangıçta 5 ücretsiz token alırsınız.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-lg bg-[#00d4ff] hover:bg-[#00a8cc] text-black font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: '0 0 20px rgba(0,212,255,0.25)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Hesap oluşturuluyor...
                </span>
              ) : 'Kayıt Ol'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Zaten hesabın var mı?{' '}
            <Link to="/login" className="text-[#00d4ff] hover:text-[#00a8cc] transition-colors">
              Giriş yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
