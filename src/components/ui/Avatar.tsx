import { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  rounded?: boolean;
  status?: 'online' | 'offline' | 'away' | 'busy';
  className?: string;
}

function Avatar({
  src,
  alt,
  name,
  size = 'md',
  rounded = true,
  status,
  className,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
    '2xl': 'w-4 h-4',
  };

  const statusColors = {
    online: 'bg-success',
    offline: 'bg-gray-500',
    away: 'bg-warning',
    busy: 'bg-error',
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const shouldShowImage = src && !imageError;

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden',
          'bg-gray-700 text-gray-300',
          rounded ? 'rounded-full' : 'rounded-lg',
          sizes[size]
        )}
      >
        {shouldShowImage ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : name ? (
          <span className="font-semibold">{getInitials(name)}</span>
        ) : (
          <User className="w-1/2 h-1/2" />
        )}
      </div>

      {/* Status indicator */}
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            statusSizes[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

// Avatar Group component
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    name?: string;
    alt?: string;
  }>;
  max?: number;
  size?: AvatarProps['size'];
  className?: string;
}

function AvatarGroup({
  avatars,
  max = 5,
  size = 'md',
  className,
}: AvatarGroupProps) {
  const displayAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const marginSizes = {
    xs: '-ml-2',
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-3',
    xl: '-ml-4',
    '2xl': '-ml-5',
  };

  return (
    <div className={cn('flex items-center', className)}>
      {displayAvatars.map((avatar, index) => (
        <div
          key={index}
          className={cn(
            'ring-2 ring-background',
            index > 0 && marginSizes[size]
          )}
        >
          <Avatar {...avatar} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center',
            'bg-gray-700 text-gray-300 font-semibold rounded-full',
            'ring-2 ring-background',
            marginSizes[size],
            size === 'xs' && 'w-6 h-6 text-xs',
            size === 'sm' && 'w-8 h-8 text-sm',
            size === 'md' && 'w-10 h-10 text-base',
            size === 'lg' && 'w-12 h-12 text-lg',
            size === 'xl' && 'w-16 h-16 text-xl',
            size === '2xl' && 'w-20 h-20 text-2xl'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export { Avatar, AvatarGroup };
export default Avatar;
