import { NextResponse } from "next/server";
import {
  AccessToken,
  type AccessTokenOptions,
  RoomConfiguration,
  type VideoGrant,
} from "livekit-server-sdk";
import crypto from "crypto";

type ConnectionDetails = {
  server_url: string;
  serverUrl: string;
  room_name: string;
  roomName: string;
  participant_name: string;
  participantName: string;
  participant_token: string;
  participantToken: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const AGENT_NAME = process.env.AGENT_NAME || "lmp-sis-agent";

// Dynamic token minting route

export async function POST(req: Request) {
  const isAllowed =
    process.env.NODE_ENV === "development" ||
    process.env.ALLOW_LOCAL_TEST_TOKEN === "true";

  if (!isAllowed) {
    return NextResponse.json(
      { error: "LiveKit token generation requires an authorized user session." },
      { status: 403 }
    );
  }

  try {
    if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
      return NextResponse.json(
        {
          error:
            "LiveKit credentials missing on server. Ensure LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET are set.",
        },
        { status: 500 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      // Empty or non-JSON body is acceptable for standard token request
      body = {};
    }

    // Server-enforced agent dispatch: Always route strictly to lmp-sis-agent
    const roomConfig =
      body?.room_config && typeof body.room_config === "object"
        ? RoomConfiguration.fromJson(body.room_config as Parameters<typeof RoomConfiguration.fromJson>[0], {
            ignoreUnknownFields: true,
          })
        : new RoomConfiguration();

    // Generate isolated random session IDs
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const participantName =
      (typeof body?.participant_name === "string" && body.participant_name) ||
      `flight_controller_${randomSuffix}`;
    const participantIdentity = `user_${randomSuffix}`;
    const roomName =
      (typeof body?.room_name === "string" && body.room_name) ||
      `sis_session_${randomSuffix}`;

    // Attach optional opaque mission context metadata if provided by LMP workspace
    const metadataObj: Record<string, unknown> = {
      agent: AGENT_NAME,
      analysisRunId: body?.analysisRunId || null,
      contextRef: body?.contextRef || "lmp_workspace_active",
    };

    const participantToken = await createParticipantToken(
      {
        identity: participantIdentity,
        name: participantName,
        metadata: JSON.stringify(metadataObj),
      },
      roomName,
      roomConfig
    );

    const data: ConnectionDetails = {
      server_url: LIVEKIT_URL,
      serverUrl: LIVEKIT_URL,
      room_name: roomName,
      roomName,
      participant_name: participantName,
      participantName,
      participant_token: participantToken,
      participantToken,
    };

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Token generation failed";
    console.error("[SIS Token Generation Error]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  roomConfig: RoomConfiguration | undefined
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: "15m",
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };

  at.addGrant(grant);

  if (roomConfig) {
    at.roomConfig = roomConfig;
  }

  return at.toJwt();
}
