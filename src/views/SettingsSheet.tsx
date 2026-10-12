import { Check, Copy, Download, RefreshCw } from 'lucide-react';
import qrcode from 'qrcode-generator';
import { useMemo, useState } from 'react';
import { Plate } from '../components/Plate';
import { Sheet } from '../components/Sheet';
import { Card, Toggle } from '../components/bits';
import { fmtTime } from '../lib/dates';
import { useMe, useProfiles } from '../lib/domain';
import { install, setupLink, useInstall } from '../lib/install';
import { PLATES } from '../lib/labels';
import { useApp } from '../lib/store';
import { syncNow, useSync } from '../lib/sync';
import type { PlateColor } from '../lib/types';
import { useUi } from '../lib/ui';

const inputClass =
  'mt-1.5 h-12 w-full rounded-2xl bg-chalk px-4 text-[0.95rem] ring-1 ring-line outline-none placeholder:text-mist focus:ring-2 focus:ring-ink';

function Heading({ children }: { children: string }) {
  return <h3 className="display mt-8 mb-2.5 text-2xl">{children}</h3>;
}

function Repo() {
  const gh = useApp((s) => s.gh);
  const connect = useApp((s) => s.connect);
  const pending = useApp((s) => Object.keys(s.dirty).length);
  const { status, at, error } = useSync();
  const profiles = useProfiles();
  const me = useApp((s) => s.me);
  const [owner, setOwner] = useState(gh?.owner ?? '');
  const [repo, setRepo] = useState(gh?.repo ?? '');
  const [token, setToken] = useState(gh?.token ?? '');
  const [linkFor, setLinkFor] = useState<string | null>(null);

  const link = gh && linkFor ? setupLink(gh, linkFor) : null;
  const qr = useMemo(() => {
    if (!link) return null;
    const code = qrcode(0, 'L');
    code.addData(link);
    code.make();
    return code.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }, [link]);

  if (!gh) {
    return (
      <Card>
        <p className="text-sm leading-relaxed text-steel">
          Şu an kayıtlar yalnızca bu cihazda duruyor. Özel GitHub deposunu bağlayınca her set otomatik gönderilir; koç
          (Claude) kayıtları oradan okur ve yeni programı oraya yazar.
        </p>
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (owner.trim() && repo.trim() && token.trim())
              connect({ owner: owner.trim(), repo: repo.trim(), token: token.trim() });
          }}
        >
          <div className="flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="eyebrow text-steel">Sahip</span>
              <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="kullanıcı adı" autoCapitalize="none" className={inputClass} />
            </label>
            <label className="min-w-0 flex-1">
              <span className="eyebrow text-steel">Depo</span>
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="superset-data" autoCapitalize="none" className={inputClass} />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="eyebrow text-steel">Erişim anahtarı (fine-grained token)</span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              type="password"
              placeholder="github_pat_…"
              autoComplete="off"
              className={`${inputClass} font-mono`}
            />
          </label>
          <p className="mt-2 text-xs leading-relaxed text-steel">
            Anahtar yalnızca bu depoya, yalnızca "Contents: Read and write" izniyle açılmalı. Bu cihazda saklanır, başka
            hiçbir yere gönderilmez.
          </p>
          <button type="submit" className="display mt-4 h-14 w-full rounded-full bg-ink text-xl text-chalk active:scale-[0.98]">
            Depoyu bağla
          </button>
        </form>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-medium">
            {gh.owner}/{gh.repo}
          </p>
          <p className={`mt-0.5 text-sm ${status === 'error' ? 'font-medium text-plate-red' : 'text-steel'}`}>
            {status === 'syncing'
              ? 'Eşitleniyor…'
              : status === 'error'
                ? error
                : status === 'offline'
                  ? 'Çevrimdışı. Bağlantı gelince gönderilecek.'
                  : at
                    ? `Son eşitleme ${fmtTime(at)}${pending ? ` · ${pending} değişiklik bekliyor` : ''}`
                    : 'Bağlı'}
          </p>
        </div>
        <button
          onClick={() => void syncNow()}
          aria-label="Şimdi eşitle"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-chalk ring-1 ring-line active:scale-95"
        >
          <RefreshCw size={17} className={status === 'syncing' ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="font-medium">Başka bir cihaza kur</p>
        <p className="mt-0.5 text-sm text-steel">
          Kimin telefonu? Seç, çıkan kodu o telefonun kamerasıyla okut ya da bağlantıyı özel mesajla gönder.
        </p>
        <div className="mt-3 flex gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setLinkFor(linkFor === p.id ? null : p.id)}
              aria-pressed={linkFor === p.id}
              className={`h-11 flex-1 rounded-full text-sm font-semibold ${
                linkFor === p.id ? 'bg-ink text-chalk' : 'ring-1 ring-line'
              }`}
            >
              {p.name}
              {p.id === me ? ' (ben)' : ''}
            </button>
          ))}
        </div>
        {link && qr && (
          <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl bg-chalk p-4">
            <div className="w-full max-w-[15rem] rounded-xl bg-paper p-3" dangerouslySetInnerHTML={{ __html: qr }} />
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                useUi.getState().showToast('Bağlantı kopyalandı');
              }}
              className="flex h-11 items-center gap-2 rounded-full bg-paper px-4 text-sm font-semibold ring-1 ring-line active:scale-95"
            >
              <Copy size={15} /> Bağlantıyı kopyala
            </button>
            <p className="text-center text-xs leading-relaxed text-steel">
              Bu kod depo anahtarını içerir. Yalnızca birbirinizle paylaşın.
            </p>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          if (confirm('Depo bağlantısı bu cihazdan kaldırılsın mı? Kayıtlar silinmez.')) connect(null);
        }}
        className="mt-4 h-11 w-full rounded-full text-sm font-medium text-steel ring-1 ring-line"
      >
        Bağlantıyı kaldır
      </button>
    </Card>
  );
}

