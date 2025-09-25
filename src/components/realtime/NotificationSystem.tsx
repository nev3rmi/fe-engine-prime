'use client';

import React, { useEffect, useState } from 'react';

import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  X,
  Settings,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Trash2,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { useNotifications, useNotificationPermissions, useNotificationSounds, useFilteredNotifications } from '@/lib/hooks/use-notifications';
import { cn } from '@/lib/utils';
import type { RealtimeNotification, NotificationType, NotificationPriority } from '@/types/realtime';


interface NotificationItemProps {
  notification: RealtimeNotification;
  onMarkRead: (id: string) => void;
  onClear: (id: string) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

interface NotificationBellProps {
  className?: string;
  showBadge?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
}

interface NotificationPanelProps {
  maxHeight?: string;
  showFilters?: boolean;
  showSettings?: boolean;
  className?: string;
}

interface NotificationToastProps {
  notification: RealtimeNotification;
  onAction?: (action: string, data?: any) => void;
}

/**
 * Get notification type icon and styling
 */
const getNotificationTypeInfo = (type: NotificationType) => {
  switch (type) {
    case 'message':
      return {
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950',
      };
    case 'mention':
      return {
        icon: <MessageSquare className="w-4 h-4" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50 dark:bg-purple-950',
      };
    case 'system':
      return {
        icon: <Settings className="w-4 h-4" />,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50 dark:bg-gray-950',
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      };
    case 'error':
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-950',
      };
    case 'success':
      return {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-950',
      };
    case 'update':
      return {
        icon: <Zap className="w-4 h-4" />,
        color: 'text-indigo-500',
        bgColor: 'bg-indigo-50 dark:bg-indigo-950',
      };
    case 'maintenance':
      return {
        icon: <Settings className="w-4 h-4" />,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-950',
      };
    default:
      return {
        icon: <Info className="w-4 h-4" />,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50 dark:bg-gray-950',
      };
  }
};

/**
 * Get priority styling
 */
const getPriorityInfo = (priority: NotificationPriority) => {
  switch (priority) {
    case 'urgent':
      return {
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900',
        label: 'Urgent',
      };
    case 'high':
      return {
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900',
        label: 'High',
      };
    case 'normal':
      return {
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900',
        label: 'Normal',
      };
    case 'low':
      return {
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-900',
        label: 'Low',
      };
  }
};

/**
 * Individual notification item component
 */
