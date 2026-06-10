import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Status = 'waiting' | 'updated' | 'pending';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<Status>('waiting');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll(tryNum: number) {
      // İlk denemede 2s, sonrakilerde 3s bekle
      const delay = tryNum === 0 ? 2000 : 3000;
      await new Promise((r) => setTimeout(r, delay));
      if (cancelled) return;

      try {
        await refreshUser();
      } catch {
        // refreshUser hata verse bile devam et
      }

      if (cancelled) return;
      setAttempt(tryNum + 1);
    }

    poll(0);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // attempt değişince kullanıcı planını kontrol et
  useEffect(() => {
    if (attempt === 0) return;

    if (user && user.plan !== 'FREE') {
      setStatus('updated');
      return;
    }

    if (attempt < 3) {
      // Hâlâ FREE — tekrar dene
      let cancelled = false;
      (async () => {
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;
        try { await refreshUser(); } catch { /* ignore */ }
        if (!cancelled) setAttempt((a) => a + 1);
      })();
      return () => { cancelled = true; };
    }

    // 3 deneme bitti, hâlâ FREE
    setStatus('pending');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, user?.plan]);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        {/* İkon */}
        {status === 'waiting' ? (
          <div className="w-20 h-20 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="animate-spin w-8 h-8 text-[#00d4ff]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
            </svg>
          </div>
        ) : status === 'updated' ? (
          <div className="w-20 h-20 rounded-full bg-[#39ff14]/10 border border-[#39ff14]/30 flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#39ff14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 8v4m0 4h.01" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="12" cy="12" r="9" stroke="#F59E0B" strokeWidth="2"/>
            </svg>
          </div>
        )}

        {/* Başlık */}
        <h1 className="text-3xl font-bold text-white mb-3">
          {status === 'waiting' && 'Ödeme Doğrulanıyor...'}
          {status === 'updated' && 'Planınız Güncellendi! 🎉'}
          {status === 'pending' && 'Ödeme Alındı'}
        </h1>

        {/* Açıklama */}
        {status === 'waiting' && (
          <p className="text-gray-400 mb-10">
            Plan bilgileriniz güncelleniyor, lütfen bekleyin.
          </p>
        )}
        {status === 'updated' && (
          <>
            <p className="text-gray-400 mb-2">
              <span className="text-[#00d4ff] font-semibold">{user?.plan}</span> planına
              geçiş yapıldı.
            </p>
            <p className="text-gray-500 text-sm mb-10">
              {user?.tokens === 999999 ? 'Sınırsız analiz hakkınız aktif.' : `${user?.tokens} analiz hakkınız hesabınıza tanımlandı.`}
            </p>
          </>
        )}
        {status === 'pending' && (
          <p className="text-gray-400 text-sm mb-10">
            Ödemeniz başarıyla alındı. Planınız birkaç dakika içinde güncellenecek.
            Sayfayı yenileyerek kontrol edebilirsiniz.
          </p>
        )}

        {/* Butonlar */}
        {status !== 'waiting' && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/')}
              className="btn-hover bg-[#00d4ff] text-[#0a0a0f] font-semibold px-8 py-3 rounded-xl hover:bg-[#00bce0]"
            >
              Ana Sayfaya Git
            </button>
            {status === 'pending' && (
              <button
                onClick={() => { refreshUser().catch(() => {}); window.location.reload(); }}
                className="btn-hover bg-[#1e1e2e] text-gray-300 font-semibold px-8 py-3 rounded-xl hover:bg-[#2a2a3e]"
              >
                Yenile
              </button>
            )}
          </div>
        )}

        {/* Deneme sayacı */}
        {status === 'waiting' && attempt > 0 && (
          <p className="text-gray-600 text-xs mt-4">Deneme {attempt}/3</p>
        )}
      </div>
    </div>
  );
}
