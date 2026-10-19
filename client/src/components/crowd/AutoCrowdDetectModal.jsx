import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { ToggleSwitch } from '../common/ToggleSwitch.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Camera,
  Upload,
  Cpu,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Users,
  Clock,
  RefreshCw,
  Globe,
  Layers,
  MapPin,
  Car,
  Link as LinkIcon,
  Scan,
  Lightbulb,
  X,
} from 'lucide-react';
import { CrowdBadge } from '../common/CrowdBadge.jsx';

/**
 * Three-Stage Progress Indicator
 * 1. Loading images
 * 2. Estimating crowd levels
 * 3. Checking queue conditions
 */
function ProgressStages({ stage, isScanning, isSuccess, isError }) {
  const stages = [
    { id: 1, label: 'Loading images', icon: Camera },
    { id: 2, label: 'Estimating crowd levels', icon: Users },
    { id: 3, label: 'Checking queue conditions', icon: Clock },
  ];

  return (
    <div className="w-full px-1 py-1">
      <div className="flex items-center justify-between relative">
        {/* Connector line behind stage nodes */}
        <div className="absolute top-4 left-[16%] right-[16%] h-[2px] bg-stone-800 -translate-y-1/2 z-0">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] to-amber-400 transition-all duration-500"
            style={{
              width: isSuccess
                ? '100%'
                : isScanning
                ? stage === 1
                  ? '15%'
                  : stage === 2
                  ? '55%'
                  : '90%'
                : '0%',
            }}
          />
        </div>

        {stages.map((st) => {
          const Icon = st.icon;
          let status = 'pending'; // 'pending' | 'active' | 'completed' | 'failed'

          if (isSuccess) {
            status = 'completed';
          } else if (isError && stage === st.id) {
            status = 'failed';
          } else if (isScanning) {
            if (st.id < stage) status = 'completed';
            else if (st.id === stage) status = 'active';
            else status = 'pending';
          } else if (!isScanning && !isError) {
            status = 'pending';
          }

          return (
            <div key={st.id} className="relative z-10 flex flex-col items-center flex-1 max-w-[110px]">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  status === 'completed'
                    ? 'bg-emerald-950/90 border border-emerald-500/60 text-emerald-400 shadow-xs'
                    : status === 'active'
                    ? 'bg-[#1C0F08] border-2 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.4)] ring-2 ring-[#D4AF37]/25'
                    : status === 'failed'
                    ? 'bg-rose-950/90 border border-rose-500/60 text-rose-400 shadow-xs'
                    : 'bg-stone-900 border border-stone-800 text-stone-500'
                }`}
              >
                {status === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : status === 'failed' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Icon className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${status === 'active' ? 'animate-pulse' : ''}`} />
                )}
              </div>
              <span
                className={`mt-1.5 text-[10px] sm:text-xs text-center leading-tight font-sans transition-colors ${
                  status === 'completed'
                    ? 'text-stone-300 font-medium'
                    : status === 'active'
                    ? 'text-amber-200 font-semibold'
                    : status === 'failed'
                    ? 'text-rose-300'
                    : 'text-stone-500'
                }`}
              >
                {st.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AutoCrowdDetectModal({ isOpen, onClose, puja, onDetectionSuccess }) {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [inputMode, setInputMode] = useState('auto-location'); // 'auto-location' | 'upload' | 'url'
  const [includeTraffic, setIncludeTraffic] = useState(true);
  const [recordObservation, setRecordObservation] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStage, setScanStage] = useState(1);
  const [scanResult, setScanResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const timerRef1 = useRef(null);
  const timerRef2 = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef1.current) clearTimeout(timerRef1.current);
      if (timerRef2.current) clearTimeout(timerRef2.current);
    };
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setScanResult(null);
      setErrorMsg('');
    }
  };

  const startStageProgression = () => {
    setScanStage(1);
    if (timerRef1.current) clearTimeout(timerRef1.current);
    if (timerRef2.current) clearTimeout(timerRef2.current);

    timerRef1.current = setTimeout(() => {
      setScanStage(2);
    }, 1100);

    timerRef2.current = setTimeout(() => {
      setScanStage(3);
    }, 2400);
  };

  const stopStageProgression = () => {
    if (timerRef1.current) clearTimeout(timerRef1.current);
    if (timerRef2.current) clearTimeout(timerRef2.current);
  };

  const handleRunAutoLocationScan = async () => {
    setErrorMsg('');
    setIsScanning(true);
    startStageProgression();

    try {
      const res = await api.post('/crowd/auto-detect-location', {
        pujaId: puja?._id || null,
        coordinates: puja?.location?.coordinates || null,
        locationName: puja?.name || 'Durga Puja Location',
        locality: puja?.locality || '',
        includeTraffic,
        recordObservation,
      });

      if (res.data?.success) {
        setScanStage(3);
        setScanResult(res.data);
        if (onDetectionSuccess) {
          onDetectionSuccess(res.data);
        }
      } else {
        setErrorMsg(res.data?.message || 'Failed to retrieve location image. You can upload a photo instead.');
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          'Failed to retrieve latest location image. You can switch to the Upload Photo tab.'
      );
    } finally {
      stopStageProgression();
      setIsScanning(false);
    }
  };

  const handleRunManualScan = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (inputMode === 'upload' && !file) {
      setErrorMsg('Please select a photo or snapshot of the pandal to scan.');
      return;
    }
    if (inputMode === 'url' && !imageUrl.trim()) {
      setErrorMsg('Please enter an image or live snapshot URL.');
      return;
    }

    try {
      setIsScanning(true);
      startStageProgression();

      const formData = new FormData();
      if (inputMode === 'upload' && file) {
        formData.append('image', file);
      } else if (inputMode === 'url' && imageUrl) {
        formData.append('imageUrl', imageUrl.trim());
      }

      if (puja?._id) {
        formData.append('pujaId', puja._id);
      }
      formData.append('recordObservation', String(recordObservation));

      const res = await api.post('/crowd/auto-detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        setScanStage(3);
        setScanResult(res.data);
        if (onDetectionSuccess) {
          onDetectionSuccess(res.data);
        }
      } else {
        setErrorMsg(res.data?.message || 'Computer vision detection failed. Please try another image.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to analyze crowd image. Check network connectivity.');
    } finally {
      stopStageProgression();
      setIsScanning(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl('');
    setImageUrl('');
    setScanResult(null);
    setErrorMsg('');
    setScanStage(1);
  };

  // Determine active visual image for the scanning preview
  let activeImage = '';
  let imageLabel = '';

  if (inputMode === 'upload' && previewUrl) {
    activeImage = previewUrl;
    imageLabel = file ? file.name : 'Uploaded Photograph';
  } else if (inputMode === 'url' && (imageUrl || previewUrl)) {
    activeImage = imageUrl || previewUrl;
    imageLabel = 'Remote Snapshot Feed';
  } else if (inputMode === 'auto-location') {
    if (scanResult?.image?.url) {
      activeImage = scanResult.image.url;
      imageLabel = scanResult.image.source || 'Detected Corridor View';
    } else if (puja?.images?.[0]) {
      activeImage = puja.images[0];
      imageLabel = 'Pandal Reference Image';
    } else {
      activeImage = 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=800&q=80';
      imageLabel = 'Target Pandal Corridor Feed';
    }
  }

  // Responsive Modal Header (Section 2 & 3)
  const customHeader = (
    <div className="flex items-start justify-between px-3.5 py-3 sm:px-6 sm:py-4 border-b border-[#E8DEC8]/80 dark:border-[#3A322B] bg-[#F4EBDD]/70 dark:bg-[#141210]/70 shrink-0">
      <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 pr-2 flex-1">
        {/* Compact crowd-related icon inside burgundy rounded-square container */}
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#C74732] to-[#702C35] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-lg font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-snug break-words">
            Crowd & Queue <span className="text-[#C74732] dark:text-[#E07A5F]">Analysis</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-normal break-words">
            Checking crowd conditions and estimated waiting times.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={isScanning}
        aria-label="Close dialog"
        className="p-1.5 -mr-1 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 transition-colors shrink-0 disabled:opacity-40 min-w-[32px] min-h-[32px] flex items-center justify-center"
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>
    </div>
  );

  // Separated Pinned Modal Footer Actions (Section 8)
  const modalFooter = scanResult ? (
    <div className="w-full flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
      <button
        type="button"
        onClick={handleReset}
        className="flex-1 py-2 sm:py-2.5 rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420] text-xs font-semibold text-stone-700 dark:text-stone-300 transition-colors flex items-center justify-center gap-1.5"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Re-scan
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex-1 py-2 sm:py-2.5 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Close & Return
      </button>
    </div>
  ) : (
    <div className="w-full flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
      <button
        type="button"
        onClick={onClose}
        disabled={isScanning}
        className="px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold text-stone-700 dark:text-stone-300 bg-[#FDFBF7] dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] hover:bg-[#F4EBDD] dark:hover:bg-[#342D28] transition-colors disabled:opacity-50"
      >
        Cancel
      </button>

      {inputMode === 'auto-location' ? (
        <button
          type="button"
          onClick={handleRunAutoLocationScan}
          disabled={isScanning}
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analysing…</span>
            </>
          ) : (
            <>
              <Scan className="w-3.5 h-3.5" />
              <span>Fetch & Analyse Crowd</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleRunManualScan}
          disabled={isScanning || (!file && !imageUrl)}
          className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {isScanning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analysing…</span>
            </>
          ) : (
            <>
              <Scan className="w-3.5 h-3.5" />
              <span>Execute Vision Analysis</span>
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      header={customHeader}
      footer={modalFooter}
      size="lg"
      className="max-w-2xl"
    >
      <div className="space-y-3.5">
        {/* Target Pandal Summary Strip */}
        {puja && (
          <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 bg-[#F4EBDD]/60 dark:bg-[#1E1A17] rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] flex items-center justify-between gap-3 shadow-2xs">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block">
                Target Pandal
              </span>
              <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-stone-100 truncate">
                {puja.name}
              </h4>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-[#C74732] shrink-0" />
                <span className="truncate">{puja.locality || 'Kolkata'}</span>
                {puja.location?.coordinates && (
                  <span className="text-[10px] text-stone-400 dark:text-stone-500 font-mono shrink-0">
                    [{puja.location.coordinates[1].toFixed(4)}, {puja.location.coordinates[0].toFixed(4)}]
                  </span>
                )}
              </p>
            </div>
            {puja.zone && (
              <span className="px-2 py-0.5 rounded-md bg-[#C74732]/10 text-[#C74732] dark:text-[#E07A5F] text-[10px] font-semibold uppercase tracking-wider shrink-0">
                {puja.zone} Kolkata
              </span>
            )}
          </div>
        )}

        {/* Mode Selector */}
        {!scanResult && (
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F4EBDD] dark:bg-[#141210] rounded-xl border border-[#E8DEC8] dark:border-[#3A322B]">
            <button
              type="button"
              onClick={() => {
                setInputMode('auto-location');
                setErrorMsg('');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'auto-location'
                  ? 'bg-[#FDFBF7] dark:bg-[#2A2420] text-stone-900 dark:text-stone-100 shadow-xs border border-[#E8DEC8] dark:border-[#3A322B]'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#C74732]" />
              <span className="truncate">Auto-Find Feed</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('upload');
                setErrorMsg('');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'upload'
                  ? 'bg-[#FDFBF7] dark:bg-[#2A2420] text-stone-900 dark:text-stone-100 shadow-xs border border-[#E8DEC8] dark:border-[#3A322B]'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-[#C74732]" />
              <span className="truncate">Upload Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputMode('url');
                setErrorMsg('');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                inputMode === 'url'
                  ? 'bg-[#FDFBF7] dark:bg-[#2A2420] text-stone-900 dark:text-stone-100 shadow-xs border border-[#E8DEC8] dark:border-[#3A322B]'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5 text-[#C74732]" />
              <span className="truncate">Remote URL</span>
            </button>
          </div>
        )}

        {/* Live Map Status Setting Row (Section 3) */}
        {!scanResult && (
          <div className="p-3 rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] bg-[#FDFBF7] dark:bg-[#1E1A17] flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full bg-[#C74732]/10 dark:bg-[#C74732]/20 text-[#C74732] dark:text-[#E07A5F] flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 pr-1">
                <label
                  htmlFor="toggle-record-obs"
                  className="block text-xs font-semibold text-stone-900 dark:text-stone-100 cursor-pointer"
                >
                  Update Pandal Live Map Status
                </label>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                  Save the latest crowd observation so visitors see fresh crowd levels on map pins.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <ToggleSwitch
                id="toggle-record-obs"
                checked={recordObservation}
                onChange={setRecordObservation}
                statusLabel={false}
              />
            </div>
          </div>
        )}

        {/* Specific Input Mode Controllers (Upload Dropzone or URL Input) */}
        {!scanResult && inputMode === 'upload' && (
          <label className="border-2 border-dashed border-[#E8DEC8] dark:border-[#3A322B] hover:border-[#C74732] dark:hover:border-[#C74732] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-[#FDFBF7]/60 dark:bg-[#1E1A17]/60 group">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              {file ? file.name : 'Select or capture a pandal crowd photograph'}
            </span>
            <span className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
              Supports JPG, PNG, WEBP (Max 5MB)
            </span>
          </label>
        )}

        {!scanResult && inputMode === 'url' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Snapshot Stream or Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setPreviewUrl(e.target.value);
              }}
              placeholder="https://example.com/pandal-cam-feed.jpg"
              className="w-full px-3 py-2 rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] bg-[#FDFBF7] dark:bg-[#1E1A17] text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-[#C74732] focus:outline-none"
            />
          </div>
        )}

        {/* Optional Traffic Toggle when in Auto-Location Mode */}
        {!scanResult && inputMode === 'auto-location' && (
          <div className="px-3.5 py-2.5 rounded-xl border border-[#E8DEC8]/80 dark:border-[#3A322B]/80 bg-[#FDFBF7]/60 dark:bg-[#1E1A17]/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 pr-1">
              <Car className="w-3.5 h-3.5 text-[#C74732] shrink-0" />
              <div className="min-w-0">
                <label
                  htmlFor="toggle-traffic"
                  className="block text-xs font-semibold text-stone-800 dark:text-stone-200 cursor-pointer"
                >
                  Perimeter Road Traffic Intelligence
                </label>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                  Cross-references approaching road speeds to detect pedestrian spillover.
                </p>
              </div>
            </div>
            <ToggleSwitch
              id="toggle-traffic"
              checked={includeTraffic}
              onChange={setIncludeTraffic}
              statusLabel={false}
              size="sm"
            />
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold block">Analysis Issue</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* 4. MAIN SCANNING PANEL (Deep Espresso/Burgundy Panel with Antique Gold Accents) */}
        {!scanResult && (
          <div className="relative overflow-hidden rounded-2xl border border-[#B58B45]/40 bg-gradient-to-b from-[#1C100A] via-[#160E0A] to-[#110A07] p-3.5 sm:p-5 text-white shadow-xl space-y-3.5">
            {/* Bengali Alpona decorative motif line along bottom edge (subtle and understated) */}
            <div className="absolute bottom-0 inset-x-0 h-6 pointer-events-none overflow-hidden opacity-12 flex justify-center text-[#D4AF37]">
              <svg className="w-full h-full" viewBox="0 0 400 24" fill="none" preserveAspectRatio="none">
                <path
                  d="M0 24 C50 10, 100 4, 150 18 C200 4, 250 10, 300 18 C350 4, 400 10, 450 24"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <circle cx="100" cy="12" r="3" fill="currentColor" />
                <circle cx="200" cy="12" r="3" fill="currentColor" />
                <circle cx="300" cy="12" r="3" fill="currentColor" />
              </svg>
            </div>

            {/* Scanning Status Heading (Section 4) */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-[#B58B45]/20">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                  <h3 className="text-sm font-serif font-bold text-amber-100 tracking-wide truncate">
                    Analysing crowd conditions
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-amber-200/70 font-sans pl-4">
                  Processing the available images and recent crowd reports.
                </p>
              </div>
              {isScanning && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-mono tracking-wider shrink-0">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>ACTIVE</span>
                </div>
              )}
            </div>

            {/* Guaranteed-rendering sphere replaces the previous crowd reference-image block. */}
            <div
              className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-xl border border-[#B58B45]/40 bg-[#100B12] shadow-[inset_0_0_42px_rgba(212,175,55,0.08)] sm:h-72"
              role="img"
              aria-label="Animated AI crowd intelligence scanner"
            >
              <div className="ai-crowd-sphere" aria-hidden="true">
                <div className="ai-crowd-sphere-orbit ai-crowd-sphere-orbit-one" />
                <div className="ai-crowd-sphere-orbit ai-crowd-sphere-orbit-two" />
                <div className="ai-crowd-sphere-core">
                  <div className="ai-crowd-sphere-particles" />
                </div>
              </div>
              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-amber-300/35 bg-black/50 px-2 py-1 text-[9px] font-semibold tracking-[0.1em] text-amber-100/90 sm:bottom-3 sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
                AI CROWD SCAN ACTIVE
              </div>
            </div>

            {/* 6. Three-Stage Progress Indicator */}
            <div className="pt-1">
              <ProgressStages
                stage={scanStage}
                isScanning={isScanning}
                isSuccess={Boolean(scanResult)}
                isError={Boolean(errorMsg)}
              />
            </div>

            {/* 7. Information Note */}
            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-[#B58B45]/20 text-[11px] text-amber-200/90 leading-relaxed font-sans">
              <Lightbulb className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>
                We analyse recent images and community reports to estimate current crowd levels and waiting times.
              </span>
            </div>
          </div>
        )}

        {/* Detection Result View (When Analysis is Complete) */}
        {scanResult && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
            {/* Result Header & Hero Visual */}
            <div className="relative overflow-hidden rounded-2xl border border-[#B58B45]/40 bg-gradient-to-b from-[#1C100A] via-[#160E0A] to-[#110A07] p-3.5 sm:p-4 text-white shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-amber-100">
                      Crowd Analysis Complete
                    </h4>
                    <span className="text-[11px] text-amber-200/70">
                      Evaluated corridor media & queue calibration
                    </span>
                  </div>
                </div>
                <CrowdBadge status={scanResult.analysis?.crowdLevel || 'moderate'} size="md" />
              </div>

              {scanResult.image?.url && (
                <div className="relative rounded-xl overflow-hidden border border-[#B58B45]/30 max-h-48 bg-black">
                  <img
                    src={scanResult.image.url}
                    alt="Analyzed Location Visual"
                    className="w-full h-40 sm:h-44 object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent text-white flex items-center justify-between text-xs">
                    <span className="text-[10px] text-amber-200 font-sans truncate max-w-[220px]">
                      Source: {scanResult.image.source || scanResult.image.title || 'Location Visual'}
                    </span>
                    <span className="text-[10px] text-stone-300">
                      {new Date(scanResult.image.timestamp || Date.now()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              )}

              {/* Three-Stage Progress Complete State */}
              <div className="pt-1">
                <ProgressStages
                  stage={3}
                  isScanning={false}
                  isSuccess={true}
                  isError={false}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] shadow-2xs">
                <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                  Detected People / Heads
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Users className="w-4 h-4 text-[#C74732]" />
                  <span className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                    ~{scanResult.analysis?.estimatedHeadCount || scanResult.analysis?.estimatedPeopleCount || 0}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] shadow-2xs">
                <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                  Visual Density Score
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                    {Math.round((scanResult.analysis?.densityScore || 0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3 bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] shadow-2xs">
                <span className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider block">
                  Est. Queue Wait
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-4 h-4 text-[#C74732]" />
                  <span className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                    ~{scanResult.analysis?.estimatedWaitMinutes || 0} mins
                  </span>
                </div>
              </div>
            </div>

            {/* Fusion Security Alert if present */}
            {scanResult.analysis?.fusionAlert && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-950 dark:text-amber-100">
                    Sensor Fusion Security Alert
                  </span>
                  <span>{scanResult.analysis.fusionAlert}</span>
                </div>
              </div>
            )}

            {/* Perimeter Road & Traffic Intelligence */}
            {scanResult.traffic && (
              <div className="p-3.5 rounded-xl bg-[#FDFBF7] dark:bg-[#1E1A17] border border-[#E8DEC8] dark:border-[#3A322B] space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 dark:text-stone-100">
                    <Car className="w-4 h-4 text-[#C74732]" />
                    <span>Perimeter Road & Traffic Intelligence</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      scanResult.traffic.congestionLevel === 'high'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : scanResult.traffic.congestionLevel === 'moderate'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {scanResult.traffic.congestionLevel} Congestion
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-[#F4EBDD]/60 dark:bg-[#141210] p-2 rounded-lg border border-[#E8DEC8]/50 dark:border-[#3A322B]">
                    <span className="text-[10px] text-stone-400 block font-bold uppercase">Current Speed</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {scanResult.traffic.currentSpeedKmh} km/h
                    </span>
                  </div>
                  <div className="bg-[#F4EBDD]/60 dark:bg-[#141210] p-2 rounded-lg border border-[#E8DEC8]/50 dark:border-[#3A322B]">
                    <span className="text-[10px] text-stone-400 block font-bold uppercase">Road Congestion</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {scanResult.traffic.congestionPercent}%
                    </span>
                  </div>
                  <div className="bg-[#F4EBDD]/60 dark:bg-[#141210] p-2 rounded-lg border border-[#E8DEC8]/50 dark:border-[#3A322B]">
                    <span className="text-[10px] text-stone-400 block font-bold uppercase">Spillover Risk</span>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {scanResult.traffic.pedestrianSpilloverRisk || 'Normal'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-relaxed pt-0.5">
                  {scanResult.traffic.roadStatusText}
                </p>
              </div>
            )}

            {/* Confidence info box */}
            <div className="p-2.5 rounded-lg bg-[#F4EBDD]/70 dark:bg-[#141210] border border-[#E8DEC8] dark:border-[#3A322B] text-[11px] text-stone-500 dark:text-stone-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-stone-400" />
                Algorithm Confidence:
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {Math.round((scanResult.analysis?.confidence || 0.85) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
