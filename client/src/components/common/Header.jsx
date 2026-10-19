import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  MessageSquarePlus,
  PlusCircle,
  User,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  Map as MapIcon,
  Camera,
  Users,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigation } from '../../context/NavigationContext.jsx';
import { ThemeToggle } from './ThemeToggle.jsx';

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const { mobileMenuOpen, setMobileMenuOpen } = useNavigation();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile drawer upon route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll and listen for ESC key when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const navLinkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
      isActive
        ? 'bg-[#C74732]/10 dark:bg-[#B58B45]/15 text-[#C74732] dark:text-[#D4AF37] border border-[#C74732]/20 dark:border-[#B58B45]/30'
        : 'text-[#686358] dark:text-[#B8AF9F] hover:text-[#282520] dark:hover:text-[#F9F6F0] hover:bg-[#F4EBDD]/70 dark:hover:bg-[#1E1A17]'
    }`;

  // Mobile bottom navigation items (Ergonomic 48px touch targets)
  const bottomNavItems = [
    { to: '/', icon: Compass, label: 'Explore', exact: true },
    { to: '/posts', icon: Users, label: 'Feed' },
    { to: '/create-post', icon: Camera, label: 'Post' },
    { to: user ? '/profile' : '/login', icon: User, label: user ? 'Profile' : 'Sign In' },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#FBF7EF]/95 dark:bg-[#141210]/95 backdrop-blur-md border-b border-[#E8DEC8] dark:border-[#3A322B] transition-colors">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Logo with vector Pandal / Pin symbol */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C74732] to-[#702C35] text-white flex items-center justify-center shadow-sm border border-[#B58B45]/30">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C7.58 2 4 5.58 4 10C4 15.5 12 22 12 22C12 22 20 15.5 20 10C20 5.58 16.42 2 12 2Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 14V11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11V14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="6" r="1.5" fill="white"/>
              </svg>
            </div>
            <div>
              <div>
                <span className="font-serif font-black text-xl tracking-tight text-[#282520] dark:text-[#F9F6F0]">
                  Pandal<span className="text-[#C74732] dark:text-[#D4AF37]">Go</span>
                </span>
              </div>
              <p className="text-[10px] font-medium text-[#686358] dark:text-[#B8AF9F] hidden sm:block">
                Kolkata & Bengal Festive Pandal Guide
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              <Compass className="w-4 h-4" />
              <span>Explore Pandals</span>
            </NavLink>
            <NavLink to="/posts" className={navLinkClass}>
              <Users className="w-4 h-4" />
              <span>Community Feed</span>
            </NavLink>
            <NavLink to="/create-post" className={navLinkClass}>
              <MessageSquarePlus className="w-4 h-4" />
              <span>Share Experience</span>
            </NavLink>

            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`
                }
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin</span>
              </NavLink>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link
              to="/add-puja"
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-200 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-festival-600 dark:text-amber-400" />
              <span>Add Pandal</span>
            </Link>

            {user ? (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-stone-200 dark:border-stone-800">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-festival-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate max-w-[120px]">
                    {user.name}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg"
                  title="Log out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 pl-2 border-l border-stone-200 dark:border-stone-800">
                <Link
                  to="/login"
                  className="px-3 py-2 text-xs font-bold text-stone-700 dark:text-stone-200 hover:text-stone-900 dark:hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-festival-600 hover:bg-festival-700 text-white shadow-sm transition-colors"
                >
                  Join
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#686358] dark:text-[#B8AF9F] hover:bg-[#F4EBDD] dark:hover:bg-[#1E1A17] active:scale-95 rounded-xl transition-all"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-[#C74732] dark:text-[#D4AF37]" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-in Side Drawer & Backdrop Portal */}
      {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
        <div className="md:hidden fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/65 dark:bg-black/80 backdrop-blur-sm transition-opacity duration-300 touch-none cursor-pointer"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-In Side Drawer Container */}
          <aside className="fixed top-0 bottom-0 right-0 z-[101] w-[84vw] max-w-xs sm:max-w-sm bg-[#FBF7EF] dark:bg-[#161311] border-l border-[#E8DEC8] dark:border-[#3A322B] shadow-2xl flex flex-col justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-y-auto transform transition-transform duration-300 ease-out translate-x-0">
              {/* Drawer Top Header & Brand */}
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-[#E8DEC8] dark:border-[#3A322B]">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C74732] to-[#702C35] text-white flex items-center justify-center shadow-sm border border-[#B58B45]/30">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C7.58 2 4 5.58 4 10C4 15.5 12 22 12 22C12 22 20 15.5 20 10C20 5.58 16.42 2 12 2Z" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 14V11C9 9.34315 10.3431 8 12 8C13.6569 8 15 9.34315 15 11V14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        <circle cx="12" cy="6" r="1.5" fill="white"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif font-black text-lg tracking-tight text-[#282520] dark:text-[#F9F6F0]">
                          Pandal<span className="text-[#C74732] dark:text-[#D4AF37]">Go</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#B58B45]/15 text-[#702C35] dark:text-[#D4AF37] border border-[#B58B45]/30">
                          2026
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-[#686358] dark:text-[#B8AF9F]">
                        Bengal Festive Pandal Guide
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[#686358] dark:text-[#B8AF9F] hover:bg-[#F4EBDD] dark:hover:bg-[#1E1A17] active:scale-95 transition-all"
                    aria-label="Close navigation menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Festival Live Status Banner in Drawer */}
                <div className="mt-4 p-3 rounded-xl bg-[#F4EBDD]/70 dark:bg-[#1C1814] border border-[#E8DEC8] dark:border-[#3A322B] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-[#282520] dark:text-[#F9F6F0]">Durga Puja Live</p>
                      <p className="text-[10px] text-[#686358] dark:text-[#B8AF9F]">45+ Popular Pandals Mapped</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C74732]/10 text-[#C74732] dark:text-[#D4AF37] border border-[#C74732]/20">
                    Active
                  </span>
                </div>

                {/* Navigation Links with Icons & Slide-in Ergonomics */}
                <nav className="mt-4 space-y-1.5">
                  <NavLink
                    to="/"
                    end
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-[#C74732]/10 dark:bg-[#B58B45]/15 text-[#C74732] dark:text-[#D4AF37] border border-[#C74732]/20 dark:border-[#B58B45]/30 shadow-sm'
                          : 'text-[#282520] dark:text-[#F9F6F0] hover:bg-[#F4EBDD]/80 dark:hover:bg-[#1E1A17]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#C74732]/10 text-[#C74732] dark:text-[#D4AF37] flex items-center justify-center">
                        <Compass className="w-4 h-4" />
                      </div>
                      <span>Explore Pandals</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8C8272] opacity-60" />
                  </NavLink>

                  <NavLink
                    to="/posts"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-[#C74732]/10 dark:bg-[#B58B45]/15 text-[#C74732] dark:text-[#D4AF37] border border-[#C74732]/20 dark:border-[#B58B45]/30 shadow-sm'
                          : 'text-[#282520] dark:text-[#F9F6F0] hover:bg-[#F4EBDD]/80 dark:hover:bg-[#1E1A17]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#C74732]/10 text-[#C74732] dark:text-[#D4AF37] flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <span>Community Feed</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8C8272] opacity-60" />
                  </NavLink>

                  <NavLink
                    to="/create-post"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-[#C74732]/10 dark:bg-[#B58B45]/15 text-[#C74732] dark:text-[#D4AF37] border border-[#C74732]/20 dark:border-[#B58B45]/30 shadow-sm'
                          : 'text-[#282520] dark:text-[#F9F6F0] hover:bg-[#F4EBDD]/80 dark:hover:bg-[#1E1A17]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#C74732]/10 text-[#C74732] dark:text-[#D4AF37] flex items-center justify-center">
                        <MessageSquarePlus className="w-4 h-4" />
                      </div>
                      <span>Share Experience</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8C8272] opacity-60" />
                  </NavLink>

                  <NavLink
                    to="/add-puja"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                        isActive
                          ? 'bg-[#C74732]/10 dark:bg-[#B58B45]/15 text-[#C74732] dark:text-[#D4AF37] border border-[#C74732]/20 dark:border-[#B58B45]/30 shadow-sm'
                          : 'text-[#282520] dark:text-[#F9F6F0] hover:bg-[#F4EBDD]/80 dark:hover:bg-[#1E1A17]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#B58B45]/15 text-[#8F6826] dark:text-[#D4AF37] flex items-center justify-center">
                        <PlusCircle className="w-4 h-4" />
                      </div>
                      <span>Add Missing Pandal</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8C8272] opacity-60" />
                  </NavLink>

                  {isAdmin && (
                    <NavLink
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                          isActive
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-sm'
                            : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                        }`
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <span>Admin Portal</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-rose-400 opacity-60" />
                    </NavLink>
                  )}
                </nav>
              </div>

              {/* Drawer Bottom Controls & User Account Card */}
              <div className="pt-4 border-t border-[#E8DEC8] dark:border-[#3A322B] space-y-3">
                {user ? (
                  <div className="space-y-3">
                    <Link
                      to="/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F4EBDD]/60 dark:bg-[#1C1814] border border-[#E8DEC8] dark:border-[#3A322B] hover:bg-[#F4EBDD] dark:hover:bg-[#25201B] transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C74732] to-[#702C35] text-white font-bold text-sm flex items-center justify-center shadow-sm">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#282520] dark:text-[#F9F6F0] truncate">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-[#686358] dark:text-[#B8AF9F] truncate">
                          {user.email}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8C8272]" />
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-[#8C8272] hover:text-[#C74732] dark:hover:text-rose-400 bg-stone-100 dark:bg-stone-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full block py-2.5 text-center text-xs font-bold text-[#282520] dark:text-[#F9F6F0] bg-[#F4EBDD] dark:bg-[#25201B] hover:bg-[#E8DEC8] dark:hover:bg-[#2F2923] rounded-xl transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full block py-2.5 text-center text-xs font-bold text-white bg-gradient-to-r from-[#C74732] to-[#A33624] hover:from-[#B63D2A] hover:to-[#8E2C1C] rounded-xl shadow-sm transition-all"
                    >
                      Join PandalGo
                    </Link>
                  </div>
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}

      {/* Mobile Bottom Navigation Bar (High Ergonomics, 48px Touch Targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FBF7EF]/95 dark:bg-[#141210]/95 backdrop-blur-md border-t border-[#E8DEC8] dark:border-[#3A322B] safe-bottom shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4 py-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'text-[#C74732] dark:text-[#D4AF37] font-bold'
                    : 'text-[#686358] dark:text-[#B8AF9F] active:text-[#282520] font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] leading-tight">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C74732] dark:bg-[#D4AF37] mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
