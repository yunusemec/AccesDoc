import { useNavigate } from 'react-router-dom';

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* İptal ikonu */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M6 18L18 6M6 6l12 12" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Ödeme İptal Edildi</h1>
        <p className="text-gray-400 mb-10">
          Herhangi bir ücret alınmadı. İstediğiniz zaman tekrar deneyebilirsiniz.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate('/pricing')}
            className="btn-hover bg-[#a855f7] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#9333ea]"
          >
            Planlara Dön
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-hover bg-[#1e1e2e] text-gray-300 font-semibold px-6 py-3 rounded-xl hover:bg-[#2a2a3e]"
          >
            Ana Sayfa
          </button>
        </div>
      </div>
    </div>
  );
}
