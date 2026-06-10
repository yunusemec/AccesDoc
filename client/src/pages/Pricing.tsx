import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/axios';

// ── Onay Modalı ───────────────────────────────────────────────────────────────
function CancelModal({ onConfirm, onClose, loading }: {
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#12121a] border border-[#2a2a3e] rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* İkon */}
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4m0 4h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="9" stroke="#ef4444" strokeWidth="1.8"/>
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-3">
          Aboneliği İptal Et
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
          Aboneliğinizi iptal etmek istediğinize emin misiniz?{' '}
          <span className="text-red-400 font-medium">Tüm premium özellikler kaldırılacak</span>{' '}
          ve hesabınız Free plana geçecek.
        </p>

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
            disabled={loading}
            className="btn-hover flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/20 disabled:opacity-50"
          >
            {loading ? 'İptal ediliyor...' : 'Evet, İptal Et'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PlanInfo {
  name: string;
  price: number;
  tokens: number;
  features: string[];
  extraFeatures?: string[];
}

const FREE_PLAN: PlanInfo = {
  name: 'Free',
  price: 0,
  tokens: 5,
  features: [
    '5 analiz hakkı',
    'HTML erişilebilirlik analizi',
    'CSS erişilebilirlik analizi',
    'Otomatik düzeltme önizleme',
  ],
};

const STARTER_PLAN: PlanInfo = {
  name: 'Starter',
  price: 9900,
  tokens: 50,
  features: ["Free'deki her şey, artı:"],
  extraFeatures: [
    '50 analiz hakkı / ay',
    'URL ve HTML analizi',
    'Analiz geçmişi',
    'E-posta desteği',
  ],
};

const PRO_PLAN: PlanInfo = {
  name: 'Pro',
  price: 24900,
  tokens: 999999,
  features: ["Starter'daki her şey, artı:"],
  extraFeatures: [
    'Sınırsız analiz',
    'PDF rapor indirme',
    'Öncelikli destek',
    'API erişimi (yakında)',
    'Takım çalışması (yakında)',
  ],
};

function formatPrice(kurus: number): string {
  return `₺${(kurus / 100).toFixed(0)}`;
}

export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading]                   = useState<'STARTER' | 'PRO' | null>(null);
  const [error, setError]                       = useState('');
  const [infoMsg, setInfoMsg]                   = useState('');
  const [showCancelModal, setShowCancelModal]   = useState(false);
  const [cancelLoading, setCancelLoading]       = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  const currentPlan          = user?.plan ?? 'FREE';
  const subscriptionStatus   = user?.subscriptionStatus ?? null;
  const isCancelling         = subscriptionStatus === 'cancelling';

  async function handleCheckout(planKey: 'STARTER' | 'PRO') {
    if (!user) { navigate('/login'); return; }
    setLoading(planKey);
    setError('');
    try {
      const res = await api.post<{ url: string }>(
        '/api/payment/create-checkout',
        { plan: planKey },
      );
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Ödeme başlatılamadı.';
      setError(msg);
      setLoading(null);
    }
  }

  async function handleCancelSubscription() {
    setCancelLoading(true);
    try {
      const res = await api.delete<{ success: boolean; cancelAt: string; plan: string }>(
        '/api/payment/cancel-subscription',
      );
      console.log('[cancel] API response:', res.data);

      await refreshUser();

      // AuthContext'ten gelen güncel user'ı doğrudan okuyamayız (closure),
      // ama api.get('/api/auth/me') ile subscriptionStatus'u doğrulayalım
      const meRes = await api.get('/api/auth/me');
      console.log('[cancel] /me sonrası subscriptionStatus:', meRes.data.user?.subscriptionStatus);
      console.log('[cancel] isCancelling (beklenen true):', meRes.data.user?.subscriptionStatus === 'cancelling');

      setShowCancelModal(false);
      const cancelAt = new Date(res.data.cancelAt).toLocaleDateString('tr-TR', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      setInfoMsg(`Aboneliğiniz iptal edildi. ${cancelAt} tarihine kadar ${res.data.plan} özelliklerini kullanmaya devam edebilirsiniz.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'İptal işlemi başarısız.';
      setError(msg);
      setShowCancelModal(false);
    } finally {
      setCancelLoading(false);
    }
  }

  async function handleReactivate() {
    setReactivateLoading(true);
    setError('');
    try {
      await api.post('/api/payment/reactivate');
      await refreshUser();
      setInfoMsg('Aboneliğiniz yeniden aktifleştirildi!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Yeniden aktivasyon başarısız.';
      setError(msg);
    } finally {
      setReactivateLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen py-20 px-4">
      {/* Onay modalı */}
      {showCancelModal && (
        <CancelModal
          onConfirm={handleCancelSubscription}
          onClose={() => setShowCancelModal(false)}
          loading={cancelLoading}
        />
      )}

      {/* Geri butonu */}
      <div className="max-w-5xl mx-auto mb-8">
        <Link
          to="/"
          className="btn-hover inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#00d4ff] px-3 py-1.5 rounded-lg group"
        >
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            className="flex-shrink-0 group-hover:-translate-x-0.5 transition-transform duration-200"
          >
            <path d="M8 3L4 7l4 4M4 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Ana Sayfaya Dön
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-block bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          Fiyatlandırma
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">
          İhtiyacınıza Uygun Planı Seçin
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Erişilebilir bir web,{' '}
          <span className="text-[#00d4ff] font-semibold">herkes için daha iyi</span>{' '}
          bir web demektir.
        </p>
      </div>

      {error && (
        <div className="max-w-md mx-auto mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
          {error}
        </div>
      )}

      {infoMsg && (
        <div className="max-w-lg mx-auto mb-6 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-xl px-4 py-3 text-center">
          {infoMsg}
        </div>
      )}

      {/* Plan kartları */}
      <div className="flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto items-stretch justify-center">

        {/* FREE */}
        <PlanCard
          planKey="FREE"
          plan={FREE_PLAN}
          currentPlan={currentPlan}
          subscriptionStatus={subscriptionStatus}
          isPopular={false}
          loading={null}
          reactivateLoading={false}
          onSelect={() => {}}
          onCancel={() => {}}
          onReactivate={() => {}}
          isLoggedIn={!!user}
        />

        {/* STARTER */}
        <PlanCard
          planKey="STARTER"
          plan={STARTER_PLAN}
          currentPlan={currentPlan}
          subscriptionStatus={subscriptionStatus}
          isPopular={false}
          loading={loading}
          reactivateLoading={reactivateLoading}
          onSelect={() => handleCheckout('STARTER')}
          onCancel={() => setShowCancelModal(true)}
          onReactivate={handleReactivate}
          isLoggedIn={!!user}
        />

        {/* PRO */}
        <PlanCard
          planKey="PRO"
          plan={PRO_PLAN}
          currentPlan={currentPlan}
          subscriptionStatus={subscriptionStatus}
          isPopular={!isCancelling}
          loading={loading}
          reactivateLoading={reactivateLoading}
          onSelect={() => handleCheckout('PRO')}
          onCancel={() => setShowCancelModal(true)}
          onReactivate={handleReactivate}
          isLoggedIn={!!user}
        />
      </div>

      {/* Alt not */}
      <div className="text-center mt-12">
        <p className="text-gray-600 text-xs">
          Tüm planlar aylık faturalandırılır. İstediğiniz zaman iptal edebilirsiniz.
        </p>
      </div>
    </div>
  );
}

interface PlanCardProps {
  planKey: string;
  plan: PlanInfo;
  currentPlan: string;
  subscriptionStatus: string | null;
  isPopular: boolean;
  loading: string | null;
  reactivateLoading: boolean;
  onSelect: () => void;
  onCancel: () => void;
  onReactivate: () => void;
  isLoggedIn: boolean;
}

function PlanCard({
  planKey, plan, currentPlan, subscriptionStatus,
  isPopular, loading, reactivateLoading,
  onSelect, onCancel, onReactivate, isLoggedIn,
}: PlanCardProps) {
  const isPro        = planKey === 'PRO';
  const isFree       = planKey === 'FREE';
  const isCurrent    = currentPlan === planKey;
  const isLoading    = loading === planKey;
  const isCancelling = isCurrent && subscriptionStatus === 'cancelling';

  // PRO kullanıcı Starter'a inemez
  const isDowngrade = currentPlan === 'PRO' && planKey === 'STARTER';

  // Buton label
  let btnLabel = isLoggedIn ? 'Satın Al' : 'Giriş Yap ve Satın Al';
  if (isLoading) btnLabel = 'Yönlendiriliyor...';
  else if (currentPlan === 'STARTER' && planKey === 'PRO') btnLabel = "⬆ Pro'ya Yükselt";
  else if (isDowngrade) btnLabel = 'Mevcut Plan Daha İyi';

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 flex-1 transition-all duration-200
        ${isPro
          ? 'bg-[#0d1117] border-2 border-[#00d4ff] shadow-[0_0_40px_rgba(0,212,255,0.12)]'
          : 'bg-[#0d0d18] border border-[#1e1e2e]'
        }`}
    >
      {/* Popüler badge */}
      {isPopular && !isCurrent && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-[#00d4ff] text-[#0a0a0f] text-xs font-bold px-4 py-1 rounded-full">
            ✦ Popüler
          </span>
        </div>
      )}

      {/* Mevcut plan badge */}
      {isCurrent && !isCancelling && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className={`text-xs font-bold px-4 py-1 rounded-full
            ${isPro
              ? 'bg-amber-500 text-[#0a0a0f]'
              : isFree
                ? 'bg-white/20 text-white'
                : 'bg-[#39ff14] text-[#0a0a0f]'
            }`}>
            ✓ Mevcut Planınız
          </span>
        </div>
      )}

      {/* İptal ediliyor badge */}
      {isCancelling && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            ⏳ İptal Sürecinde
          </span>
        </div>
      )}

      {/* Plan adı */}
      <div className={`text-sm font-semibold mb-2 ${
        isPro ? 'text-[#00d4ff]' :
        isCurrent ? 'text-[#39ff14]' : 'text-gray-400'
      }`}>
        {plan.name}
      </div>

      {/* Fiyat */}
      <div className="mb-6">
        {plan.price === 0 ? (
          <span className="text-4xl font-bold text-white">Ücretsiz</span>
        ) : (
          <>
            <span className="text-4xl font-bold text-white">{formatPrice(plan.price)}</span>
            <span className="text-gray-500 text-sm ml-1">/ ay</span>
          </>
        )}
      </div>

      {/* Token bilgisi */}
      <div className={`text-sm mb-6 font-medium ${
        isPro ? 'text-[#00d4ff]' :
        isCurrent ? 'text-[#39ff14]' : 'text-gray-300'
      }`}>
        {plan.tokens === 999999 ? '∞ Sınırsız analiz' : `${plan.tokens} analiz hakkı`}
      </div>

      {/* Özellikler */}
      <ul className="space-y-3 mb-8 flex-1">
        {/* Cumulative header (e.g. "Free'deki her şey, artı:") */}
        {plan.features.map((feature, i) => (
          <li key={`f-${i}`} className="flex items-center gap-2">
            {i === 0 && plan.extraFeatures ? (
              /* "X'teki her şey, artı:" başlık satırı */
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                isPro
                  ? 'text-[#00d4ff] bg-[#00d4ff]/10 border-[#00d4ff]/25'
                  : 'text-[#39ff14] bg-[#39ff14]/10 border-[#39ff14]/25'
              }`}>
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {feature}
              </span>
            ) : (
              <>
                <span className={`mt-0.5 flex-shrink-0 text-sm ${
                  isPro ? 'text-[#00d4ff]' : 'text-[#39ff14]'
                }`}>✓</span>
                <span className="text-gray-300 text-sm">{feature}</span>
              </>
            )}
          </li>
        ))}
        {/* Extra features (plan-specific additions) */}
        {plan.extraFeatures?.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-300">
            <span className={`mt-0.5 flex-shrink-0 ${
              isPro ? 'text-[#00d4ff]' : 'text-[#39ff14]'
            }`}>✓</span>
            {feature}
          </li>
        ))}
      </ul>

      {/* Buton */}
      {isCurrent && !isCancelling ? (
        /* Mevcut plan (FREE dahil tüm planlar) */
        <button
          disabled
          className={`w-full py-3 rounded-xl text-sm font-semibold cursor-default
            ${isPro
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : isCurrent && !isFree
                ? 'bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14]'
                : 'bg-[#1e1e2e] text-gray-500'
            }`}
        >
          ✓ Mevcut Planınız
        </button>
      ) : isCancelling ? (
        <button
          disabled
          className="w-full py-3 rounded-xl text-sm font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 cursor-default"
        >
          ⏳ İptal Sürecinde
        </button>
      ) : isDowngrade ? (
        <button
          disabled
          className="w-full py-3 rounded-xl text-sm font-semibold bg-[#1e1e2e] text-gray-600 cursor-not-allowed"
        >
          {btnLabel}
        </button>
      ) : isFree ? (
        /* FREE kart — ne mevcut plan ne de satın al, sadece "Ücretsiz" etiketi */
        <button
          disabled
          className="w-full py-3 rounded-xl text-sm font-semibold bg-[#1e1e2e] text-gray-500 cursor-default"
        >
          Ücretsiz
        </button>
      ) : (
        <button
          onClick={onSelect}
          disabled={!!loading}
          className={`btn-hover w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-50
            ${isPro
              ? 'bg-[#00d4ff] text-[#0a0a0f] hover:bg-[#00bce0]'
              : 'bg-[#a855f7] text-white hover:bg-[#9333ea]'
            }`}
        >
          {btnLabel}
        </button>
      )}

      {/* Aboneliği İptal Et / İptali Geri Al — sadece mevcut ücretli planda */}
      {isCurrent && !isFree && (
        <div className="mt-3 text-center">
          {isCancelling ? (
            <button
              onClick={onReactivate}
              disabled={reactivateLoading}
              className="btn-hover inline-flex items-center gap-1.5 text-xs text-emerald-500/80 hover:text-emerald-400 px-2 py-1 rounded-md disabled:opacity-50"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M10 6A4 4 0 1 1 6 2v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M6 2l2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {reactivateLoading ? 'İşleniyor...' : 'İptali Geri Al'}
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="btn-hover inline-flex items-center gap-1.5 text-xs text-red-500/60 hover:text-red-400 px-2 py-1 rounded-md"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Aboneliği İptal Et
            </button>
          )}
        </div>
      )}
    </div>
  );
}
