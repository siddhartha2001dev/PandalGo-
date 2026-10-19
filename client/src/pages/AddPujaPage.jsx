import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusCircle,
  Camera,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Clock,
  Lock,
  Info,
  ShieldCheck,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LocationPickerMap } from '../components/map/LocationPickerMap.jsx';
import { Layout, ComponentLayout } from '../components/layout/index.js';

const CATEGORIES = [
  'Community / Baroari',
  'Traditional / Heritage',
  'Theme / Contemporary',
  'Bonedi Bari / Household',
  'Club / Local',
];

export function AddPujaPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [locality, setLocality] = useState('');
  const [category, setCategory] = useState('Community / Baroari');
  const [festivalYear, setFestivalYear] = useState(2026);
  const [timings, setTimings] = useState('Open 24 Hours during Puja days');
  const [description, setDescription] = useState('');
  const [coordinates, setCoordinates] = useState(null); // [lng, lat]
  const [locationSource, setLocationSource] = useState(isAdmin ? 'manual' : null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  if (authLoading) {
    return (
      <div className="min-h-[45vh] flex flex-col items-center justify-center gap-3 px-4">
        <div className="w-9 h-9 border-3 border-stone-200 dark:border-stone-800 border-t-festival-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">Restoring your session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-festival-600 dark:text-festival-400" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Login Required</h2>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Please log in to add a new Durga Puja pandal.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl bg-festival-600 hover:bg-festival-700 text-white font-bold text-xs shadow-md"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (imageFiles.length + files.length > 5) {
      setErrorMessage('A maximum of 5 photographs can be uploaded.');
      return;
    }
    setImageFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim() || name.length < 3) {
      setErrorMessage('Pandal name must be at least 3 characters.');
      return;
    }

    if (!address.trim() || address.length < 5) {
      setErrorMessage('Address must be at least 5 characters.');
      return;
    }

    if (!locality.trim()) {
      setErrorMessage('Locality is required.');
      return;
    }

    if (!coordinates || coordinates.length !== 2) {
      setErrorMessage(
        isAdmin
          ? 'Please set the pandal location pin on the map or use GPS.'
          : 'Please click "Use My Present Location (GPS)" to verify your current location at this pandal.'
      );
      return;
    }

    if (!isAdmin && locationSource !== 'gps') {
      setErrorMessage('Normal users must capture their present location via GPS to register a new pandal.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload photographs
      let uploadedUrls = [];
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append('images', file));

        const uploadRes = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadRes.data?.urls) {
          uploadedUrls = uploadRes.data.urls;
        }
      }

      const payload = {
        name: name.trim(),
        address: address.trim(),
        locality: locality.trim(),
        category,
        festivalYear: Number(festivalYear) || 2026,
        timings: timings.trim(),
        description: description.trim(),
        coordinates,
        images: uploadedUrls,
        locationSource: isAdmin ? (locationSource || 'manual') : 'gps',
        reportedGpsAccuracy: gpsAccuracy || undefined,
      };

      const res = await api.post('/contributions', payload);
      if (res.data.success) {
        setSuccessResult(res.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit pandal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successResult) {
    const isLive = successResult.isLive || successResult.puja?.status === 'approved';

    return (
      <Layout maxWidth="xl" centered>
        <ComponentLayout padding="relaxed" className="text-center space-y-4 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {isLive ? 'Pandal Registered & Live on Map!' : 'Submission Received!'}
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed max-w-md mx-auto">
            {isLive ? (
              <>
                Thank you for adding <strong>{successResult.puja?.name}</strong>. Because your location was verified on-site, this pandal is now <strong>active live on the map</strong>. Other hoppers can trace its location and view or report live crowd updates!
              </>
            ) : (
              <>
                Thank you for contributing <strong>{successResult.puja?.name}</strong>. Your suggestion has been queued with <strong>pending</strong> status for administrator verification.
              </>
            )}
          </p>

          {successResult.hasPossibleDuplicates && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-left text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Duplicate Check Notice
              </div>
              <p>
                Our system detected existing pandals with similar names or nearby coordinates in this area. An administrator may review and merge if needed.
              </p>
            </div>
          )}

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            {successResult.puja?.slug && (
              <Link
                to={`/?puja=${successResult.puja.slug}`}
                className="px-5 py-2.5 rounded-xl bg-festival-600 hover:bg-festival-700 text-white font-bold text-xs shadow-md shadow-festival-600/30 flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" /> Trace on Map
              </Link>
            )}
            {successResult.puja?.slug && (
              <Link
                to={`/puja/${successResult.puja.slug}`}
                className="px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-colors"
              >
                View Pandal Page
              </Link>
            )}
            <Link
              to="/profile"
              className="px-5 py-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold text-xs transition-colors"
            >
              My Contributions
            </Link>
          </div>
        </ComponentLayout>
      </Layout>
    );
  }

  return (
    <Layout maxWidth="3xl" className="space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EBDD] dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-xs font-semibold text-stone-800 dark:text-stone-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Real-Time Pandal Discovery Service</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Add a New Durga Puja Pandal
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
          {isAdmin
            ? 'Administrator Mode: You can place remote custom locations anywhere or use GPS to add pandals.'
            : 'At a Puja pandal not yet on PandalGo? Capture your present location and info to instantly make it live on the map!'}
        </p>
      </div>

      {/* Mode Explanation */}
      <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
        isAdmin
          ? 'bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 text-purple-950 dark:text-purple-200'
          : 'bg-[#F4EBDD]/80 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-200'
      }`}>
        <Info className={`w-4 h-4 shrink-0 mt-0.5 ${isAdmin ? 'text-purple-600 dark:text-purple-400' : 'text-[#C74732] dark:text-[#E07A5F]'}`} />
        <div>
          {isAdmin ? (
            <span>
              <strong>Admin Mode Active:</strong> You can place custom location pins remotely anywhere on the map or input exact coordinates.
            </span>
          ) : (
            <span>
              <strong>Verified On-Site Registration:</strong> Normal users register pandals at their <strong>present location</strong> using GPS. Once added, the pandal goes live on the interactive map so others can trace the location and check crowds!
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <ComponentLayout as="form" onSubmit={handleSubmit} padding="relaxed" className="space-y-6">
        {/* Pandal Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            Pandal Name <span className="text-[#C74732]">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Nabin Pally Sarbojanin Durgotsav"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
          />
        </div>

        {/* Address & Locality */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Address / Landmark <span className="text-[#C74732]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Near Hatibagan Crossing, Bidhan Sarani"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Locality / Area <span className="text-[#C74732]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. North Kolkata, Lake Town, Salt Lake"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
            />
          </div>
        </div>

        {/* Category & Timings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Visiting Timings
            </label>
            <input
              type="text"
              value={timings}
              onChange={(e) => setTimings(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
            />
          </div>
        </div>

        {/* Description / Background */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            Pandal Description / History <span className="text-stone-400 dark:text-stone-500 font-normal">(Optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Describe the heritage, theme, pratima style, or unique attractions..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
          />
        </div>

        {/* Photographs */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            Photographs <span className="text-stone-400 dark:text-stone-500 font-normal">(Up to 5 images)</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-1">
            {previews.map((src, idx) => (
              <div key={idx} className="relative h-24 rounded-xl overflow-hidden border border-[#E8DEC8] dark:border-[#3A322B] group">
                <img src={src} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {imageFiles.length < 5 && (
              <label className="cursor-pointer h-24 rounded-xl border-2 border-dashed border-[#E8DEC8] dark:border-[#3A322B] hover:border-[#C74732] bg-[#F4EBDD]/40 dark:bg-[#2A2420] hover:bg-[#F4EBDD]/70 dark:hover:bg-[#342D28] flex flex-col items-center justify-center gap-1 text-stone-600 dark:text-stone-400 transition-colors">
                <Camera className="w-5 h-5 text-[#C74732]" />
                <span className="text-[11px] font-semibold">Add Photo</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Location Picker */}
        <div className="pt-2 border-t border-[#E8DEC8]/80 dark:border-[#3A322B]">
          <LocationPickerMap
            coordinates={coordinates}
            onChange={(coords) => setCoordinates(coords)}
            onGpsCapture={(gpsInfo) => {
              setCoordinates(gpsInfo.coordinates);
              setLocationSource(gpsInfo.source);
              setGpsAccuracy(gpsInfo.accuracy);
            }}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-[#F4EBDD] dark:hover:bg-[#2A2420] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 text-xs font-bold rounded-xl bg-[#C74732] hover:bg-[#991B1B] text-white shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isSubmitting ? 'Registering Pandal...' : 'Register Pandal'}</span>
          </button>
        </div>
      </ComponentLayout>
    </Layout>
  );
}
