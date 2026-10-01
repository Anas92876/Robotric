import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Link2, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button, TextInput } from '../../../ui';

/** Google Places search is used when a browser key is set; otherwise OpenStreetMap search. */
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined;
const DAMASCUS = { lat: 33.5138, lng: 36.2765 };

declare global {
  interface Window {
    // Leaflet and Google Maps are loaded from their CDNs on first use
    L: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    google: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

/** lat/lng from the usual Google Maps link formats. */
export function parseMapsLink(url: string): { lat: number; lng: number } | null {
  const patterns = [/@(-?\d+\.?\d*),(-?\d+\.?\d*)/, /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/, /!3d(-?\d+\.?\d*).*?!4d(-?\d+\.?\d*)/, /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

/** Adds a CDN script once; resolves when it is usable (also when another page loaded it already). */
function loadOnce(id: string, src: string, ready: () => boolean, css?: string): Promise<void> {
  if (css && !document.getElementById(`${id}-css`)) {
    const l = document.createElement('link');
    l.id = `${id}-css`;
    l.rel = 'stylesheet';
    l.href = css;
    document.head.appendChild(l);
  }
  if (ready()) return Promise.resolve();
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  return new Promise((resolve, reject) => {
    const s = existing ?? document.createElement('script');
    s.addEventListener('load', () => resolve(), { once: true });
    s.addEventListener('error', () => reject(new Error(`Could not load ${src}`)), { once: true });
    if (!existing) {
      s.id = id;
      s.src = src;
      s.async = true;
      document.head.appendChild(s);
    }
  });
}

const round = (n: number) => parseFloat(n.toFixed(6));

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number, address?: string) => void;
}

/** Pin a home on the map: search a place, paste a Google Maps link, or click/drag the pin. */
export function LocationPicker({ lat, lng, onChange }: Props) {
  const { t } = useTranslation('dashboardReception');
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const pin = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const searchBox = useRef<HTMLInputElement>(null);
  const change = useRef(onChange);
  change.current = onChange;
  // Latest pin, for when the map finishes loading after a place was already chosen
  const latest = useRef({ lat, lng });
  latest.current = { lat, lng };

  const [mode, setMode] = useState<'search' | 'link'>('search');
  const [query, setQuery] = useState('');
  const [link, setLink] = useState('');
  const [problem, setProblem] = useState('');
  const [searching, setSearching] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const place = useCallback((la: number, lo: number) => {
    const L = window.L;
    if (!map.current || !L) return;
    if (pin.current) pin.current.setLatLng([la, lo]);
    else {
      const icon = L.divIcon({
        html: '<div style="width:30px;height:30px;background:#0f1f33;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #3fd360"></div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        className: '',
      });
      pin.current = L.marker([la, lo], { icon, draggable: true }).addTo(map.current);
      pin.current.on('dragend', (e: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
        const p = e.target.getLatLng();
        change.current(round(p.lat), round(p.lng));
      });
    }
    map.current.setView([la, lo], Math.max(map.current.getZoom(), 15));
  }, []);

  // The map (Leaflet + OpenStreetMap tiles)
  useEffect(() => {
    let gone = false;
    loadOnce('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', () => !!window.L, 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css')
      .then(() => {
        if (gone || !box.current || map.current) return;
        const L = window.L;
        const { lat: la, lng: lo } = latest.current;
        const m = L.map(box.current).setView(la && lo ? [la, lo] : [DAMASCUS.lat, DAMASCUS.lng], la && lo ? 15 : 12);
        map.current = m;
        // Opened inside a dialog that is still animating: measure again once it settles
        setTimeout(() => m.invalidateSize(), 250);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(m);
        if (la && lo) place(la, lo);
        m.on('click', (e: { latlng: { lat: number; lng: number } }) => {
          place(round(e.latlng.lat), round(e.latlng.lng));
          change.current(round(e.latlng.lat), round(e.latlng.lng));
        });
      })
      .catch(() => !gone && setMapFailed(true));
    return () => {
      gone = true;
      map.current?.remove();
      map.current = null;
      pin.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lat != null && lng != null) place(lat, lng);
  }, [lat, lng, place]);

  // Google Places suggestions while typing (only with a key)
  useEffect(() => {
    if (!GMAPS_KEY || mode !== 'search') return;
    let gone = false;
    loadOnce('gmaps-places-js', `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`, () => !!window.google?.maps?.places)
      .then(() => {
        if (gone || !searchBox.current || !window.google?.maps?.places) return;
        const ac = new window.google.maps.places.Autocomplete(searchBox.current, { types: ['geocode', 'establishment'], fields: ['geometry', 'formatted_address', 'name'] });
        ac.addListener('place_changed', () => {
          const p = ac.getPlace();
          if (!p.geometry?.location) return;
          const addr = p.formatted_address || p.name || '';
          setQuery(addr);
          change.current(round(p.geometry.location.lat()), round(p.geometry.location.lng()), addr);
        });
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [mode]);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setProblem('');
    try {
      if (window.google?.maps?.places) {
        const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
        await new Promise<void>((done) =>
          svc.textSearch({ query: q }, (results: { geometry?: { location: { lat: () => number; lng: () => number } }; formatted_address?: string; name?: string }[], status: string) => {
            const r = results?.[0];
            if (status === 'OK' && r?.geometry) {
              const addr = r.formatted_address || r.name || '';
              setQuery(addr);
              change.current(round(r.geometry.location.lat()), round(r.geometry.location.lng()), addr);
            } else setProblem(t('transport.map.notFound'));
            done();
          }),
        );
      } else {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=sy&q=${encodeURIComponent(q)}`, { headers: { 'Accept-Language': 'ar,en' } });
        const [r] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
        if (r) change.current(round(+r.lat), round(+r.lon), r.display_name);
        else setProblem(t('transport.map.notFound'));
      }
    } catch {
      setProblem(t('transport.map.notFound'));
    } finally {
      setSearching(false);
    }
  };

  const applyLink = () => {
    const v = link.trim();
    if (!v) return;
    const c = parseMapsLink(v);
    if (c) {
      setLink('');
      setProblem('');
      change.current(c.lat, c.lng);
    } else setProblem(t(v.includes('goo.gl') || v.includes('maps.app') ? 'transport.map.shortLink' : 'transport.map.badLink'));
  };

  return (
    <div className="space-y-2.5">
      <div role="tablist" aria-label={t('transport.map.how')} className="flex rounded-pill bg-rail p-1">
        {(['search', 'link'] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={mode === k}
            onClick={() => { setMode(k); setProblem(''); }}
            className={cn('flex h-8 flex-1 items-center justify-center gap-1.5 rounded-pill text-xs font-medium transition-colors focus-visible:focus-ring', mode === k ? 'bg-paper text-ink shadow-card' : 'text-ink-3 hover:text-ink')}
          >
            {k === 'search' ? <Search className="size-3.5" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
            {t(k === 'search' ? 'transport.map.searchTab' : 'transport.map.linkTab')}
          </button>
        ))}
      </div>

      {mode === 'search' ? (
        <div className="flex gap-2">
          <TextInput
            ref={searchBox}
            className="h-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }}
            placeholder={t('transport.map.searchPlaceholder')}
            aria-label={t('transport.map.searchTab')}
            autoComplete="off"
          />
          <Button variant="secondary" size="sm" className="h-10 shrink-0" onClick={() => void search()} disabled={searching || !query.trim()} icon={searching ? <Loader2 className="animate-spin" /> : <Search />}>
            {t('transport.map.find')}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <TextInput
            className="h-10 font-mono text-xs"
            dir="ltr"
            value={link}
            onChange={(e) => { setLink(e.target.value); setProblem(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } }}
            placeholder="https://maps.google.com/…"
            aria-label={t('transport.map.linkTab')}
            aria-describedby="maps-link-hint"
          />
          <Button variant="secondary" size="sm" className="h-10 shrink-0" onClick={applyLink} disabled={!link.trim()} icon={<Check />}>
            {t('transport.map.apply')}
          </Button>
        </div>
      )}
      {mode === 'link' && !problem && (
        <p id="maps-link-hint" className="text-xs text-ink-4">
          {t('transport.map.linkHint')}
        </p>
      )}
      {problem && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {problem}
        </p>
      )}

      <div className="overflow-hidden rounded-card border border-line">
        {mapFailed ? (
          <p className="grid h-[260px] place-items-center bg-rail px-6 text-center text-sm text-ink-3">{t('transport.map.failed')}</p>
        ) : (
          <div ref={box} className="relative z-0 h-[260px] w-full bg-rail" aria-label={t('transport.map.label')} role="application" />
        )}
        <div className="flex items-center justify-between gap-2 border-t border-line bg-canvas px-3 py-2 text-xs text-ink-3">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-ink" aria-hidden />
            {lat && lng ? (
              <span className="font-mono font-medium text-ink" dir="ltr">
                {lat}, {lng}
              </span>
            ) : (
              t('transport.map.clickHint')
            )}
          </span>
          {lat && lng && (
            <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-ink underline-offset-2 hover:underline">
              <Navigation className="size-3" aria-hidden />
              {t('transport.map.open')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
