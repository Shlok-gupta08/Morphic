import { useState, useLayoutEffect, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CATEGORIES, TOOLS, getToolsByCategory, type ToolCategory } from '@/data/tools';
import LandingPage from '@/components/LandingPage';
import { useFileManager } from '@/contexts/FileManagerContext';

export default function HomePage() {
  const [filter, setFilter] = useState<ToolCategory | 'all'>('all');
  const tools = filter === 'all' ? TOOLS : getToolsByCategory(filter);
  const scrollRef = useRef<number>(0);
  const location = useLocation();
  const { isOpen } = useFileManager();
  const [isMobile, setIsMobile] = useState(false);

  // Handle resizing for mobile check
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll Restoration Logic
  useLayoutEffect(() => {
    const savedPosition = sessionStorage.getItem('homeScrollPosition');
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition, 10));
    }

    const handleScroll = () => {
      scrollRef.current = window.scrollY;
      sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate sidebar offset for centering (on desktop only)
  const sidebarWidth = isMobile ? 0 : (isOpen ? 280 : 60);

  return (
    <div className="min-h-screen relative">

      {/* ─── Parallax Landing (Fixed at top) ──────────────────────── */}
      <div 
        className="fixed top-0 right-0 bottom-0 z-0 h-screen pointer-events-none transition-[left] duration-300 ease-[cubic-bezier(0.25,0.8,0.25,1)]"
        style={{ left: sidebarWidth }}
      >
        <LandingPage />
      </div>

      {/* ─── Spacer to push content down ──────────────────────── */}
      <div className="h-screen w-full pointer-events-none" />

      {/* ─── Modules Grid (Overlays the fixed landing) ──────────────────────── */}
      <div id="modules-section" className="modules-overlay relative z-40 bg-surface-50">

        <div className="filter-bar">
          <button
            className={`filter-pill ${filter === 'all' ? 'filter-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`filter-pill ${filter === cat.id ? 'filter-active' : ''}`}
              onClick={() => setFilter(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="tools-grid">
          {tools.map((tool, i) => (
            <ToolCard key={tool.id} tool={tool} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ToolCard({ tool, index }: { tool: typeof TOOLS[number]; index: number }) {
  return (
    <Link
      to={tool.path}
      className="tool-card group"
      style={{ animationDelay: `${index * 0.05}s` }}
      draggable={false}
    >
      <div className="tool-card-icon">
        <tool.icon className="w-6 h-6" />
      </div>
      <div className="tool-card-body">
        <h3 className="tool-card-title">{tool.name}</h3>
        <p className="tool-card-desc">{tool.description}</p>
      </div>
    </Link>
  );
}
