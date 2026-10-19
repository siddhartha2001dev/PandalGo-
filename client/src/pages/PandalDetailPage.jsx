import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Clock,
  Navigation,
  CheckCircle2,
  Calendar,
  Share2,
  ExternalLink,
  Users,
  Flame,
  AlertCircle,
  HelpCircle,
  MapPinOff,
  Compass,
  Activity,
  ChevronRight,
  MessageSquarePlus,
  Camera,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../lib/api.js';
import { buildDirectionsUrl, getDirectionsLabel } from '../lib/directions.js';
import { CrowdBadge } from '../components/common/CrowdBadge.jsx';
import { CrowdReportModal } from '../components/crowd/CrowdReportModal.jsx';
import { AutoCrowdDetectModal } from '../components/crowd/AutoCrowdDetectModal.jsx';
import { PostCard } from '../components/posts/PostCard.jsx';
import { Layout, ComponentLayout } from '../components/layout/index.js';
import { useTheme } from '../context/ThemeContext.jsx';
import { DEFAULT_TILE_URL, DEFAULT_ATTRIBUTION, MAP_MAX_ZOOM } from '../config/mapConfig.js';

const pandalPin = L.divIcon({
  html: `
    <div style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35));">
      <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0C7.61 0 0 7.61 0 17C0 26.68 14.86 40.54 15.5 41.13C15.91 41.52 16.45 41.74 17 41.74C17.55 41.74 18.09 41.52 18.5 41.13C19.14 40.54 34 26.68 34 17C34 7.61 26.39 0 17 0Z" fill="#991B1B" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="17" cy="17" r="9" fill="#FFFFFF"/>
        <path d="M13 22V16.5C13 14.29 14.79 12.5 17 12.5C19.21 12.5 21 14.29 21 16.5V22" stroke="#991B1B" stroke-width="2" stroke-linecap="round"/>
        <circle cx="17" cy="10" r="1.5" fill="#991B1B"/>
      </svg>
    </div>
  `,
  className: 'pandal-detail-pin',
  iconSize: [34, 42],
  iconAnchor: [17, 42],
});

