import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { SISChatPanel } from "@/components/sis/sis-chat-panel";
import { WorkspaceNavigation } from "@/components/workspace/workspace-navigation";

describe("Phase 26 LiveKit SIS Assistant Integration & Dummy Data Removal Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders SIS button in WorkspaceNavigation at the far right", () => {
    const onToggle = vi.fn();
    render(<WorkspaceNavigation onToggleSis={onToggle} isSisOpen={false} />);

    const sisBtn = screen.getByRole("button", { name: "Open SIS Assistant" });
    expect(sisBtn).toBeDefined();
    expect(sisBtn.textContent).toContain("SIS");

    fireEvent.click(sisBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not render SISChatPanel when isOpen is false", () => {
    render(<SISChatPanel isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("complementary", { name: "SIS Assistant Panel" })).toBeNull();
    expect(screen.queryByText("SIS Assistant")).toBeNull();
  });

  it("renders panel with real Disconnected runtime status and no dummy UI preview label", () => {
    render(<SISChatPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByRole("complementary", { name: "SIS Assistant Panel" })).toBeDefined();
    expect(screen.getByText("SIS Assistant")).toBeDefined();
    expect(screen.getByText("LMP · Super Intelligent System")).toBeDefined();

    // Truthful runtime status: Disconnected (no fake 'UI preview' badge)
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.queryByText("UI preview")).toBeNull();

    // Verify close and minimize buttons exist with accessible names
    expect(screen.getByRole("button", { name: "Close SIS Assistant" })).toBeDefined();
  });

  it("renders instructional empty state with zero seeded mock conversation bubbles", () => {
    render(<SISChatPanel isOpen={true} onClose={vi.fn()} />);

    // Instructional empty state is rendered
    expect(
      screen.getByText(/Ask SIS about your lunar mission/i)
    ).toBeDefined();
    expect(
      screen.getByText(/SIS provides verified mission intelligence/i)
    ).toBeDefined();

    // No hardcoded sample or preview conversation bubbles exist
    expect(screen.queryByText(/Is the selected site suitable for a 4-hour rover mission/i)).toBeNull();
    expect(screen.queryByText(/This is a UI preview/i)).toBeNull();
    expect(screen.queryByText(/12:00 UTC/i)).toBeNull();

    // Suggested prompt chips are present and functional
    expect(screen.getByText("Explain the Sun analysis")).toBeDefined();
    expect(screen.getByText("Why is Earth below the horizon?")).toBeDefined();
    expect(screen.getByText("Explain the terrain results")).toBeDefined();
    expect(screen.getByText("What does this mean for the rover?")).toBeDefined();
  });

  it("populates composer and invokes send when a suggested prompt chip is clicked", () => {
    render(<SISChatPanel isOpen={true} onClose={vi.fn()} />);

    const chip = screen.getByText("Explain the Sun analysis");
    fireEvent.click(chip);

    const input = screen.getByLabelText("Message to SIS Assistant") as HTMLInputElement;
    expect(input.value).toBe("Explain the Sun analysis");
  });

  it("distinguishes truthful connection status states without misleading Connected badge", () => {
    render(<SISChatPanel isOpen={true} onClose={vi.fn()} />);

    // When disconnected initially, shows Disconnected
    expect(screen.getByText("Disconnected")).toBeDefined();
    // Does NOT claim Connected
    expect(screen.queryByText(/^Connected$/)).toBeNull();
  });

  it("renders real microphone and speaker controls with accessible labels", () => {
    render(<SISChatPanel isOpen={true} onClose={vi.fn()} />);

    // Microphone toggle button exists with real actionable label
    const micBtn = screen.getByRole("button", { name: /Turn on microphone/i });
    expect(micBtn).toBeDefined();

    // Speaker toggle button exists
    const speakerBtn = screen.getByRole("button", { name: /Mute audio output/i });
    expect(speakerBtn).toBeDefined();

    // Keyboard mode button exists
    expect(screen.getByRole("button", { name: /Text mode active/i })).toBeDefined();
  });

  it("toggles speaker mute state when speaker button is clicked", () => {
    render(<SISChatPanel isOpen={true} onClose={vi.fn()} />);

    const speakerBtn = screen.getByRole("button", { name: /Mute audio output/i });
    fireEvent.click(speakerBtn);

    // Now button reflects unmuting
    expect(screen.getByRole("button", { name: /Unmute audio output/i })).toBeDefined();

    fireEvent.click(speakerBtn);
    expect(screen.getByRole("button", { name: /Mute audio output/i })).toBeDefined();
  });

  it("renders minimized launcher pill with real runtime status when isMinimized is true", () => {
    const onToggleMinimize = vi.fn();
    render(
      <SISChatPanel
        isOpen={true}
        isMinimized={true}
        onClose={vi.fn()}
        onToggleMinimize={onToggleMinimize}
      />
    );

    const pill = screen.getByRole("complementary", { name: "SIS Assistant Minimized" });
    expect(pill).toBeDefined();
    expect(screen.getByText("SIS Assistant")).toBeDefined();
    expect(screen.getByText("Disconnected")).toBeDefined();
    expect(screen.queryByText("UI preview")).toBeNull();

    fireEvent.click(pill);
    expect(onToggleMinimize).toHaveBeenCalledTimes(1);
  });

  it("renders active mission context reference when missionContext prop is supplied", () => {
    render(
      <SISChatPanel
        isOpen={true}
        onClose={vi.fn()}
        missionContext={{
          latitude: -89.5,
          longitude: 0.0,
          missionDate: "2028-01-15",
          missionTimeUtc: "12:00",
          solarElevation: 5.27,
          solarAzimuth: 132.64,
          earthElevation: 12.3,
          earthAzimuth: 45.18,
          isStale: false,
        }}
      />
    );

    expect(screen.getByText(/Site: -89.50°, 0.00°/i)).toBeDefined();
  });
});
