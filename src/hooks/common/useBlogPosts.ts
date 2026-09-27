import { useState, useEffect, useCallback } from 'react';
import { api, ApiRequestConfig } from '../../lib/api';

export interface BlogPost {
  _id: string;
  slug: string;
  title: string;
  body: string;
  tags?: string[];
  status: 'draft' | 'published';
  publishedAt?: string;
  authorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UseBlogPostsReturn {
  posts: BlogPost[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch blog posts
 * Fetches only published posts from the public API endpoint
 */
export const useBlogPosts = (): UseBlogPostsReturn => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const config: ApiRequestConfig = {
        skipAuth: true, // Public endpoint, no auth required
        skipErrorToast: true, // Handle errors manually
      };

      const response = await api.get<BlogPost[]>('/posts', config);
      
      // Backend already filters and sorts published posts
      const posts = response.data || [];
      setPosts(posts);
    } catch (err: any) {
      // Handle backend error format: { success: false, error: { message, code, statusCode } }
      let errorMessage = 'Failed to load blog posts';
      
      if (err?.response?.data) {
        if (err.response.data.error?.message) {
          errorMessage = err.response.data.error.message;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching blog posts:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    refetch: fetchPosts,
  };
};

/**
 * Check if a string is a valid MongoDB ObjectId format
 */
const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Custom hook to fetch a single blog post by ID or slug
 * Uses backend slug endpoint for efficient lookup
 */
export const useBlogPost = (postIdOrSlug: string | undefined): {
  post: BlogPost | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} => {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    if (!postIdOrSlug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const config: ApiRequestConfig = {
        skipAuth: true, // Public endpoint, no auth required
        skipErrorToast: true, // Handle errors manually
      };

      // If it's a valid ObjectId, fetch by ID
      if (isValidObjectId(postIdOrSlug)) {
        try {
          const response = await api.get<BlogPost>(`/posts/${postIdOrSlug}`, config);
          setPost(response.data);
          return;
        } catch (err: any) {
          // Handle backend error format
          let errorMessage = 'Post not found';
          
          if (err?.response?.data) {
            if (err.response.data.error?.message) {
              errorMessage = err.response.data.error.message;
            } else if (err.response.data.message) {
              errorMessage = err.response.data.message;
            }
          } else if (err?.message) {
            errorMessage = err.message;
          }
          
          setError(errorMessage);
          setPost(null);
          return;
        }
      }

      // Otherwise, try slug lookup using the new endpoint
      try {
        const response = await api.get<BlogPost>(`/posts/slug/${postIdOrSlug}`, config);
        setPost(response.data);
      } catch (err: any) {
        // Handle backend error format
        let errorMessage = 'Post not found';
        
        if (err?.response?.data) {
          if (err.response.data.error?.message) {
            errorMessage = err.response.data.error.message;
          } else if (err.response.data.message) {
            errorMessage = err.response.data.message;
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        setPost(null);
      }
    } catch (err: any) {
      // Fallback error handling
      let errorMessage = 'Failed to load blog post';
      
      if (err?.response?.data) {
        if (err.response.data.error?.message) {
          errorMessage = err.response.data.error.message;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Error fetching blog post:', err);
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postIdOrSlug]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  return {
    post,
    loading,
    error,
    refetch: fetchPost,
  };
};
