import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot,
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  MapPin,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Compass,
  ArrowRight,
  Info,
  Loader2,
  Navigation,
  LocateFixed,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { DevBotCard } from './DevBotCard.jsx';
import { DevBotPlaceCard } from './DevBotPlaceCard.jsx';
import { DevBotRouteCard } from './DevBotRouteCard.jsx';
import { DevBotImportTable } from './DevBotImportTable.jsx';

/**
 * Clean up accidental raw HTML or mock UI button tables from LLM outputs
 */
const HTML_LINK_REGEX = new RegExp('<a\\s+(?:[^>]*?\\s+)?href=["\'](.*?)["\'][^>]*>(.*?)<\\/a>', 'gi');
const MOCK_TABLE_REGEX = new RegExp('\\|?\\s*\\*{0,2}View Details\\*{0,2}\\s*\\|\\s*\\*{0,2}Show on Map\\*{0,2}\\s*\\|\\s*\\*{0,2}Get Directions\\*{0,2}[\\s\\S]*?(?:\\n\\n|$)', 'gi');

function sanitizeDevBotMarkdown(content) {
  if (!content || typeof content !== 'string') return '';
  let clean = content;

  // Convert raw HTML links like <a href="url">text</a> or <a href="url" target="_blank">url</a> into markdown [text](url)
  clean = clean.replace(HTML_LINK_REGEX, '[$2]($1)');

  // Strip mock UI button tables that mimic [View Details | Show on Map | Get Directions]
  clean = clean.replace(MOCK_TABLE_REGEX, '');

  // Clean trailing excessive horizontal rules or empty lines caused by stripped table
  clean = clean.replace(/---\s*[\r\n]+\s*---/g, '---').trim();

  return clean;
}

/**
 * DevBotPanel
 * Primary chat interface component supporting Visitor discovery and Admin bulk management.
 */
