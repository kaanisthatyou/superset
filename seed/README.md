# superset-data

Süperset uygulamasının özel veri deposu. Buradaki dosyaları iki taraf yazar:

| Yol | Kim yazar | Ne |
| --- | --- | --- |
| `profiles.json` | koç (Claude) + uygulama (yalnızca ad ve renk) | İki profil ve koçun bildikleri |
| `music.json` | koç | Antrenman sırasında önerilen şarkı havuzu |
| `programs/<profil>/<başlangıç>.json` | koç | Haftalık programlar |
| `logs/<profil>/<pazartesi>.json` | uygulama | İşaretlenen setler, kg, tekrar, his, not |
| `body/<profil>.json` | uygulama | Kilo ve bel ölçümleri |
| `coach/journal.md` | koç | Her değerlendirmede görülenler ve kararlar |

Koçu çalıştırmak için bilgisayarda Claude Code'a `/gym` yaz.
