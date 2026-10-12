# Süperset

İki kişilik antrenman defteri. Telefona ya da bilgisayara Chrome uygulaması olarak yüklenir (PWA).

- **Program** — o haftanın günleri; her set bir plaka. Seti işaretleyince dinlenme sayacı başlar, kg ve tekrar kaydedilir.
- **Hareketler** — 1300'den fazla hareket, vücut bölgesine ve çalıştırdığı kasa göre gruplu, kas vurgulu animasyonlarla.
- **İlerleme** — haftalık uyum, hareket başına en ağır set, kilo ve bel ölçümü; iki kişi için ayrı ayrı.
- **Koç** — kayıtlar özel bir GitHub deposuna gider. Bilgisayarda Claude Code'a `/gym` yazınca kayıtlar okunur,
  değerlendirilir ve süre dolduysa yeni haftanın programı yazılır.
- **Müzik** — her hareket bitince sıradaki için bir şarkı önerilir; onaylarsan Spotify'da açılır. Ayarlardan kapatılır.

## Nasıl çalışır

```
telefon (PWA) ──set işaretle──▶ özel GitHub deposu ◀──/gym── Claude Code (bilgisayar)
      ▲                              │  programs/…  ▲ logs/…, body/…
      └────────── yeni program ──────┘
```

Sunucu yok. Uygulama statik dosyalardan ibarettir; depoya, cihazda saklanan ve yalnızca o depoya yetkili bir erişim
anahtarıyla doğrudan GitHub API'si üzerinden yazar. Bağlantı yokken kayıtlar cihazda bekler, gelince gönderilir.

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/
```

| Klasör | Ne |
| --- | --- |
| `src/` | Uygulama (React, TypeScript, Tailwind, Motion, Zustand) |
| `seed/` | Veri deposunun ilk içeriği; depo bağlanmadan önce uygulamanın gösterdiği başlangıç programları |
| `tools/` | Koçun kullandığı betikler: `report`, `validate`, `find`, `spotify-playlist`; veri hazırlama: `build-exercises`, `check-gifs` |
| `skill/gym/` | `/gym` komutu (Claude Code becerisi) |
| `data/` | Özel veri deposunun yerel kopyası (bu depoya dahil değil) |

## Kurulum (bir kez)

1. Özel veri deposunu oluştur ve `seed/` içeriğini gönder.
2. GitHub'da yalnızca o depoya yetkili bir *fine-grained token* oluştur: **Contents → Read and write**.
3. Uygulamada Ayarlar → Kayıt deposu: sahip, depo adı, anahtar.
4. Aynı ekrandan "Başka bir cihaza kur" ile çıkan kodu diğer telefona okut.

## Kaynaklar

Hareket verisi ve animasyonlar [ExerciseDB](https://github.com/ExerciseDB/exercisedb-api) açık veri setinden alınır;
animasyonlar çalışma anında ExerciseDB sunucusundan yüklenir. Vücut haritası çokgenleri
[react-body-highlighter](https://github.com/giavinh79/react-body-highlighter) (MIT) projesindendir.
