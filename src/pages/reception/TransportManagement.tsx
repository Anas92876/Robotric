import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Bus, Users, Car, Calendar, Plus,
  Trash2, X, Save, Phone, MapPin, DollarSign,
  Navigation, AlertCircle, ChevronDown, ChevronUp,
  RefreshCw, Search, Check, Link, Loader2, Pencil,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useTransportManagement,
  type DriverStudent, type TransportTrip,
} from '../../hooks/reception/useTransportManagement';

type Tab = 'students' | 'drivers' | 'trips';

/** Deep-link payload passed from the Enrollment page to pre-open the enroll form.
 *  Student-only by design — transport is student-based (one bus seat covers all
 *  courses), so we don't tie the deep-link to a specific enrollment. */
interface DeepLinkEnroll {
  studentId: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  in_travel:  'bg-orange-100 text-orange-700 border-orange-200',
  completed:  'bg-green-100 text-green-700 border-green-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
};

// ─── Location Picker (Places search + Maps link paste + Leaflet map) ──────────

const GMAPS_KEY  = 'REMOVED_GOOGLE_MAPS_KEY';
const DAMASCUS   = { lat: 33.5138, lng: 36.2765 };

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  address: string;
  onChange: (lat: number, lng: number, address?: string) => void;
  isRTL?: boolean;
}

declare global {
  interface Window {
    L: any;
    google: any;
    _googleMapsLoaded?: boolean;
  }
}

