import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { NavigationProvider } from './context/NavigationContext.jsx';

import { Compass } from 'lucide-react';
import { Header } from './components/common/Header.jsx';
import { Footer } from './components/common/Footer.jsx';

import { HomePage } from './pages/HomePage.jsx';
import { PandalDetailPage } from './pages/PandalDetailPage.jsx';
import { CreatePostPage } from './pages/CreatePostPage.jsx';
import { AddPujaPage } from './pages/AddPujaPage.jsx';
import { CommunityFeedPage } from './pages/CommunityFeedPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.jsx';
import { ProtectedRoute } from './components/common/ProtectedRoute.jsx';
import { DevBot } from './components/devbot/DevBot.jsx';
import { Layout, ComponentLayout } from './components/layout/index.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 4000),
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <NavigationProvider>
            <BrowserRouter>
              <div className="flex flex-col min-h-screen bg-[#FBF7EF] dark:bg-[#141210] text-[#282520] dark:text-[#F9F6F0] transition-colors duration-200">
                <Header />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/puja/:slug" element={<PandalDetailPage />} />
                    <Route path="/posts" element={<CommunityFeedPage />} />
                    <Route path="/create-post" element={<CreatePostPage />} />
                    <Route path="/add-puja" element={<AddPujaPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute adminOnly>
                          <AdminDashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    {/* 404 Fallback */}
                    <Route
                      path="*"
                      element={
                        <Layout maxWidth="md" centered>
                          <ComponentLayout padding="normal" className="text-center space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#F4EBDD] dark:bg-[#2A2420] text-[#C74732] flex items-center justify-center mx-auto border border-[#E8DEC8] dark:border-[#3A322B]">
                              <Compass className="w-7 h-7 text-[#C74732] dark:text-[#E07A5F]" />
                            </div>
                            <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-stone-100">Page Not Found</h2>
                            <p className="text-xs text-stone-600 dark:text-stone-400">
                              The requested page does not exist or has been moved.
                            </p>
                            <a
                              href="/"
                              className="inline-block px-5 py-2.5 bg-[#C74732] hover:bg-[#991B1B] text-white rounded-xl text-xs font-bold transition-colors"
                            >
                              Return Home
                            </a>
                          </ComponentLayout>
                        </Layout>
                      }
                    />
                  </Routes>
                </main>
                <Footer />
                <DevBot />
              </div>
            </BrowserRouter>
          </NavigationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
