import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ABOUT_GALLERY_SLIDES = [
  {
    src: "/images/about/image_2026-02-24_03-39-25.webp",
    caption: {
      ar: "وجهتكم الأولى.. هنا نستقبلك كشريك ونرسم معك المستقبل",
      en: "Your first destination.. here we welcome you as a partner and draw the future with you",
    },
  },
  {
    src: "/images/about/image_2026-02-24_03-11-56.webp",
    caption: {
      ar: "مخبرنا.. هنا نجتمع مع التكنولوجيا؛ معدات متطورة ومساحات حرة تمنح إبداعك القوة.",
      en: "Our lab.. here we meet with technology; advanced equipment and free spaces that give your creativity power.",
    },
  },
  {
    src: "/images/about/image_2026-02-24_03-38-57.webp",
    caption: {
      ar: "مساحات تفاعلية مجهزة بأحدث الوسائل، صُممت لتنقل مهاراتك من النظرية إلى الاحتراف",
      en: "Interactive spaces equipped with the latest tools, designed to transfer your skills from theory to professionalism",
    },
  },
  {
    src: "/images/about/image_2026-02-24_03-44-03.webp",
    caption: {
      ar: "قاعات مكيفة ومجهزة بكل سبل الراحة لتجربة تعليمية استثنائية",
      en: "Air-conditioned halls equipped with all comfort for an exceptional educational experience",
    },
  },
];

interface AboutGallerySliderProps {
  isRTL?: boolean;
}

/**
 * About gallery slider matching the official Embla Carousel Loop example:
 * https://www.embla-carousel.com/examples/predefined/#loop
 * - 70% slide size (peek of adjacent slides)
 * - 1rem spacing between slides
 * - loop: true for infinite scroll
 */
