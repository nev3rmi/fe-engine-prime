'use client';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent } from '@/components/ui/card';
import { usePresence, useUserPresence } from '@/lib/hooks/use-presence';
import { OnlineUser, PresenceStatus } from '@/types/realtime';
import { cn } from '@/lib/utils';
import { Circle, Users } from 'lucide-react';

interface PresenceIndicatorProps {
  userId: string;
  showName?: boolean;
  showStatus?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface PresenceBadgeProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface OnlineUsersListProps {
  maxDisplay?: number;
  showCount?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

interface UserAvatarWithPresenceProps {
  user: OnlineUser;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  className?: string;
}

/**
 * Status badge indicating online/offline/away/busy status
 */
export const PresenceBadge: React.FC<PresenceBadgeProps> = ({
  status,
  size = 'md',
  className,
}) => {
  const getStatusColor = (status: PresenceStatus): string => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'invisible':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusText = (status: PresenceStatus): string => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'busy':
        return 'Busy';
      case 'invisible':
        return 'Invisible';
      default:
        return 'Offline';
    }
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Circle
            className={cn(
              'rounded-full border-2 border-white dark:border-gray-800',
              getStatusColor(status),
              sizeClasses[size],
              className
            )}
            fill="currentColor"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{getStatusText(status)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * User avatar with presence indicator
 */
export const UserAvatarWithPresence: React.FC<UserAvatarWithPresenceProps> = ({
  user,
  size = 'md',
  showStatus = true,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const statusSizes = {
    sm: 'sm' as const,
    md: 'sm' as const,
    lg: 'md' as const,
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className={sizeClasses[size]}>
              <AvatarImage src={user.image || undefined} alt={user.name || ''} />
              <AvatarFallback>
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.status} • {user.role.toLowerCase()}
              </p>
              {user.lastActivity && (
                <p className="text-xs text-muted-foreground">
                  Active {new Date(user.lastActivity).toLocaleTimeString()}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {showStatus && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <PresenceBadge status={user.status} size={statusSizes[size]} />
        </div>
      )}
    </div>
  );
};

/**
 * Individual user presence indicator with name and status
 */
export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  userId,
  showName = true,
  showStatus = true,
  size = 'md',
  className,
}) => {
  const { user, isOnline, status } = useUserPresence(userId);

  if (!user && !isOnline) {
    return null;
  }

  const displayUser: OnlineUser = user || {
    id: userId,
    name: 'Unknown User',
    image: null,
    role: 'USER',
    status: 'offline',
    lastActivity: new Date(),
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <UserAvatarWithPresence
        user={displayUser}
        size={size}
        showStatus={showStatus}
      />

      {showName && (
        <div className="flex flex-col">
          <span className="text-sm font-medium">{displayUser.name}</span>
          {showStatus && (
            <span className="text-xs text-muted-foreground capitalize">
              {status || 'offline'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * List of online users with avatars
 */
export const OnlineUsersList: React.FC<OnlineUsersListProps> = ({
  maxDisplay = 10,
  showCount = true,
  orientation = 'horizontal',
  className,
}) => {
  const { onlineUsers, userCount } = usePresence();

  if (userCount === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No users online
      </div>
    );
  }

  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const remainingCount = Math.max(0, userCount - maxDisplay);

  const containerClasses = orientation === 'horizontal'
    ? 'flex items-center space-x-2'
    : 'flex flex-col space-y-2';

  return (
    <div className={cn('', className)}>
      {showCount && (
        <div className="flex items-center space-x-2 mb-2">
          <Users className="w-4 h-4" />
          <span className="text-sm font-medium">
            {userCount} user{userCount !== 1 ? 's' : ''} online
          </span>
        </div>
      )}

      <div className={containerClasses}>
        {displayUsers.map(user => (
          <UserAvatarWithPresence
            key={user.id}
            user={user}
            size="sm"
            showStatus={true}
          />
        ))}

        {remainingCount > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{remainingCount} more user{remainingCount !== 1 ? 's' : ''}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
};

/**
 * Presence status card with online users list
 */
export const PresenceCard: React.FC<{
  title?: string;
  className?: string;
}> = ({
  title = 'Online Users',
  className,
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">{title}</h3>
        <OnlineUsersList
          maxDisplay={8}
          showCount={true}
          orientation="vertical"
        />
      </CardContent>
    </Card>
  );
};

/**
 * Compact presence counter
 */
export const PresenceCounter: React.FC<{
  className?: string;
}> = ({ className }) => {
  const { userCount } = usePresence();

  return (
    <Badge variant="secondary" className={cn('space-x-1', className)}>
      <Circle className="w-2 h-2 bg-green-500 rounded-full" />
      <span>{userCount} online</span>
    </Badge>
  );
};