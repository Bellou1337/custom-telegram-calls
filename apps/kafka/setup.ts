import { Kafka, logLevel } from "kafkajs";
import { logger } from "@app/bot/lib";

const KAFKA_BROKERS = process.env.KAFKA_BROKERS!;

export const TOPICS = {
  CALL_EVENTS: "call-events",
} as const;

const kafka = new Kafka({
  clientId: "custom-telegram-calls",
  brokers: KAFKA_BROKERS?.split(","),
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

export const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
});

export const consumer = kafka.consumer({
  groupId: "custom-telegram-calls-group",
  sessionTimeout: 30000,
  rebalanceTimeout: 60000,
  heartbeatInterval: 3000,
});

const admin = kafka.admin();

export const initKafka = async () => {
  logger.info("Connecting to Kafka...");
  await producer.connect();
  await consumer.connect();

  logger.info("Connected to Kafka successfully");
  await createTopics();
};

const createTopics = async () => {
  logger.info("Creating Kafka topics if not exist...");
  await admin.connect();

  const existingTopics = await admin.listTopics();
  const topicsToCreate = Object.values(TOPICS).filter(
    (topic) => !existingTopics.includes(topic)
  );

  const topicConfigs = topicsToCreate.map((topic) => ({
    topic,
    numPartitions: 3,
    replicationFactor: 1,
  }));

  await admin.createTopics({
    topics: topicConfigs,
    waitForLeaders: true,
  });

  logger.info("Kafka topics are ready.");
  await admin.disconnect();
};

export const disconnectKafka = async () => {
  await producer.disconnect();
  await consumer.disconnect();
};