export const AboutGallerySlider = ({ isRTL = false }: AboutGallerySliderProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      direction: isRTL ? "rtl" : "ltr",
      align: "center",
    },
    [Autoplay({ delay: 4500, stopOnInteraction: true })]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => {
    if (!emblaApi) return;
    const isAtFirst = selectedIndex === 0;
    const useInstant = isAtFirst;
    const api = emblaApi as { goToPrev?: (instant?: boolean) => void; scrollPrev?: () => void };
    if (typeof api.goToPrev === "function") {
      api.goToPrev(useInstant);
    } else {
      api.scrollPrev?.();
    }
  }, [emblaApi, selectedIndex]);

  const scrollNext = useCallback(() => {
    if (!emblaApi) return;
    const isAtLast = selectedIndex === ABOUT_GALLERY_SLIDES.length - 1;
    const useInstant = isAtLast;
    const api = emblaApi as { goToNext?: (instant?: boolean) => void; scrollNext?: () => void };
    if (typeof api.goToNext === "function") {
      api.goToNext(useInstant);
    } else {
      api.scrollNext?.();
    }
  }, [emblaApi, selectedIndex]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  const handleMouseEnter = useCallback(() => {
    emblaApi?.plugins().autoplay?.stop();
  }, [emblaApi]);

  const handleMouseLeave = useCallback(() => {
    emblaApi?.plugins().autoplay?.play();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.plugins().autoplay?.play();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section
      className="embla relative w-full max-w-3xl mx-auto [--slide-size:85%] [--slide-height:14rem] sm:[--slide-size:70%] sm:[--slide-height:19rem]"
      role="region"
      aria-roledescription="carousel"
      aria-label={isRTL ? "معرض صور روبوتريك" : "Robotrick gallery"}
      style={{ "--slide-spacing": "1rem" } as React.CSSProperties}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="embla__viewport overflow-hidden rounded-2xl shadow-xl" ref={emblaRef}>
        <div
          className="embla__container flex touch-pan-y"
          style={{
            backfaceVisibility: "hidden",
            marginLeft: "calc(var(--slide-spacing) * -1)",
          }}
        >
          {ABOUT_GALLERY_SLIDES.map((slide, index) => {
            const caption = isRTL ? slide.caption.ar : slide.caption.en;
            const isActive = index === selectedIndex;
            return (
              <div
                key={slide.src}
                className={`embla__slide relative min-w-0 shrink-0 flex flex-col gap-3 transition-transform duration-300 ${
                  isActive ? "scale-[1.02] opacity-100 z-10" : "scale-[0.96] opacity-80"
                }`}
                style={{
                  flex: "0 0 var(--slide-size)",
                  paddingLeft: "var(--slide-spacing)",
                }}
                role="group"
                aria-roledescription="slide"
              >
                {caption && isActive && (
                  <div className="min-h-10 flex items-end justify-center text-center">
                    <p
                      className={`text-xs sm:text-sm md:text-base font-bold text-primary/90 leading-snug px-1 line-clamp-2 ${
                        isRTL ? "font-arabic" : ""
                      }`}
                    >
                      {caption}
                    </p>
                  </div>
                )}
                <div
                  className={`relative overflow-hidden rounded-xl transition-shadow duration-300 ${
                    isActive ? "shadow-xl" : "shadow-md"
                  }`}
                  style={{ height: "var(--slide-height)" }}
                >
                  <img
                    src={slide.src}
                    alt={
                      isRTL
                        ? `صورة روبوتريك ${index + 1}`
                        : `Robotrick gallery image ${index + 1}`
                    }
                    className="block w-full h-full object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-primary/5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Arrow buttons - 44px touch targets, fixed left/right positions for LTR & RTL */}
      <div className="embla__buttons pointer-events-none">
        {/* Left arrow */}
        <div className="absolute top-1/2 -translate-y-1/2 left-2 sm:left-4">
          <button
            type="button"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            className="embla__button pointer-events-auto min-h-[44px] min-w-[44px] p-3 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 51, 0, 0.9)", color: "#cccc99" }}
            aria-label={isRTL ? "السابق" : "Previous slide"}
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>

        {/* Right arrow */}
        <div className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-4">
          <button
            type="button"
            onClick={scrollNext}
            disabled={!canScrollNext}
            className="embla__button pointer-events-auto min-h-[44px] min-w-[44px] p-3 rounded-full shadow-lg backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0, 51, 0, 0.9)", color: "#cccc99" }}
            aria-label={isRTL ? "التالي" : "Next slide"}
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
        </div>
      </div>

      {/* Dot indicators - pill style with 44px touch targets */}
      <div className="embla__dots flex justify-center items-center gap-2 mt-4">
        {ABOUT_GALLERY_SLIDES.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => scrollTo(index)}
            className={`embla__dot flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-full transition-all ${
              index === selectedIndex
                ? "embla__dot--selected opacity-100"
                : "opacity-60 hover:opacity-90"
            }`}
            style={{
              backgroundColor: "transparent",
            }}
            aria-label={
              isRTL
                ? `انتقل إلى الشريحة ${index + 1}`
                : `Go to slide ${index + 1}`
            }
            aria-current={index === selectedIndex ? "true" : undefined}
          >
            <span
              className={`block rounded-full transition-all ${
                index === selectedIndex ? "min-w-10 w-10 h-2" : "w-2 h-2"
              }`}
              style={{
                backgroundColor: index === selectedIndex ? "#003300" : "#cccc99",
              }}
            />
          </button>
        ))}
      </div>

      {/* Autoplay progress bar - resets on slide change */}
      <div
        className="mt-3 h-0.5 w-full max-w-48 mx-auto rounded-full overflow-hidden bg-primary/20"
        role="progressbar"
        aria-valuenow={0}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={isRTL ? "تقدم التشغيل التلقائي" : "Autoplay progress"}
      >
        <div
          key={selectedIndex}
          className={`h-full w-full animate-progress-fill rounded-full ${isRTL ? "origin-right" : "origin-left"}`}
          style={{ backgroundColor: "#003300" }}
        />
      </div>
    </section>
  );
};