/** Extract lat/lng from any Google Maps URL format */
function parseGoogleMapsLink(url: string): { lat: number; lng: number } | null {
  // @lat,lng,zoom (most common share format)
  let m = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // ?q=lat,lng
  m = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // !3d lat !4d lng (embed / place URL)
  m = url.match(/!3d(-?\d+\.?\d*).*?!4d(-?\d+\.?\d*)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  // ll=lat,lng
  m = url.match(/[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ lat, lng, address, onChange, isRTL }) => {
  const containerRef    = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const markerRef       = useRef<any>(null);
  const autocompleteRef = useRef<any>(null);
  const searchInputRef  = useRef<HTMLInputElement>(null);

  const [searchQuery,  setSearchQuery]  = useState('');
  const [linkInput,    setLinkInput]    = useState('');
  const [linkError,    setLinkError]    = useState('');
  const [searching,    setSearching]    = useState(false);
  const [activeTab,    setActiveTab]    = useState<'search' | 'link'>('search');

  // ── Build/update marker ────────────────────────────────────────────────────

  const getIcon = () => {
    const L = window.L;
    return L.divIcon({
      html: `<div style="
        width:32px;height:32px;background:#003300;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);border:3px solid #fff;
        box-shadow:0 2px 10px rgba(0,0,0,0.35);">
      </div>`,
      iconSize: [32, 32], iconAnchor: [16, 32], className: '',
    });
  };

  const placeMarker = useCallback((la: number, lo: number) => {
    if (!mapRef.current) return;
    const L = window.L;
    if (markerRef.current) {
      markerRef.current.setLatLng([la, lo]);
    } else {
      markerRef.current = L.marker([la, lo], { icon: getIcon(), draggable: true }).addTo(mapRef.current);
      markerRef.current.on('dragend', (e: any) => {
        const { lat: la2, lng: lo2 } = e.target.getLatLng();
        onChange(parseFloat(la2.toFixed(6)), parseFloat(lo2.toFixed(6)));
      });
    }
    mapRef.current.setView([la, lo], Math.max(mapRef.current.getZoom(), 15));
  }, [onChange]);

  // ── Init Leaflet ───────────────────────────────────────────────────────────

  const initLeaflet = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;
    const L = window.L;
    const center = lat && lng ? [lat, lng] : [DAMASCUS.lat, DAMASCUS.lng];
    const map = L.map(containerRef.current, { zoomControl: true }).setView(center, lat && lng ? 15 : 12);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    if (lat && lng) placeMarker(lat, lng);

    map.on('click', (e: any) => {
      const la = parseFloat(e.latlng.lat.toFixed(6));
      const lo = parseFloat(e.latlng.lng.toFixed(6));
      placeMarker(la, lo);
      onChange(la, lo);
    });
  }, []); // eslint-disable-line

  // ── Load Leaflet JS/CSS ────────────────────────────────────────────────────

  useEffect(() => {
    const loadLeaflet = () => {
      if (window.L) { initLeaflet(); return; }
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const s = document.createElement('script');
        s.id = 'leaflet-js';
        s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        s.onload = initLeaflet;
        document.head.appendChild(s);
      } else {
        const ex = document.getElementById('leaflet-js') as HTMLScriptElement;
        if (window.L) initLeaflet();
        else ex.addEventListener('load', initLeaflet, { once: true });
      }
    };
    loadLeaflet();
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }
    };
  }, []); // eslint-disable-line

  // Sync external coords → marker
  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    placeMarker(lat, lng);
  }, [lat, lng]); // eslint-disable-line

  // ── Init Google Places autocomplete ───────────────────────────────────────

  const initAutocomplete = useCallback(() => {
    if (!searchInputRef.current || autocompleteRef.current || !window.google?.maps?.places) return;
    const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
      types: ['geocode', 'establishment'],
      fields: ['geometry', 'formatted_address', 'name'],
    });
    autocompleteRef.current = ac;
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;
      const la = parseFloat(place.geometry.location.lat().toFixed(6));
      const lo = parseFloat(place.geometry.location.lng().toFixed(6));
      const addr = place.formatted_address || place.name || '';
      setSearchQuery(addr);
      onChange(la, lo, addr);
    });
  }, [onChange]);

  useEffect(() => {
    if (window.google?.maps?.places) { initAutocomplete(); return; }
    if (!document.getElementById('gmaps-places-js')) {
      const s = document.createElement('script');
      s.id = 'gmaps-places-js';
      s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places`;
      s.async = true;
      s.onload = initAutocomplete;
      document.head.appendChild(s);
    } else {
      const ex = document.getElementById('gmaps-places-js') as HTMLScriptElement;
      if (window.google?.maps?.places) initAutocomplete();
      else ex.addEventListener('load', initAutocomplete, { once: true });
    }
  }, [initAutocomplete]);

  // Re-init autocomplete when tab switches to search
  useEffect(() => {
    if (activeTab === 'search') setTimeout(initAutocomplete, 50);
  }, [activeTab]); // eslint-disable-line

  // ── Geocode free-text via Places (fallback if autocomplete not triggered) ──

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim() || !window.google?.maps?.places) return;
    setSearching(true);
    try {
      const svc = new window.google.maps.places.PlacesService(mapRef.current?._container || document.createElement('div'));
      svc.textSearch({ query: searchQuery }, (results: any[], status: string) => {
        setSearching(false);
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const la = parseFloat(results[0].geometry.location.lat().toFixed(6));
          const lo = parseFloat(results[0].geometry.location.lng().toFixed(6));
          const addr = results[0].formatted_address || results[0].name || '';
          setSearchQuery(addr);
          onChange(la, lo, addr);
        }
      });
    } catch { setSearching(false); }
  };

  // ── Paste Google Maps link ─────────────────────────────────────────────────

  const handlePasteLink = async () => {
    const input = linkInput.trim();
    if (!input) return;
    setLinkError('');

    // Try direct parse first
    let coords = parseGoogleMapsLink(input);

    // If it's a short URL (maps.app.goo.gl / goo.gl), try to resolve via a HEAD request
    if (!coords && (input.includes('goo.gl') || input.includes('maps.app'))) {
      try {
        // We can't follow redirects from the browser due to CORS, so we geocode the raw URL text
        // as a fallback — but tell the user what happened
        setLinkError(isRTL
          ? 'الرابط المختصر لا يمكن معالجته مباشرةً — يرجى نسخ الرابط الكامل من تطبيق الخرائط'
          : 'Short links cannot be resolved in the browser — please copy the full URL from the Maps app');
        return;
      } catch { /* fall through */ }
    }

    if (!coords) {
      setLinkError(isRTL
        ? 'تعذر استخراج الإحداثيات — تأكد من أن الرابط من تطبيق خرائط جوجل'
        : 'Could not extract coordinates — make sure it\'s a Google Maps link');
      return;
    }

    setLinkInput('');
    onChange(coords.lat, coords.lng);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Tab switcher: Search | Paste link */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {(['search', 'link'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-600 transition-all ${
              activeTab === tab ? 'bg-white shadow text-[#003300]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'search' ? <Search className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
            {tab === 'search'
              ? (isRTL ? 'بحث عن مكان' : 'Search place')
              : (isRTL ? 'لصق رابط خرائط' : 'Paste Maps link')}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {activeTab === 'search' && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
              placeholder={isRTL ? 'ابحث عن عنوان أو مكان...' : 'Search address or place...'}
              className="w-full ps-9 pe-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={handleSearchSubmit}
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#003300] text-white rounded-xl text-xs font-600 disabled:opacity-40 hover:bg-[#004400] transition-colors shrink-0"
          >
            {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {isRTL ? 'بحث' : 'Search'}
          </button>
        </div>
      )}

      {/* Paste link tab */}
      {activeTab === 'link' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                value={linkInput}
                onChange={e => { setLinkInput(e.target.value); setLinkError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePasteLink()}
                placeholder={isRTL ? 'https://maps.google.com/...' : 'https://maps.google.com/...'}
                className={`w-full ps-9 pe-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003300]/20 font-mono text-xs ${
                  linkError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                dir="ltr"
              />
            </div>
            <button
              type="button"
              onClick={handlePasteLink}
              disabled={!linkInput.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#003300] text-white rounded-xl text-xs font-600 disabled:opacity-40 hover:bg-[#004400] transition-colors shrink-0"
            >
              <Check className="w-3.5 h-3.5" />
              {isRTL ? 'تطبيق' : 'Apply'}
            </button>
          </div>
          {linkError && (
            <p className="text-xs text-red-500 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {linkError}
            </p>
          )}
          <p className="text-xs text-gray-400">
            {isRTL
              ? 'شارك الموقع من تطبيق خرائط جوجل ← انسخ الرابط ← الصقه هنا'
              : 'Share location from Google Maps → Copy link → Paste here'}
          </p>
        </div>
      )}

      {/* Leaflet map */}
      <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
        <div ref={containerRef} style={{ height: 300, width: '100%' }} />
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#003300]" />
            {lat && lng
              ? <span className="font-mono text-[#003300] font-600">{lat}, {lng}</span>
              : <span>{isRTL ? 'انقر على الخريطة لتحديد الموقع' : 'Click on the map to pin a location'}</span>
            }
          </div>
          {lat && lng && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[#003300] hover:underline"
            >
              <Navigation className="w-3 h-3" />
              {isRTL ? 'عرض' : 'View'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Student Combobox ─────────────────────────────────────────────────────────

interface StudentOption { _id: string; name: string; email: string }

interface StudentComboboxProps {
  value: StudentOption | null;
  onChange: (s: StudentOption | null) => void;
  search: (q: string) => Promise<StudentOption[]>;
  isRTL: boolean;
}

const StudentCombobox: React.FC<StudentComboboxProps> = ({ value, onChange, search, isRTL }) => {
  const [query,   setQuery]   = useState('');
  const [options, setOptions] = useState<StudentOption[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<any>(null);
  const wrapRef  = useRef<HTMLDivElement>(null);

  const doSearch = useCallback((q: string) => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try { setOptions(await search(q)); } catch { setOptions([]); }
      finally { setLoading(false); }
    }, 300);
  }, [search]);

  useEffect(() => { doSearch(query); }, [query, doSearch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (s: StudentOption) => {
    onChange(s);
    setQuery(s.name);
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery('');
    setOpen(true);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative flex items-center">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={value ? value.name : query}
          onChange={e => { setQuery(e.target.value); onChange(null); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={isRTL ? 'ابحث عن طالب...' : 'Search for a student...'}
          className={`w-full ps-9 pe-9 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003300]/20 ${
            value ? 'border-[#003300]/40 bg-[#f0fdf4]' : 'border-gray-200'
          }`}
        />
        {value
          ? <button onClick={clear} className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          : loading
            ? <RefreshCw className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 animate-spin pointer-events-none" />
            : null
        }
      </div>

      {value && (
        <div className="mt-1 px-3 py-1.5 bg-[#f0fdf4] border border-[#003300]/20 rounded-xl flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-[#003300]" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-600 text-gray-900">{value.name}</span>
            <span className="text-xs text-gray-500 ms-2">{value.email}</span>
          </div>
        </div>
      )}

      {open && !value && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {options.length === 0 && !loading && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">
              {isRTL ? 'لا توجد نتائج' : 'No students found'}
            </div>
          )}
          {options.map(s => (
            <button
              key={s._id}
              onMouseDown={() => select(s)}
              className="w-full px-4 py-2.5 flex items-start gap-3 hover:bg-gray-50 transition-colors text-start"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-gray-700 font-700 text-sm">
                {s.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-600 text-gray-900 truncate">{s.name}</p>
                <p className="text-xs text-gray-400 truncate">{s.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const TransportManagement: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboardCommon', 'dashboardReception']);
  const isRTL = i18n.language === 'ar';

  // Deep-link from the Enrollment page: ?tab=students&enrollStudentId=...
  // We read these once on mount, drive initial state from them, then clear the URL
  // so a refresh doesn't keep re-opening the enroll form. enrollmentId is NOT
  // part of the deep-link — transport is student-based and shouldn't couple to
  // a specific enrollment row.
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'students';
  const initialEnrollStudentId = searchParams.get('enrollStudentId');

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [pendingDeepLink, setPendingDeepLink] = useState<DeepLinkEnroll | null>(
    initialEnrollStudentId ? { studentId: initialEnrollStudentId } : null
  );

  // Clear deep-link params from the URL so refresh doesn't re-trigger the open.
  // We keep the tab in the URL since it's a meaningful navigation anchor.
  useEffect(() => {
    if (initialEnrollStudentId) {
      const next = new URLSearchParams(searchParams);
      next.delete('enrollStudentId');
      // Also strip any legacy enrollmentId param a user might still have in the URL
      next.delete('enrollmentId');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hook = useTransportManagement();
  const { loading, error, setError, fetchAcademyLocation } = hook;

  useEffect(() => {
    fetchAcademyLocation();
  }, [fetchAcademyLocation]);

  useEffect(() => {
    if (activeTab === 'students') {
      hook.fetchStudents();
      hook.fetchDrivers(true); // drivers needed for enroll dropdown — silent so no spinner
    } else if (activeTab === 'drivers') {
      hook.fetchDrivers();
    } else if (activeTab === 'trips') {
      hook.fetchTrips();
      hook.fetchDrivers(true); // drivers needed for trip create form
    }
  }, [activeTab]); // eslint-disable-line

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'students', label: isRTL ? 'الطلاب' : 'Students',  icon: <Users className="w-4 h-4" />, count: hook.students.length },
    { id: 'drivers',  label: isRTL ? 'السائقون' : 'Drivers',  icon: <Car className="w-4 h-4" />,   count: hook.drivers.length },
    { id: 'trips',    label: isRTL ? 'الرحلات' : 'Trips',     icon: <Bus className="w-4 h-4" />,   count: hook.trips.length },
  ];

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-[#003300] px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Bus className="w-7 h-7 text-white" />
            <h1 className="text-2xl font-bold text-white">
              {isRTL ? 'إدارة التوصيل' : 'Transportation Management'}
            </h1>
          </div>
          <p className="text-white/60 text-sm ms-10">
            {isRTL ? 'تسجيل الطلاب — إدارة السائقين — متابعة الرحلات' : 'Enroll students — Manage drivers — Track trips'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-4">
        {/* Tab bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 transition-all ${
                activeTab === tab.id
                  ? 'bg-[#003300] text-white shadow'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ms-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-7 h-7 text-[#003300] animate-spin" />
          </div>
        )}

        {/* Tab content */}
        {!loading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'students' && (
                <StudentsTab
                  hook={hook}
                  isRTL={isRTL}
                  deepLink={pendingDeepLink}
                  onDeepLinkConsumed={() => setPendingDeepLink(null)}
                />
              )}
              {activeTab === 'drivers'  && <DriversTab  hook={hook} isRTL={isRTL} />}
              {activeTab === 'trips'    && <TripsTab    hook={hook} isRTL={isRTL} />}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

// ─── Students Tab ─────────────────────────────────────────────────────────────

const StudentsTab: React.FC<{
  hook: ReturnType<typeof useTransportManagement>;
  isRTL: boolean;
  /** Deep-link from the Enrollment page — open the enroll form pre-filled with this student. */
  deepLink?: DeepLinkEnroll | null;
  /** Notify the parent that we've consumed the deep-link so it can clear state. */
  onDeepLinkConsumed?: () => void;
}> = ({ hook, isRTL, deepLink, onDeepLinkConsumed }) => {
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [search, setSearch] = useState('');

  // Enroll form state
  const [selectedStudent, setSelectedStudent] = useState<{ _id: string; name: string; email: string } | null>(null);
  const [driverId,        setDriverId]        = useState('');
  const [homeAddress,     setHomeAddress]     = useState('');
  const [phoneNumber,     setPhoneNumber]     = useState('');
  const [sessionsPerMonth, setSessionsPerMonth] = useState('');
  const [mapLat, setMapLat] = useState<number | null>(null);
  const [mapLng, setMapLng] = useState<number | null>(null);
  const [estimate, setEstimate]   = useState<any>(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving]       = useState(false);

  // ── Deep-link consumer ────────────────────────────────────────────────────
  // When the Enrollment page sends us here with an enrollStudentId, look up the
  // student's full record (name/email) so the combobox displays correctly,
  // then open the form. We deliberately do NOT carry an enrollmentId — transport
  // is student-based and the bus seat covers all the student's courses.
  useEffect(() => {
    if (!deepLink?.studentId) return;
    let cancelled = false;
    (async () => {
      try {
        // The hook's searchStudents accepts a query string. Use the id itself
        // as the search term — the backend matches by id when it's an exact
        // ObjectId. Fall back to a stub if the lookup returns nothing.
        const results = await hook.searchStudents(deepLink.studentId);
        const match = results.find(s => s._id === deepLink.studentId) || results[0];
        if (cancelled) return;
        setSelectedStudent(match || {
          _id: deepLink.studentId,
          name: 'Selected student',
          email: '',
        });
        setShowEnrollForm(true);
        hook.fetchDrivers(true);
        onDeepLinkConsumed?.();
      } catch {
        // Still open the form even if name lookup failed — the id is enough to
        // submit. Reception can manually adjust the student if needed.
        if (cancelled) return;
        setSelectedStudent({ _id: deepLink.studentId, name: 'Selected student', email: '' });
        setShowEnrollForm(true);
        onDeepLinkConsumed?.();
      }
    })();
    return () => { cancelled = true; };
    // We deliberately depend only on deepLink — re-running on hook identity changes
    // would re-open the form every time the hook's memoised functions are recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLink?.studentId]);

  const resetForm = () => {
    setSelectedStudent(null);
    setDriverId('');
    setHomeAddress('');
    setPhoneNumber('');
    setSessionsPerMonth('');
    setMapLat(null);
    setMapLng(null);
    setEstimate(null);
  };

  const filtered = hook.students.filter(s => {
    const name = (s.studentId as any)?.name || '';
    return name.toLowerCase().includes(search.toLowerCase()) ||
      (s.homeAddress || '').toLowerCase().includes(search.toLowerCase());
  });

  const handleEstimate = async () => {
    if (!mapLat || !mapLng) return;
    setEstimating(true);
    try {
      const res = await hook.getCostEstimate(
        mapLat, mapLng,
        undefined,
        sessionsPerMonth ? parseInt(sessionsPerMonth) : undefined,
      );
      setEstimate(res);
    } catch { /* shown via hook error */ }
    finally { setEstimating(false); }
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !driverId || !mapLat || !mapLng) return;
    setSaving(true);
    try {
      // No enrollmentId — transport is student-based. The backend syncs the
      // cache on ALL of this student's transport-enabled enrollments via
      // syncEnrollmentTransportCache(studentId) once the DriverStudent is created.
      await hook.enrollStudent({
        studentId: selectedStudent._id,
        driverId,
        homeLocation: { lat: mapLat, lng: mapLng },
        homeAddress: homeAddress || undefined,
        phoneNumber: phoneNumber || undefined,
        sessionsPerMonthOverride: sessionsPerMonth ? parseInt(sessionsPerMonth) : undefined,
      });
      setShowEnrollForm(false);
      resetForm();
    } catch { /* shown via hook error */ }
    finally { setSaving(false); }
  };

  return (
    <div className="pb-10">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isRTL ? 'بحث بالاسم أو العنوان...' : 'Search by name or address...'}
            className="w-full ps-9 pe-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
          />
        </div>
        <button
          onClick={() => { setShowEnrollForm(true); hook.fetchDrivers(true); }}
          className="flex items-center gap-2 bg-[#003300] text-white px-4 py-2 rounded-xl text-sm font-600 hover:bg-[#004400] transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isRTL ? 'تسجيل طالب' : 'Enroll Student'}
        </button>
      </div>

      {/* Enroll form */}
      <AnimatePresence>
        {showEnrollForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-700 text-[#003300] text-base">
                {isRTL ? 'تسجيل طالب في التوصيل' : 'Enroll Student in Transportation'}
              </h3>
              <button onClick={() => { setShowEnrollForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left column */}
              <div className="space-y-4">
                {/* Student combobox */}
                <div>
                  <label className="block text-xs font-600 text-gray-500 mb-1.5">
                    {isRTL ? 'الطالب' : 'Student'} <span className="text-red-400">*</span>
                  </label>
                  <StudentCombobox
                    value={selectedStudent}
                    onChange={setSelectedStudent}
                    search={hook.searchStudents}
                    isRTL={isRTL}
                  />
                </div>

                {/* Driver dropdown */}
                <div>
                  <label className="block text-xs font-600 text-gray-500 mb-1.5 flex items-center gap-1.5">
                    {isRTL ? 'السائق' : 'Driver'} <span className="text-red-400">*</span>
                    {hook.drivers.length === 0 && (
                      <RefreshCw className="w-3 h-3 text-gray-300 animate-spin" />
                    )}
                  </label>
                  <select
                    value={driverId}
                    onChange={e => setDriverId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
                  >
                    {hook.drivers.length === 0
                      ? <option value="">{isRTL ? 'جاري التحميل...' : 'Loading drivers...'}</option>
                      : <>
                          <option value="">{isRTL ? 'اختر سائقاً...' : 'Select driver...'}</option>
                          {hook.drivers.map(d => (
                            <option key={d._id} value={d._id}>
                              {d.name} — {d.studentCount} {isRTL ? 'طالب' : 'students'} · {isRTL ? 'سعة' : 'seat cap'} {d.capacity}
                            </option>
                          ))}
                        </>
                    }
                  </select>
                </div>

                {/* Home address */}
                <div>
                  <label className="block text-xs font-600 text-gray-500 mb-1.5">
                    {isRTL ? 'العنوان' : 'Home Address'}
                  </label>
                  <input
                    value={homeAddress}
                    onChange={e => setHomeAddress(e.target.value)}
                    placeholder={isRTL ? 'وصف العنوان (اختياري)' : 'Address description (optional)'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-600 text-gray-500 mb-1.5">
                    {isRTL ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <input
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
                  />
                </div>

                {/* Sessions */}
                <div>
                  <label className="block text-xs font-600 text-gray-500 mb-1.5">
                    {isRTL ? 'جلسات / الشهر (اختياري)' : 'Sessions/Month (optional)'}
                  </label>
                  <input
                    value={sessionsPerMonth}
                    onChange={e => setSessionsPerMonth(e.target.value)}
                    type="number"
                    min="1"
                    placeholder={isRTL ? 'يُحسب تلقائياً' : 'Auto-calculated'}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
                  />
                </div>
              </div>

              {/* Right column — Location picker */}
              <div className="space-y-2">
                <label className="block text-xs font-600 text-gray-500 mb-1.5">
                  {isRTL ? 'موقع المنزل' : 'Home Location'}
                  {mapLat && mapLng && <span className="text-[#003300] ms-2">✓</span>}
                  {!mapLat && <span className="text-red-400 ms-1">*</span>}
                </label>
                <LocationPicker
                  lat={mapLat}
                  lng={mapLng}
                  address={homeAddress}
                  isRTL={isRTL}
                  onChange={(la, lo, addr) => {
                    setMapLat(la);
                    setMapLng(lo);
                    if (addr && !homeAddress) setHomeAddress(addr);
                  }}
                />
              </div>
            </div>

            {/* Fee estimate result */}
            {estimate && (
              <div className="mt-4 bg-white border-2 border-[#003300]/20 rounded-xl p-4">
                <p className="text-xs font-700 text-[#003300] mb-3">{isRTL ? 'تقدير التكلفة' : 'Fee Estimate'}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg font-800 text-gray-900">{estimate.distanceKm} km</p>
                    <p className="text-xs text-gray-500 mt-0.5">{isRTL ? 'المسافة' : 'Distance'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg font-800 text-gray-900">{estimate.sessionsPerMonth}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{isRTL ? 'جلسات / شهر' : 'Sessions/mo'}</p>
                  </div>
                  <div className="bg-[#003300] rounded-xl p-3">
                    <p className="text-lg font-800 text-white">{(estimate.monthlyFee ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-white/70 mt-0.5">{estimate.breakdown?.currency || 'SYP'} / {isRTL ? 'شهر' : 'month'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <button
                onClick={handleEstimate}
                disabled={estimating || !mapLat || !mapLng}
                className="flex items-center gap-2 border border-[#003300] text-[#003300] px-4 py-2 rounded-xl text-sm font-600 hover:bg-[#003300]/5 disabled:opacity-40 transition-colors"
              >
                {estimating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {isRTL ? 'احسب التكلفة' : 'Calculate Fee'}
              </button>
              <button
                onClick={handleEnroll}
                disabled={saving || !selectedStudent || !driverId || !mapLat || !mapLng}
                className="flex items-center gap-2 bg-[#003300] text-white px-5 py-2 rounded-xl text-sm font-600 hover:bg-[#004400] disabled:opacity-40 transition-colors"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isRTL ? 'حفظ' : 'Save'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Students list */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Users className="w-10 h-10 text-gray-300" />} message={isRTL ? 'لا يوجد طلاب مسجلون في التوصيل' : 'No students enrolled in transportation'} />
      ) : (
        <div className="grid gap-3">
          {filtered.map(ds => (
            <StudentCard key={ds._id} ds={ds} isRTL={isRTL} hook={hook} />
          ))}
        </div>
      )}
    </div>
  );
};

const StudentCard: React.FC<{ ds: DriverStudent; isRTL: boolean; hook: ReturnType<typeof useTransportManagement> }> = ({ ds, isRTL, hook }) => {
  const [expanded, setExpanded] = useState(false);
  const [removing, setRemoving] = useState(false);

  const student = ds.studentId as any;
  const driver  = ds.driverId  as any;

  const handleRemove = async () => {
    if (!confirm(isRTL ? 'إزالة هذا الطالب من التوصيل؟' : 'Remove this student from transportation?')) return;
    setRemoving(true);
    try { await hook.removeStudent(ds._id); }
    finally { setRemoving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <span className="text-gray-700 font-800 text-sm">{student?.name?.[0] || '?'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-700 text-gray-900 text-sm">{student?.name || 'Unknown'}</p>
          <p className="text-xs text-gray-400 truncate">{ds.homeAddress || '—'}</p>
        </div>
        <div className="text-end shrink-0">
          <p className="font-800 text-[#003300] text-sm">{ds.monthlyFee?.toLocaleString() || '—'}</p>
          <p className="text-xs text-gray-400">SYP/mo</p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600 ms-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-gray-50">
            <div className="px-4 pb-4 pt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <InfoCell label={isRTL ? 'السائق' : 'Driver'} value={driver?.name || '—'} icon={<Car className="w-3 h-3" />} />
              <InfoCell label={isRTL ? 'المسافة' : 'Distance'} value={`${ds.distanceKm || 0} km`} icon={<Navigation className="w-3 h-3" />} />
              <InfoCell label={isRTL ? 'الجلسات/شهر' : 'Sessions/mo'} value={String(ds.sessionsPerMonth)} icon={<Calendar className="w-3 h-3" />} />
              <InfoCell label={isRTL ? 'الهاتف' : 'Phone'} value={ds.phoneNumber || '—'} icon={<Phone className="w-3 h-3" />} />
            </div>
            {ds.homeLocation && (
              <div className="px-4 pb-4">
                <a
                  href={`https://www.google.com/maps?q=${ds.homeLocation.lat},${ds.homeLocation.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                >
                  <MapPin className="w-3 h-3" />
                  {isRTL ? 'عرض على الخريطة' : 'View on map'}
                </a>
              </div>
            )}
            <div className="px-4 pb-4">
              <button
                onClick={handleRemove}
                disabled={removing}
                className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isRTL ? 'إزالة' : 'Remove'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Drivers Tab ──────────────────────────────────────────────────────────────

const EMPTY_DRIVER_FORM = {
  name: '', email: '', password: '',
  vehiclePlate: '', vehicleModel: '', vehicleColor: '',
  vehicleCapacity: '5', phoneNumber: '',
};

const DriversTab: React.FC<{ hook: ReturnType<typeof useTransportManagement>; isRTL: boolean }> = ({ hook, isRTL }) => {
  // editTarget !== null means edit mode. showForm doubles as the visibility flag
  // — open via "Add Driver" (editTarget null) or row Edit button (editTarget set).
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_DRIVER_FORM);

  const isEdit = editTarget !== null;

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_DRIVER_FORM);
    setShowForm(true);
  };

  const openEdit = (driver: any) => {
    setEditTarget(driver);
    // Prefill from the driver row. Password stays blank — editing doesn't
    // change auth credentials (we don't expose a password-reset surface here).
    setForm({
      name:        driver.name || '',
      email:       driver.email || '',
      password:    '',
      vehiclePlate:    driver.profile_data?.vehiclePlate    || '',
      vehicleModel:    driver.profile_data?.vehicleModel    || '',
      vehicleColor:    driver.profile_data?.vehicleColor    || '',
      vehicleCapacity: String(driver.profile_data?.vehicleCapacity ?? driver.capacity ?? 5),
      phoneNumber:     driver.profile_data?.phoneNumber     || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_DRIVER_FORM);
  };

  const handleSave = async () => {
    if (isEdit) {
      // Edit path — name + vehicle fields only. Email/password require
      // separate flows (changing them affects auth + login) and we don't
      // surface that here.
      if (!form.name) return;
      setSaving(true);
      try {
        await hook.updateDriver(editTarget._id, {
          name: form.name,
          phoneNumber: form.phoneNumber || undefined,
          vehiclePlate: form.vehiclePlate || undefined,
          vehicleModel: form.vehicleModel || undefined,
          vehicleColor: form.vehicleColor || undefined,
          vehicleCapacity: parseInt(form.vehicleCapacity) || 5,
        });
        closeForm();
      } finally { setSaving(false); }
    } else {
      // Create path
      if (!form.name || !form.email || !form.password) return;
      setSaving(true);
      try {
        await hook.createDriver({ ...form, vehicleCapacity: parseInt(form.vehicleCapacity) || 5 });
        closeForm();
      } finally { setSaving(false); }
    }
  };

  const handleDelete = async (driver: any) => {
    // Plain confirm() is fine here — reception is a desktop staff context
    // and the backend has guards (active students / in-flight trips) that
    // produce a specific 409 message we can surface verbatim.
    const msg = isRTL
      ? `هل أنت متأكد من حذف السائق "${driver.name}"؟ لن تتأثر الرحلات السابقة.`
      : `Delete driver "${driver.name}"? Historical trips will not be affected.`;
    if (!window.confirm(msg)) return;
    setDeletingId(driver._id);
    try {
      await hook.removeDriver(driver._id);
    } catch (err: any) {
      // The backend returns a specific message when the driver still has
      // students or in-flight trips — show that to the user.
      const apiMsg = err?.response?.data?.error?.message
        || err?.response?.data?.message
        || err?.message
        || (isRTL ? 'تعذّر حذف السائق' : 'Could not delete driver');
      window.alert(apiMsg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{hook.drivers.length} {isRTL ? 'سائق' : 'drivers'}</p>
        <button onClick={openCreate} className="flex items-center gap-2 bg-[#003300] text-white px-4 py-2 rounded-xl text-sm font-600 hover:bg-[#004400] transition-colors">
          <Plus className="w-4 h-4" /> {isRTL ? 'إضافة سائق' : 'Add Driver'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-700 text-[#003300]">
                {isEdit
                  ? (isRTL ? `تعديل السائق: ${editTarget?.name}` : `Edit Driver: ${editTarget?.name}`)
                  : (isRTL ? 'إضافة سائق جديد' : 'Add New Driver')}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'name',          label: isRTL ? 'الاسم' : 'Name',             required: true,  type: 'text' },
                // Email + password are only fields when creating. On edit
                // they'd just confuse — credentials are out of scope here.
                ...(isEdit ? [] : [
                  { key: 'email',    label: isRTL ? 'البريد' : 'Email',         required: true, type: 'email' },
                  { key: 'password', label: isRTL ? 'كلمة المرور' : 'Password', required: true, type: 'password' },
                ]),
                { key: 'phoneNumber',   label: isRTL ? 'الهاتف' : 'Phone',           required: false, type: 'text' },
                { key: 'vehiclePlate',  label: isRTL ? 'لوحة السيارة' : 'Plate',     required: false, type: 'text' },
                { key: 'vehicleModel',  label: isRTL ? 'موديل السيارة' : 'Model',    required: false, type: 'text' },
                { key: 'vehicleColor',  label: isRTL ? 'لون السيارة' : 'Color',      required: false, type: 'text' },
                { key: 'vehicleCapacity', label: isRTL ? 'سعة المقاعد (لكل رحلة)' : 'Seat Capacity (per trip)', required: false, type: 'number' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-600 text-gray-500 mb-1">{field.label}{field.required && ' *'}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key]}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={closeForm} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-600 hover:bg-gray-50 transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || (!isEdit && (!form.email || !form.password))}
                className="flex items-center gap-2 bg-[#003300] text-white px-5 py-2 rounded-xl text-sm font-600 hover:bg-[#004400] disabled:opacity-40 transition-colors"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEdit ? (isRTL ? 'حفظ التغييرات' : 'Save Changes') : (isRTL ? 'إنشاء' : 'Create')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hook.drivers.length === 0 ? (
        <EmptyState icon={<Car className="w-10 h-10 text-gray-300" />} message={isRTL ? 'لا يوجد سائقون مسجلون' : 'No drivers registered'} />
      ) : (
        <div className="grid gap-3">
          {hook.drivers.map(driver => {
            const isDeleting = deletingId === driver._id;
            return (
              <div key={driver._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-700 text-gray-900 truncate">{driver.name}</p>
                    <p className="text-xs text-gray-400 truncate">{driver.email}</p>
                    {driver.profile_data?.vehiclePlate && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {[driver.profile_data.vehicleColor, driver.profile_data.vehicleModel, driver.profile_data.vehiclePlate].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="text-end shrink-0">
                    <p className="font-800 text-[#003300] text-lg">{driver.studentCount}</p>
                    <p className="text-xs text-gray-400">{isRTL ? 'طلاب مسجلون' : 'enrolled students'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isRTL ? 'سعة السيارة' : 'seat cap'}: {driver.capacity}
                    </p>
                  </div>

                  {/* Row actions */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(driver)}
                      disabled={isDeleting}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      title={isRTL ? 'تعديل' : 'Edit'}
                    >
                      <Pencil className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(driver)}
                      disabled={isDeleting}
                      className="p-2 rounded-lg border border-red-200 hover:bg-red-50 disabled:opacity-40 transition-colors"
                      title={isRTL ? 'حذف' : 'Delete'}
                    >
                      {isDeleting
                        ? <RefreshCw className="w-4 h-4 text-red-600 animate-spin" />
                        : <Trash2 className="w-4 h-4 text-red-600" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Trips Tab ────────────────────────────────────────────────────────────────

const STUDENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  picked:  'bg-green-100 text-green-700',
  absent:  'bg-red-100 text-red-700',
  dropped: 'bg-purple-100 text-purple-700',
};

const TripsTab: React.FC<{ hook: ReturnType<typeof useTransportManagement>; isRTL: boolean }> = ({ hook, isRTL }) => {
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState({ driverId: '', date: '', direction: 'to_academy', isExtra: false, extraCharge: '', notes: '' });
  const [driverStudents, setDriverStudents] = useState<{ _id: string; studentName: string; pickupOrder: number }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingDriverStudents, setLoadingDriverStudents] = useState(false);

  // Fire only when filters actually change (not on every render)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    hook.fetchTrips({ status: filterStatus || undefined, date: filterDate || undefined });
  }, [filterStatus, filterDate]); // eslint-disable-line

  // Load students when driver changes
  useEffect(() => {
    if (!form.driverId) { setDriverStudents([]); setSelectedStudentIds([]); return; }
    setLoadingDriverStudents(true);
    hook.fetchStudents({ driverId: form.driverId }, true)
      .then(() => {
        const ds = hook.students
          .filter((s: any) => {
            const did = typeof s.driverId === 'object' ? s.driverId._id : s.driverId;
            return String(did) === String(form.driverId);
          })
          .map((s: any) => ({
            _id: s._id,
            studentName: typeof s.studentId === 'object' ? s.studentId.name : s.studentName || '',
            pickupOrder: s.pickupOrder,
          }))
          .sort((a: any, b: any) => a.pickupOrder - b.pickupOrder);
        setDriverStudents(ds);
        setSelectedStudentIds(ds.map((s: any) => s._id)); // default: all selected
      })
      .finally(() => setLoadingDriverStudents(false));
  }, [form.driverId]); // eslint-disable-line

  const toggleStudent = (id: string) =>
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleCreate = async () => {
    if (!form.driverId || !form.date || !form.direction) return;
    setSaving(true);
    try {
      await hook.createTrip({
        driverId: form.driverId,
        date: form.date,
        direction: form.direction,
        isExtra: form.isExtra,
        extraCharge: form.extraCharge ? parseFloat(form.extraCharge) : 0,
        notes: form.notes,
        // Only send studentIds if not all selected (backend defaults to all if omitted)
        studentIds: selectedStudentIds.length < driverStudents.length ? selectedStudentIds : undefined,
      });
      setShowForm(false);
      setForm({ driverId: '', date: '', direction: 'to_academy', isExtra: false, extraCharge: '', notes: '' });
      setSelectedStudentIds([]);
      setDriverStudents([]);
    } finally { setSaving(false); }
  };

  const handleCancel = async (trip: TransportTrip) => {
    const reason = prompt(isRTL ? 'سبب الإلغاء:' : 'Cancellation reason:');
    if (reason === null) return;
    await hook.updateTrip(trip._id, { status: 'cancelled', cancellationReason: reason });
  };

  const handleDelete = async (trip: TransportTrip) => {
    // The backend refuses to delete in_travel trips, but we also gate here so
    // the button is just not shown in that state. Reception confirms once to
    // avoid mis-clicks, then we surface the server error verbatim if it fails
    // (e.g., a race where the trip became in_travel between view and delete).
    const msg = isRTL
      ? 'هل أنت متأكد من حذف هذه الرحلة؟ لا يمكن التراجع.'
      : 'Delete this trip permanently? This cannot be undone.';
    if (!window.confirm(msg)) return;
    setDeletingId(trip._id);
    try {
      await hook.removeTrip(trip._id);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error?.message
        || err?.response?.data?.message
        || err?.message
        || (isRTL ? 'تعذّر حذف الرحلة' : 'Could not delete trip');
      window.alert(apiMsg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="pb-10">
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20" />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20">
          <option value="">{isRTL ? 'كل الحالات' : 'All statuses'}</option>
          <option value="scheduled">{isRTL ? 'مجدولة' : 'Scheduled'}</option>
          <option value="in_travel">{isRTL ? 'في الطريق' : 'In Travel'}</option>
          <option value="completed">{isRTL ? 'مكتملة' : 'Completed'}</option>
          <option value="cancelled">{isRTL ? 'ملغاة' : 'Cancelled'}</option>
        </select>
        <button onClick={() => hook.fetchTrips({ status: filterStatus || undefined, date: filterDate || undefined })}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 ${hook.tripsLoading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={() => setShowForm(true)}
          className="ms-auto flex items-center gap-2 bg-[#003300] text-white px-4 py-2 rounded-xl text-sm font-600 hover:bg-[#004400] transition-colors">
          <Plus className="w-4 h-4" /> {isRTL ? 'رحلة جديدة' : 'New Trip'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-700 text-[#003300]">{isRTL ? 'إنشاء رحلة جديدة' : 'Create New Trip'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'السائق' : 'Driver'} *</label>
                <select value={form.driverId} onChange={e => setForm(f => ({ ...f, driverId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20">
                  <option value="">{isRTL ? 'اختر سائقاً' : 'Select driver'}</option>
                  {hook.drivers.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'التاريخ' : 'Date'} *</label>
                <input type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20" />
              </div>
              <div>
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'الاتجاه' : 'Direction'}</label>
                <select value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20">
                  <option value="to_academy">{isRTL ? '🌅 صباحاً — من المنازل إلى روبوتريك' : '🌅 Morning — Homes → RoboTrick'}</option>
                  <option value="from_academy">{isRTL ? '🌆 مساءً — من روبوتريك إلى المنازل' : '🌆 Afternoon — RoboTrick → Homes'}</option>
                </select>
              </div>
              {/* Student selector — shown after driver is chosen */}
              {form.driverId && (
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-600 text-gray-500">
                      {isRTL ? 'الطلاب في هذه الرحلة' : 'Students in this trip'}
                    </label>
                    {loadingDriverStudents
                      ? <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                      : <span className="text-xs text-gray-400">{selectedStudentIds.length}/{driverStudents.length} {isRTL ? 'محدد' : 'selected'}</span>
                    }
                  </div>
                  {driverStudents.length === 0 && !loadingDriverStudents
                    ? <p className="text-xs text-gray-400 italic">{isRTL ? 'لا يوجد طلاب لهذا السائق' : 'No students for this driver'}</p>
                    : (
                      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                        {driverStudents.map(s => (
                          <label key={s._id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
                            <input type="checkbox" checked={selectedStudentIds.includes(s._id)}
                              onChange={() => toggleStudent(s._id)}
                              className="w-4 h-4 accent-[#003300] shrink-0" />
                            <div className="w-5 h-5 rounded-full bg-[#003300] flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-800">{s.pickupOrder}</span>
                            </div>
                            <span className="text-sm text-gray-800">{s.studentName}</span>
                          </label>
                        ))}
                      </div>
                    )
                  }
                </div>
              )}
              <div>
                <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20" />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.isExtra} onChange={e => setForm(f => ({ ...f, isExtra: e.target.checked }))} className="w-4 h-4 accent-[#003300]" />
                  {isRTL ? 'رحلة إضافية' : 'Extra trip'}
                </label>
              </div>
              {form.isExtra && (
                <div>
                  <label className="block text-xs font-600 text-gray-500 mb-1">{isRTL ? 'رسوم إضافية' : 'Extra Charge'}</label>
                  <input type="number" value={form.extraCharge} onChange={e => setForm(f => ({ ...f, extraCharge: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003300]/20" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowForm(false)} className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-600 hover:bg-gray-50 transition-colors">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button onClick={handleCreate} disabled={saving || !form.driverId || !form.date}
                className="flex items-center gap-2 bg-[#003300] text-white px-5 py-2 rounded-xl text-sm font-600 hover:bg-[#004400] disabled:opacity-40 transition-colors">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isRTL ? 'إنشاء' : 'Create'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hook.tripsLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-[#003300] animate-spin" />
        </div>
      ) : hook.trips.length === 0 ? (
        <EmptyState icon={<Bus className="w-10 h-10 text-gray-300" />} message={isRTL ? 'لا توجد رحلات' : 'No trips found'} />
      ) : (
        <div className="grid gap-3">
          {hook.trips.map(trip => {
            const sc = STATUS_COLORS[trip.status] || 'bg-gray-100 text-gray-600 border-gray-200';
            const driverName = (trip.driverId as any)?.name || trip.driverId;
            const isExpanded = expandedId === trip._id;

            return (
              <div key={trip._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Clickable header */}
                <button
                  className="w-full text-start p-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : trip._id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`px-2.5 py-1 rounded-lg border text-xs font-700 shrink-0 ${sc}`}>
                      {trip.status === 'in_travel' ? (isRTL ? 'في الطريق' : 'In Travel') : trip.status.replace('_', ' ')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-700 text-gray-900 text-sm">
                        {trip.direction === 'to_academy' ? (isRTL ? '🌅 إلى روبوتريك' : '🌅 To RoboTrick') : (isRTL ? '🌆 إلى المنازل' : '🌆 To Homes')}
                        {trip.isExtra && <span className="ms-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{isRTL ? 'إضافية' : 'Extra'}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(trip.date).toLocaleString()} · {driverName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{trip.studentsSnapshot.length} {isRTL ? 'طلاب' : 'students'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {trip.driverEarnings != null && trip.driverEarnings > 0 && (
                        <span className="text-xs text-white bg-[#003300] px-2 py-1.5 rounded-lg font-700">
                          {trip.driverEarnings.toLocaleString()} SYP
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 px-4 py-3">
                        {/* Students list */}
                        {trip.studentsSnapshot.length > 0 ? (
                          <div className="mb-3">
                            <p className="text-xs font-700 text-gray-500 mb-2">{isRTL ? 'الطلاب' : 'Students'}</p>
                            <div className="grid gap-2">
                              {[...trip.studentsSnapshot]
                                .sort((a, b) => a.pickupOrder - b.pickupOrder)
                                .map(s => {
                                  const se = trip.studentStatuses?.find(st => String(st.studentId) === String(s.studentId));
                                  const ss = se?.status || 'pending';
                                  const ssc = STUDENT_STATUS_COLORS[ss] || 'bg-gray-100 text-gray-600';
                                  return (
                                    <div key={String(s.studentId)} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                                      <div className="w-6 h-6 rounded-full bg-[#003300] flex items-center justify-center shrink-0">
                                        <span className="text-white text-xs font-800">{s.pickupOrder}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-600 text-gray-900 truncate">{s.studentName}</p>
                                        {s.homeAddress && <p className="text-xs text-gray-400 truncate">{s.homeAddress}</p>}
                                      </div>
                                      {s.phoneNumber && (
                                        <a href={`tel:${s.phoneNumber}`} className="text-gray-400 hover:text-[#003300]">
                                          <Phone className="w-4 h-4" />
                                        </a>
                                      )}
                                      <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${ssc}`}>{ss}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mb-3">{isRTL ? 'لا يوجد طلاب في هذه الرحلة' : 'No students in this trip'}</p>
                        )}

                        {/* Notes */}
                        {trip.notes && (
                          <p className="text-xs text-gray-500 mb-3 italic">"{trip.notes}"</p>
                        )}

                        {/* Status actions */}
                        <div className="flex flex-wrap gap-2">
                          {trip.status === 'scheduled' && (
                            <button
                              onClick={async () => {
                                if (!confirm(isRTL ? 'هل تريد بدء هذه الرحلة يدوياً؟' : 'Force-start this trip?')) return;
                                await hook.updateTrip(trip._id, { status: 'in_travel' });
                              }}
                              className="text-xs text-emerald-700 border border-emerald-200 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-600">
                              {isRTL ? '▶ بدء الرحلة' : '▶ Force Start'}
                            </button>
                          )}
                          {trip.status === 'in_travel' && (
                            <button
                              onClick={async () => {
                                if (!confirm(isRTL ? 'هل تريد إكمال هذه الرحلة يدوياً؟' : 'Force-complete this trip?')) return;
                                await hook.updateTrip(trip._id, { status: 'completed' });
                              }}
                              className="text-xs text-blue-700 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-600">
                              {isRTL ? '✓ إكمال الرحلة' : '✓ Force Complete'}
                            </button>
                          )}
                          {(trip.status === 'scheduled' || trip.status === 'in_travel') && (
                            <button onClick={() => handleCancel(trip)}
                              className="text-xs text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              {isRTL ? 'إلغاء الرحلة' : 'Cancel Trip'}
                            </button>
                          )}

                          {/* Delete — available on any non-in-travel trip. For an
                              in-progress trip, reception must cancel first to
                              avoid orphaning student-status updates and live-
                              location pings the driver is sending. */}
                          {trip.status !== 'in_travel' && (
                            <button
                              onClick={() => handleDelete(trip)}
                              disabled={deletingId === trip._id}
                              className="flex items-center gap-1.5 text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 px-3 py-1.5 rounded-lg transition-colors font-600"
                              title={isRTL ? 'حذف نهائي' : 'Delete permanently'}
                            >
                              {deletingId === trip._id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />}
                              {isRTL ? 'حذف' : 'Delete'}
                            </button>
                          )}
                        </div>
                        {trip.status === 'cancelled' && trip.cancellationReason && (
                          <p className="text-xs text-red-500 mt-1">{isRTL ? 'سبب الإلغاء: ' : 'Reason: '}{trip.cancellationReason}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

const InfoCell: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-start gap-1.5">
    {icon && <span className="text-gray-400 mt-0.5">{icon}</span>}
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="font-600 text-gray-700">{value}</p>
    </div>
  </div>
);

const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    {icon}
    <p className="text-gray-400 text-sm mt-3">{message}</p>
  </div>
);

export default TransportManagement;