export function PandalDetailPage() {
  const { slug } = useParams();
  const { isDark } = useTheme();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [crowdModalOpen, setCrowdModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    data,
    isLoading,
    error,
    refetch: refetchPuja,
  } = useQuery({
    queryKey: ['puja-detail', slug],
    queryFn: async () => {
      const res = await api.get(`/pujas/slug/${slug}`);
      return res.data;
    },
    staleTime: 8 * 1000,
    refetchInterval: 12000, // Dynamic auto-updating live crowd conditions
  });

  const puja = data?.puja;
  const crowdEstimate = data?.crowdEstimate;
  const recentPosts = data?.recentPosts || [];
  const nearbyPujas = data?.nearbyPujas || [];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <Layout maxWidth="5xl" className="animate-pulse space-y-6">
        <div className="h-72 bg-[#EAE0D0] dark:bg-[#2A2420] rounded-3xl" />
        <div className="h-10 bg-[#EAE0D0] dark:bg-[#2A2420] rounded-xl w-2/3" />
        <div className="h-40 bg-[#EAE0D0] dark:bg-[#2A2420] rounded-2xl" />
      </Layout>
    );
  }

  if (error || !puja) {
    return (
      <Layout maxWidth="md" centered>
        <ComponentLayout padding="normal" className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F4EBDD] dark:bg-[#2A2420] text-[#C74732] flex items-center justify-center mx-auto border border-[#E8DEC8] dark:border-[#3A322B]">
            <MapPinOff className="w-7 h-7 text-[#C74732]" />
          </div>
          <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">Pandal Not Found</h2>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            The pandal you are looking for may have been archived or is still pending owner review.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white font-bold text-xs shadow-md transition-colors"
          >
            Return to Discovery
          </Link>
        </ComponentLayout>
      </Layout>
    );
  }

  const coordinates = puja.location?.coordinates; // [lng, lat]
  const images =
    puja.images && puja.images.length > 0
      ? puja.images
      : ['https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=1200&q=80'];

  const directionsUrl = buildDirectionsUrl(coordinates) || '#';

  return (
    <Layout maxWidth="6xl" className="space-y-8">
      {/* Photo Gallery & Hero */}
      <section className="space-y-3">
        <div className="relative h-72 sm:h-96 md:h-[420px] rounded-3xl overflow-hidden border border-[#E8DEC8] dark:border-[#3A322B] shadow-md bg-stone-900">
          <img
            src={images[activeImageIndex]}
            alt={puja.name}
            className="w-full h-full object-cover transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 right-24 sm:top-4 sm:left-4 sm:right-28 flex flex-wrap items-center gap-1.5 sm:gap-2 max-h-20 overflow-hidden">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FDFBF7]/90 dark:bg-[#1E1A17]/90 backdrop-blur-md text-stone-900 dark:text-stone-100 border border-[#E8DEC8]/80 dark:border-[#3A322B] shadow-sm">
              {puja.category}
            </span>
            {puja.status === 'approved' && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#B58B45] text-white shadow-sm flex items-center gap-1 border border-[#B58B45]/40">
                <CheckCircle2 className="w-3.5 h-3.5" /> Official Heritage Pandal
              </span>
            )}
          </div>

          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-black/60 backdrop-blur-md text-white hover:bg-black/80 flex items-center gap-1.5 transition-colors border border-white/20"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>

          {/* Bottom Title Overlay */}
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-white space-y-1 min-w-0">
            <h1 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight drop-shadow-md break-words leading-tight">
              {puja.name}
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 flex items-start gap-1.5 opacity-90 min-w-0">
              <MapPin className="w-4 h-4 text-[#B58B45] shrink-0" />
              <span className="min-w-0 break-words line-clamp-2">
                {puja.address}, {puja.locality}
              </span>
            </p>
          </div>
        </div>

        {/* Thumbnail Selector */}
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`relative w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                  activeImageIndex === idx
                    ? 'border-[#C74732] scale-105 shadow-md'
                    : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Main Content Grid: Info & Crowd Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Overview & Description */}
        <div className="lg:col-span-7 space-y-6">
          {/* Key Facts bar */}
          <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl p-4 sm:p-5 border border-[#E8DEC8] dark:border-[#3A322B] shadow-sm grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 transition-colors">
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                Festival Year
              </span>
              <span className="font-bold text-sm text-stone-800 dark:text-stone-200 flex items-center gap-1 mt-0.5 min-w-0">
                <Calendar className="w-4 h-4 text-[#C74732] shrink-0" /> <span className="truncate">{puja.festivalYear || 2026}</span>
              </span>
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                Timings
              </span>
              <span className="font-bold text-sm text-stone-800 dark:text-stone-200 flex items-start gap-1 mt-0.5 min-w-0">
                <Clock className="w-4 h-4 text-[#B58B45] shrink-0 mt-0.5" /> <span className="break-words line-clamp-2">{puja.timings || 'Open 24 Hours'}</span>
              </span>
            </div>

            <div className="col-span-2 sm:col-span-1 min-w-0">
              <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                Directions
              </span>
              <a
                href={directionsUrl === '#' ? undefined : directionsUrl}
                aria-disabled={directionsUrl === '#'}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-xs text-[#C74732] hover:text-[#991B1B] dark:text-[#E07A5F] flex items-center gap-1 mt-1 underline"
              >
                <span>{getDirectionsLabel()}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Description */}
          <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl p-6 border border-[#E8DEC8] dark:border-[#3A322B] shadow-sm space-y-3 transition-colors">
            <h2 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">About this Pandal</h2>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-line">
              {puja.description || 'No detailed background provided yet.'}
            </p>
          </div>

          {/* Interactive Location Preview with 100m Crowd Radius */}
          {coordinates && coordinates.length === 2 && (
            <ComponentLayout padding="normal" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#C74732]" /> Location & 100m Crowd Radius
                </h3>
                <a
                  href={directionsUrl === '#' ? undefined : directionsUrl}
                  aria-disabled={directionsUrl === '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-[#C74732] hover:text-[#991B1B] dark:text-[#E07A5F] hover:underline flex items-center gap-1"
                >
                  {getDirectionsLabel()} <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="h-64 rounded-xl overflow-hidden border border-[#E8DEC8] dark:border-[#3A322B]">
                <MapContainer
                  center={[coordinates[1], coordinates[0]]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className="w-full h-full"
                >
                  <TileLayer
                    key={isDark ? 'osm-dark-detail' : 'osm-light-detail'}
                    attribution={DEFAULT_ATTRIBUTION}
                    url={DEFAULT_TILE_URL}
                    maxZoom={MAP_MAX_ZOOM}
                  />
                  <Marker position={[coordinates[1], coordinates[0]]} icon={pandalPin} />
                  {/* 100-metre radius circle */}
                  <Circle
                    center={[coordinates[1], coordinates[0]]}
                    radius={100}
                    pathOptions={{
                      color: '#C74732',
                      fillColor: '#C74732',
                      fillOpacity: 0.12,
                      weight: 1.5,
                      dashArray: '4, 4',
                    }}
                  />
                </MapContainer>
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                The dashed circle represents the <strong>100-metre geographic perimeter</strong>. Observations submitted outside this circle do not count towards live queue crowd levels.
              </p>
            </ComponentLayout>
          )}

          {/* Associated Community Posts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100">
                Community Posts ({recentPosts.length})
              </h3>
              <Link
                to="/create-post"
                className="text-xs font-bold text-[#C74732] hover:text-[#991B1B] dark:text-[#E07A5F] hover:underline flex items-center gap-1"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" /> Share Your Experience
              </Link>
            </div>

            {recentPosts.length === 0 ? (
              <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl p-6 border border-[#E8DEC8] dark:border-[#3A322B] text-center text-xs text-stone-500 dark:text-stone-400">
                No visitor experiences shared for this pandal yet. Be the first to share photographs!
              </div>
            ) : (
              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Crowd Intelligence Card & Nearby Pandals */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          {/* Crowd Intelligence Panel */}
          <ComponentLayout padding="normal" className="shadow-md space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#C74732]" />
                <h3 className="font-serif font-bold text-base text-stone-900 dark:text-stone-100">Live Crowd Intelligence</h3>
              </div>
              <button
                onClick={() => refetchPuja()}
                className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 underline"
              >
                Refresh
              </button>
            </div>

            {/* Crowd Status Banner */}
            <div className="p-4 rounded-2xl bg-[#F4EBDD]/70 dark:bg-[#141210]/70 border border-[#E8DEC8] dark:border-[#3A322B] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Current Density
                </span>
                <CrowdBadge
                  status={crowdEstimate?.crowdStatus || 'unknown'}
                  waitMinutes={crowdEstimate?.estimatedWaitMinutes}
                  size="lg"
                />
              </div>

              {/* Status explanation */}
              {crowdEstimate?.freshnessStatus === 'fresh' ? (
                <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1">
                  <p className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Based on {crowdEstimate.observationCount} recent on-site report(s)</span>
                  </p>
                  {crowdEstimate.estimatedWaitMinutes && (
                    <p className="text-stone-500 dark:text-stone-400">
                      Estimated queue waiting time: ~{crowdEstimate.estimatedWaitMinutes} minutes.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <span>
                    {crowdEstimate?.freshnessStatus === 'stale'
                      ? 'Live crowd data is currently stale (>15m old). Standing at this pandal? Submit a fresh observation below!'
                      : 'No live crowd observations reported in the last 15 minutes.'}
                  </span>
                </div>
              )}

              {/* Confidence & Timing */}
              <div className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between pt-1 border-t border-[#E8DEC8]/80 dark:border-[#3A322B]">
                <span>Confidence: {crowdEstimate?.confidence || 'None'}</span>
                <span>
                  Radius: <strong>100m</strong>
                </span>
              </div>
            </div>

            {/* Action CTAs: Report Crowd & AI Vision Scan */}
            <div className="space-y-2.5">
              <button
                onClick={() => setAiModalOpen(true)}
                className="w-full py-3 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>AI Crowd Scan</span>
              </button>

              <button
                onClick={() => setCrowdModalOpen(true)}
                className="w-full py-3 rounded-xl bg-[#F4EBDD] hover:bg-[#EAE0D0] dark:bg-[#2A2420] dark:hover:bg-[#342D28] text-stone-900 dark:text-stone-100 font-semibold text-xs border border-[#E8DEC8] dark:border-[#3A322B] transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4 text-[#C74732]" />
                <span>Submit Crowd Report</span>
              </button>
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center leading-relaxed">
              Multi-layer AI estimates queue density and congestion from photos and live traffic telemetry. Observations dynamically refresh live status.
            </p>
          </ComponentLayout>

          {nearbyPujas.length > 0 && (
            <ComponentLayout padding="normal" className="space-y-4">
              <h3 className="font-serif font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-[#C74732]" />
                <span>Nearby Pandals within 3km</span>
              </h3>

              <div className="space-y-3">
                {nearbyPujas.map((near) => (
                  <Link
                    key={near._id}
                    to={`/puja/${near.slug}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F4EBDD]/70 dark:hover:bg-[#2A2420] border border-transparent hover:border-[#E8DEC8] dark:hover:border-[#3A322B] transition-all group"
                  >
                    <img
                      src={
                        near.images?.[0] ||
                        'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=200&q=80'
                      }
                      alt={near.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="truncate flex-1">
                      <h4 className="font-bold text-xs text-stone-800 dark:text-stone-200 group-hover:text-[#C74732] dark:group-hover:text-[#E07A5F] truncate">
                        {near.name}
                      </h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{near.locality}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 dark:text-stone-500 group-hover:text-[#C74732] dark:group-hover:text-[#E07A5F] shrink-0" />
                  </Link>
                ))}
              </div>
            </ComponentLayout>
          )}
        </div>
      </div>

      {/* Manual Crowd Report Modal */}
      {crowdModalOpen && (
        <CrowdReportModal
          isOpen={crowdModalOpen}
          onClose={() => setCrowdModalOpen(false)}
          puja={puja}
          onReportSuccess={() => {
            refetchPuja();
          }}
        />
      )}

      {/* AI Crowd Detection Modal */}
      {aiModalOpen && (
        <AutoCrowdDetectModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          puja={puja}
          onDetectionSuccess={() => {
            refetchPuja();
          }}
        />
      )}
    </Layout>
  );
}
