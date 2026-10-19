import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  Navigation,
  Map as MapIcon,
  List as ListIcon,
  X,
  PlusCircle,
  MessageSquarePlus,
  AlertCircle,
  Camera,
  Scan,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { PujoMap } from '../components/map/PujoMap.jsx';
import { PujaCard } from '../components/pujas/PujaCard.jsx';
import { CrowdBadge } from '../components/common/CrowdBadge.jsx';
import { ToggleSwitch } from '../components/common/ToggleSwitch.jsx';
import { CrowdReportModal } from '../components/crowd/CrowdReportModal.jsx';
import { AutoCrowdDetectModal } from '../components/crowd/AutoCrowdDetectModal.jsx';
import { AlpanaCorner, AlpanaDivider, AlpanaMandala } from '../components/common/AlpanaMotif.jsx';
import { Layout, ComponentLayout } from '../components/layout/index.js';
import { useNavigation } from '../context/NavigationContext.jsx';

const LOCALITIES = [
  'All Localities',
  'South Kolkata',
  'North Kolkata',
  'Central Kolkata',
  'Salt Lake',
  'Behala',
  'Kolkata Suburbs',
];

const CATEGORIES = [
  'All Categories',
  'Traditional / Heritage',
  'Theme / Contemporary',
  'Community / Baroari',
  'Bonedi Bari / Household',
];

const QUICK_LOCALITIES = [
  { label: 'All Pandals', value: 'All Localities' },
  { label: 'South Kolkata', value: 'South Kolkata' },
  { label: 'North Kolkata', value: 'North Kolkata' },
  { label: 'Central Kolkata', value: 'Central Kolkata' },
  { label: 'Salt Lake', value: 'Salt Lake' },
  { label: 'Behala', value: 'Behala' },
  { label: 'Suburbs', value: 'Kolkata Suburbs' },
];

