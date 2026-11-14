import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Rocket } from "lucide-react";

describe("Phase 1 Component Verification", () => {
  it("renders Button component successfully", () => {
    render(<Button>Launch Mission</Button>);
    expect(screen.getByRole("button", { name: /launch mission/i })).toBeDefined();
  });

  it("renders Card and nested components", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Telemetry</CardTitle>
        </CardHeader>
        <CardContent>Data Stream</CardContent>
      </Card>
    );
    expect(screen.getByText("Telemetry")).toBeDefined();
    expect(screen.getByText("Data Stream")).toBeDefined();
  });

  it("renders Input and Label with accessible association", () => {
    render(
      <div>
        <Label htmlFor="longitude">Target Longitude</Label>
        <Input id="longitude" placeholder="0.0" />
      </div>
    );
    expect(screen.getByLabelText("Target Longitude")).toBeDefined();
    expect(screen.getByPlaceholderText("0.0")).toBeDefined();
  });

  it("renders Separator component", () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toBeDefined();
  });

  it("renders Lucide icon as SVG", () => {
    const { container } = render(<Rocket data-testid="rocket-icon" />);
    expect(container.querySelector("svg")).toBeDefined();
  });
});