const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onClear,
  showActions = true,
  compact = false,
  className,
}) => {
  const typeInfo = getNotificationTypeInfo(notification.type);
  const priorityInfo = getPriorityInfo(notification.priority);

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(notification.id);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear(notification.id);
  };

  const handleNotificationClick = () => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }

    // Handle notification action based on data
    if (notification.data?.url) {
      window.open(notification.data.url, '_blank');
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer',
          !notification.isRead && 'bg-muted/30',
          className
        )}
        onClick={handleNotificationClick}
      >
        <div className={cn('flex-shrink-0', typeInfo.color)}>
          {typeInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{notification.title}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors',
        !notification.isRead && 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50',
        notification.priority === 'urgent' && 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50',
        className
      )}
      onClick={handleNotificationClick}
    >
      <div className={cn('flex-shrink-0 mt-0.5', typeInfo.color)}>
        {typeInfo.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <h4 className="text-sm font-medium">{notification.title}</h4>
          <Badge variant="outline" className={cn('text-xs', priorityInfo.color)}>
            {priorityInfo.label}
          </Badge>
          {!notification.isRead && (
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>

          {notification.expiresAt && (
            <span className="text-orange-500">
              Expires {formatDistanceToNow(new Date(notification.expiresAt), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {showActions && (
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.isRead && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleMarkRead}
              className="h-8 w-8 p-0"
            >
              <Check className="w-3 h-3" />
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!notification.isRead && (
                <DropdownMenuItem onClick={handleMarkRead}>
                  <Check className="w-4 h-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
              )}
              {notification.data?.url && (
                <DropdownMenuItem onClick={() => window.open(notification.data.url, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open link
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleClear} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

/**
 * Notification bell icon with badge
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
  className,
  showBadge = true,
  variant = 'ghost',
}) => {
  const { unreadCount } = useNotifications();

  return (
    <div className={cn('relative', className)}>
      <Button variant={variant} size="sm" className="relative">
        {unreadCount > 0 ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
      </Button>

      {showBadge && unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </div>
  );
};

/**
 * Main notification panel
 */
export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  maxHeight = '400px',
  showFilters = true,
  showSettings = true,
  className,
}) => {
  const [filter, setFilter] = useState<{
    type?: NotificationType;
    unreadOnly: boolean;
  }>({ unreadOnly: false });

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    clearNotification,
  } = useFilteredNotifications({
    ...(filter.type && { type: filter.type }),
    unreadOnly: filter.unreadOnly,
    limit: 50,
  });

  const { soundEnabled, setSoundEnabled } = useNotificationSounds();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount}</Badge>
            )}
          </CardTitle>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}

            {showSettings && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Notification Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <Label htmlFor="sound-toggle" className="text-sm">
                      Sound notifications
                    </Label>
                    <Switch
                      id="sound-toggle"
                      checked={soundEnabled}
                      onCheckedChange={setSoundEnabled}
                    />
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={filter.unreadOnly ? 'default' : 'ghost'}
              onClick={() => setFilter(prev => ({ ...prev, unreadOnly: !prev.unreadOnly }))}
            >
              Unread only
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="ghost">
                  {filter.type ? filter.type : 'All types'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilter(prev => {
                  const { type, ...rest } = prev;
                  return rest;
                })}>
                  All types
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter(prev => ({ ...prev, type: 'message' }))}>
                  Messages
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter(prev => ({ ...prev, type: 'mention' }))}>
                  Mentions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter(prev => ({ ...prev, type: 'system' }))}>
                  System
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilter(prev => ({ ...prev, type: 'warning' }))}>
                  Warnings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea style={{ height: maxHeight }}>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {filter.unreadOnly ? 'No unread notifications' : 'No notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-1 p-4 group">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={markAsRead}
                  onClear={clearNotification}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

/**
 * Notification dropdown for header
 */
export const NotificationDropdown: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={className}>
          <NotificationBell />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationPanel maxHeight="500px" showSettings={true} />
      </PopoverContent>
    </Popover>
  );
};

/**
 * Real-time toast notifications
 */
export const RealtimeToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notifications } = useNotifications();
  const { playNotificationSound } = useNotificationSounds();

  useEffect(() => {
    const lastNotification = notifications[0];
    if (lastNotification && !lastNotification.isRead) {
      // Show toast for new notifications
      const typeInfo = getNotificationTypeInfo(lastNotification.type);

      toast(lastNotification.title, {
        description: lastNotification.message,
        icon: typeInfo.icon,
        action: lastNotification.data?.url ? {
          label: "Open",
          onClick: () => window.open(lastNotification.data.url, '_blank'),
        } : undefined,
        duration: lastNotification.priority === 'urgent' ? 10000 : 5000,
      });

      // Play notification sound
      playNotificationSound(lastNotification.priority);
    }
  }, [notifications, playNotificationSound]);

  return <>{children}</>;
};

/**
 * Notification permission request component
 */
export const NotificationPermissionBanner: React.FC = () => {
  const { permission, isSupported, requestPermission } = useNotificationPermissions();
  const [dismissed, setDismissed] = useState(false);

  if (!isSupported || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  const handleRequest = async () => {
    const granted = await requestPermission();
    if (!granted) {
      setDismissed(true);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium">Enable Browser Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get notified about important updates even when the tab isn't active
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button size="sm" onClick={handleRequest}>
              Enable
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};