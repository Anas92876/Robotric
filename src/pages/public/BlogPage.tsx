import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { useBlogPosts } from "../../hooks/common/useBlogPosts";
import { BlogPostCard } from "../../components/blog/BlogPostCard";
import { LoadingState } from "../../components/ui/LoadingState";
import { SEO } from "../../components/seo/SEO";
import { ROUTES } from "../../constants/routes.constants";

export const BlogPage: React.FC = () => {
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  const { posts, loading, error } = useBlogPosts();

  useEffect(() => {
    const dir = isRTL ? 'rtl' : 'ltr';
    const lang = isRTL ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [isRTL]);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.robotrick.net';
  const blogUrl = `${siteUrl}${ROUTES.BLOG}`;

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'font-arabic' : ''}`}>
      <SEO
        title="Blog"
        titleAr="المدونة"
        description="Read the latest articles and insights from Robotrick on robotics, AI, technology, STEM, and innovation in Syria."
        descriptionAr="اقرأ أحدث المقالات والرؤى من روبوتريك حول الروبوتات والذكاء الاصطناعي والتكنولوجيا وSTEM والابتكار في سوريا."
        keywords="robotics, technology, Syria, AI, STEM, blog, articles, innovation"
        keywordsAr="روبوتات، تكنولوجيا، سوريا، ذكاء اصطناعي، STEM، مدونة، مقالات، ابتكار"
        path="/blog"
      />
      <LandingHeader />
      <main className="flex-1 pt-20">
        <section className="relative py-12 md:py-24 bg-surface overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
            <div className="text-center mb-12 md:mb-16">
              <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black text-text-primary mb-6 ${isRTL ? 'font-arabic' : ''}`}>
                {t('blog.title')}
              </h1>
              <p className={`text-lg md:text-xl text-text-secondary max-w-3xl mx-auto ${isRTL ? 'font-arabic' : ''}`}>
                {t('blog.subtitle')}
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <LoadingState
                type="skeleton"
                text={isRTL ? 'جاري التحميل...' : 'Loading posts...'}
              />
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-white rounded-2xl p-12 md:p-16 text-center shadow-lg">
                <p className={`text-error text-lg md:text-xl mb-4 ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? 'حدث خطأ أثناء تحميل المقالات' : 'Failed to load blog posts'}
                </p>
                <p className={`text-text-secondary text-sm ${isRTL ? 'font-arabic' : ''}`}>
                  {error}
                </p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && posts.length === 0 && (
              <div className="bg-white rounded-2xl p-12 md:p-16 text-center shadow-lg">
                <p className={`text-text-secondary text-lg md:text-xl ${isRTL ? 'font-arabic' : ''}`}>
                  {t('blog.comingSoon')}
                </p>
              </div>
            )}

            {/* Posts Grid */}
            {!loading && !error && posts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {posts.map((post) => (
                  <BlogPostCard key={post._id} post={post} isRTL={isRTL} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPage;
