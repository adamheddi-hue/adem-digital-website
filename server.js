/**
 * ============================================================
 * ADEM DIGITAL — PRIVATE LIVE STREAMING SERVER
 * ============================================================
 * 
 * Backend server using Express + Socket.IO for WebRTC signaling.
 * 
 * FEATURES:
 * - Host can start a live stream and get a unique Stream ID + Access Code
 * - Viewers must enter correct Stream ID + Access Code to watch
 * - WebRTC peer connections managed via Socket.IO signaling
 * - Stream auto-deletes when host ends it
 * - Multiple viewers supported simultaneously
 * - Secure random IDs and codes generated with crypto module
 * 
 * HOW IT WORKS:
 * 1. Host opens stream-host.html, clicks "Start Stream"
 * 2. Server generates unique 6-char Stream ID + 6-digit Access Code
 * 3. Host shares Stream ID + Code with authorized viewers
 * 4. Viewers enter Stream ID + Code on stream.html
 * 5. Server validates credentials, then allows WebRTC connection
 * 6. When host ends stream, all viewers are disconnected
 * 
 * RUN: npm install && npm start
 * Server listens on PORT 3000 (or PORT env variable)
 * ============================================================
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const path = require("path");

/* ===========================================================
 * CONFIGURATION
 * =========================================================== */
const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);

/**
 * Socket.IO server with CORS configured for development.
 * In production, restrict origin to your actual domain.
 */
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

/* ===========================================================
 * STREAM STORE (In-Memory)
 * ===========================================================
 * Each stream entry: {
 *   streamId:     string  — Unique 6-char alphanumeric ID
 *   accessCode:   string  — 6-digit numeric code
 *   hostSocketId: string  — Socket ID of the host
 *   active:       boolean — Whether stream is currently live
 *   viewers:      Set     — Set of connected viewer socket IDs
 *   createdAt:    Date    — When the stream was created
 * }
 * 
 * Keyed by streamId for O(1) lookup.
 * =========================================================== */
const streams = new Map();

/* ===========================================================
 * UTILITY FUNCTIONS
 * =========================================================== */

/**
 * Generate a secure random 6-character alphanumeric Stream ID.
 * Uses crypto.randomBytes for cryptographic randomness.
 * Format: uppercase alphanumeric, e.g. "A7F92K"
 */
function generateStreamId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars (0,O,1,I)
  const bytes = crypto.randomBytes(6);
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

/**
 * Generate a secure random 6-digit Access Code.
 * Uses crypto.randomBytes for cryptographic randomness.
 * Always exactly 6 digits, zero-padded if needed.
 */
function generateAccessCode() {
  const num = crypto.randomInt(0, 999999);
  return num.toString().padStart(6, "0");
}

/**
 * Validate that a stream exists and is currently active.
 * Returns the stream object if valid, null otherwise.
 */
function getActiveStream(streamId) {
  const stream = streams.get(streamId);
  if (stream && stream.active) return stream;
  return null;
}

/* ===========================================================
 * REST API ROUTES
 * ===========================================================
 * Simple REST endpoints for stream lifecycle management.
 * Socket.IO handles all real-time signaling.
 * =========================================================== */

/**
 * POST /api/streams/create
 * Creates a new stream and returns Stream ID + Access Code.
 * Called by the host when clicking "Start Stream".
 * 
 * Response: { streamId, accessCode }
 */
app.use(express.json());

app.post("/api/streams/create", (req, res) => {
  // Generate unique IDs, retrying if collision occurs
  let streamId;
  do {
    streamId = generateStreamId();
  } while (streams.has(streamId));

  const accessCode = generateAccessCode();

  // Store the new stream
  streams.set(streamId, {
    streamId,
    accessCode,
    hostSocketId: null, // Will be set when host connects via Socket.IO
    active: true,
    viewers: new Set(),
    createdAt: new Date(),
  });

  console.log(`[STREAM CREATED] ID: ${streamId} | Code: ${accessCode}`);

  return res.json({ streamId, accessCode });
});

/**
 * POST /api/streams/validate
 * Validates a viewer's Stream ID + Access Code.
 * Called by viewers before they can access the watch page.
 * 
 * Body: { streamId, accessCode }
 * Response: { valid: true/false, message: string }
 */
app.post("/api/streams/validate", (req, res) => {
  const { streamId, accessCode } = req.body;

  if (!streamId || !accessCode) {
    return res.json({ valid: false, message: "Stream ID and Access Code are required." });
  }

  const stream = getActiveStream(streamId.toUpperCase());

  if (!stream) {
    return res.json({ valid: false, message: "Invalid Stream ID or Access Code." });
  }

  if (stream.accessCode !== accessCode.toString()) {
    return res.json({ valid: false, message: "Invalid Stream ID or Access Code." });
  }

  return res.json({ valid: true, message: "Access granted." });
});

/**
 * GET /api/streams/:id/status
 * Returns the current status of a stream (active, viewer count).
 * Useful for host dashboard to show viewer count.
 */
app.get("/api/streams/:id/status", (req, res) => {
  const stream = streams.get(req.params.id.toUpperCase());
  if (!stream || !stream.active) {
    return res.json({ active: false, viewers: 0 });
  }
  return res.json({ active: true, viewers: stream.viewers.size });
});

/* ===========================================================
 * SERVE STATIC FILES
 * ===========================================================
 * All existing HTML, CSS, JS, and assets are served as-is.
 * This ensures existing site features work without changes.
 * =========================================================== */
app.use(express.static(path.join(__dirname)));

/* ===========================================================
 * SOCKET.IO — SIGNALING FOR WEBRTC
 * ===========================================================
 * Socket.IO is used ONLY for signaling:
 * - Exchanging WebRTC offers and answers
 * - Exchanging ICE candidates
 * - Managing viewer join/leave events
 * - Host stream end notifications
 * 
 * No media data flows through Socket.IO.
 * All video/audio is peer-to-peer via WebRTC.
 * =========================================================== */
