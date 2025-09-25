"use client"

import { useEffect, useState } from "react"

import { Moon, Sun, Monitor, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { ThemeToggle, SimpleThemeToggle } from "@/components/theme-toggle"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"


export default function ThemeDemo() {
  const { theme, setTheme, themes } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="container mx-auto py-10">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Theme System Demo</h1>
          <p className="text-xl text-muted-foreground">
            Tailwind CSS v4 + shadcn/ui with Dark/Light Mode
          </p>
        </div>

        {/* Theme Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Controls
            </CardTitle>
            <CardDescription>
              Current theme: <Badge variant="secondary">{theme}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 flex-wrap">
              <div className="space-y-2">
                <p className="text-sm font-medium">Dropdown Toggle:</p>
                <ThemeToggle />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Simple Toggle:</p>
                <SimpleThemeToggle />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Direct Buttons:</p>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Primary Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="bg-primary text-primary-foreground p-3 rounded">
                Primary Background
              </div>
              <div className="bg-secondary text-secondary-foreground p-3 rounded">
                Secondary Background
              </div>
              <div className="bg-accent text-accent-foreground p-3 rounded">
                Accent Background
              </div>
              <div className="bg-muted text-muted-foreground p-3 rounded">
                Muted Background
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>UI Components</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Alert>
                <AlertTitle>Default Alert</AlertTitle>
                <AlertDescription>This is how alerts look in the current theme.</AlertDescription>
              </Alert>
              <div className="flex gap-2 flex-wrap">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Chart Colors</CardTitle>
            <CardDescription>Colors optimized for data visualization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              <div className="aspect-square bg-chart-1 rounded flex items-center justify-center text-xs font-medium">
                Chart 1
              </div>
              <div className="aspect-square bg-chart-2 rounded flex items-center justify-center text-xs font-medium">
                Chart 2
              </div>
              <div className="aspect-square bg-chart-3 rounded flex items-center justify-center text-xs font-medium">
                Chart 3
              </div>
              <div className="aspect-square bg-chart-4 rounded flex items-center justify-center text-xs font-medium">
                Chart 4
              </div>
              <div className="aspect-square bg-chart-5 rounded flex items-center justify-center text-xs font-medium">
                Chart 5
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CSS Variables Info */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold mb-2">Tailwind CSS Version:</p>
                <Badge variant="outline">v4.0.0</Badge>
              </div>
              <div>
                <p className="font-semibold mb-2">Color Format:</p>
                <Badge variant="outline">OKLCH</Badge>
              </div>
              <div>
                <p className="font-semibold mb-2">Theme Provider:</p>
                <Badge variant="outline">next-themes</Badge>
              </div>
              <div>
                <p className="font-semibold mb-2">Animation:</p>
                <Badge variant="outline">tw-animate-css</Badge>
              </div>
            </div>
            <Alert>
              <AlertTitle>CSS-First Configuration</AlertTitle>
              <AlertDescription>
                Tailwind v4 uses @theme directive in CSS instead of tailwind.config.js.
                All theme customization happens in globals.css.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}