import { TOPICS, producer, createConsumer, initKafka } from "@app/kafka";
import { logger } from "@app/bot/lib";

await initKafka();

const callsConsumer = await createConsumer("calls-consumer");

await callsConsumer.connect();

await callsConsumer.subscribe({
  topics: [TOPICS.CALL_EVENTS],
  fromBeginning: true,
});

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

const generateCallUrl = async (
  callersId: string,
  calleeId: string
): Promise<string> => {
  const tunnelUrl = process.env.TUNNEL_URL!;

  return `${tunnelUrl}/${callersId}-${calleeId}-${Date.now()}`;
};

// TODO: сделать функцию которая будет генерировать url для мини апс, для этого нужно поднять
// http туннель, юзай tuna
// 1) поднимаешь туннель генеришь урл по типа https://tuna_url/callers_id-callee_id-date.now()
// 2) делаешь возврат этого урла через кафку: produser.send... и делаешь новый топик по типу CALL_URLS
// 3) в боте подписываешься на этот топик и получаешь урл
// 4) отправляешь юзерам(тот кто звонит и тому кто принимает) сообщение с этим урлом через notifyUsers, который в сервисе notify
