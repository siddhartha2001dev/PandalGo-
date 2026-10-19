import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Users,
  Clock,
  Navigation,
  Camera,
  CheckCircle2,
  AlertCircle,
  Flame,
  Info,
} from 'lucide-react';

export function CrowdReportModal({ isOpen, onClose, puja, onReportSuccess }) {
  const { user } = useAuth();
  const [crowdLevel, setCrowdLevel] = useState('moderate');
  const [waitMinutes, setWaitMinutes] = useState(15);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | loading | success | error
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Auto-acquire GPS when modal opens if not already set
  React.useEffect(() => {
    if (isOpen && !gpsCoords) {
      acquireLocation();
    }
  }, [isOpen]);

  const acquireLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsErrorMsg('Browser does not support geolocation.');
      return;
    }

    setGpsStatus('loading');
    setGpsErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        setGpsCoords(coords);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setGpsStatus('success');
      },
      (err) => {
        setGpsStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setGpsErrorMsg(
            'GPS permission was denied. If you are standing at the pandal, allow location access in your browser settings so your report can be verified within 100 meters.'
          );
        } else {
          setGpsErrorMsg('Could not detect GPS location. Please check your signal and retry.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!user) {
      setSubmitError('Please log in to submit a crowd report.');
      return;
    }

    const submissionCoordinates = gpsCoords || puja?.location?.coordinates;

    if (!submissionCoordinates) {
      setSubmitError('Location coordinates are required to verify proximity to the pandal.');
      return;
    }

    try {
      setIsSubmitting(true);

      let imageReference = null;
      if (photoFile) {
        const formData = new FormData();
        formData.append('images', photoFile);
        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (uploadRes.data?.urls?.[0]) {
          imageReference = uploadRes.data.urls[0];
        }
      }

      const res = await api.post(`/pujas/${puja._id}/crowd-reports`, {
        crowdLevel,
        estimatedWaitMinutes: Number(waitMinutes),
        coordinates: submissionCoordinates,
        gpsAccuracy: gpsAccuracy || null,
        source: gpsCoords ? 'gps' : 'manual',
        imageReference,
      });

      if (res.data.success) {
        if (onReportSuccess) {
          onReportSuccess(res.data.updatedEstimate);
        }
        onClose();
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit crowd observation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={puja ? `Report Crowd — ${puja.name}` : 'Report Live Crowd'}
      description="Contribute real-time on-site queue observations to assist fellow pandal hoppers."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info banner */}
        <div className="p-3 bg-[#F4EBDD]/80 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] rounded-xl text-xs text-stone-800 dark:text-stone-300 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-[#C74732] dark:text-[#E07A5F] mt-0.5" />
          <span className="leading-relaxed">
            Observations within <strong>100 meters</strong> of the registered pandal are verified and reflected on the live map immediately.
          </span>
        </div>

        {submitError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Crowd level selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
            Current Crowd Condition
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setCrowdLevel('low')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                crowdLevel === 'low'
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-sm'
                  : 'bg-[#FDFBF7] dark:bg-[#1E1A17] border-[#E8DEC8] dark:border-[#3A322B] text-stone-700 dark:text-stone-300 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Low</span>
              <span className="text-[10px] font-normal text-stone-500 dark:text-stone-400">&lt; 10m wait</span>
            </button>

            <button
              type="button"
              onClick={() => setCrowdLevel('moderate')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                crowdLevel === 'moderate'
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-200 shadow-sm'
                  : 'bg-[#FDFBF7] dark:bg-[#1E1A17] border-[#E8DEC8] dark:border-[#3A322B] text-stone-700 dark:text-stone-300 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420]'
              }`}
            >
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Moderate</span>
              <span className="text-[10px] font-normal text-stone-500 dark:text-stone-400">10–30m wait</span>
            </button>

            <button
              type="button"
              onClick={() => setCrowdLevel('high')}
              className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                crowdLevel === 'high'
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 shadow-sm'
                  : 'bg-[#FDFBF7] dark:bg-[#1E1A17] border-[#E8DEC8] dark:border-[#3A322B] text-stone-700 dark:text-stone-300 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420]'
              }`}
            >
              <Flame className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Heavy</span>
              <span className="text-[10px] font-normal text-stone-500 dark:text-stone-400">&gt; 30m wait</span>
            </button>
          </div>
        </div>

        {/* Estimated wait time */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Estimated Waiting Time
            </label>
            <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
              {waitMinutes} minutes
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="120"
            step="5"
            value={waitMinutes}
            onChange={(e) => setWaitMinutes(e.target.value)}
            className="w-full accent-[#C74732] cursor-pointer"
          />
        </div>

        {/* GPS Proximity Status */}
        <div className="p-3 bg-[#F4EBDD]/60 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700 dark:text-stone-300">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#C74732] dark:text-[#E07A5F]" /> On-Site GPS Verification
            </span>
            <button
              type="button"
              onClick={acquireLocation}
              disabled={gpsStatus === 'loading'}
              className="text-[11px] text-[#C74732] dark:text-[#E07A5F] hover:underline font-medium"
            >
              {gpsStatus === 'loading' ? 'Checking GPS...' : 'Refresh GPS'}
            </button>
          </div>

          {gpsStatus === 'loading' && (
            <p className="text-xs text-stone-500 dark:text-stone-400 animate-pulse">
              Acquiring location coordinates to verify 100m pandal perimeter...
            </p>
          )}

          {gpsStatus === 'success' && (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                GPS verified (~{gpsAccuracy}m accuracy).
              </span>
            </div>
          )}

          {gpsStatus === 'error' && (
            <div className="text-xs text-stone-600 dark:text-stone-400">
              <p>{gpsErrorMsg}</p>
            </div>
          )}
        </div>

        {/* Optional crowd photo */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            Optional Crowd Photo
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420] transition-colors text-stone-700 dark:text-stone-300 bg-[#FDFBF7] dark:bg-[#1E1A17]">
              <Camera className="w-3.5 h-3.5 text-[#C74732]" />
              <span>{photoFile ? 'Change Photo' : 'Attach Photo'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
            {photoPreview && (
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#E8DEC8] dark:border-[#3A322B]">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#E8DEC8]/80 dark:border-[#3A322B]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white shadow-sm disabled:opacity-50 transition-all"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Observation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
