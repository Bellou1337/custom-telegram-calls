import { TOPICS, consumer, initKafka } from "@app/kafka";
import { logger } from "@app/bot/lib";

await consumer.subscribe({
  topics: [TOPICS.CALL_EVENTS],
  fromBeginning: true,
});

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    try {
      const data = JSON.parse(message.value?.toString() || "{}");
      // TODO: инициализировать звонок и обработать разные типы событий
      console.log(data);
    } catch (error) {
      logger.error(
        `Error processing message in topic ${topic}, partition ${partition}: ${
          (error as Error).message
        }`
      );
    }
  },
});
