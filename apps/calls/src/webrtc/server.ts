import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "@app/bot/lib";
import { initKafka, producer, TOPICS } from "@app/kafka";

type RTCSessionDescriptionInit = any;
type RTCIceCandidateInit = any;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CustomSocket extends Socket {
  userId?: string;
  roomId?: string;
}

export const initWebRTCServer = async () => {
  await initKafka();

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.static(path.join(__dirname, "public")));

  app.get("/call/:roomId", (req, res) => {
    const { roomId } = req.params;
    const { callerId, calleeId } = req.query;

    logger.info(
      `Mini App request: room=${roomId}, caller=${callerId}, callee=${calleeId}`
    );

    const htmlPath = path.join(__dirname, "public", "call.html");
    res.sendFile(htmlPath, (err) => {
      if (err) {
        logger.error(`Error sending HTML file: ${err}`);
        res.status(500).send("Error loading the call page.");
      }
    });
  });

  io.on("connection", (socket: CustomSocket) => {
    socket.on("set-user-id", (userId: string) => {
      socket.userId = userId;
    });

    socket.on("join-room", (data: { userId: string; roomId: string }) => {
      const { userId, roomId } = data;
      socket.userId = userId;
      socket.roomId = roomId;

      socket.join(roomId);

      const room = io.sockets.adapter.rooms.get(roomId) ?? new Set();
      const participants = room.size;

      if (participants > 2) {
        socket.leave(roomId);
        socket.emit("room-full");
        return;
      }

      socket.emit("room-state", { participants });
      socket.to(roomId).emit("user-joined", { userId, participants });
    });

    socket.on("offer", (data: { offer: RTCSessionDescriptionInit }) => {
      socket.to(socket.roomId!).emit("offer", {
        offer: data.offer,
        fromUserId: socket.userId,
      });
    });

    socket.on("answer", (data: { answer: RTCSessionDescriptionInit }) => {
      socket.to(socket.roomId!).emit("answer", {
        answer: data.answer,
        fromUserId: socket.userId,
      });
    });

    socket.on("ice-candidate", (data: { candidate: RTCIceCandidateInit }) => {
      socket.to(socket.roomId!).emit("ice-candidate", {
        candidate: data.candidate,
        fromUserId: socket.userId,
      });
    });

    socket.on("end-call", () => {
      socket.to(socket.roomId!).emit("call-ended");
    });

    socket.on(
      "user-opened-app",
      (payload: { userId: string; roomId: string }) => {
        producer.send({
          topic: TOPICS.CALL_STATUS,
          messages: [
            {
              value: JSON.stringify({
                type: "USER_OPENED_MINIAPP",
                userId: payload.userId,
                roomId: payload.roomId,
                timestamp: Date.now(),
              }),
            },
          ],
        });
      }
    );

    socket.on("disconnect", () => {
      if (socket.roomId) {
        socket.to(socket.roomId).emit("user-disconnected", {
          userId: socket.userId,
        });
      }

      if (socket.userId) {
        producer.send({
          topic: TOPICS.CALL_STATUS,
          messages: [
            {
              value: JSON.stringify({
                type: "USER_CLOSED_MINIAPP",
                userId: socket.userId,
                timestamp: Date.now(),
              }),
            },
          ],
        });
      }
    });
  });

  const PORT = process.env.WEBRTC_SERVER_PORT || 4000;
  server.listen(PORT, () => {
    logger.info(`WebRTC server is running on port ${PORT}`);
  });
};
