// src/components/GuideHelp.jsx
import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import {
  HelpCircle, ChevronDown, BookOpen, Search as SearchIcon,
  Rocket, UserCircle2, Users, FolderKanban, ListChecks, Archive, Sparkles,
  Maximize2, Minimize2, Clock, Image as ImageIcon,
} from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import Button from './ui/Button';
import SearchBar from './ui/SearchBar';
import EmptyState from './ui/EmptyState';
import Heading from './ui/Heading';
import Text from './ui/Text';

// Read-only Guide & Help view. Admins manage entries from the Admin
// Dashboard (see components/Admin/AdminGuideHelp.jsx) — users can only
// browse and expand them here, never edit.

// Purely presentational lookup — icon + accent per category. Falls back to
// a generic icon for any category name not listed here, so this never
// breaks if an admin adds a new category value.
const CATEGORY_META = {
  'Getting Started': { icon: Rocket,        accent: 'from-purple-500 to-indigo-500',  badge: 'purple' },
  'Account':         { icon: UserCircle2,   accent: 'from-blue-500 to-cyan-500',      badge: 'blue'   },
  'Groups':          { icon: Users,         accent: 'from-pink-500 to-rose-500',      badge: 'red'    },
  'Projects':        { icon: FolderKanban,  accent: 'from-amber-500 to-orange-500',   badge: 'orange' },
  'Tasks':           { icon: ListChecks,    accent: 'from-green-500 to-emerald-500',  badge: 'green'  },
  'Locked Items':    { icon: Archive,       accent: 'from-slate-500 to-gray-500',     badge: 'gray'   },
  'Other':           { icon: Sparkles,      accent: 'from-yellow-500 to-amber-400',   badge: 'yellow' },
};
const DEFAULT_META = { icon: HelpCircle, accent: 'from-purple-500 to-indigo-500', badge: 'purple' };
const metaFor = (category) => CATEGORY_META[category] || DEFAULT_META;

// Wrap the parts of `text` that match `query` in a <mark> so matches are
// visually highlighted while searching. Case-insensitive, safe for regex
// special characters in the query.
const highlight = (text, query) => {
  if (!query.trim()) return text;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark key={i} className="bg-purple-500/40 text-white rounded px-0.5">{part}</mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
};

const readTime = (steps) => {
  const words = steps.reduce((sum, s) => sum + (s.text || '').trim().split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.round(words / 200));
};

// Normalizes a guide into a `steps` array for display, regardless of
// whether it was authored with the step-builder (has `steps`) or is an
// older entry that only has the legacy single `content`/`image` fields.
const stepsFor = (g) => {
  if (g.steps?.length) return g.steps;
  if (g.content) return [{ text: g.content, image: g.image }];
  return [];
};

const GuideHelp = () => {
  const [guides, setGuides]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [openIds, setOpenIds]   = useState(() => new Set());
  const [search, setSearch]     = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    api.get('/guides')
      .then(res => setGuides(res.data.guides ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleOpen = (id) => {
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const categories = useMemo(
    () => Array.from(new Set(guides.map(g => g.category))),
    [guides]
  );

  const filtered = useMemo(() => guides.filter(g => {
    const stepsText = stepsFor(g).map(s => s.text).join(' ');
    const matchesSearch = !search.trim()
      || g.title.toLowerCase().includes(search.toLowerCase())
      || stepsText.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || g.category === activeCategory;
    return matchesSearch && matchesCategory;
  }), [guides, search, activeCategory]);

  const grouped = useMemo(() => filtered.reduce((acc, g) => {
    (acc[g.category] ||= []).push(g);
    return acc;
  }, {}), [filtered]);

  const allExpanded = filtered.length > 0 && filtered.every(g => openIds.has(g._id));
  const expandAll = () => setOpenIds(new Set(filtered.map(g => g._id)));
  const collapseAll = () => setOpenIds(new Set());

  if (loading) return <div className="text-center text-purple-400 animate-pulse py-12">Loading guide...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading level={2} className="flex items-center gap-2">
            <HelpCircle size={22} className="text-purple-400" /> Guide &amp; Help
          </Heading>
          <Text className="mt-0.5">
            {guides.length === 0
              ? 'Step-by-step help for using this platform.'
              : `${guides.length} guide${guides.length === 1 ? '' : 's'} across ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} — find what you need, fast.`}
          </Text>
        </div>

        {filtered.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={allExpanded ? Minimize2 : Maximize2}
            onClick={allExpanded ? collapseAll : expandAll}
          >
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </Button>
        )}
      </div>

      {guides.length > 0 && (
        <>
          {/* Search */}
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search the guide..."
          />

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                activeCategory === 'All'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-purple-500/40'
              }`}
            >
              All Topics
            </button>
            {categories.map(cat => {
              const { icon: Icon } = metaFor(cat);
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(active ? 'All' : cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    active
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-purple-500/40'
                  }`}
                >
                  <Icon size={13} /> {cat}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Content */}
      {guides.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No guide entries yet"
          description="Your admin hasn't added any help content yet."
        />
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No matches found"
          description={`Nothing matches "${search}". Try a different search term or category.`}
        />
      ) : (
        Object.entries(grouped).map(([category, items]) => {
          const { icon: CategoryIcon, accent, badge } = metaFor(category);
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center shrink-0`}>
                  <CategoryIcon size={13} className="text-white" />
                </span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-purple-300">{category}</h3>
                <Badge variant={badge} className="!py-0">{items.length}</Badge>
              </div>

              <div className="space-y-2">
                {items.map(g => {
                  const isOpen = openIds.has(g._id);
                  const steps = stepsFor(g);
                  const hasImage = steps.some(s => s.image);
                  return (
                    <Card
                      key={g._id}
                      variant="default"
                      accent={isOpen}
                      accentColor={accent}
                      className={isOpen ? 'border-purple-500/50' : ''}
                    >
                      <button
                        onClick={() => toggleOpen(g._id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer hover:bg-white/5 transition"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-white text-sm truncate">
                            {highlight(g.title, search)}
                          </span>
                          {hasImage && (
                            <ImageIcon size={12} className="text-purple-400/70 shrink-0" aria-label="Includes a picture" />
                          )}
                        </span>
                        <span className="flex items-center gap-3 shrink-0">
                          <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                            <Clock size={11} /> {readTime(steps)} min
                          </span>
                          <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-400' : ''}`}
                          />
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-4">
                          {steps.map((step, i) => (
                            <div key={i} className="space-y-2">
                              {steps.length > 1 && (
                                <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-bold">
                                  {i + 1}
                                </span>
                              )}
                              {step.image && (
                                <img
                                  src={step.image}
                                  alt={`${g.title} — step ${i + 1}`}
                                  className="w-full max-h-72 object-contain rounded-xl border border-white/10 bg-black/20"
                                />
                              )}
                              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                {highlight(step.text, search)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default GuideHelp;