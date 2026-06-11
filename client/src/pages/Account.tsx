import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../lib/axios';

// ── Hesabı sil onay modalı ────────────────────────────────────────────────────
function DeleteModal({ onConfirm, onClose, loading, error, password, setPassword }: {
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  error: string;
  password: string;
  setPassword: (v: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#12121a] border border-[#2a2a3e] rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4m0 4h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="1.8"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white text-center mb-3">Hesabı Sil</h2>
        <p className="text-gray-400 text-sm text-center mb-5 leading-relaxed">
          Bu işlem <span className="text-red-400 font-medium">geri alınamaz</span>. Hesabınız ve tüm
          analiz geçmişiniz kalıcı olarak silinecek. Onaylamak için şifrenizi girin.
        </p>
        <input
          type="password"
          placeholder="Şifreniz"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-red-500/50 transition-all mb-3"
        />
        {error && <p className="text-red-400 text-xs text-center mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="btn-hover flex-1 py-3 rounded-xl border border-[#2a2a3e] text-gray-300 font-semibold text-sm hover:bg-white/5 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || !password}
            className="btn-hover flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Siliniyor...' : 'Hesabı Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Plan rozeti ───────────────────────────────────────────────────────────────
function planBadge(plan: string) {
  if (plan === 'PRO') return { label: '⚜ Pro', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
  if (plan === 'STARTER') return { label: 'Starter', cls: 'text-[#00d4ff] bg-[#00d4ff]/10 border-[#00d4ff]/30' };
  return { label: 'Free', cls: 'text-gray-400 bg-white/5 border-white/10' };
}

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Şifre değiştirme
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError]     = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  // Hesap silme
  const [showDelete, setShowDelete]   = useState(false);
  const [delPassword, setDelPassword] = useState('');
  const [delLoading, setDelLoading]   = useState(false);
  const [delError, setDelError]       = useState('');

  const badge = planBadge(user?.plan ?? 'FREE');
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwError(''); setPwSuccess('');
    if (!current || !next) { setPwError('Mevcut ve yeni şifre gerekli.'); return; }
    if (next.length < 6) { setPwError('Yeni şifre en az 6 karakter olmalı.'); return; }
    if (next !== confirm) { setPwError('Yeni şifreler eşleşmiyor.'); return; }
    setPwLoading(true);
    try {
      await api.patch('/api/auth/password', { currentPassword: current, newPassword: next });
      setPwSuccess('Şifreniz başarıyla güncellendi.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setPwError(msg ?? 'Şifre değiştirilemedi.');
    } finally {
      setPwLoading(false);
    }
  }

  async function handleDelete() {
    setDelError('');
    setDelLoading(true);
    try {
      await api.delete('/api/auth/account', { data: { password: delPassword } });
      logout();
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setDelError(msg ?? 'Hesap silinemedi.');
      setDelLoading(false);
    }
  }

  const inputCls = 'w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-[#00d4ff]/60 focus:ring-1 focus:ring-[#00d4ff]/20 transition-all';

  return (
    <div className="relative min-h-screen">
      <Navbar />

      {showDelete && (
        <DeleteModal
          onConfirm={handleDelete}
          onClose={() => { setShowDelete(false); setDelPassword(''); setDelError(''); }}
          loading={delLoading}
          error={delError}
          password={delPassword}
          setPassword={setDelPassword}
        />
      )}

      <main className="relative max-w-2xl mx-auto px-4 pt-28 pb-20">
        {/* Başlık */}
        <div className="mb-8">
          <Link to="/analyze" className="btn-hover inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#00d4ff] mb-4 px-2 py-1 rounded-lg group">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M8 3L4 7l4 4M4 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Geri
          </Link>
          <h1 className="text-2xl font-bold text-white">Hesap Ayarları</h1>
        </div>

        {/* Hesap bilgileri */}
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">Hesap Bilgileri</h2>
          <div className="divide-y divide-[#1e1e2e]">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-400">E-posta</span>
              <span className="text-sm text-white font-medium truncate max-w-[60%]">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-400">Plan</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-400">Kalan analiz</span>
              <span className="text-sm text-white font-medium">{user?.plan === 'PRO' ? '∞ Sınırsız' : `${user?.tokens ?? 0} token`}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-400">Üyelik tarihi</span>
              <span className="text-sm text-white font-medium">{memberSince}</span>
            </div>
          </div>
        </div>

        {/* Şifre değiştirme */}
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-6 mb-6">
          <h2 className="text-base font-semibold text-white mb-4">Şifre Değiştir</h2>

          {pwError && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-[#39ff14]/10 border border-[#39ff14]/20 text-[#39ff14] text-sm text-center">
              {pwSuccess}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Mevcut Şifre</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="••••••••" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Yeni Şifre</label>
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="En az 6 karakter" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Yeni Şifre (Tekrar)</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className={inputCls} />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              className="btn-hover w-full py-3 rounded-xl bg-[#00d4ff] text-[#0a0a0f] font-semibold text-sm hover:bg-[#00bce0] disabled:opacity-50"
            >
              {pwLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </div>

        {/* Tehlikeli bölge */}
        <div className="bg-[#12121a] border border-red-500/30 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-red-400 mb-2">Tehlikeli Bölge</h2>
          <p className="text-gray-400 text-sm mb-4 leading-relaxed">
            Hesabınızı sildiğinizde tüm analiz geçmişiniz kalıcı olarak silinir ve geri alınamaz.
          </p>
          <button
            onClick={() => setShowDelete(true)}
            className="btn-hover py-2.5 px-5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/20"
          >
            Hesabı Sil
          </button>
        </div>
      </main>
    </div>
  );
}
