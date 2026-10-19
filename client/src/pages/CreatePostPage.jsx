import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  X,
  Upload,
  AlertCircle,
  CheckCircle2,
  MapPin,
  PenSquare,
  Lock,
  Info,
  Navigation,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LocationPickerMap } from '../components/map/LocationPickerMap.jsx';
import { Layout, ComponentLayout } from '../components/layout/index.js';

const CATEGORIES = [
  'Puja Experience',
  'Pandal Photography',
  'Pandal Discovery',
  'Crowd Update',
  'New Pandal Suggestion',
];

export function CreatePostPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locality, setLocality] = useState('');
  const [associatedPujaId, setAssociatedPujaId] = useState('');
  const [category, setCategory] = useState('Puja Experience');
  const [coordinates, setCoordinates] = useState(null); // [lng, lat]
  const [locationSource, setLocationSource] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);

  const [imageFiles, setImageFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch approved pandals for the dropdown
  const { data: pujasData } = useQuery({
    queryKey: ['approved-pujas-dropdown'],
    queryFn: async () => {
      const res = await api.get('/pujas');
      return res.data;
    },
  });

  const approvedPujas = pujasData?.pujas || [];

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
          Please log in or create an account to share your Puja experiences and photographs with the community.
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
    if (imageFiles.length + files.length > 6) {
      setErrorMessage('A maximum of 6 photographs can be attached.');
      return;
    }

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

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

    if (!description.trim() || description.length < 5) {
      setErrorMessage('Please provide a description of at least 5 characters.');
      return;
    }

    if (!locality.trim()) {
      setErrorMessage('Please enter the locality or neighborhood.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload photographs if attached
      let uploadedUrls = [];
      if (imageFiles.length > 0) {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append('images', file));

        const uploadRes = await api.post('/upload', formData, {
          timeout: 120000,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!uploadRes.data?.success || !Array.isArray(uploadRes.data?.urls)) {
          throw new Error(uploadRes.data?.message || 'Photograph upload failed.');
        }
        uploadedUrls = uploadRes.data.urls;
      }

      const payload = {
        title: title.trim() || undefined,
        description: description.trim(),
        locality: locality.trim(),
        images: uploadedUrls,
        category,
        associatedPujaId: associatedPujaId || null,
        coordinates: coordinates || undefined,
        locationSource: locationSource || undefined,
        reportedGpsAccuracy: gpsAccuracy || undefined,
      };

      const res = await api.post('/posts', payload);
      if (!res.data?.success) throw new Error(res.data?.message || 'The post could not be published.');
      navigate('/posts', { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to publish post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout maxWidth="3xl" className="space-y-6">
      <div className="space-y-1 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4EBDD] dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-xs font-semibold text-stone-800 dark:text-stone-200">
          <PenSquare className="w-3.5 h-3.5 text-[#C74732]" />
          <span>Community Contribution</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 dark:text-stone-100">
          Share Your Puja Experience
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400">
          Publish photographs, describe your pandal visit, and share impressions with festival hoppers.
        </p>
      </div>

      {/* Note about pandal distinction */}
      <div className="p-3.5 bg-[#F4EBDD]/80 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] rounded-2xl text-xs text-stone-800 dark:text-stone-200 flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-[#B58B45] mt-0.5" />
        <div>
          <strong>Note:</strong> Publishing a community post shares your experience in the community feed. If you want to officially register a newly discovered pandal location on the public map, please submit it via{' '}
          <Link to="/add-puja" className="font-bold underline text-[#C74732] hover:text-[#991B1B] dark:text-[#E07A5F]">
            Suggest a New Pandal
          </Link>
          .
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <ComponentLayout as="form" onSubmit={handleSubmit} padding="relaxed" className="space-y-6">
        {/* Post Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            Post Title <span className="text-stone-400 dark:text-stone-500 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Stunning Pratima and lighting at College Square!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-[#F4EBDD]/50 dark:bg-[#2A2420] border border-[#E8DEC8] dark:border-[#3A322B] text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C74732]"
          />
        </div>

        {/* Category & Associated Pandal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-festival-500"
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
              Associated Pandal <span className="text-stone-400 dark:text-stone-500 font-normal">(Optional)</span>
            </label>
            <select
              value={associatedPujaId}
              onChange={(e) => {
                setAssociatedPujaId(e.target.value);
                const selected = approvedPujas.find((p) => p._id === e.target.value);
                if (selected && !locality) {
                  setLocality(selected.locality);
                }
              }}
              className="w-full px-3.5 py-2.5 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-festival-500"
            >
              <option value="">Select an approved pandal...</option>
              {approvedPujas.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.locality})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Locality */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            Locality / Neighborhood <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Bagbazar, North Kolkata / Naihati Station Road"
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            className="w-full px-4 py-2.5 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-festival-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            Your Experience / Description <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Share details about the pandal decor, crowd waiting time, atmosphere, or cultural highlights..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 text-sm bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-festival-500"
          />
        </div>

        {/* Photographs Upload */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-1.5">
            Photographs <span className="text-stone-400 dark:text-stone-500 font-normal">(Up to 6 images)</span>
          </label>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-1">
            {previews.map((src, idx) => (
              <div key={idx} className="relative h-24 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 group">
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

            {imageFiles.length < 6 && (
              <label className="cursor-pointer h-24 rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-festival-500 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 flex flex-col items-center justify-center gap-1 text-stone-500 dark:text-stone-400 transition-colors">
                <Camera className="w-5 h-5 text-festival-600 dark:text-festival-400" />
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
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
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
            className="px-5 py-2.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 text-xs font-bold rounded-xl bg-festival-600 hover:bg-festival-700 text-white shadow-md shadow-festival-600/25 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>{isSubmitting ? 'Publishing Post...' : 'Publish Experience'}</span>
          </button>
        </div>
      </ComponentLayout>
    </Layout>
  );
}
