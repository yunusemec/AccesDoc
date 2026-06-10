import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      className="relative z-10 border-t border-[#1e1e2e] mt-auto"
      style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div className="max-w-5xl mx-auto px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">

        {/* Sol — telif hakkı */}
        <p className="text-gray-500 text-xs text-center sm:text-left">
          © 2025 AccessiScan. Tüm hakları saklıdır.
        </p>

        {/* Sağ — linkler */}
        <div className="flex items-center gap-4 text-xs">
          <Link
            to="/privacy"
            className="btn-hover text-gray-500 hover:text-[#00d4ff] px-2 py-1 rounded-md"
          >
            Gizlilik Politikası
          </Link>
          <span className="text-gray-700">|</span>
          <Link
            to="/terms"
            className="btn-hover text-gray-500 hover:text-[#00d4ff] px-2 py-1 rounded-md"
          >
            Kullanım Koşulları
          </Link>
        </div>

      </div>
    </footer>
  );
}
