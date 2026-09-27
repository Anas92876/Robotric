import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { BlogPost } from '../../hooks/common/useBlogPosts';

interface BlogPostCardProps {
  post: BlogPost;
  isRTL?: boolean;
}

/**
 * Extracts excerpt from post body (first 150-200 characters)
 */
const getExcerpt = (body: string, maxLength: number = 180): string => {
  // Remove HTML tags if any
  const text = body.replace(/<[^>]*>/g, '').trim();
  
  if (text.length <= maxLength) {
    return text;
  }
  
  // Find the last space before maxLength to avoid cutting words
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

/**
 * Formats date for display
 */
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch {
    return '';
  }
};

export const BlogPostCard: React.FC<BlogPostCardProps> = ({ post, isRTL = false }) => {
  const excerpt = getExcerpt(post.body);
  const formattedDate = formatDate(post.publishedAt || post.createdAt);
  const postUrl = `/blog/${post.slug || post._id}`;

  return (
    <Link
      to={postUrl}
      className={`
        group
        relative
        block
        bg-linear-to-br from-white via-white to-primary/5
        rounded-xl sm:rounded-2xl
        p-4 sm:p-5 md:p-6
        shadow-lg hover:shadow-2xl
        transition-all duration-500 ease-out
        hover:-translate-y-2
        hover:scale-[1.02]
        overflow-hidden
        cursor-pointer
        ${isRTL ? 'font-arabic' : ''}
      `}
    >
      {/* Animated Background Gradient on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {/* Content Container */}
      <div className="relative z-10">
        {/* Title */}
        <h3 className={`text-xl md:text-2xl font-black text-text-primary mb-3 group-hover:text-primary transition-colors line-clamp-2 ${isRTL ? 'font-arabic' : ''}`}>
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className={`text-text-secondary text-base mb-4 line-clamp-3 ${isRTL ? 'font-arabic' : ''}`}>
          {excerpt}
        </p>

        {/* Tags and Date */}
        <div className={`flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className={`flex flex-wrap items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Tag className="w-4 h-4 text-primary flex-shrink-0" />
              <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {post.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-md"
                  >
                    {tag}
                  </span>
                ))}
                {post.tags.length > 3 && (
                  <span className="px-2 py-1 text-xs font-medium text-text-secondary">
                    +{post.tags.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Date */}
          {formattedDate && (
            <div className={`flex items-center gap-2 text-sm text-text-secondary ${isRTL ? 'flex-row-reverse ml-auto' : 'ml-auto'}`}>
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
          )}
        </div>

        {/* Read More Link */}
        <div className={`mt-4 text-primary font-semibold text-sm group-hover:underline ${isRTL ? 'text-left' : 'text-right'}`}>
          {isRTL ? 'اقرأ المزيد ←' : 'Read More →'}
        </div>
      </div>

      {/* Corner Decoration */}
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Link>
  );
};