export function SettingsSheet() {
  const me = useMe();
  const profiles = useProfiles();
  const settings = useApp((s) => s.settings);
  const setSettings = useApp((s) => s.setSettings);
  const setMe = useApp((s) => s.setMe);
  const updateProfile = useApp((s) => s.updateProfile);
  const { event, installed } = useInstall();
  const [name, setName] = useState(me?.name ?? '');

  return (
    <Sheet title="Ayarlar" eyebrow="Süperset">
      <div className="px-5 pb-12">
        <Heading>Bu cihaz kimin</Heading>
        <Card>
          <div className="flex gap-2">
            {profiles.map((p) => {
              const active = p.id === me?.id;
              const c = PLATES[p.color];
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setMe(p.id);
                    setName(p.name);
                  }}
                  aria-pressed={active}
                  className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full font-semibold ring-1 ring-line"
                  style={active ? { background: c.bg, color: c.on } : undefined}
                >
                  {active && <Check size={17} strokeWidth={3} />}
                  {p.name}
                </button>
              );
            })}
          </div>
          {me && (
            <>
              <label className="mt-4 block">
                <span className="eyebrow text-steel">Adın</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => name.trim() && name.trim() !== me.name && updateProfile(me.id, { name: name.trim() })}
                  className={inputClass}
                />
              </label>
              <p className="eyebrow mt-4 text-steel">Plakan</p>
              <div className="mt-2 flex gap-3">
                {(Object.keys(PLATES) as PlateColor[]).map((color) => (
                  <button
                    key={color}
                    onClick={() => updateProfile(me.id, { color })}
                    aria-label={`${PLATES[color].label} plaka`}
                    aria-pressed={me.color === color}
                    className="active:scale-95"
                  >
                    <Plate size={52} fill={1} color={PLATES[color].bg} onColor={PLATES[color].on} active>
                      {me.color === color ? (
                        <Check size={20} strokeWidth={3.5} />
                      ) : (
                        <span className="num text-base opacity-80">{PLATES[color].kg}</span>
                      )}
                    </Plate>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Heading>Antrenman sırasında</Heading>
        <Card className="!py-1.5">
          <Toggle
            label="Müzik önerileri"
            hint="Her hareket bitince sıradaki için bir şarkı önerir. Şarkı yalnızca sen onaylarsan Spotify'da açılır."
            checked={settings.music}
            onChange={(music) => setSettings({ music })}
          />
          <div className="border-t border-line" />
          <Toggle
            label="Süre dolunca ses"
            checked={settings.sound}
            onChange={(sound) => setSettings({ sound })}
          />
          <div className="border-t border-line" />
          <Toggle
            label="Titreşim"
            checked={settings.vibrate}
            onChange={(vibrate) => setSettings({ vibrate })}
          />
          <div className="border-t border-line" />
          <Toggle
            label="Ekranı açık tut"
            hint="Antrenman ekranı açıkken telefon kilitlenmez."
            checked={settings.keepAwake}
            onChange={(keepAwake) => setSettings({ keepAwake })}
          />
        </Card>

        <Heading>Kayıt deposu</Heading>
        <Repo />

        <Heading>Uygulama</Heading>
        <Card>
          {installed ? (
            <p className="text-sm text-steel">Süperset bu cihaza yüklü.</p>
          ) : event ? (
            <button
              onClick={() => void install()}
              className="display flex h-14 w-full items-center justify-center gap-2 rounded-full bg-me text-xl text-on-me active:scale-[0.98]"
            >
              <Download size={19} strokeWidth={2.75} /> Uygulamayı yükle
            </button>
          ) : (
            <p className="text-sm leading-relaxed text-steel">
              Yüklemek için Chrome menüsünden (⋮) <span className="font-medium text-ink">Uygulamayı yükle</span> ya da{' '}
              <span className="font-medium text-ink">Ana ekrana ekle</span> seçeneğine dokun.
            </p>
          )}
          <p className="eyebrow mt-4 text-mist">Hareket verisi ve animasyonlar: ExerciseDB · Sürüm 1.0</p>
        </Card>
      </div>
    </Sheet>
  );
}
