import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Web APIs for testing
interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

interface PerformanceObserverEntry extends PerformanceEntry {
  processingStart?: number;
  loadEventEnd?: number;
  value?: number;
  hadRecentInput?: boolean;
  sources?: Array<{
    node?: Element;
  }>;
}

// Mock Web Performance APIs
const mockPerformanceObserver = vi.fn();
const mockPerformanceEntries: PerformanceObserverEntry[] = [];

global.PerformanceObserver = vi.fn().mockImplementation(callback => {
  mockPerformanceObserver.mockImplementation(callback);
  return {
    observe: vi.fn(options => {
      // Simulate performance entries based on observed types
      if (options.entryTypes?.includes("paint")) {
        const entries = [
          { name: "first-paint", entryType: "paint", startTime: 100, duration: 0 },
          { name: "first-contentful-paint", entryType: "paint", startTime: 150, duration: 0 },
        ];
        callback({ getEntries: () => entries });
      }
      if (options.entryTypes?.includes("largest-contentful-paint")) {
        const entries = [
          {
            name: "",
            entryType: "largest-contentful-paint",
            startTime: 500,
            duration: 0,
            loadEventEnd: 1000,
            sources: [{ node: document.createElement("img") }],
          },
        ];
        callback({ getEntries: () => entries });
      }
      if (options.entryTypes?.includes("layout-shift")) {
        const entries = [
          {
            name: "",
            entryType: "layout-shift",
            startTime: 300,
            duration: 0,
            value: 0.05,
            hadRecentInput: false,
            sources: [{ node: document.createElement("div") }],
          },
        ];
        callback({ getEntries: () => entries });
      }
      if (options.entryTypes?.includes("first-input")) {
        const entries = [
          {
            name: "click",
            entryType: "first-input",
            startTime: 800,
            duration: 0,
            processingStart: 805,
          },
        ];
        callback({ getEntries: () => entries });
      }
    }),
    disconnect: vi.fn(),
  };
});

