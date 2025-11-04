"use client";

import React, { useCallback } from "react";

import { formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  MessageSquare,
  BarChart3,
  PieChart,
  LineChart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useWidgetSync } from "@/lib/hooks/use-data-sync";
import { cn } from "@/lib/utils";

interface BaseWidgetProps {
  widgetId: string;
  title?: string;
  className?: string;
  refreshRate?: number;
  showLastUpdated?: boolean;
  showRefreshButton?: boolean;
}

interface MetricWidgetProps extends BaseWidgetProps {
  icon?: React.ReactNode;
  format?: "number" | "currency" | "percentage" | "bytes";
  trend?: "up" | "down" | "neutral";
  target?: number;
  showProgress?: boolean;
}

interface ChartWidgetProps extends BaseWidgetProps {
  chartType?: "line" | "bar" | "pie" | "area";
  height?: number;
}

interface ActivityWidgetProps extends BaseWidgetProps {
  maxItems?: number;
  showAvatars?: boolean;
}

interface StatusIndicatorProps {
  isConnected: boolean;
  lastUpdated: Date | null;
  isLoading: boolean;
  error?: string | null;
  className?: string;
}

/**
 * Status indicator for real-time connection and data freshness
 */
const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isConnected,
  lastUpdated,
  isLoading,
  error,
  className,
}) => {
  const getStatusInfo = () => {
    if (error) {
      return {
        icon: <AlertTriangle className="h-3 w-3" />,
        text: "Error",
        variant: "destructive" as const,
      };
    }

    if (isLoading) {
      return {
        icon: <RefreshCw className="h-3 w-3 animate-spin" />,
        text: "Loading",
        variant: "secondary" as const,
      };
    }

    if (!isConnected) {
      return {
        icon: <WifiOff className="h-3 w-3" />,
        text: "Offline",
        variant: "outline" as const,
      };
    }

    return {
      icon: <Wifi className="h-3 w-3" />,
      text: "Live",
      variant: "default" as const,
    };
  };

  const status = getStatusInfo();

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Badge variant={status.variant} className="flex items-center space-x-1 text-xs">
        {status.icon}
        <span>{status.text}</span>
      </Badge>

      {lastUpdated && !isLoading && (
        <span className="text-muted-foreground text-xs">
          {formatDistanceToNow(lastUpdated, { addSuffix: true })}
        </span>
      )}
    </div>
  );
};

/**
 * Base widget wrapper with real-time sync capabilities
 */
