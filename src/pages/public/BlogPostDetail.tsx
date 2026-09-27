import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LandingHeader } from "../../components/layout/LandingHeader";
import { Footer } from "../../components/layout/Footer";
import { useBlogPost } from "../../hooks/common/useBlogPosts";
import { LoadingState } from "../../components/ui/LoadingState";
import { SEO } from "../../components/seo/SEO";
import { ROUTES } from "../../constants/routes.constants";
import { ArrowLeft, Calendar, Tag, Home } from "lucide-react";
import { format } from "date-fns";

export const BlogPostDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation('home');
  const isRTL = i18n.language === 'ar';
  
  // Try to find post by slug first, then by ID
  const { post, loading, error } = useBlogPost(slug);

  useEffect(() => {
    const dir = isRTL ? 'rtl' : 'ltr';
    const lang = isRTL ? 'ar' : 'en';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [isRTL]);

  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.robotrick.net';
  const postUrl = post ? `${siteUrl}/blog/${post.slug || post._id}` : '';
  
  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM dd, yyyy');
    } catch {
      return '';
    }
  };

  // Extract plain text from body for meta description
  const getMetaDescription = (body: string): string => {
    const text = body.replace(/<[^>]*>/g, '').trim();
    return text.length > 160 ? text.substring(0, 160) + '...' : text;
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isRTL ? 'font-arabic' : ''}`}>
      {post && (
        <SEO
          title={post.title}
          description={getMetaDescription(post.body)}
          keywords={post.tags?.join(', ') || 'robotics, technology, Syria, AI, STEM'}
          path={`/blog/${post.slug || post._id}`}
        />
      )}
      <LandingHeader />
      <main className="flex-1 pt-20">
        <section className="relative py-12 md:py-24 bg-surface overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
            {/* Loading State */}
            {loading && (
              <LoadingState
                type="skeleton"
                text={isRTL ? 'جاري التحميل...' : 'Loading post...'}
              />
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-white rounded-2xl p-12 md:p-16 text-center shadow-lg">
                <p className={`text-error text-lg md:text-xl mb-4 ${isRTL ? 'font-arabic' : ''}`}>
                  {isRTL ? 'حدث خطأ أثناء تحميل المقال' : 'Failed to load blog post'}
                </p>
                <p className={`text-text-secondary text-sm mb-6 ${isRTL ? 'font-arabic' : ''}`}>
                  {error}
                </p>
                <Link
                  to={ROUTES.BLOG}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {isRTL ? 'العودة إلى المدونة' : 'Back to Blog'}
                </Link>
              </div>
            )}

            {/* Post Content */}
            {post && !loading && !error && (
              <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-gray-100">
                  {/* Breadcrumb */}
                  <nav className={`flex items-center gap-2 text-sm text-text-secondary mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <Link
                      to={ROUTES.HOME}
                      className="hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Home className="w-4 h-4" />
                      <span>{isRTL ? 'الرئيسية' : 'Home'}</span>
                    </Link>
                    <span>/</span>
                    <Link
                      to={ROUTES.BLOG}
                      className="hover:text-primary transition-colors"
                    >
                      {t('blog.title')}
                    </Link>
                    <span>/</span>
                    <span className="text-text-primary">{post.title}</span>
                  </nav>

                  {/* Title */}
                  <h1 className={`text-3xl sm:text-4xl md:text-5xl font-black text-text-primary mb-4 ${isRTL ? 'font-arabic' : ''}`}>
                    {post.title}
                  </h1>

                  {/* Meta Information */}
                  <div className={`flex flex-wrap items-center gap-4 text-sm text-text-secondary ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {/* Date */}
                    {post.publishedAt && (
                      <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>{formatDate(post.publishedAt)}</span>
                      </div>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Tag className="w-4 h-4 flex-shrink-0" />
                        <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {post.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 md:p-8">
                  <div
                    className={`text-text-primary text-base md:text-lg leading-relaxed ${isRTL ? 'font-arabic' : ''}`}
                    dangerouslySetInnerHTML={{ __html: post.body }}
                    style={{
                      lineHeight: '1.8',
                    }}
                  />
                </div>

                {/* Footer Actions */}
                <div className="p-6 md:p-8 border-t border-gray-100">
                  <Link
                    to={ROUTES.BLOG}
                    className={`inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                    {isRTL ? 'العودة إلى المدونة' : 'Back to Blog'}
                  </Link>
                </div>
              </article>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BlogPostDetail;
