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

export default function Terms() {
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
            <span className="text-2xl">📋</span>
            <h1 className="text-3xl font-bold text-white">Kullanım Koşulları</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Son güncelleme: <span className="text-gray-400">Mayıs 2025</span>
          </p>
          <p className="mt-4 text-gray-400 text-sm leading-relaxed">
            AccessiScan platformunu kullanarak aşağıdaki kullanım koşullarını kabul etmiş
            sayılırsınız. Lütfen bu koşulları dikkatlice okuyunuz.
          </p>
        </div>

        {/* Test modu uyarı banner */}
        <div className="mb-8 flex items-start gap-3 px-4 py-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25">
          <span className="text-amber-400 text-lg flex-shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-amber-400 font-semibold text-sm">Test Modu</p>
            <p className="text-amber-400/75 text-xs mt-0.5 leading-relaxed">
              Platform şu anda test modundadır. Ödeme sistemi Stripe test ortamında çalışmakta
              olup gerçek ödeme alınmamaktadır. Stripe test kartlarını kullanabilirsiniz.
            </p>
          </div>
        </div>

        {/* İçerik */}
        <Section title="1. Hizmet Tanımı">
          <p>
            AccessiScan, web sitelerinin WCAG 2.1 AA standartlarına uygunluğunu analiz eden
            bir erişilebilirlik test aracıdır. Hizmet kapsamında:
          </p>
          <ul className="space-y-2 mt-2">
            <Li>URL veya HTML kodu üzerinden 50 WCAG kriteri ile otomatik analiz</Li>
            <Li>HTML ve CSS tabanlı erişilebilirlik sorunlarının tespiti</Li>
            <Li>Yapay zeka destekli (Groq AI) kod düzeltme önerileri</Li>
            <Li>Detaylı PDF rapor oluşturma</Li>
            <Li>Analiz geçmişi ve karşılaştırma (plan bağımlı)</Li>
          </ul>
          <p className="mt-3">
            Hizmet; Ücretsiz (Free), Başlangıç (Starter) ve Profesyonel (Pro) olmak üzere
            üç farklı planda sunulmaktadır.
          </p>
        </Section>

        <Section title="2. Hesap Oluşturma ve Güvenlik">
          <p>
            Platforma erişim için geçerli bir e-posta adresi ile kayıt olmanız gerekmektedir.
            Hesap güvenliğinizden siz sorumlusunuz:
          </p>
          <ul className="space-y-2 mt-2">
            <Li>Şifrenizi üçüncü şahıslarla paylaşmayınız.</Li>
            <Li>Hesabınızda yetkisiz bir erişim tespit ederseniz derhal bildirin.</Li>
            <Li>Her kullanıcı yalnızca bir hesap açabilir; çoklu hesap açılması yasaktır.</Li>
          </ul>
        </Section>

        <Section title="3. Kullanıcı Yükümlülükleri">
          <p>Platformu kullanırken aşağıdaki kurallara uymayı kabul edersiniz:</p>
          <ul className="space-y-2 mt-2">
            <Li>
              Analiz için yalnızca sahibi olduğunuz veya analiz etme yetkisine sahip olduğunuz
              URL ve içerikleri kullanacaksınız.
            </Li>
            <Li>
              Platformu spam, otomatik saldırı, kötü amaçlı yazılım dağıtımı veya yasadışı
              amaçlar için kullanmayacaksınız.
            </Li>
            <Li>
              Sistemin altyapısını aşırı yükleyecek veya bozacak işlemler gerçekleştirmeyeceksiniz.
            </Li>
            <Li>
              Başka kullanıcıların verilerine izinsiz erişmeye çalışmayacaksınız.
            </Li>
            <Li>
              Geçerli Türk Hukuku ve uluslararası mevzuata uygun hareket edeceksiniz.
            </Li>
          </ul>
        </Section>

        <Section title="4. Ödeme Koşulları">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/8 border border-amber-500/20 mb-3">
            <span className="text-amber-400 text-xs font-bold flex-shrink-0 mt-0.5">TEST</span>
            <p className="text-amber-400/80 text-xs">
              Platform şu an test modundadır. Gerçek ödeme alınmamaktadır.
              Test için Stripe kart numarası: <code className="font-mono bg-amber-500/10 px-1 rounded">4242 4242 4242 4242</code>
            </p>
          </div>
          <ul className="space-y-2">
            <Li>
              Abonelik planları aylık faturalandırılmaktadır. Ödeme, her dönem başında
              kayıtlı ödeme yönteminizden tahsil edilir.
            </Li>
            <Li>
              Tüm ödemeler Stripe altyapısı aracılığıyla güvenli şekilde işlenmektedir.
              Kart bilgileriniz tarafımızca saklanmamaktadır.
            </Li>
            <Li>
              Fiyatlar KDV hariçtir. Uygulanabilir vergiler ödeme sırasında ayrıca
              gösterilecektir.
            </Li>
            <Li>
              Plan yükseltmeleri anında geçerli olur; fark tutarı dönem sonuna orantılı
              olarak tahsil edilir.
            </Li>
          </ul>
        </Section>

        <Section title="5. İptal ve İade Koşulları">
          <ul className="space-y-2">
            <Li>
              Aboneliğinizi dilediğiniz zaman iptal edebilirsiniz. İptal işlemi, mevcut
              ödeme döneminin sonunda geçerli olur; o döneme kadar tüm özelliklerden
              yararlanmaya devam edersiniz.
            </Li>
            <Li>
              İptal sonrasında hesabınız Ücretsiz plana düşürülür; geçmiş analiz
              verileriniz 30 gün boyunca saklanır.
            </Li>
            <Li>
              Kullanılmamış abonelik süresine ait iade yapılmamaktadır; ancak hizmetin
              ciddi şekilde kesintiye uğraması durumunda bireysel değerlendirme yapılabilir.
            </Li>
            <Li>
              İptal taleplerini hesap ayarlarından veya{' '}
              <a href="mailto:privacy@accessiscan.com" className="text-[#00d4ff] hover:underline">
                privacy@accessiscan.com
              </a>{' '}
              adresine e-posta göndererek iletebilirsiniz.
            </Li>
          </ul>
        </Section>

        <Section title="6. Hizmet Kullanılabilirliği">
          <p>
            Platformun kesintisiz çalışması için azami özen gösterilmektedir; ancak
            %100 uptime garantisi verilmemektedir. Planlı bakım, teknik arıza veya
            üçüncü taraf servis kesintileri nedeniyle hizmet geçici olarak kullanılamaz
            hale gelebilir.
          </p>
        </Section>

        <Section title="7. Sorumluluk Reddi">
          <p>
            AccessiScan analiz sonuçları <strong className="text-gray-300">yalnızca bilgi amaçlıdır</strong> ve
            yasal uyumluluk danışmanlığı niteliği taşımamaktadır:
          </p>
          <ul className="space-y-2 mt-2">
            <Li>
              Analiz sonuçları, bir web sitesinin gerçek dünya erişilebilirliğini tam olarak
              yansıtmayabilir. Manuel denetim ve kullanıcı testleri ile desteklenmelidir.
            </Li>
            <Li>
              Bir sitenin WCAG uyumlu çıkması, yasal erişilebilirlik yükümlülüklerinin
              yerine getirildiğini garanti etmez.
            </Li>
            <Li>
              Analiz sırasında Groq AI tarafından üretilen kod önerileri insan denetiminden
              geçirilmeden üretim ortamına uygulanmamalıdır.
            </Li>
            <Li>
              Platform, analiz sonuçlarının kullanımından doğabilecek dolaylı zararlardan
              sorumlu tutulamaz.
            </Li>
          </ul>
        </Section>

        <Section title="8. Fikri Mülkiyet">
          <p>
            Platformun tasarımı, kodu, logosu ve içeriği AccessiScan'e aittir. Kullanıcılar,
            girdi olarak sağladıkları içeriklerin (URL, HTML kodu) haklarını saklı tutar.
            Analiz sonuçları kişisel veya ticari amaçla serbestçe kullanılabilir.
          </p>
        </Section>

        <Section title="9. Koşullarda Değişiklik">
          <p>
            Bu kullanım koşulları önceden bildirimde bulunmaksızın değiştirilebilir.
            Önemli değişiklikler kayıtlı e-posta adresinize bildirilecektir. Platformu
            kullanmaya devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.
            Koşulların güncel halini bu sayfadan takip edebilirsiniz.
          </p>
        </Section>

        <Section title="10. Uygulanacak Hukuk ve Uyuşmazlık Çözümü">
          <p>
            Bu koşullar Türk Hukuku'na tabidir. Doğabilecek uyuşmazlıkların çözümünde
            Türkiye mahkemeleri yetkilidir. Herhangi bir sorun için öncelikle{' '}
            <a href="mailto:privacy@accessiscan.com" className="text-[#00d4ff] hover:underline">
              privacy@accessiscan.com
            </a>{' '}
            adresine başvurmanızı tavsiye ederiz.
          </p>
        </Section>

        <Section title="11. İletişim">
          <p>
            Kullanım koşullarına ilişkin sorularınız için:{' '}
            <a href="mailto:privacy@accessiscan.com" className="text-[#00d4ff] hover:underline font-medium">
              privacy@accessiscan.com
            </a>
          </p>
        </Section>

      </main>

    </div>
  );
}
