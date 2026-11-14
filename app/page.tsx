import localFont from "next/font/local";
import { Compass, Rocket, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const anandaBlack = localFont({
  src: "./fonts/ananda.black.ttf",
  display: "swap",
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-bg-base text-text-primary">
      <div className="w-full max-w-xl space-y-8">
        <header className="text-center space-y-2">
          <div className={`${anandaBlack.className} text-[56px] text-accent-primary`}>
            Luminar Check
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            Lunar Mission Planner Shell
          </h1>
          <p className="text-sm text-text-secondary">
            Environment, dependencies, and component verification baseline.
          </p>
        </header>

        <Card className="bg-bg-surface border-border-default shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2 text-accent-primary">
              <Compass className="h-5 w-5" />
              <CardTitle className="text-base text-text-primary">
                Coordinate Verification
              </CardTitle>
            </div>
            <CardDescription className="text-text-muted">
              Verify UI input and typography styling tokens.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-lat" className="text-text-secondary">
                Target Latitude (°N)
              </Label>
              <Input
                id="target-lat"
                placeholder="e.g. -89.9"
                className="bg-bg-subtle border-border-default text-text-primary placeholder:text-text-faint font-mono"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2 text-xs text-state-success">
                <ShieldCheck className="h-4 w-4" />
                <span>Components & Theme Verified</span>
              </div>
              <Button className="bg-accent-primary text-bg-base hover:bg-accent-primary/90 font-medium">
                <Rocket className="mr-2 h-4 w-4" />
                Initialize Site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