// Core Web Vitals measurement utilities
class CoreWebVitalsCollector {
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  measureLCP(): Promise<number> {
    return new Promise(resolve => {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries() as PerformanceObserverEntry[];
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.set("LCP", lastEntry.startTime);
          resolve(lastEntry.startTime);
        }
      });
      observer.observe({ entryTypes: ["largest-contentful-paint"] });
      this.observers.push(observer);
    });
  }

  measureFID(): Promise<number> {
    return new Promise(resolve => {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries() as PerformanceObserverEntry[];
        entries.forEach(entry => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            this.metrics.set("FID", fid);
            resolve(fid);
          }
        });
      });
      observer.observe({ entryTypes: ["first-input"] });
      this.observers.push(observer);
    });
  }

  measureCLS(): Promise<number> {
    return new Promise(resolve => {
      let clsValue = 0;
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries() as PerformanceObserverEntry[];
        entries.forEach(entry => {
          if (entry.value && !entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.set("CLS", clsValue);
        resolve(clsValue);
      });
      observer.observe({ entryTypes: ["layout-shift"] });
      this.observers.push(observer);
    });
  }

  measureFCP(): Promise<number> {
    return new Promise(resolve => {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries() as PerformanceObserverEntry[];
        const fcpEntry = entries.find(entry => entry.name === "first-contentful-paint");
        if (fcpEntry) {
          this.metrics.set("FCP", fcpEntry.startTime);
          resolve(fcpEntry.startTime);
        }
      });
      observer.observe({ entryTypes: ["paint"] });
      this.observers.push(observer);
    });
  }

  measureTTFB(): number {
    const navTiming = performance.getEntriesByType("navigation")[0] as any;
    if (navTiming) {
      const ttfb = navTiming.responseStart - navTiming.requestStart;
      this.metrics.set("TTFB", ttfb);
      return ttfb;
    }
    return 0;
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Bundle size analyzer
class BundleSizeAnalyzer {
  analyzeJavaScriptBundles(): Promise<{
    total: number;
    chunks: Array<{ name: string; size: number }>;
  }> {
    return new Promise(resolve => {
      // Mock bundle analysis - in real implementation this would analyze actual bundles
      const chunks = [
        { name: "main", size: 245000 }, // 245KB
        { name: "vendor", size: 512000 }, // 512KB
        { name: "runtime", size: 5000 }, // 5KB
      ];
      const total = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      resolve({ total, chunks });
    });
  }

  analyzeCSSBundles(): Promise<{ total: number; files: Array<{ name: string; size: number }> }> {
    return new Promise(resolve => {
      const files = [
        { name: "globals.css", size: 45000 }, // 45KB
        { name: "components.css", size: 32000 }, // 32KB
      ];
      const total = files.reduce((sum, file) => sum + file.size, 0);
      resolve({ total, files });
    });
  }

  getThresholds() {
    return {
      javascript: {
        warning: 500000, // 500KB
        error: 1000000, // 1MB
      },
      css: {
        warning: 100000, // 100KB
        error: 200000, // 200KB
      },
    };
  }
}

describe("Core Web Vitals", () => {
  let collector: CoreWebVitalsCollector;
  let bundleAnalyzer: BundleSizeAnalyzer;

  beforeEach(() => {
    collector = new CoreWebVitalsCollector();
    bundleAnalyzer = new BundleSizeAnalyzer();
    vi.clearAllMocks();
  });

  afterEach(() => {
    collector.cleanup();
  });

  describe("Performance Metrics", () => {
    it("should measure Largest Contentful Paint (LCP)", async () => {
      const lcp = await collector.measureLCP();

      expect(lcp).toBeDefined();
      expect(lcp).toBeGreaterThanOrEqual(0);
      expect(lcp).toBeLessThan(2500); // Good LCP threshold
    });

    it("should measure First Input Delay (FID)", async () => {
      const fid = await collector.measureFID();

      expect(fid).toBeDefined();
      expect(fid).toBeGreaterThanOrEqual(0);
      expect(fid).toBeLessThan(100); // Good FID threshold
    });

    it("should measure Cumulative Layout Shift (CLS)", async () => {
      const cls = await collector.measureCLS();

      expect(cls).toBeDefined();
      expect(cls).toBeGreaterThanOrEqual(0);
      expect(cls).toBeLessThan(0.1); // Good CLS threshold
    });

    it("should measure First Contentful Paint (FCP)", async () => {
      const fcp = await collector.measureFCP();

      expect(fcp).toBeDefined();
      expect(fcp).toBeGreaterThanOrEqual(0);
      expect(fcp).toBeLessThan(1800); // Good FCP threshold
    });

    it("should measure Time to First Byte (TTFB)", () => {
      // Mock navigation timing
      Object.defineProperty(performance, "getEntriesByType", {
        value: (type: string) => {
          if (type === "navigation") {
            return [
              {
                requestStart: 0,
                responseStart: 200, // 200ms TTFB
              },
            ];
          }
          return [];
        },
        writable: true,
      });

      const ttfb = collector.measureTTFB();

      expect(ttfb).toBe(200);
      expect(ttfb).toBeLessThan(600); // Good TTFB threshold
    });

    it("should collect all metrics at once", async () => {
      // Measure all metrics
      await Promise.all([
        collector.measureLCP(),
        collector.measureFID(),
        collector.measureCLS(),
        collector.measureFCP(),
      ]);

      collector.measureTTFB();

      const metrics = collector.getMetrics();

      expect(metrics).toHaveProperty("LCP");
      expect(metrics).toHaveProperty("FID");
      expect(metrics).toHaveProperty("CLS");
      expect(metrics).toHaveProperty("FCP");
      expect(metrics).toHaveProperty("TTFB");
    });

    it("should identify performance regressions", async () => {
      const baseline = {
        LCP: 2000,
        FID: 80,
        CLS: 0.08,
        FCP: 1500,
        TTFB: 400,
      };

      // Measure current metrics
      await Promise.all([
        collector.measureLCP(),
        collector.measureFID(),
        collector.measureCLS(),
        collector.measureFCP(),
      ]);
      collector.measureTTFB();

      const current = collector.getMetrics();

      // Check for regressions (allow 10% variance)
      Object.entries(baseline).forEach(([metric, baselineValue]) => {
        const currentValue = current[metric];
        if (currentValue) {
          const variance = (currentValue - baselineValue) / baselineValue;
          expect(variance).toBeLessThan(0.1); // Less than 10% regression
        }
      });
    });
  });

  describe("Bundle Size Analysis", () => {
    it("should analyze JavaScript bundle sizes", async () => {
      const analysis = await bundleAnalyzer.analyzeJavaScriptBundles();

      expect(analysis.total).toBeDefined();
      expect(analysis.chunks).toHaveLength(3);
      expect(analysis.chunks[0]).toHaveProperty("name", "main");
      expect(analysis.chunks[0]).toHaveProperty("size");
    });

    it("should analyze CSS bundle sizes", async () => {
      const analysis = await bundleAnalyzer.analyzeCSSBundles();

      expect(analysis.total).toBeDefined();
      expect(analysis.files).toHaveLength(2);
      expect(analysis.files[0]).toHaveProperty("name", "globals.css");
      expect(analysis.files[0]).toHaveProperty("size");
    });

    it("should enforce bundle size thresholds", async () => {
      const jsAnalysis = await bundleAnalyzer.analyzeJavaScriptBundles();
      const cssAnalysis = await bundleAnalyzer.analyzeCSSBundles();
      const thresholds = bundleAnalyzer.getThresholds();

      // JavaScript bundle size checks
      expect(jsAnalysis.total).toBeLessThan(thresholds.javascript.error);
      if (jsAnalysis.total > thresholds.javascript.warning) {
        console.warn(`JavaScript bundle size (${jsAnalysis.total}) exceeds warning threshold`);
      }

      // CSS bundle size checks
      expect(cssAnalysis.total).toBeLessThan(thresholds.css.error);
      if (cssAnalysis.total > thresholds.css.warning) {
        console.warn(`CSS bundle size (${cssAnalysis.total}) exceeds warning threshold`);
      }
    });

    it("should identify the largest bundle chunks", async () => {
      const analysis = await bundleAnalyzer.analyzeJavaScriptBundles();

      const sortedChunks = analysis.chunks.sort((a, b) => b.size - a.size);
      const largestChunk = sortedChunks[0];

      // Ensure the largest chunk doesn't exceed reasonable limits
      expect(largestChunk.size).toBeLessThan(600000); // 600KB for any single chunk

      // Log largest chunks for monitoring
      console.log("Largest JavaScript chunks:", sortedChunks.slice(0, 3));
    });
  });

  describe("Performance Monitoring", () => {
    it("should create performance budget", () => {
      const budget = {
        "Largest Contentful Paint": 2500, // ms
        "First Input Delay": 100, // ms
        "Cumulative Layout Shift": 0.1,
        "First Contentful Paint": 1800, // ms
        "Time to First Byte": 600, // ms
        "JavaScript Bundle": 800000, // bytes (800KB)
        "CSS Bundle": 150000, // bytes (150KB)
      };

      // Validate budget values are reasonable
      expect(budget["Largest Contentful Paint"]).toBeLessThanOrEqual(2500);
      expect(budget["First Input Delay"]).toBeLessThanOrEqual(100);
      expect(budget["Cumulative Layout Shift"]).toBeLessThanOrEqual(0.1);
      expect(budget["First Contentful Paint"]).toBeLessThanOrEqual(1800);
      expect(budget["Time to First Byte"]).toBeLessThanOrEqual(600);
    });

    it("should generate performance report", async () => {
      // Collect all metrics
      const [lcp, fid, cls, fcp] = await Promise.all([
        collector.measureLCP(),
        collector.measureFID(),
        collector.measureCLS(),
        collector.measureFCP(),
      ]);
      const ttfb = collector.measureTTFB();

      const jsAnalysis = await bundleAnalyzer.analyzeJavaScriptBundles();
      const cssAnalysis = await bundleAnalyzer.analyzeCSSBundles();

      const report = {
        timestamp: new Date().toISOString(),
        coreWebVitals: {
          LCP: lcp,
          FID: fid,
          CLS: cls,
          FCP: fcp,
          TTFB: ttfb,
        },
        bundleSizes: {
          javascript: jsAnalysis.total,
          css: cssAnalysis.total,
        },
        scores: {
          LCP: lcp <= 2500 ? "good" : lcp <= 4000 ? "needs improvement" : "poor",
          FID: fid <= 100 ? "good" : fid <= 300 ? "needs improvement" : "poor",
          CLS: cls <= 0.1 ? "good" : cls <= 0.25 ? "needs improvement" : "poor",
          FCP: fcp <= 1800 ? "good" : fcp <= 3000 ? "needs improvement" : "poor",
        },
      };

      expect(report).toHaveProperty("timestamp");
      expect(report).toHaveProperty("coreWebVitals");
      expect(report).toHaveProperty("bundleSizes");
      expect(report).toHaveProperty("scores");

      // Ensure we have scores for all metrics
      expect(Object.keys(report.scores)).toHaveLength(4);
    });
  });
});