io.on("connection", (socket) => {
  console.log(`[CONNECTED] Socket: ${socket.id}`);

  /* -------------------------------------------------------
   * HOST: "host-join"
   * Host joins after creating a stream.
   * Associates the host's socket ID with the stream.
   * ------------------------------------------------------- */
  socket.on("host-join", ({ streamId }) => {
    const stream = streams.get(streamId);
    if (stream) {
      stream.hostSocketId = socket.id;
      socket.join(streamId); // Host joins the room
      socket.streamId = streamId;
      socket.role = "host";
      console.log(`[HOST JOINED] Stream: ${streamId} | Socket: ${socket.id}`);
    }
  });

  /* -------------------------------------------------------
   * VIEWER: "viewer-join"
   * Viewer joins after validating Stream ID + Access Code.
   * Notifies the host that a new viewer has connected.
   * ------------------------------------------------------- */
  socket.on("viewer-join", ({ streamId }) => {
    const stream = getActiveStream(streamId);
    if (!stream) {
      socket.emit("stream-error", { message: "Stream is not available." });
      return;
    }

    // Add viewer to the stream's viewer set
    stream.viewers.add(socket.id);
    socket.join(streamId); // Viewer joins the room
    socket.streamId = streamId;
    socket.role = "viewer";

    console.log(
      `[VIEWER JOINED] Stream: ${streamId} | Socket: ${socket.id} | Total viewers: ${stream.viewers.size}`
    );

    // Notify the host about the new viewer (triggers WebRTC offer)
    io.to(stream.hostSocketId).emit("viewer-joined", {
      viewerSocketId: socket.id,
    });

    // Send updated viewer count to host
    io.to(stream.hostSocketId).emit("viewer-count", {
      count: stream.viewers.size,
    });
  });

  /* -------------------------------------------------------
   * WEBRTC SIGNALING — Offer/Answer/ICE
   * -------------------------------------------------------
   * These events relay SDP offers/answers and ICE candidates
   * between host and viewers through the Socket.IO server.
   * No media data is transmitted here — only signaling metadata.
   * ------------------------------------------------------- */

  /**
   * Host sends WebRTC offer to a specific viewer.
   * Each viewer gets a unique offer/answer pair.
   */
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  /**
   * Viewer sends WebRTC answer back to the host.
   */
  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  /**
   * ICE candidate exchange between host and viewer.
   * Needed for NAT traversal and establishing the peer connection.
   */
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  /* -------------------------------------------------------
   * HOST: "end-stream"
   * Host explicitly ends the stream.
   * All viewers are disconnected and notified.
   * Stream data is deleted from memory.
   * ------------------------------------------------------- */
  socket.on("end-stream", ({ streamId }) => {
    const stream = streams.get(streamId);
    if (stream) {
      console.log(`[STREAM ENDED] Stream: ${streamId}`);

      // Notify all viewers that the stream has ended
      io.to(streamId).emit("stream-ended", {
        message: "The host has ended the stream.",
      });

      // Close all viewer connections
      stream.viewers.forEach((viewerSocketId) => {
        const viewerSocket = io.sockets.sockets.get(viewerSocketId);
        if (viewerSocket) {
          viewerSocket.disconnect(true);
        }
      });

      // Delete the stream from memory
      streams.delete(streamId);
      console.log(`[STREAM DELETED] Stream: ${streamId}`);
    }
  });

  /* -------------------------------------------------------
   * DISCONNECT HANDLER
   * -------------------------------------------------------
   * Handles both host and viewer disconnections gracefully.
   * - If HOST disconnects: end stream, notify all viewers
   * - If VIEWER disconnects: remove from viewer set, 
   *   notify host, do NOT interrupt stream
   * ------------------------------------------------------- */
  socket.on("disconnect", () => {
    const { streamId, role } = socket;
    if (!streamId) return;

    const stream = streams.get(streamId);
    if (!stream) return;

    if (role === "host") {
      /* Host disconnected — end the entire stream */
      console.log(`[HOST DISCONNECTED] Stream: ${streamId}`);

      io.to(streamId).emit("stream-ended", {
        message: "The host has disconnected. Stream ended.",
      });

      stream.viewers.forEach((viewerSocketId) => {
        const viewerSocket = io.sockets.sockets.get(viewerSocketId);
        if (viewerSocket) viewerSocket.disconnect(true);
      });

      streams.delete(streamId);
      console.log(`[STREAM DELETED] Stream: ${streamId}`);
    } else if (role === "viewer") {
      /* Viewer disconnected — remove from set, notify host */
      stream.viewers.delete(socket.id);
      console.log(
        `[VIEWER DISCONNECTED] Stream: ${streamId} | Socket: ${socket.id} | Remaining: ${stream.viewers.size}`
      );

      // Notify host about viewer count update
      if (stream.hostSocketId) {
        io.to(stream.hostSocketId).emit("viewer-count", {
          count: stream.viewers.size,
        });
        io.to(stream.hostSocketId).emit("viewer-left", {
          viewerSocketId: socket.id,
        });
      }
    }
  });
});

/* ===========================================================
 * START SERVER
 * =========================================================== */
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║  ADEM DIGITAL — STREAMING SERVER                ║
║                                                  ║
║  Server running on http://localhost:${PORT}        ║
║                                                  ║
║  Pages:                                          ║
║    Main site:  http://localhost:${PORT}/index.html ║
║    Host:       http://localhost:${PORT}/stream-host.html ║
║    Viewer:     http://localhost:${PORT}/stream.html      ║
╚══════════════════════════════════════════════════╝
  `);
});
