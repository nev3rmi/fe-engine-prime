"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Component Showcase - Demonstrates all core ShadCN/UI components
 * with strict MCP compliance and official implementation patterns
 */
export function ComponentShowcase() {
  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">ShadCN/UI Component Showcase</h1>
        <p className="text-muted-foreground">
          Complete implementation of core ShadCN components with official patterns and strict MCP
          compliance.
        </p>
      </div>

      {/* Button Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Button Components</CardTitle>
          <CardDescription>
            Official ShadCN Button variants following exact documentation patterns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Button Variants</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Button Sizes</h3>
            <div className="flex items-center gap-2">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Card Components</CardTitle>
          <CardDescription>
            ShadCN Card composition with CardHeader, CardContent, and CardFooter patterns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sample Card</CardTitle>
                <CardDescription>Card with header and content</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  This demonstrates the official ShadCN Card component composition pattern using
                  CardHeader, CardContent structure.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Card with Footer</CardTitle>
                <CardDescription>Complete card composition</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  This card includes all three composition elements following ShadCN patterns.
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Action Button</Button>
              </CardFooter>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Input and Form Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Form Components</CardTitle>
          <CardDescription>
            ShadCN Input and Label components with proper form patterns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter your email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Enter your password" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="Enter your full name" />
            </div>
            <div className="flex gap-2">
              <Button type="submit">Submit</Button>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Table Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Table Components</CardTitle>
          <CardDescription>
            ShadCN Table composition with TableHeader, TableBody, and TableCell patterns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>Sample data table using ShadCN Table components.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">001</TableCell>
                <TableCell>John Doe</TableCell>
                <TableCell>Developer</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    Active
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">002</TableCell>
                <TableCell>Jane Smith</TableCell>
                <TableCell>Designer</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    Active
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">003</TableCell>
                <TableCell>Bob Johnson</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell className="text-right">
                  <Button variant="secondary" size="sm">
                    Inactive
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
