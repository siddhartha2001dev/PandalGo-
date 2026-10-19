import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ShieldCheck, Heart } from 'lucide-react';
import { TerracottaBorderPattern } from './AlpanaMotif.jsx';

export function Footer() {
  return (
    <footer className="bg-[#141210] text-[#B8AF9F] border-t border-[#3A322B] pt-8 pb-24 md:pb-10 mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TerracottaBorderPattern className="text-[#B58B45]/20 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#3A322B]">
          {/* Brand & Mission */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#C74732] to-[#702C35] text-white flex items-center justify-center border border-[#B58B45]/30 shadow-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C7.58 2 4 5.58 4 10C4 15.5 12 22 12 22C12 22 20 15.5 20 10C20 5.58 16.42 2 12 2Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2"/>
                  <path d="M9 14V11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11V14" stroke="white" strokeWidth="2"/>
                </svg>
              </div>
              <span className="font-serif font-black text-xl text-[#F9F6F0] tracking-tight">
                Pandal<span className="text-[#D4AF37]">Go</span>
              </span>
            </div>
            <p className="text-xs text-[#B8AF9F] leading-relaxed">
              Real-time queue wait estimates, traffic intelligence, and pandal navigation across West Bengal, celebrating Bengal's UNESCO Intangible Cultural Heritage.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F9F6F0] mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs font-medium text-[#B8AF9F]">
              <li>
                <Link to="/" className="hover:text-[#D4AF37] transition-colors">
                  Interactive Live Map
                </Link>
              </li>
              <li>
                <Link to="/posts" className="hover:text-[#D4AF37] transition-colors">
                  Community Feed & Stories
                </Link>
              </li>
              <li>
                <Link to="/create-post" className="hover:text-[#D4AF37] transition-colors">
                  Share Crowd Observation
                </Link>
              </li>
              <li>
                <Link to="/add-puja" className="hover:text-[#D4AF37] transition-colors">
                  Suggest a Pandal
                </Link>
              </li>
            </ul>
          </div>

          {/* Covered Zones */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F9F6F0] mb-3">
              Key Festive Zones
            </h4>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {['North Kolkata', 'South Kolkata', 'Central', 'Salt Lake', 'Lake Town', 'Kalyani', 'Naihati', 'Barrackpore'].map((loc) => (
                <span
                  key={loc}
                  className="px-2 py-0.5 rounded-md bg-[#1E1A17] text-[#B8AF9F] border border-[#3A322B]"
                >
                  {loc}
                </span>
              ))}
            </div>
          </div>

          {/* Tech & Methodology */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F9F6F0] mb-3">
              Heritage & Intelligence
            </h4>
            <p className="text-xs text-[#B8AF9F] leading-relaxed">
              Crowd estimates merge on-site visitor reports, multi-layer AI queue density analysis, and live TomTom traffic congestion telemetry.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#686358] dark:text-[#B8AF9F]/70 gap-3">
          <p>© {new Date().getFullYear()} PandalGo • Kolkata & Bengal Durga Puja Guide</p>
          <p className="flex items-center gap-1.5 font-bengali">
            <span>বাংলার দুর্গোৎসব ও ঐতিহ্য • UNESCO Intangible Cultural Heritage</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