export function HomePage() {
  const [searchParams] = useSearchParams();
  const pujaParam = searchParams.get('puja');
  const { mobileMenuOpen } = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('All Localities');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedCrowdFilter, setSelectedCrowdFilter] = useState('all'); // all | low | moderate | high
  const [userLocation, setUserLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [sortByDistance, setSortByDistance] = useState(false);

  // Mobile view toggle: 'split' on desktop, 'map' | 'list' on mobile
  const [mobileView, setMobileView] = useState(pujaParam ? 'map' : 'list'); // 'list' | 'map'
  const [selectedPuja, setSelectedPuja] = useState(null);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [reportingPuja, setReportingPuja] = useState(null);
  const [aiDetectPuja, setAiDetectPuja] = useState(null);
  const [isLivePollingEnabled, setIsLivePollingEnabled] = useState(true);
  const [selectedFestival, setSelectedFestival] = useState('durga'); // 'durga' | 'kali' | 'jagaddhatri'
  const [festivalDropdownOpen, setFestivalDropdownOpen] = useState(false);

  // Search focus & geocoding
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const searchContainerRef = useRef(null);
  const mapSectionRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchQuery(searchQuery), 250);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Smoothly redirect / scroll viewport down to the live map section
  const scrollToMap = () => {
    setTimeout(() => {
      if (mapSectionRef.current) {
        mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  // Explicitly dismiss visible card and searched location when mobile navigation drawer opens
  useEffect(() => {
    if (mobileMenuOpen) {
      setIsCardVisible(false);
      setSearchedLocation(null);
    }
  }, [mobileMenuOpen]);

  const handleSelectPuja = (puja) => {
    if (mobileMenuOpen) return;
    setSelectedPuja(puja);
    setIsCardVisible(true);
    setSearchedLocation(null);
  };

  // Trigger resize event whenever switching to map view so Leaflet renders immediately
  const handleSwitchMobileView = (view) => {
    setMobileView(view);
    if (view === 'map') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 250);
    }
  };

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search suggestions with crowd status
  const { data: suggestionsData } = useQuery({
    queryKey: ['search-suggestions', debouncedSearchQuery],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim() || debouncedSearchQuery.trim().length < 2) {
        return { pujas: [], localities: [] };
      }
      const res = await api.get('/pujas/search-suggestions', {
        params: { q: debouncedSearchQuery.trim() },
      });
      return res.data;
    },
    enabled: Boolean(debouncedSearchQuery.trim() && debouncedSearchQuery.trim().length >= 2),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const handleGeocodeLocation = async (query) => {
    if (!query || !query.trim()) return;
    setGeocodingLoading(true);
    setLocationError(null);
    setIsSearchFocused(false);
    try {
      const res = await api.get('/pujas/geocode-location', {
        params: { q: query.trim() },
      });
      if (res.data?.success) {
        setSearchedLocation(res.data);
        setSelectedPuja(null);
        setIsCardVisible(false);
        // Switch to map view on mobile/tablet and smoothly scroll to the map
        handleSwitchMobileView('map');
        scrollToMap();
      } else {
        setLocationError(`No coordinates found for "${query}".`);
      }
    } catch (err) {
      setLocationError(err.response?.data?.message || `Could not find coordinates for "${query}".`);
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Fetch approved pandals
  const {
    data: pujasData,
    isLoading: pujasLoading,
    isError: pujasErrorState,
    error: pujasError,
    refetch: refetchPujas,
  } = useQuery({
    queryKey: ['pujas', debouncedSearchQuery, selectedLocality, selectedCategory, userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const params = {};
      if (debouncedSearchQuery.trim()) params.q = debouncedSearchQuery.trim();
      if (selectedLocality !== 'All Localities') params.locality = selectedLocality;
      if (selectedCategory !== 'All Categories') params.category = selectedCategory;
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }
      const res = await api.get('/pujas', { params });
      return res.data;
    },
    staleTime: 60 * 1000,
    gcTime: 15 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  const rawPujas = pujasData?.pujas || [];

  // Automatically trace and select pandal when requested from a post or link
  useEffect(() => {
    if (pujaParam && rawPujas.length > 0) {
      const match = rawPujas.find((p) => p.slug === pujaParam || p._id === pujaParam);
      if (match) {
        setSelectedPuja(match);
        setIsCardVisible(true);
        handleSwitchMobileView('map');
      }
    }
  }, [pujaParam, rawPujas]);

  // Dynamic crowd overview with 12-second live auto-polling
  const pujaIds = rawPujas.map((p) => p._id).join(',');
  const { data: crowdData, refetch: refetchCrowd } = useQuery({
    queryKey: ['crowd-overview', pujaIds],
    queryFn: async () => {
      if (!pujaIds) return { crowdMap: {} };
      const res = await api.get('/crowd/map', { params: { ids: pujaIds } });
      return res.data;
    },
    enabled: Boolean(pujaIds),
    staleTime: 8 * 1000,
    refetchInterval: isLivePollingEnabled ? 12000 : false,
  });

  const crowdMap = crowdData?.crowdMap || {};

  // Request user geolocation permission
  const handleNearMeClick = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setSortByDistance(true);
        setLocationLoading(false);
        handleSwitchMobileView('map');
        scrollToMap();
      },
      (err) => {
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. You can select your zone using the locality chips below.');
        } else {
          setLocationError('Unable to retrieve location coordinates.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Filter and sort pandals
  const displayedPujas = rawPujas.filter((puja) => {
    if (selectedCrowdFilter === 'all') return true;
    const crowd = crowdMap[puja._id];
    return crowd?.crowdStatus === selectedCrowdFilter;
  });

  if (sortByDistance && userLocation) {
    displayedPujas.sort((a, b) => (a.distanceMeters || 9999999) - (b.distanceMeters || 9999999));
  }

  return (
    <Layout maxWidth="7xl">
      {/* Distinctive Bengal-Inspired Product Hero & Live Command Search */}
      <ComponentLayout as="section" padding="relaxed" className="relative z-40 mb-5 overflow-visible">
        {/* Subtle Ornamental Alpana Corner Frames */}
        <div className="absolute -top-1 -right-1 pointer-events-none opacity-40 dark:opacity-20">
          <AlpanaCorner size={76} className="text-[#B58B45]" />
        </div>
        <div className="absolute -bottom-1 -left-1 pointer-events-none opacity-30 dark:opacity-15 rotate-180">
          <AlpanaCorner size={68} className="text-[#B86B4B]" />
        </div>

        {/* Mobile Festival Dropdown Selector (Visible on Mobile only) */}
        <div className="sm:hidden relative z-20 mb-4 max-w-xs">
          <button
            type="button"
            onClick={() => setFestivalDropdownOpen(!festivalDropdownOpen)}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-[#F4EBDD] dark:bg-[#141210] border border-[#E8DEC8] dark:border-[#3A322B] shadow-sm text-xs font-bold text-[#282520] dark:text-[#F9F6F0] active:scale-[0.99] transition-all"
            aria-expanded={festivalDropdownOpen}
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-[#C74732] animate-pulse shrink-0" />
              <span className="font-serif">Durga Puja</span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#C74732] text-white font-semibold shrink-0">
                45+ Live Pandals
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#8C8272] shrink-0 transition-transform duration-200 ${festivalDropdownOpen ? 'rotate-180 text-[#C74732]' : ''}`} />
          </button>

          {/* Dropdown Menu Options */}
          {festivalDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setFestivalDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[#FDFBF7] dark:bg-[#1E1A17] border border-[#E8DEC8] dark:border-[#3A322B] rounded-2xl shadow-xl p-1.5 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFestival('durga');
                    setFestivalDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-[#C74732]/10 text-[#C74732] dark:text-[#E07A5F] border border-[#C74732]/20"
                >
                  <div className="flex items-center gap-2">
                    <span>🪔 Durga Puja</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#C74732] text-white">Active</span>
                  </div>
                  <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-300">45+ Live Pandals</span>
                </button>

                <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#8C8272] dark:text-[#7A7265] opacity-70 cursor-not-allowed">
                  <div className="flex items-center gap-2">
                    <span>🪔 Kali Puja</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#B58B45]/15 text-[#8F6826] dark:text-[#D4AF37] border border-[#B58B45]/30 font-semibold">
                    Coming Soon
                  </span>
                </div>

                <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-[#8C8272] dark:text-[#7A7265] opacity-70 cursor-not-allowed">
                  <div className="flex items-center gap-2">
                    <span>🪔 Jagaddhatri Puja</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#B86B4B]/15 text-[#9C5435] dark:text-[#E07A5F] border border-[#B86B4B]/30 font-semibold">
                    Coming Soon
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop Festival Selector Tabs (Visible on Tablet/Desktop only) */}
        <div className="hidden sm:flex relative z-10 flex-wrap items-center gap-1.5 p-1 bg-[#F4EBDD]/70 dark:bg-[#141210]/80 rounded-2xl border border-[#E8DEC8] dark:border-[#3A322B] w-fit mb-4">
          <button
            type="button"
            onClick={() => setSelectedFestival('durga')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-[#C74732] text-white shadow-sm"
          >
            <span>Durga Puja</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/20 font-medium">
              45+ Live Pandals
            </span>
          </button>

          {/* Inactive Kali Puja with Coming Soon */}
          <button
            type="button"
            disabled
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#8C8272] dark:text-[#7A7265] cursor-not-allowed opacity-80 flex items-center gap-1.5 transition-all"
            title="Kali Puja discovery routes will activate closer to Diwali week."
          >
            <span>Kali Puja</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#B58B45]/15 text-[#8F6826] dark:text-[#D4AF37] border border-[#B58B45]/30 font-semibold tracking-wide">
              Coming Soon
            </span>
          </button>

          {/* Inactive Jagaddhatri Puja with Coming Soon */}
          <button
            type="button"
            disabled
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#8C8272] dark:text-[#7A7265] cursor-not-allowed opacity-80 flex items-center gap-1.5 transition-all"
            title="Jagaddhatri Puja (Chandannagar) illumination mapping will activate soon."
          >
            <span>Jagaddhatri Puja</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#B86B4B]/15 text-[#9C5435] dark:text-[#E07A5F] border border-[#B86B4B]/30 font-semibold tracking-wide">
              Coming Soon
            </span>
          </button>
        </div>

        {/* Hero Title & Actions */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#C74732] dark:text-[#D4AF37]">
                Sharodotsav 2026
              </span>
              <span className="text-[#E8DEC8] dark:text-[#3A322B]">•</span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#686358] dark:text-[#B8AF9F]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isLivePollingEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                  }`}
                />
                {isLivePollingEnabled ? 'Live Crowd Intelligence Active' : 'Polling Paused'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-serif font-black text-[#282520] dark:text-[#F9F6F0] tracking-tight leading-tight">
              Kolkata & Bengal <span className="text-[#C74732] dark:text-[#D4AF37]">Pandal Guide</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#686358] dark:text-[#B8AF9F] mt-1 max-w-2xl leading-relaxed">
              Explore Bengal's UNESCO heritage celebration with real-time queue wait estimates, traffic alerts, and authentic community crowd updates across 50+ major pandals.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => setAiDetectPuja(selectedPuja || (rawPujas.length > 0 ? rawPujas[0] : null))}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F4EBDD] hover:bg-[#E8DEC8] dark:bg-[#27221E] dark:hover:bg-[#342D26] text-[#282520] dark:text-[#F9F6F0] border border-[#E8DEC8] dark:border-[#3A322B] text-xs font-semibold transition-colors"
            >
              <Scan className="w-3.5 h-3.5 text-[#C74732] dark:text-[#D4AF37]" />
              <span>Vision Crowd Scan</span>
            </button>
            <Link
              to="/add-puja"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F4EBDD] dark:bg-[#27221E] hover:bg-[#E8DEC8] dark:hover:bg-[#342D26] text-[#282520] dark:text-[#F9F6F0] border border-[#E8DEC8] dark:border-[#3A322B] text-xs font-semibold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#C74732] dark:text-[#D4AF37]" />
              <span>Add Pandal</span>
            </Link>
          </div>
        </div>

        {/* Search & Location Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              handleGeocodeLocation(searchQuery.trim());
            }
          }}
          className="flex flex-col sm:flex-row gap-2.5 relative z-30"
        >
          <div className="relative flex-1" ref={searchContainerRef}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B86B4B] dark:text-[#B58B45] z-10" />
            <input
              type="text"
              placeholder="Search pandal or neighborhood (e.g. Sreebhumi, Bagbazar, Gariahat, Kalyani)..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  e.preventDefault();
                  handleGeocodeLocation(searchQuery.trim());
                }
              }}
              className="w-full pl-10 pr-24 py-3 bg-[#F4EBDD]/60 dark:bg-[#141210]/70 text-[#282520] dark:text-[#F9F6F0] rounded-2xl text-xs sm:text-sm placeholder:text-[#686358]/70 dark:placeholder:text-[#B8AF9F]/60 border border-[#E8DEC8] dark:border-[#3A322B] focus:outline-none focus:ring-2 focus:ring-[#C74732] transition-all font-medium"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSearchFocused(false);
                  }}
                  className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={geocodingLoading || !searchQuery.trim()}
                className="px-3 py-1.5 rounded-xl bg-[#C74732] hover:bg-[#A83522] text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                title="Search on Map"
              >
                <span>{geocodingLoading ? 'Locating...' : 'Search'}</span>
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {isSearchFocused && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl shadow-xl border border-[#E8DEC8] dark:border-[#3A322B] z-[100] flex flex-col max-h-[min(440px,70vh)] overflow-hidden">
                <div className="overflow-y-auto divide-y divide-[#E8DEC8]/60 dark:divide-[#3A322B]/60 flex-1 overscroll-contain">
                  {/* Matching Pandals */}
                  {suggestionsData?.pujas && suggestionsData.pujas.length > 0 && (
                    <div className="p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#686358] dark:text-[#B8AF9F] px-2 block mb-1">
                        Matching Pandals
                      </span>
                      <div className="space-y-1">
                        {suggestionsData.pujas.map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() => {
                              const match = rawPujas.find((item) => item._id === p._id) || p;
                              handleSelectPuja(match);
                              setSearchedLocation(null);
                              setIsSearchFocused(false);
                              handleSwitchMobileView('map');
                              scrollToMap();
                            }}
                            className="w-full px-3 py-2 rounded-xl hover:bg-[#F4EBDD] dark:hover:bg-[#25201C] flex items-center justify-between text-left transition-colors group"
                          >
                            <div className="truncate pr-2">
                              <h5 className="font-serif font-bold text-xs text-[#282520] dark:text-[#F9F6F0] group-hover:text-[#C74732] dark:group-hover:text-[#D4AF37] truncate">
                                {p.name}
                              </h5>
                              <p className="text-[11px] text-[#686358] dark:text-[#B8AF9F] truncate flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-[#C74732] shrink-0" />
                                <span>{p.locality}</span>
                              </p>
                            </div>
                            <div className="shrink-0">
                              <CrowdBadge
                                status={p.crowdEstimate?.crowdStatus || 'unknown'}
                                waitMinutes={p.crowdEstimate?.estimatedWaitMinutes}
                                size="sm"
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {suggestionsData?.communityPosts && suggestionsData.communityPosts.length > 0 && (
                    <div className="p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#686358] dark:text-[#B8AF9F] px-2 block mb-1">
                        Community Updates
                      </span>
                      <div className="space-y-1">
                        {suggestionsData.communityPosts.map((post) => (
                          <Link
                            key={post._id}
                            to="/posts"
                            onClick={() => setIsSearchFocused(false)}
                            className="w-full px-3 py-2 rounded-xl hover:bg-[#F4EBDD] dark:hover:bg-[#25201C] flex items-center gap-2 text-left transition-colors group"
                          >
                            {post.image ? (
                              <img src={post.image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                            ) : (
                              <MessageSquarePlus className="w-4 h-4 text-[#C74732] shrink-0" />
                            )}
                            <div className="min-w-0">
                              <h5 className="font-serif font-bold text-xs text-[#282520] dark:text-[#F9F6F0] group-hover:text-[#C74732] dark:group-hover:text-[#D4AF37] truncate">
                                {post.title}
                              </h5>
                              <p className="text-[11px] text-[#686358] dark:text-[#B8AF9F] truncate">
                                {post.locality} · {post.category}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Localities */}
                  {suggestionsData?.localities && suggestionsData.localities.length > 0 && (
                    <div className="p-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#686358] dark:text-[#B8AF9F] px-2 block mb-1">
                        Neighborhoods & Zones
                      </span>
                      <div className="flex flex-wrap gap-1.5 p-1">
                        {suggestionsData.localities.map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setSelectedLocality(loc);
                              setSearchQuery('');
                              setIsSearchFocused(false);
                              handleSwitchMobileView('map');
                              scrollToMap();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[#F4EBDD] dark:bg-[#25201C] hover:bg-[#E8DEC8] dark:hover:bg-[#302821] text-xs font-semibold text-[#282520] dark:text-[#F9F6F0] flex items-center gap-1 transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-[#C74732]" />
                            <span>{loc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Geocode Search */}
                <div className="shrink-0 p-2 bg-[#F4EBDD]/70 dark:bg-[#141210]/60 border-t border-[#E8DEC8] dark:border-[#3A322B]">
                  <button
                    type="button"
                    onClick={() => handleGeocodeLocation(searchQuery.trim())}
                    disabled={geocodingLoading}
                    className="w-full px-3 py-2 rounded-xl bg-[#C74732] hover:bg-[#A83522] text-white font-bold text-xs flex items-center justify-between shadow-sm transition-colors"
                  >
                    <span className="truncate">
                      {geocodingLoading ? `Searching "${searchQuery}"...` : `Pin Location & Go To Map: "${searchQuery}"`}
                    </span>
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleNearMeClick}
            disabled={locationLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-2xl bg-[#282520] hover:bg-[#161412] dark:bg-[#D4AF37] dark:hover:bg-[#C5A02E] text-[#FDFBF7] dark:text-[#141210] font-bold text-xs sm:text-sm shadow-sm transition-colors shrink-0"
          >
            <Navigation className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${locationLoading ? 'animate-spin' : ''}`} />
            <span>{locationLoading ? 'Locating...' : 'Near Me'}</span>
          </button>
        </form>

        {locationError && (
          <div className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Quick Locality Swipe Chips */}
        <div className="pt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {QUICK_LOCALITIES.map((chip) => {
            const isActive = selectedLocality === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setSelectedLocality(chip.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-[#C74732] text-white shadow-sm border border-[#C74732]'
                    : 'bg-[#F4EBDD]/80 dark:bg-[#25201C] text-[#686358] dark:text-[#B8AF9F] hover:bg-[#E8DEC8] dark:hover:bg-[#2E2822] border border-[#E8DEC8]/80 dark:border-[#3A322B]'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Active Filter Clear Helper */}
        {selectedLocality !== 'All Localities' && (
          <div className="pt-2.5 flex items-center justify-between text-xs text-[#686358] dark:text-[#B8AF9F] border-t border-[#E8DEC8]/60 dark:border-[#3A322B]/60 mt-2">
            <span>
              Zone Filter: <strong className="text-[#282520] dark:text-[#F9F6F0]">{selectedLocality}</strong> ({displayedPujas.length} pandals)
            </span>
            <button
              type="button"
              onClick={() => setSelectedLocality('All Localities')}
              className="font-bold text-[#C74732] dark:text-[#D4AF37] hover:underline flex items-center gap-1"
            >
              <span>Show All ({rawPujas.length})</span>
            </button>
          </div>
        )}
      </ComponentLayout>

      {/* Segmented Controls & Filters Bar */}
      <ComponentLayout as="section" padding="compact" className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Mobile Segmented Switcher: List vs Map (Visible on Mobile/Tablet only, hidden on PC view) */}
          <div className="lg:hidden flex items-center justify-between gap-2">
            <div className="flex items-center bg-[#F4EBDD] dark:bg-[#141210] p-1 rounded-xl w-full sm:w-auto border border-[#E8DEC8]/80 dark:border-[#3A322B]">
              <button
                onClick={() => handleSwitchMobileView('list')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  mobileView === 'list'
                    ? 'bg-[#FDFBF7] dark:bg-[#25201C] text-[#282520] dark:text-[#F9F6F0] shadow-sm'
                    : 'text-[#686358] dark:text-[#B8AF9F] hover:text-[#282520] dark:hover:text-[#F9F6F0]'
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>Pandals ({displayedPujas.length})</span>
              </button>
              <button
                onClick={() => handleSwitchMobileView('map')}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  mobileView === 'map'
                    ? 'bg-[#C74732] text-white shadow-sm'
                    : 'text-[#686358] dark:text-[#B8AF9F] hover:text-[#282520] dark:hover:text-[#F9F6F0]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Live Map</span>
              </button>
            </div>
          </div>

          {/* Desktop Pandal Count Indicator (PC View) */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#F4EBDD] dark:bg-[#141210] text-[#282520] dark:text-[#F9F6F0] border border-[#E8DEC8]/80 dark:border-[#3A322B] flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#C74732] animate-pulse" />
              <span>Showing {displayedPujas.length} Pandals</span>
            </span>
          </div>

          {/* Crowd Filter Pills & Live Polling Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <span className="text-xs font-semibold text-[#686358] dark:text-[#B8AF9F] shrink-0">
                Crowd:
              </span>
              {[
                { id: 'all', label: 'All' },
                { id: 'low', label: 'Low Wait' },
                { id: 'moderate', label: 'Moderate' },
                { id: 'high', label: 'Heavy Queue' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedCrowdFilter(f.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                    selectedCrowdFilter === f.id
                      ? 'bg-[#702C35] text-white shadow-sm border border-[#702C35]'
                      : 'bg-[#F4EBDD] dark:bg-[#25201C] text-[#686358] dark:text-[#B8AF9F] hover:bg-[#E8DEC8] dark:hover:bg-[#2F2720] border border-[#E8DEC8]/80 dark:border-[#3A322B]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="hidden sm:block h-4 w-px bg-[#E8DEC8] dark:bg-[#3A322B]" />

            <ToggleSwitch
              id="live-crowd-toggle"
              label="Live Polling"
              checked={isLivePollingEnabled}
              onChange={setIsLivePollingEnabled}
              size="sm"
              statusActiveText="On"
              statusInactiveText="Off"
            />
          </div>
        </div>
      </ComponentLayout>

      {/* Main Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[550px] items-start">
        {/* Pandal Cards Column */}
        <div
          className={`lg:col-span-5 xl:col-span-5 space-y-3.5 ${
            mobileView === 'map' ? 'hidden lg:block' : 'block'
          }`}
        >
          {pujasLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl h-56 animate-pulse border border-[#E8DEC8] dark:border-[#3A322B]"
                />
              ))}
            </div>
          ) : pujasErrorState ? (
            <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl p-8 border border-rose-200 dark:border-rose-900/50 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900/50">
                <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#282520] dark:text-[#F9F6F0]">Locations are temporarily unavailable</h3>
              <p className="text-xs text-[#686358] dark:text-[#B8AF9F] max-w-sm mx-auto leading-relaxed">
                The discovery service could not reach the database. Please try again in a moment.
                {pujasError?.message ? ` ${pujasError.message}` : ''}
              </p>
              <button onClick={() => refetchPujas()} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#C74732] text-white hover:bg-[#A83522] shadow-sm transition-colors">
                Retry locations
              </button>
            </div>
          ) : displayedPujas.length === 0 ? (
            <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl p-8 border border-[#E8DEC8] dark:border-[#3A322B] text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#F4EBDD] dark:bg-[#25201C] text-[#B86B4B] flex items-center justify-center mx-auto border border-[#E8DEC8] dark:border-[#3A322B]">
                <MapPin className="w-6 h-6 text-[#C74732]" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#282520] dark:text-[#F9F6F0]">
                No pandals found
              </h3>
              <p className="text-xs text-[#686358] dark:text-[#B8AF9F] max-w-sm mx-auto leading-relaxed">
                No pandals match the selected filter. Try selecting "All Localities" or add a new pandal to the community registry!
              </p>
              <AlpanaDivider className="text-[#B58B45]/40" />
              <Link
                to="/add-puja"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#C74732] text-white hover:bg-[#A83522] shadow-sm transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit a Pandal</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {displayedPujas.map((puja) => (
                <PujaCard
                  key={puja._id}
                  puja={puja}
                  crowdInfo={crowdMap[puja._id]}
                  isSelected={selectedPuja?._id === puja._id}
                  onSelect={(p) => {
                    handleSelectPuja(p);
                    if (window.innerWidth < 1024) {
                      handleSwitchMobileView('map');
                    }
                  }}
                  onOpenCrowdModal={(p) => setReportingPuja(p)}
                  userLocation={userLocation}
                />
              ))}
            </div>
          )}
        </div>

        {/* Map Column (Full Mobile Height, Immediate Render) */}
        <div
          ref={mapSectionRef}
          id="map-section"
          className={`lg:col-span-7 xl:col-span-7 lg:sticky lg:top-20 isolate relative z-10 rounded-2xl overflow-hidden border border-[#E8DEC8] dark:border-[#3A322B] bg-[#F4EBDD] dark:bg-[#141210] shadow-sm ${
            mobileView === 'list'
              ? 'hidden lg:block lg:h-[calc(100vh-110px)]'
              : 'block h-[calc(100dvh-175px)] min-h-[460px] lg:h-[calc(100vh-110px)] w-full'
          }`}
        >
          <PujoMap
            pujas={displayedPujas}
            selectedPuja={selectedPuja}
            onSelectPuja={(p) => handleSelectPuja(p)}
            userLocation={userLocation}
            searchedLocation={searchedLocation}
            onScanSearchedLocation={(loc) => {
              setAiDetectPuja({
                name: loc.locationName,
                locality: loc.displayName,
                location: { coordinates: loc.coordinates },
              });
            }}
            crowdMap={crowdMap}
            isActiveView={mobileView === 'map'}
            isDrawerOpen={mobileMenuOpen}
          />

          {/* Searched Location Drawer on Map */}
          {searchedLocation && !selectedPuja && !mobileMenuOpen && (
            <div className="absolute bottom-4 left-3 right-3 z-30 bg-[#FDFBF7]/95 dark:bg-[#1E1A17]/95 backdrop-blur-md rounded-2xl p-3.5 border border-[#B58B45]/40 shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                    Pinned Point
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                    {searchedLocation.locationName}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    {searchedLocation.displayName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => {
                    setAiDetectPuja({
                      name: searchedLocation.locationName,
                      locality: searchedLocation.displayName,
                      location: { coordinates: searchedLocation.coordinates },
                    });
                  }}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 text-stone-950 shadow-sm"
                >
                  Check Crowd
                </button>
                <button
                  onClick={() => setSearchedLocation(null)}
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Selected Pandal Drawer on Map */}
          {selectedPuja && isCardVisible && !mobileMenuOpen && (
            <div className="absolute bottom-4 left-3 right-3 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md rounded-2xl p-3.5 border border-stone-200 dark:border-stone-800 shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2.5 overflow-hidden">
                {selectedPuja.images?.[0] && (
                  <img
                    src={selectedPuja.images[0]}
                    alt={selectedPuja.name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200 dark:border-stone-800"
                  />
                )}
                <div className="truncate">
                  <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                    {selectedPuja.name}
                  </h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-festival-600 shrink-0" />
                    <span>{selectedPuja.locality}</span>
                  </p>
                  <div className="mt-0.5">
                    <CrowdBadge
                      status={crowdMap[selectedPuja._id]?.crowdStatus || 'unknown'}
                      waitMinutes={crowdMap[selectedPuja._id]?.estimatedWaitMinutes}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setReportingPuja(selectedPuja)}
                  className="px-2 py-1.5 text-xs font-bold rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200"
                >
                  Report
                </button>
                <Link
                  to={`/puja/${selectedPuja.slug}`}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-festival-600 text-white hover:bg-festival-700 shadow-sm"
                >
                  Details
                </Link>
                <button
                  onClick={() => {
                    setIsCardVisible(false);
                    setSelectedPuja(null);
                  }}
                  className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action CTA on Mobile */}
      <div className="mobile-floating-post-update lg:hidden flex flex-col gap-2 pointer-events-auto">
        <Link
          to="/create-post"
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-festival-600 text-white font-bold text-xs shadow-lg shadow-festival-900/20 active:scale-95 transition-transform"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Post Update</span>
        </Link>
      </div>

      {/* Crowd Report Modal */}
      {reportingPuja && (
        <CrowdReportModal
          isOpen={Boolean(reportingPuja)}
          onClose={() => setReportingPuja(null)}
          puja={reportingPuja}
          onReportSuccess={() => refetchCrowd()}
        />
      )}

      {/* Auto Crowd Vision AI Modal */}
      {aiDetectPuja && (
        <AutoCrowdDetectModal
          isOpen={Boolean(aiDetectPuja)}
          onClose={() => setAiDetectPuja(null)}
          puja={aiDetectPuja}
          onDetectionSuccess={() => refetchCrowd()}
        />
      )}
    </Layout>
  );
}
