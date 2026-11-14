import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { LandingPage } from "@/components/landing/landing-page";
import { MissionConfigurationCard } from "@/components/landing/mission-configuration-card";

describe("Phase 2 Landing Page & Mission Form Component Tests", () => {
  it("renders navigation, hero content, and feature highlights", () => {
    render(<LandingPage />);

    expect(screen.getByText("Lunar Mission Planner")).toBeDefined();
    expect(screen.getByText("Mission Planner")).toBeDefined();
    expect(screen.getByText("About")).toBeDefined();
    expect(screen.getByText("Documentation")).toBeDefined();

    expect(screen.getByText("NASA SPACE APPS CHALLENGE")).toBeDefined();
    expect(screen.getByText("Plan Your")).toBeDefined();
    expect(screen.getByText("Lunar Mission")).toBeDefined();

    expect(screen.getByText("Sun Analysis")).toBeDefined();
    expect(screen.getByText("Earth Analysis")).toBeDefined();
    expect(screen.getByText("Terrain & Elevation")).toBeDefined();
  });

  it("renders mission configuration fields with default UTC time 12:00", () => {
    render(<MissionConfigurationCard />);

    expect(screen.getByText("Mission Configuration")).toBeDefined();
    expect(
      screen.getByText("Enter mission details to analyse lunar conditions.")
    ).toBeDefined();

    const latInput = screen.getByPlaceholderText("e.g. -89.5") as HTMLInputElement;
    const lonInput = screen.getByPlaceholderText("e.g. 0.0") as HTMLInputElement;
    const timeInput = screen.getByLabelText("Mission Time (UTC)") as HTMLInputElement;

    expect(latInput).toBeDefined();
    expect(lonInput).toBeDefined();
    expect(timeInput.value).toBe("12:00");
  });

  it("displays inline validation errors and does not call onSubmit when empty", async () => {
    const handleSubmit = vi.fn();
    render(<MissionConfigurationCard onSubmit={handleSubmit} />);

    const submitBtn = screen.getByRole("button", {
      name: /analyse mission conditions/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Valid numeric latitude is required/i)
      ).toBeDefined();
      expect(
        screen.getByText(/Valid numeric longitude is required/i)
      ).toBeDefined();
      expect(screen.getByText(/Mission date is required/i)).toBeDefined();
    });

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with structured data when form is valid", async () => {
    const handleSubmit = vi.fn();
    render(<MissionConfigurationCard onSubmit={handleSubmit} />);

    const latInput = screen.getByPlaceholderText("e.g. -89.5");
    const lonInput = screen.getByPlaceholderText("e.g. 0.0");
    const dateInput = screen.getByLabelText("Mission Date");
    const additionalInput = screen.getByPlaceholderText("e.g. -88.8, 12.4");

    fireEvent.change(latInput, { target: { value: "-89.9" } });
    fireEvent.change(lonInput, { target: { value: "0.0" } });
    fireEvent.change(dateInput, { target: { value: "2026-12-01" } });
    fireEvent.change(additionalInput, { target: { value: "-85.0, 10.5" } });

    const submitBtn = screen.getByRole("button", {
      name: /analyse mission conditions/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -89.9,
          longitude: 0,
          missionDate: "2026-12-01",
          missionTimeUtc: "12:00",
          additionalSite: {
            latitude: -85,
            longitude: 10.5,
          },
        })
      );
    });
  });
});

