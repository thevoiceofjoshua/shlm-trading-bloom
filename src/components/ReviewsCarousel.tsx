import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Review } from "@/lib/reviews.functions";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={cn("h-3.5 w-3.5", i < rating ? "text-foreground" : "text-muted-foreground/30")}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.3 5.9.85-4.25 4.15 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.65l5.9-.85L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
      <svg viewBox="0 0 20 20" className="h-3 w-3 text-foreground" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 1.6l2.1 1.5 2.6-.2.8 2.5 2.1 1.5-1 2.4 1 2.4-2.1 1.5-.8 2.5-2.6-.2L10 18.4l-2.1-1.5-2.6.2-.8-2.5L2.4 13l1-2.4-1-2.4 2.1-1.5.8-2.5 2.6.2L10 1.6zm3.7 6.1a.9.9 0 00-1.3-1.2l-3.2 3.4-1.5-1.5a.9.9 0 10-1.3 1.3l2.2 2.1c.36.35.93.34 1.28-.02l3.85-4.1z"
          clipRule="evenodd"
        />
      </svg>
      Verified
    </span>
  );
}

function relativeDate(iso: string) {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

export function ReviewsCarousel({ reviews }: { reviews: Review[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(1);

  useEffect(() => {
    const update = () => setPerView(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const pages = Math.max(1, reviews.length - perView + 1);

  const scrollToIndex = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[i] as HTMLElement | undefined;
    if (!card) return;
    track.scrollTo({ left: card.offsetLeft - track.offsetLeft, behavior: "smooth" });
  }, []);

  // auto-rotate
  useEffect(() => {
    if (paused || reviews.length <= perView) return;
    const id = window.setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % pages;
        scrollToIndex(next);
        return next;
      });
    }, 4500);
    return () => window.clearInterval(id);
  }, [paused, pages, perView, reviews.length, scrollToIndex]);

  // keep dots in sync with manual swiping
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const children = Array.from(track.children) as HTMLElement[];
    let closest = 0;
    let min = Infinity;
    children.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - track.offsetLeft - track.scrollLeft);
      if (d < min) {
        min = d;
        closest = i;
      }
    });
    setIndex(Math.min(closest, pages - 1));
  };

  const go = (dir: -1 | 1) => {
    const next = (index + dir + pages) % pages;
    setIndex(next);
    scrollToIndex(next);
  };

  if (reviews.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:gap-6 sm:px-6 lg:mx-0 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch" }}
        aria-live="polite"
      >
        {reviews.map((r) => (
          <article
            key={r.id}
            className="flex min-h-[16rem] w-[85%] shrink-0 snap-center flex-col justify-between rounded-3xl border border-border bg-card p-6 sm:w-[calc((100%-1.5rem)/2)] sm:p-7 lg:w-[calc((100%-3rem)/3)]"
          >
            <div>
              <div className="flex items-center justify-between gap-3">
                <Stars rating={r.rating} />
                <VerifiedBadge />
              </div>
              <p className="mt-5 text-base leading-relaxed text-card-foreground sm:text-lg">{r.quote}</p>
            </div>
            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div className="min-w-0">
                <p className="truncate font-display font-medium text-foreground">{r.author}</p>
                <p className="truncate text-sm text-muted-foreground">{r.role}</p>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">{relativeDate(r.created_at)}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to review ${i + 1}`}
              onClick={() => {
                setIndex(i);
                scrollToIndex(i);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-7 bg-foreground" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground",
              )}
            />
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous review"
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next review"
            className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground transition-colors hover:bg-secondary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
