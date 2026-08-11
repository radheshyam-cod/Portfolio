import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, Github, RefreshCw, Star, GitFork, Code2, Calendar, Pin, ChevronDown, ChevronUp } from 'lucide-react';
import SectionHeading from './SectionHeading';
import TiltCard from './TiltCard';
import ProjectModal from './ProjectModal';
import { useProjects } from '../hooks/useProjects';
import { clearCache } from '../services/githubService';
import { clearMetadataCache } from '../services/repositoryMetadataService';
import { AUTO_REFRESH_INTERVAL_MS } from '../config/github';

// ---------------------------------------------------------------------------
// Skeleton card
// ---------------------------------------------------------------------------

const SkeletonCard = () => (
  <div
    style={{
      padding: '2.5rem',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'rgba(12, 12, 12, 0.9)',
      borderRadius: '16px',
      border: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <div style={{ width: '120px', height: '24px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', animation: 'shimmer 2s ease-in-out infinite' }} />
      <div style={{ display: 'flex', gap: '10px' }}>
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
    <div style={{ width: '75%', height: '22px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '1rem', animation: 'shimmer 2s ease-in-out infinite', animationDelay: '0.1s' }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
      <div style={{ width: '100%', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', animation: 'shimmer 2s ease-in-out infinite', animationDelay: '0.2s' }} />
      <div style={{ width: '90%', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', animation: 'shimmer 2s ease-in-out infinite', animationDelay: '0.3s' }} />
      <div style={{ width: '60%', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', animation: 'shimmer 2s ease-in-out infinite', animationDelay: '0.4s' }} />
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} style={{ width: `${60 + i * 10}px`, height: '26px', borderRadius: '15px', background: 'rgba(255,255,255,0.04)', animation: 'shimmer 2s ease-in-out infinite', animationDelay: `${0.3 + i * 0.1}s` }} />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

const ErrorState = ({ message, onRetry }) => (
  <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', gap: '1.25rem' }}>
    <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '420px' }}>{message}</p>
    <button type="button" onClick={onRetry} className="btn-secondary" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
      <RefreshCw size={16} />
      Retry
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Project card stats row
// ---------------------------------------------------------------------------

const StatsRow = ({ language, color, stars, forks, updatedAt }) => {
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    : null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '0.75rem' }}>
      {language && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <Code2 size={12} color={color} />
          {language}
        </span>
      )}
      {stars > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <Star size={12} />
          {stars}
        </span>
      )}
      {forks > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <GitFork size={12} />
          {forks}
        </span>
      )}
      {formattedDate && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <Calendar size={12} />
          {formattedDate}
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Projects section
// ---------------------------------------------------------------------------

// How many project cards to render before the "See all projects" button.
const INITIAL_VISIBLE_COUNT = 6;

const Projects = () => {
  const { projects, loading, error, retry, refreshSilently } = useProjects();
  const shouldReduceMotion = useReducedMotion();
  const [selectedProject, setSelectedProject] = useState(null);
  // Dedicated flag so the refresh icon only spins on manual refresh,
  // not during the initial page-load skeleton.
  const [refreshing, setRefreshing] = useState(false);
  // Progressive disclosure: show a curated first page, expand on demand.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  // Timestamp of the last successful fetch (visible or silent) — shown as a
  // subtle caption so visitors can see the section is staying fresh.
  const [lastUpdated, setLastUpdated] = useState(null);

  // Manual refresh (FR-010/SC-006): invalidate the GitHub repo + metadata
  // caches, then re-fetch immediately. The dashboard cache is intentionally
  // left untouched — it refreshes on its own 30-min TTL.
  const handleRefresh = useCallback(() => {
    clearCache();
    clearMetadataCache();
    setRefreshing(true);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
    retry();
  }, [retry]);

  // Auto-refresh (silent): every few minutes, invalidate the caches and
  // re-fetch in the background so newly pinned / newly created repos appear
  // without a manual refresh. Skips while the tab is hidden (saves GitHub
  // API quota) and is throttled to one run per interval.
  useEffect(() => {
    // Start the throttle at mount time so the FIRST tab-return right after
    // page load doesn't trigger an immediate extra fetch — the initial load
    // just happened, so it would be wasted work.
    let lastRun = Date.now();

    const runAutoRefresh = () => {
      // Don't fetch while the tab is in the background.
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastRun < AUTO_REFRESH_INTERVAL_MS) return;
      lastRun = now;
      clearCache();
      clearMetadataCache();
      refreshSilently();
    };

    const intervalId = setInterval(runAutoRefresh, AUTO_REFRESH_INTERVAL_MS);

    // Also refresh immediately when the user returns to the tab if the
    // interval has elapsed (background tabs are throttled by the browser).
    const onVisibilityChange = () => {
      if (!document.hidden) runAutoRefresh();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshSilently]);

  // Track when the last successful fetch landed (initial load or refresh).
  // Gated on `error` so a failed fetch doesn't stamp a misleading fresh time.
  useEffect(() => {
    if (!loading && !error) setLastUpdated(new Date());
  }, [loading, error, projects]);


  const isExpanded = visibleCount >= projects.length;
  const visibleProjects = isExpanded ? projects : projects.slice(0, visibleCount);

  // Clear the spinner once the manual refresh finishes.
  useEffect(() => {
    if (refreshing && !loading) {
      setRefreshing(false);
    }
  }, [refreshing, loading]);

  return (
    <section id="projects" className="section">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ minWidth: 0 }}>
          <SectionHeading number="03." title="Featured Projects" />
          {lastUpdated && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
                color: 'var(--color-text-muted)',
                opacity: 0.8,
                marginTop: '0.35rem',
                whiteSpace: 'nowrap',
              }}
              title="Automatically re-checks GitHub for new pinned projects every few minutes"
            >
              <motion.span
                animate={refreshing ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
                transition={refreshing ? { repeat: Infinity, duration: 1.4 } : { duration: 0.2 }}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}
              />
              Auto-updates every {Math.round(AUTO_REFRESH_INTERVAL_MS / 60000)} min · {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <motion.button
          type="button"
          onClick={handleRefresh}
          aria-label="Refresh projects from GitHub"
          title="Refresh from GitHub"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            marginTop: '0.35rem',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'border-color 0.2s, color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-neon-blue)';
            e.currentTarget.style.color = 'var(--color-neon-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          <motion.span
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.2 }}
            style={{ display: 'flex' }}
          >
            <RefreshCw size={18} />
          </motion.span>
        </motion.button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {!loading && error && <ErrorState message="Unable to load projects." onRetry={retry} />}

        {!loading && !error && projects.length === 0 && (
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.05rem', lineHeight: '1.6', maxWidth: '420px' }}>
              No projects yet. Check back soon!
            </p>
          </div>
        )}

        {!loading && !error && visibleProjects.map((project, idx) => {
          const isEven = idx % 2 === 0;
          const xOffset = isEven ? -80 : 80;

          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : xOffset }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: shouldReduceMotion ? 0 : 0.1 }}
            >
              <TiltCard
                color={project.color}
                style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', cursor: 'pointer' }}
                onClick={() => setSelectedProject(project)}
              >
                {/* Preview image (when available) */}
                {project.previewImage && (
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      marginBottom: '1rem',
                      backgroundColor: 'rgba(0,0,0,0.2)',
                      transform: 'translateZ(5px)',
                    }}
                  >
                    <img
                      src={project.previewImage}
                      alt={`${project.title} preview`}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Badge + icon row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', transformStyle: 'preserve-3d' }}>
                  <div style={{ transform: 'translateZ(20px)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {project.featured && (
                      <span
                        className="badge"
                        title="Pinned — appears first in the Projects section"
                        style={{
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          fontWeight: 'bold',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--color-text-muted)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Pin size={10} />
                        Pinned
                      </span>
                    )}
                    <span
                      className="badge"
                      style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontWeight: 'bold',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        background: `${project.color}20`,
                        color: project.color,
                        border: `1px solid ${project.color}40`,
                        display: 'inline-block',
                      }}
                    >
                      {project.tag}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', transform: 'translateZ(10px)' }}>
                    {project.github && (
                      <a href={project.github} target="_blank" rel="noreferrer" aria-label={`View ${project.title} source code on GitHub`} style={{ color: 'var(--color-text-muted)', transition: 'color 0.2s' }} onClick={(e) => e.stopPropagation()}>
                        <Github size={18} />
                      </a>
                    )}
                    {project.live && (
                      <a href={project.live} target="_blank" rel="noreferrer" aria-label={`View live demo for ${project.title}`} style={{ color: 'var(--color-text-muted)', transition: 'color 0.2s' }} onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={18} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <StatsRow
                  language={project.language}
                  color={project.color}
                  stars={project.stars}
                  forks={project.forks}
                  updatedAt={project.updatedAt}
                />

                {/* Title */}
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.75rem', transform: 'translateZ(15px)' }}>
                  {project.title}
                </h3>

                {/* Summary (preferred) or fallback description — shown only when
                    the repo actually has one, so no blank filler appears */}
                {project.summary || project.description ? (
                  <p
                    style={{
                      color: 'var(--color-text-muted)',
                      fontSize: '0.9rem',
                      marginBottom: '1rem',
                      flex: 1,
                      transform: 'translateZ(5px)',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {project.summary || project.description}
                  </p>
                ) : (
                  // Spacer keeps the tech tags pinned to the bottom of the card
                  // even when there is no description to show.
                  <div style={{ flex: 1, transform: 'translateZ(5px)' }} />
                )}

                {/* Tech tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', transform: 'translateZ(10px)' }}>
                  {project.technologies.slice(0, 5).map((tech) => (
                    <span
                      key={tech}
                      style={{
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'rgba(255,255,255,0.6)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies.length > 5 && (
                    <span style={{ fontSize: '0.7rem', padding: '3px 8px', color: 'var(--color-text-muted)' }}>
                      +{project.technologies.length - 5}
                    </span>
                  )}
                </div>
              </TiltCard>
            </motion.div>
          );
        })}
      </div>

      {/* Show all / show less toggle (only when there is more to reveal) */}
      {!loading && !error && projects.length > INITIAL_VISIBLE_COUNT && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
          <motion.button
            type="button"
            onClick={() =>
              setVisibleCount(isExpanded ? INITIAL_VISIBLE_COUNT : projects.length)
            }
            aria-expanded={isExpanded}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              fontSize: '0.95rem',
              borderRadius: '12px',
            }}
          >
            {isExpanded ? (
              <>
                Show less
                <ChevronUp size={16} />
              </>
            ) : (
              <>
                See all projects ({projects.length})
                <ChevronDown size={16} />
              </>
            )}
          </motion.button>
        </div>
      )}

      {/* --- Project detail modal --- */}
      {selectedProject && (
        <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
      )}
    </section>
  );
};

export default Projects;
