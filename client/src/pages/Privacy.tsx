import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-white mb-3 pb-2 border-b border-[#1e1e2e]">
        {title}
      </h2>
      <div className="space-y-3 text-gray-400 leading-relaxed text-sm">
        {children}
      </div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-[#00d4ff] mt-0.5 flex-shrink-0">•</span>
      <span>{children}</span>
    </li>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────────────

export default function Privacy() {
  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 pt-28 pb-16">

        {/* Başlık */}
        <div className="mb-10">
          <Link
            to="/"
            className="btn-hover inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#00d4ff] mb-6 group px-3 py-1.5 rounded-lg"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M8 3L4 7l4 4M4 7h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ana Sayfaya Dön
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">🔒</span>
            <h1 className="text-3xl font-bold text-white">Gizlilik Politikası</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Son güncelleme: <span className="text-gray-400">Mayıs 2025</span>
          </p>
          <p className="mt-4 text-gray-400 text-sm leading-relaxed">
            AccessiScan olarak kişisel verilerinizin gizliliğini ciddiye alıyoruz. Bu politika,
            6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında hangi verileri
            topladığımızı, nasıl kullandığımızı ve haklarınızı açıklamaktadır.
          </p>
        </div>

        {/* İçerik */}
        <Section title="1. Veri Sorumlusu">
          <p>
            Veri sorumlusu sıfatıyla AccessiScan platformu işletmekteyiz. Kişisel verilerinize
            ilişkin taleplerinizi{' '}
            <a href="mailto:privacy@accessiscan.com" className="text-[#00d4ff] hover:underline">
              privacy@accessiscan.com
            </a>{' '}
            adresine iletebilirsiniz.
          </p>
        </Section>

        <Section title="2. Toplanan Veriler">
          <p>Platformumuzu kullanırken aşağıdaki veriler işlenmektedir:</p>
          <ul className="space-y-2 mt-2">
            <Li>
              <strong className="text-gray-300">Hesap bilgileri:</strong> Kayıt sırasında
              sağladığınız e-posta adresi ve şifreli kimlik doğrulama bilgileri.
            </Li>
            <Li>
              <strong className="text-gray-300">Analiz verileri:</strong> Analiz için girdiğiniz
              URL adresleri veya HTML kod parçacıkları ve bunlara ait WCAG analiz sonuçları.
            </Li>
            <Li>
              <strong className="text-gray-300">Kullanım geçmişi:</strong> Gerçekleştirdiğiniz
              analizlerin tarihi, skoru ve sonuçları (geçmiş sayfasında görüntülenebilir).
            </Li>
            <Li>
              <strong className="text-gray-300">Abonelik bilgileri:</strong> Seçtiğiniz plan
              türü ve abonelik durumu. Kredi kartı bilgileri doğrudan tarafımızca
              saklanmamakta; Stripe tarafından işlenmektedir.
            </Li>
            <Li>
              <strong className="text-gray-300">Teknik veriler:</strong> IP adresi, tarayıcı
              türü ve oturum süreleri gibi standart sunucu günlük kayıtları.
            </Li>
          </ul>
        </Section>

        <Section title="3. Verilerin Kullanım Amacı">
          <p>Toplanan veriler şu amaçlarla işlenmektedir:</p>
          <ul className="space-y-2 mt-2">
            <Li>Hizmetin sağlanması ve erişilebilirlik analizlerinin gerçekleştirilmesi</Li>
            <Li>Kullanıcı hesabının oluşturulması ve kimlik doğrulaması</Li>
            <Li>Abonelik yönetimi ve faturalandırma işlemleri</Li>
            <Li>Analiz geçmişinin saklanması ve kullanıcıya sunulması</Li>
            <Li>Hizmet kalitesinin iyileştirilmesi ve teknik sorunların giderilmesi</Li>
            <Li>KVKK ve ilgili mevzuattan doğan yasal yükümlülüklerin yerine getirilmesi</Li>
          </ul>
        </Section>

        <Section title="4. Üçüncü Taraf Hizmetler">
          <p>
            Platformumuz aşağıdaki üçüncü taraf hizmetleri kullanmaktadır:
          </p>
          <ul className="space-y-3 mt-2">
            <Li>
              <span>
                <strong className="text-gray-300">Stripe (Ödeme İşlemleri):</strong> Abonelik
                ödemeleri Stripe altyapısı üzerinden gerçekleştirilmektedir. Platform şu an
                <span className="text-amber-400 font-medium"> test modunda</span> olup gerçek
                ödeme alınmamaktadır. Stripe'ın gizlilik politikasına{' '}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">
                  stripe.com/privacy
                </a>{' '}
                adresinden ulaşabilirsiniz.
              </span>
            </Li>
            <Li>
              <span>
                <strong className="text-gray-300">Groq AI (Yapay Zeka Analizi):</strong>{' '}
                Erişilebilirlik analizleri ve kod düzeltme önerileri için Groq'un yapay zeka
                modelleri kullanılmaktadır. Analiz için gönderilen HTML/URL içerikleri Groq
                sunucularında işlenmektedir. Groq'un gizlilik politikasına{' '}
                <a href="https://groq.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#00d4ff] hover:underline">
                  groq.com/privacy-policy
                </a>{' '}
                adresinden ulaşabilirsiniz.
              </span>
            </Li>
          </ul>
        </Section>

        <Section title="5. Veri Saklama Süresi">
          <p>
            Hesap verileriniz, hesabınız aktif olduğu sürece saklanmaktadır. Hesabınızı
            silmeniz halinde verileriniz 30 gün içinde sistemlerimizden kalıcı olarak
            silinmektedir. Yasal yükümlülükler kapsamındaki veriler, ilgili mevzuatta
            öngörülen süreler boyunca saklanabilir.
          </p>
        </Section>

        <Section title="6. Kullanıcı Hakları (KVKK Md. 11)">
          <p>KVKK kapsamında aşağıdaki haklara sahipsiniz:</p>
          <ul className="space-y-2 mt-2">
            <Li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</Li>
            <Li>İşlenmişse buna ilişkin bilgi talep etme</Li>
            <Li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</Li>
            <Li>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme</Li>
            <Li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini talep etme</Li>
            <Li>Verilerin silinmesini veya yok edilmesini talep etme</Li>
            <Li>İşleme itiraz etme ve zararın giderilmesini talep etme</Li>
          </ul>
          <p className="mt-3">
            Bu haklarınızı kullanmak için{' '}
            <a href="mailto:privacy@accessiscan.com" className="text-[#00d4ff] hover:underline">
              privacy@accessiscan.com
            </a>{' '}
            adresine başvurabilirsiniz. Talepler en geç 30 gün içinde yanıtlanacaktır.
          </p>
        </Section>

        <Section title="7. Çerezler (Cookies)">
          <p>
            Platformumuz oturum yönetimi için zorunlu çerezler kullanmaktadır. Bu çerezler
            olmadan hizmete erişim mümkün değildir. Analitik veya reklam amaçlı çerez
            kullanılmamaktadır.
          </p>
        </Section>

        <Section title="8. Güvenlik">
          <p>
            Verileriniz; şifreli bağlantılar (HTTPS), güvenli veritabanı altyapısı ve
            erişim kontrolleri ile korunmaktadır. Şifreler hiçbir zaman düz metin olarak
            saklanmaz; bcrypt algoritmasıyla hashlenerek depolanır.
          </p>
        </Section>

        <Section title="9. Politika Değişiklikleri">
          <p>
            Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler kayıtlı
            e-posta adresinize bildirilecektir. Politikanın güncel halini bu sayfadan
            takip edebilirsiniz.
          </p>
        </Section>

        <Section title="10. İletişim">
          <p>
            Gizlilik politikamıza ilişkin sorularınız için:{' '}
            <a href="mailto:privacy@accessiscan.com" className="text-[#00d4ff] hover:underline font-medium">
              privacy@accessiscan.com
            </a>
          </p>
        </Section>

      </main>

    </div>
  );
}