const BaseWidget: React.FC<BaseWidgetProps & { children: React.ReactNode }> = ({
  widgetId,
  title,
  className,
  refreshRate,
  showLastUpdated = true,
  showRefreshButton = true,
  children,
}) => {
  const { data, lastUpdated, isLoading, error, refreshWidget } = useWidgetSync(
    widgetId,
    refreshRate
  );

  const handleRefresh = useCallback(() => {
    refreshWidget();
  }, [refreshWidget]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>

        <div className="flex items-center space-x-2">
          {showLastUpdated && (
            <StatusIndicator
              isConnected={true} // This should come from useRealtime hook
              lastUpdated={lastUpdated}
              isLoading={isLoading}
              error={error}
            />
          )}

          {showRefreshButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
};

/**
 * Widget loading skeleton
 */
const WidgetSkeleton: React.FC<{ height?: number }> = ({ height = 100 }) => (
  <div className="space-y-2">
    <Skeleton className="h-8 w-24" />
    <Skeleton className={`h-${height} w-full`} />
    <div className="flex space-x-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-20" />
    </div>
  </div>
);

/**
 * Metric display widget with trend indicators
 */
export const MetricWidget: React.FC<MetricWidgetProps> = ({
  widgetId,
  title = "Metric",
  icon,
  format = "number",
  trend,
  target,
  showProgress = false,
  ...baseProps
}) => {
  const { data, lastUpdated, isLoading, error } = useWidgetSync<{
    value: number;
    change?: number;
    changePercent?: number;
    label?: string;
  }>(widgetId);

  const formatValue = (value: number): string => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value);
      case "percentage":
        return `${value.toFixed(1)}%`;
      case "bytes":
        const units = ["B", "KB", "MB", "GB", "TB"];
        let size = value;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
      default:
        return new Intl.NumberFormat("en-US").format(value);
    }
  };

  const getTrendIcon = () => {
    if (trend === "up" || (data?.changePercent && data.changePercent > 0)) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (trend === "down" || (data?.changePercent && data.changePercent < 0)) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Activity className="text-muted-foreground h-4 w-4" />;
  };

  return (
    <BaseWidget widgetId={widgetId} title={title} {...baseProps}>
      {isLoading ? (
        <WidgetSkeleton />
      ) : error ? (
        <div className="text-destructive flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Failed to load data</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            {icon}
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold">
                  {data?.value !== undefined ? formatValue(data.value) : "--"}
                </span>
                {getTrendIcon()}
              </div>

              {data?.changePercent !== undefined && (
                <p className="text-muted-foreground text-xs">
                  {data.changePercent > 0 ? "+" : ""}
                  {data.changePercent.toFixed(1)}% from last period
                </p>
              )}

              {data?.label && <p className="text-muted-foreground mt-1 text-sm">{data.label}</p>}
            </div>
          </div>

          {showProgress && target && data?.value !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{Math.round((data.value / target) * 100)}%</span>
              </div>
              <Progress value={(data.value / target) * 100} className="h-2" />
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
};

/**
 * Activity feed widget
 */
export const ActivityWidget: React.FC<ActivityWidgetProps> = ({
  widgetId,
  title = "Recent Activity",
  maxItems = 5,
  showAvatars = true,
  ...baseProps
}) => {
  const { data, isLoading, error } = useWidgetSync<
    Array<{
      id: string;
      type: "message" | "join" | "leave" | "update" | "error";
      user?: { name: string; avatar?: string };
      message: string;
      timestamp: string;
      metadata?: any;
    }>
  >(widgetId);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="h-3 w-3" />;
      case "join":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "leave":
        return <Clock className="h-3 w-3 text-orange-500" />;
      case "error":
        return <AlertTriangle className="h-3 w-3 text-red-500" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const displayItems = data?.slice(0, maxItems) || [];

  return (
    <BaseWidget widgetId={widgetId} title={title} {...baseProps}>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-destructive flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Failed to load activity</span>
        </div>
      ) : displayItems.length === 0 ? (
        <div className="py-4 text-center">
          <Activity className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map(item => (
            <div key={item.id} className="flex items-start space-x-2">
              <div className="mt-0.5 flex-shrink-0">{getActivityIcon(item.type)}</div>

              <div className="min-w-0 flex-1">
                <p className="text-sm">{item.message}</p>
                <p className="text-muted-foreground text-xs">
                  {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseWidget>
  );
};

/**
 * Chart widget (placeholder for chart library integration)
 */
export const ChartWidget: React.FC<ChartWidgetProps> = ({
  widgetId,
  title = "Chart",
  chartType = "line",
  height = 200,
  ...baseProps
}) => {
  const { data, isLoading, error } = useWidgetSync<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color?: string;
    }>;
  }>(widgetId);

  const getChartIcon = () => {
    switch (chartType) {
      case "bar":
        return <BarChart3 className="h-4 w-4" />;
      case "pie":
        return <PieChart className="h-4 w-4" />;
      case "line":
      default:
        return <LineChart className="h-4 w-4" />;
    }
  };

  return (
    <BaseWidget widgetId={widgetId} title={title} {...baseProps}>
      {isLoading ? (
        <WidgetSkeleton height={height} />
      ) : error ? (
        <div className="flex h-32 items-center justify-center">
          <div className="text-destructive flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Failed to load chart</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="mb-4 flex items-center space-x-2">
            {getChartIcon()}
            <span className="text-muted-foreground text-sm capitalize">{chartType} Chart</span>
          </div>

          {/* Placeholder for actual chart implementation */}
          <div
            className="border-muted flex items-center justify-center rounded-lg border-2 border-dashed"
            style={{ height: `${height}px` }}
          >
            <div className="text-center">
              <div className="mb-2">{getChartIcon()}</div>
              <p className="text-muted-foreground text-sm">Chart component integration needed</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Data points: {data?.datasets?.[0]?.data?.length || 0}
              </p>
            </div>
          </div>
        </div>
      )}
    </BaseWidget>
  );
};

/**
 * Grid layout for dashboard widgets
 */
export const WidgetGrid: React.FC<{
  children: React.ReactNode;
  columns?: number;
  gap?: number;
  className?: string;
}> = ({ children, columns = 3, gap = 4, className }) => {
  return (
    <div
      className={cn(
        "grid auto-rows-max",
        `grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns}`,
        `gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
};