export function DevBotPanel({ isOpen, onClose }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => {
    return sessionStorage.getItem('pandalgo_devbot_conversation_id') || null;
  });
  const [liveLocation, setLiveLocation] = useState(() => {
    try {
      const saved = sessionStorage.getItem('pandalgo_devbot_live_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [fileUploadError, setFileUploadError] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Do not focus automatically on phones: it opens the keyboard immediately
      // and causes mobile browsers to pan the fixed chat sheet off-screen.
      if (window.matchMedia('(min-width: 640px)').matches) {
        inputRef.current?.focus();
      }
    }
  }, [isOpen, messages, isLoading]);

  // Handle body scroll lock on mobile when modal is active
  useEffect(() => {
    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalBodyOverscroll = document.body.style.overscrollBehavior;
      const originalBodyPosition = document.body.style.position;
      const originalBodyTop = document.body.style.top;
      const originalBodyWidth = document.body.style.width;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
      const scrollY = window.scrollY;
      const viewport = window.visualViewport;
      const updateViewportHeight = () => {
        const height = viewport?.height || window.innerHeight;
        const top = viewport?.offsetTop || 0;
        document.documentElement.style.setProperty('--devbot-viewport-height', `${height}px`);
        document.documentElement.style.setProperty('--devbot-viewport-top', `${top}px`);
      };
      if (window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';
        updateViewportHeight();
        viewport?.addEventListener('resize', updateViewportHeight);
        viewport?.addEventListener('scroll', updateViewportHeight);
      }
      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        document.body.style.position = originalBodyPosition;
        document.body.style.top = originalBodyTop;
        document.body.style.width = originalBodyWidth;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
        viewport?.removeEventListener('resize', updateViewportHeight);
        viewport?.removeEventListener('scroll', updateViewportHeight);
        document.documentElement.style.removeProperty('--devbot-viewport-height');
        document.documentElement.style.removeProperty('--devbot-viewport-top');
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Initial welcome greeting when empty
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage = {
        id: 'welcome-0',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: isAdmin
          ? `🙏 **Namaskar Admin! Dev Bot at your service.**\n\nI can assist you with Puja data management, directory imports, duplicate audits, and map coordinates:\n• **Paste pandal listings** directly into our chat.\n• **Upload a CSV file** for batch validation.\n• **Check missing coordinates** or search existing pandals.\n• Review and edit records before approving any database write.`
          : `🙏 **Joy Maa Durga! Welcome to PandalGo Dev Bot.**\n\nI am your AI companion for discovering Durga Puja pandals across Bengal. Ask me anything:\n• "Find pandals near me"\n• "Top heritage pandals in North Kolkata"\n• "Pandal hopping route around Bagbazar"\n• "Which pandals have live crowd updates?"\n\n💡 Tap **📍 Send Live Location** below to get personalized destinations, distances, and turn-by-turn routes!`,
        cards: [],
      };
      setMessages([welcomeMessage]);
    }
  }, [isAdmin]);

  // Quick suggestion prompts
  const visitorChips = [
    {
      label: liveLocation ? '📍 Update Live Location' : '📍 Send Live Location',
      action: 'send_live_location',
    },
    { label: '🏛️ Bagbazar Sarbojanin details', action: 'query', text: 'Tell me about Bagbazar Sarbojanin Durga Puja' },
    { label: '🗺️ Pandals in Salt Lake', action: 'query', text: 'Find Durga Puja pandals in Salt Lake' },
    { label: '👥 Live crowd status', action: 'query', text: 'Which pandals currently have high or low crowd?' },
    { label: '🚶 Plan a heritage route', action: 'query', text: 'Plan a heritage Durga Puja route in North Kolkata' },
  ];

  const adminChips = [
    { label: '📋 Paste pandal list to import', action: 'paste_template' },
    { label: '📁 Upload pandal CSV', action: 'upload_csv' },
    { label: '⚠️ Check missing coordinates', action: 'query', text: 'Which pandals have missing coordinates?' },
    { label: '🔍 Search directory records', action: 'query', text: 'Show existing approved pandals in directory' },
  ];

  const chips = isAdmin ? adminChips : visitorChips;

  // Handle chip click
  const handleChipClick = (chip) => {
    if (chip.action === 'send_live_location' || chip.action === 'near_me') {
      handleSendLiveLocation();
    } else if (chip.action === 'upload_csv') {
      fileInputRef.current?.click();
    } else if (chip.action === 'paste_template') {
      setInputValue(
        `Please import these pandals:\n` +
        `1. Hatibagan Sarbojanin — 84/2, Aurobindo Sarani — Hatibagan, Kolkata\n` +
        `2. Kumartuli Park — 8B, Mayur Sarani — Kumartuli, Kolkata\n` +
        `3. College Square — 53, College Street — College Square, Kolkata`
      );
      inputRef.current?.focus();
    } else if (chip.action === 'query') {
      handleSendMessage(chip.text);
    }
  };

  // Request & send browser live geolocation
  const handleSendLiveLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please type your locality or landmark name instead.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        const loc = { latitude, longitude, accuracy: Math.round(accuracy) };
        setLiveLocation(loc);
        try {
          sessionStorage.setItem('pandalgo_devbot_live_location', JSON.stringify(loc));
        } catch {
          // ignore
        }

        handleSendMessage(
          `📍 Shared my Live Location: (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E). What are the closest destination pandals near me and how to reach them?`,
          loc
        );
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Unable to fetch your GPS coordinates. Please type your locality, landmark, or station name instead.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. You can still search by locality or station name (e.g., "Bagbazar" or "Naihati").';
        }
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            content: `⚠️ **Location Notice**: ${msg}`,
          },
        ]);
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  // Admin CSV/Text File Upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected if needed
    event.target.value = '';

    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      setFileUploadError('Please upload a valid .csv, .tsv, or .txt file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setFileUploadError('File exceeds maximum size limit of 2 MB.');
      return;
    }

    setFileUploadError(null);
    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        try {
          const res = await api.post('/dev-bot/imports/preview', {
            rawText: text,
            sourceType: 'file',
          });

          if (res.data?.success) {
            const preview = res.data.data || res.data.preview || res.data;
            const summary = preview.summary || {
              totalRows: preview.totalRows || 0,
              validRows: preview.validRowsCount || 0,
              warningRows: preview.warningRowsCount || 0,
              duplicateRows: preview.duplicateRowsCount || 0,
              invalidRows: preview.invalidRowsCount || 0,
            };
            const previewMessage = {
              id: `msg-${Date.now()}`,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              content: `📊 **Import Preview Generated for ${file.name}**\n\nI analysed **${summary.totalRows} records** from your uploaded file:\n• **${summary.validRows}** valid records\n• **${summary.warningRows}** warnings\n• **${summary.duplicateRows}** possible duplicates\n• **${summary.invalidRows}** invalid rows\n\nPlease review and toggle rows below before confirming the import.`,
              importPreview: preview,
            };

            setMessages((prev) => [...prev, previewMessage]);
          }
        } catch (err) {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'assistant',
              timestamp: new Date().toISOString(),
              content: `❌ **Import Preview Error**: ${err.message || 'Failed to process uploaded file.'}`,
            },
          ]);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setIsLoading(false);
      setFileUploadError(err.message || 'Error reading file');
    }
  };

  // Send message to server
  const handleSendMessage = async (customText, customLocation = null) => {
    const textToSend = typeof customText === 'string' ? customText.trim() : inputValue.trim();
    if (!textToSend || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg = {
      id: userMessageId,
      role: 'user',
      timestamp: new Date().toISOString(),
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const locationToSend = customLocation || liveLocation || undefined;
      const payload = {
        message: textToSend,
        conversationId: conversationId || undefined,
        userLocation: locationToSend,
      };

      const res = await api.post('/dev-bot/chat', payload);

      if (res.data?.success) {
        const data = res.data.data || res.data;
        const convId = data.conversationId || res.data.conversationId;
        if (convId) {
          setConversationId(convId);
          sessionStorage.setItem('pandalgo_devbot_conversation_id', convId);
        }

        const botMsg = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: data.reply || data.message?.content || 'Here are the matching records from our directory:',
          cards: data.cards || data.pujas || [],
          places: data.places || [],
          routePlan: data.routePlan || null,
          importPreview: data.importPreview || null,
        };

        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(res.data?.message || 'Dev Bot encountered an error.');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          content: `⚠️ **Service Notice**: ${err.message || 'Unable to connect to Dev Bot backend. Please try again.'}`,
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear conversation
  const handleClearConversation = async () => {
    if (!window.confirm('Clear your Dev Bot conversation history?')) return;
    if (conversationId) {
      try {
        await api.delete(`/dev-bot/conversations/${conversationId}`);
      } catch (e) {
        // Ignore deletion errors on client
      }
    }
    sessionStorage.removeItem('pandalgo_devbot_conversation_id');
    setConversationId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: `Conversation cleared. How can I assist you with Durga Puja discovery today?`,
        cards: [],
      },
    ]);
  };

  // Card action handlers
  const handleShowOnMap = (pandal) => {
    const coords = pandal.location?.coordinates;
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      navigate(`/?pandal=${pandal.slug || pandal._id}&lat=${lat}&lng=${lng}`);
    } else {
      navigate(`/?pandal=${pandal.slug || pandal._id}`);
    }
    if (window.innerWidth < 640) {
      onClose();
    }
  };

  const handleViewDetails = (pandal) => {
    navigate(`/puja/${pandal.slug || pandal._id}`);
    if (window.innerWidth < 640) {
      onClose();
    }
  };

  // Keyboard shortcut: Enter sends message, Shift+Enter for newline
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`devbot-mobile-shell fixed sm:transition-all sm:duration-300 sm:ease-out z-[100] ${
        isMaximized
          ? 'inset-2 sm:inset-6 flex flex-col'
          : 'inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[460px] sm:h-[680px] sm:max-h-[calc(100vh-48px)] flex flex-col'
      }`}
    >
      {/* Outer Card Container */}
      <div className="relative flex flex-col min-h-0 w-full h-full bg-[#FDFBF7] dark:bg-[#1C1815] sm:rounded-2xl shadow-2xl border border-[#E8DEC8] dark:border-[#3A322B] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#FBF7EF] via-[#F4EBDD] to-[#FBF7EF] dark:from-[#1E1A17] dark:via-[#26201B] dark:to-[#1E1A17] border-b border-[#E8DEC8] dark:border-[#3A322B] select-none">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#C74732] to-[#8C3B46] text-white shadow-md shadow-[#C74732]/20">
              <Bot className="w-5 h-5 text-white" />
              <Sparkles className="w-2.5 h-2.5 text-[#D4AF37] absolute -top-1 -right-1" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-[#282520] dark:text-[#F9F6F0] font-serif">
                  Dev Bot
                </h3>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-festival-500/10 text-festival-700 dark:text-festival-300 border border-festival-500/30">
                    <Compass className="w-2.5 h-2.5 text-festival-600 dark:text-festival-400" />
                    Discovery
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                PandalGo Durga Puja AI Assistant
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                onClick={handleClearConversation}
                title="Clear chat"
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Restore size' : 'Expand window'}
              className="hidden sm:inline-flex p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              title="Close Dev Bot"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live GPS Active Status Bar */}
        {liveLocation && (
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border-b border-emerald-200/80 dark:border-emerald-800/40 text-[11px] text-emerald-900 dark:text-emerald-200 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold">Live GPS Active:</span>
              <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-300">
                {liveLocation.latitude.toFixed(4)}° N, {liveLocation.longitude.toFixed(4)}° E
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendLiveLocation}
                disabled={isLocating}
                className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline inline-flex items-center gap-0.5"
              >
                Refresh
              </button>
              <span className="text-emerald-400">•</span>
              <button
                onClick={() => {
                  setLiveLocation(null);
                  try {
                    sessionStorage.removeItem('pandalgo_devbot_live_location');
                  } catch {
                    // ignore
                  }
                }}
                className="text-[10px] text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Messages Body */}
        <div ref={messagesContainerRef} className="devbot-messages flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 text-xs sm:text-sm">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[88%] sm:max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-[#C74732] to-[#B33925] text-white shadow-md rounded-br-none'
                    : msg.error
                    ? 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200 rounded-bl-none'
                    : 'bg-[#F4EBDD]/70 dark:bg-[#25201B] border border-[#E8DEC8]/80 dark:border-[#3A322B] text-[#282520] dark:text-[#F9F6F0] rounded-bl-none shadow-sm'
                }`}
              >
                {/* Formatted Markdown rendering */}
                <div className="font-sans text-xs sm:text-[13px] leading-relaxed break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ node, ...props }) => (
                        <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong
                          className={`font-bold ${
                            msg.role === 'user'
                              ? 'text-white'
                              : 'text-[#C74732] dark:text-[#E05A44]'
                          }`}
                          {...props}
                        />
                      ),
                      a: ({ node, href, children, ...props }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-0.5 underline font-semibold break-all ${
                            msg.role === 'user'
                              ? 'text-amber-200 hover:text-white'
                              : 'text-[#C74732] hover:text-[#962A19] dark:text-[#E05A44] dark:hover:text-[#FFA280]'
                          }`}
                          {...props}
                        >
                          <span>{children}</span>
                          <ExternalLink className="w-2.5 h-2.5 inline shrink-0 opacity-70" />
                        </a>
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc pl-4 space-y-1 my-1.5" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal pl-4 space-y-1 my-1.5" {...props} />
                      ),
                      li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-2 rounded-lg border border-[#E8DEC8] dark:border-[#3A322B] shadow-xs">
                          <table className="min-w-full divide-y divide-[#E8DEC8] dark:divide-[#3A322B] text-xs" {...props} />
                        </div>
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-[#E8DEC8]/50 dark:bg-[#25201B]" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th className="px-2.5 py-1.5 font-bold text-left text-[#282520] dark:text-[#F9F6F0]" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="px-2.5 py-1.5 border-t border-[#E8DEC8]/40 dark:border-[#3A322B]/40" {...props} />
                      ),
                      h1: ({ node, ...props }) => (
                        <h1 className="font-serif font-bold text-base mb-1.5 text-[#282520] dark:text-[#F9F6F0]" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="font-serif font-bold text-sm mb-1 text-[#282520] dark:text-[#F9F6F0]" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="font-serif font-bold text-xs sm:text-sm mb-1 text-[#282520] dark:text-[#F9F6F0]" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-2 border-[#C74732] pl-2.5 my-1.5 italic opacity-90 text-stone-600 dark:text-stone-300" {...props} />
                      ),
                      code: ({ node, ...props }) => (
                        <code className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 font-mono text-[11px]" {...props} />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr className="my-2 border-[#E8DEC8] dark:border-[#3A322B]" {...props} />
                      ),
                    }}
                  >
                    {sanitizeDevBotMarkdown(msg.content)}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Rendered Puja Result Cards */}
              {msg.cards && msg.cards.length > 0 && (
                <div className="w-full mt-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 dark:text-stone-400 px-1">
                    <span>Matching Pandals ({msg.cards.length})</span>
                    {liveLocation && (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-medium inline-flex items-center gap-1">
                        <LocateFixed className="w-2.5 h-2.5" />
                        Sorted by distance from live location
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {msg.cards.map((pandal) => (
                      <DevBotCard
                        key={pandal._id || pandal.id}
                        pandal={pandal}
                        userLocation={liveLocation}
                        onShowOnMap={handleShowOnMap}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Rendered Admin Import Table */}
              {msg.places && msg.places.length > 0 && (
                <div className="w-full mt-2.5 space-y-2">
                  <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 px-1">
                    Nearby places ({msg.places.length})
                  </div>
                  {msg.places.map((place) => (
                    <DevBotPlaceCard key={place.id} place={place} userLocation={liveLocation} />
                  ))}
                </div>
              )}

              {msg.routePlan && (
                <div className="w-full mt-2.5">
                  <DevBotRouteCard routePlan={msg.routePlan} />
                </div>
              )}

              {/* Rendered Admin Import Table */}
              {msg.importPreview && (
                <div className="w-full mt-3">
                  <DevBotImportTable
                    preview={msg.importPreview}
                    onImportConfirmed={(result) => {
                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `confirmed-${Date.now()}`,
                          role: 'assistant',
                          timestamp: new Date().toISOString(),
                          content: `✅ **Batch Import Complete!**\n\n• Successfully saved: **${result.importedCount}** pandals\n• Skipped/Duplicates: **${result.skippedCount}**\n• Failed: **${result.failedCount}**\n\nThe live map and discovery lists have been updated.`,
                        },
                      ]);
                    }}
                  />
                </div>
              )}

              <span className="text-[10px] text-stone-400 dark:text-stone-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}

          {/* Typing/Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs italic py-2 px-1">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C74732] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#702C35] animate-bounce [animation-delay:0.4s]" />
              </div>
              <span>Dev Bot is consulting pandal directory...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-3 py-2 bg-[#FBF7EF]/90 dark:bg-[#181412]/90 border-t border-[#E8DEC8]/60 dark:border-[#3A322B]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {chips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleChipClick(chip)}
              disabled={isLoading || isLocating}
              className="flex-shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-full bg-[#F4EBDD] hover:bg-[#E8DEC8] dark:bg-[#25201B] dark:hover:bg-[#2E2722] text-[#282520] dark:text-[#E6E1D8] border border-[#E8DEC8] dark:border-[#3A322B] transition-colors whitespace-nowrap active:scale-95 disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* File upload error if any */}
        {fileUploadError && (
          <div className="px-4 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] flex items-center justify-between border-t border-red-500/20">
            <span>{fileUploadError}</span>
            <button
              onClick={() => setFileUploadError(null)}
              className="font-bold hover:underline"
            >
              ✕
            </button>
          </div>
        )}

        {/* Message Composer */}
        <div className="p-3 safe-bottom bg-[#FDFBF7] dark:bg-[#1E1A17] border-t border-[#E8DEC8] dark:border-[#3A322B]">
          <div className="flex items-end gap-2 bg-[#FBF7EF] dark:bg-[#141210] rounded-xl border border-[#E8DEC8] dark:border-[#3A322B] p-1.5 focus-within:ring-2 focus-within:ring-[#C74732]/40 transition-all">
            
            {/* Send Live Location button */}
            <button
              type="button"
              onClick={handleSendLiveLocation}
              disabled={isLoading || isLocating}
              title={
                liveLocation
                  ? `Live GPS Active (${liveLocation.latitude.toFixed(4)}, ${liveLocation.longitude.toFixed(4)}). Tap to refresh.`
                  : 'Send Live Location to get destination routes & nearest pandals'
              }
              className={`p-2 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                liveLocation
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                  : 'text-stone-500 hover:text-[#C74732] dark:hover:text-[#E05A44] hover:bg-[#F4EBDD] dark:hover:bg-[#25201B]'
              } disabled:opacity-50`}
            >
              {isLocating ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#C74732]" />
              ) : liveLocation ? (
                <LocateFixed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Navigation className="w-4 h-4 text-[#C74732]" />
              )}
              <span className="hidden sm:inline text-[11px]">
                {liveLocation ? 'GPS Active' : 'Live Location'}
              </span>
            </button>

            {/* Admin File Upload trigger */}
            {isAdmin && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="Upload CSV / TSV pandal data"
                  className="p-2 rounded-lg text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-[#F4EBDD] dark:hover:bg-[#25201B] transition-colors disabled:opacity-50"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </>
            )}

            {/* Input textarea */}
            <textarea
              ref={inputRef}
              rows={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAdmin
                  ? 'Ask to search, or paste pandal names & addresses...'
                  : 'Ask about any Durga Puja pandal, area, or crowd...'
              }
              disabled={isLoading}
              className="flex-1 bg-transparent border-0 resize-none py-1.5 px-2 text-xs sm:text-sm text-[#282520] dark:text-[#F9F6F0] placeholder-stone-400 focus:outline-none max-h-24 leading-relaxed"
            />

            {/* Send button */}
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
              className="p-2 rounded-lg bg-gradient-to-r from-[#C74732] to-[#B33925] text-white hover:from-[#B33925] hover:to-[#962A19] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center justify-between mt-1.5 px-1 text-[10px] text-stone-400">
            <span>Enter to send · Shift+Enter for newline</span>
            <span>Ground truth: Approved Puja DB</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default DevBotPanel;
