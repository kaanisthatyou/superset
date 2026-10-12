import { useApp } from './store';

let ctx: AudioContext | null = null;

/** Tarayıcılar sesi ancak bir dokunuştan sonra açar; her set işaretlemesinde çağrılır. */
export function prime() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    // ses yoksa sessiz devam
  }
}

function tone(freq: number, at: number, duration: number) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
  gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + at);
  osc.stop(ctx.currentTime + at + duration + 0.05);
}

/** Süre doldu: iki kısa, bir uzun. */
export function timerDone() {
  const { sound, vibrate } = useApp.getState().settings;
  if (sound) {
    tone(660, 0, 0.14);
    tone(660, 0.2, 0.14);
    tone(990, 0.4, 0.4);
  }
  if (vibrate) navigator.vibrate?.([180, 90, 180, 90, 360]);
}

/** Set işaretlendi: tek kısa tık. */
export function tick() {
  if (useApp.getState().settings.vibrate) navigator.vibrate?.(18);
}
