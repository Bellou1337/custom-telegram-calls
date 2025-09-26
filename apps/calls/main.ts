import { TOPICS, producer, createConsumer, initKafka } from "@app/kafka";
import { logger } from "@app/bot/lib";
import { initWebRTCServer } from "./src/webrtc";

await initKafka();

const callsConsumer = await createConsumer("calls-consumer");
const statusConsumer = await createConsumer("status-consumer");

await callsConsumer.connect();
await statusConsumer.connect();

await callsConsumer.subscribe({
  topics: [TOPICS.CALL_EVENTS],
  fromBeginning: true,
});

await statusConsumer.subscribe({
  topics: [TOPICS.CALL_STATUS],
  fromBeginning: false,
});

const generateCallUrl = async (
  callerId: string,
  calleeId: string
): Promise<string> => {
  const tunnelUrl = process.env.TUNNEL_URL!;
  const roomId = `${callerId}-${calleeId}-${Date.now()}`;

  return `${tunnelUrl}/call/${roomId}?callerId=${callerId}&calleeId=${calleeId}`;
};

await initWebRTCServer();

await callsConsumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      const data = JSON.parse(message.value?.toString() || "{}");
      const telegramUrl = await generateCallUrl(data?.callerId, data?.calleeId);

      producer.send({
        topic: TOPICS.CALL_URLS,
        messages: [
          {
            key: `${data?.callerId}_${data?.calleeId}_${Date.now()}`,
            value: JSON.stringify({
              type: "URL_GENERATED",
              callerId: data?.callerId,
              calleeId: data?.calleeId,
              telegramUrl: telegramUrl,
            }),
          },
        ],
      });
    } catch (error) {
      logger.error(
        `Error processing message in topic ${topic}, partition ${partition}: ${
          (error as Error).message
        }`
      );
    }
  },
});

await statusConsumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      const data = JSON.parse(message.value?.toString() || "{}");

      logger.info(`Received status event: ${JSON.stringify(data)}`);

      if (data.type === "USER_OPENED_MINIAPP") {
        logger.info(
          `User ${data.userId} OPENED Mini App in room ${data.roomId}`
        );
      }

      if (data.type === "USER_CLOSED_MINIAPP") {
        logger.info(`User ${data.userId} CLOSED Mini App`);

        await producer.send({
          topic: TOPICS.USER_COMMANDS,
          messages: [
            {
              key: `update_status_${data.userId}`,
              value: JSON.stringify({
                type: "UPDATE_USER_STATUS",
                userId: data.userId,
                status: "ACTIVE",
                reason: "MINIAPP_CLOSED",
                timestamp: Date.now(),
              }),
            },
          ],
        });

        logger.info(`Sent UPDATE_USER_STATUS command for user ${data.userId}`);
      }
    } catch (error) {
      logger.error(
        `Error processing message in topic ${topic}, partition ${partition}: ${
          (error as Error).message
        }`
      );
    }
  },
});
