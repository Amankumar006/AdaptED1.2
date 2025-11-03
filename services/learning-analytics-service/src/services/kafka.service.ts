import { Kafka, Consumer, Producer, EachMessagePayload, KafkaMessage } from 'kafkajs';
import config from '../config/config';
import { logger } from '../utils/logger';
import { LearningEvent, EventType } from '../types/analytics.types';

class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;
  private eventHandlers: Map<EventType, (event: LearningEvent) => Promise<void>> = new Map();

  constructor() {
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8,
      },
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });

    this.consumer = this.kafka.consumer({
      groupId: config.kafka.groupId,
      sessionTimeout: 30000,
      rebalanceTimeout: 60000,
      heartbeatInterval: 3000,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      
      // Subscribe to all configured topics
      for (const topic of config.kafka.topics) {
        await this.consumer.subscribe({ topic, fromBeginning: false });
      }

      this.isConnected = true;
      logger.info('Kafka service connected successfully', {
        brokers: config.kafka.brokers,
        topics: config.kafka.topics,
      });
    } catch (error) {
      logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka service disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Kafka', error);
    }
  }

  async publishEvent(topic: string, event: LearningEvent): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka service is not connected');
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: event.userId,
            value: JSON.stringify(event),
            timestamp: event.timestamp.getTime().toString(),
            headers: {
              eventType: event.eventType,
              userId: event.userId,
              sessionId: event.sessionId,
            },
          },
        ],
      });

      logger.debug('Event published to Kafka', {
        topic,
        eventType: event.eventType,
        userId: event.userId,
        eventId: event.id,
      });
    } catch (error) {
      logger.error('Failed to publish event to Kafka', {
        error,
        topic,
        eventType: event.eventType,
        eventId: event.id,
      });
      throw error;
    }
  }

  async publishBatchEvents(topic: string, events: LearningEvent[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka service is not connected');
    }

    try {
      const messages = events.map(event => ({
        key: event.userId,
        value: JSON.stringify(event),
        timestamp: event.timestamp.getTime().toString(),
        headers: {
          eventType: event.eventType,
          userId: event.userId,
          sessionId: event.sessionId,
        },
      }));

      await this.producer.send({
        topic,
        messages,
      });

      logger.debug('Batch events published to Kafka', {
        topic,
        eventCount: events.length,
      });
    } catch (error) {
      logger.error('Failed to publish batch events to Kafka', {
        error,
        topic,
        eventCount: events.length,
      });
      throw error;
    }
  }

  registerEventHandler(eventType: EventType, handler: (event: LearningEvent) => Promise<void>): void {
    this.eventHandlers.set(eventType, handler);
    logger.info('Event handler registered', { eventType });
  }

  async startConsuming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka service is not connected');
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        await this.handleMessage(topic, partition, message);
      },
    });

    logger.info('Kafka consumer started');
  }

  private async handleMessage(topic: string, partition: number, message: KafkaMessage): Promise<void> {
    try {
      if (!message.value) {
        logger.warn('Received empty message', { topic, partition });
        return;
      }

      const event: LearningEvent = JSON.parse(message.value.toString());
      
      // Validate event structure
      if (!this.isValidEvent(event)) {
        logger.warn('Received invalid event structure', { topic, partition, event });
        return;
      }

      // Get event handler
      const handler = this.eventHandlers.get(event.eventType);
      if (!handler) {
        logger.warn('No handler registered for event type', {
          eventType: event.eventType,
          topic,
          partition,
        });
        return;
      }

      // Process event
      const startTime = Date.now();
      await handler(event);
      const processingTime = Date.now() - startTime;

      logger.debug('Event processed successfully', {
        eventType: event.eventType,
        eventId: event.id,
        userId: event.userId,
        processingTime,
        topic,
        partition,
      });

      // Track processing metrics
      await this.trackProcessingMetrics(event.eventType, processingTime);

    } catch (error) {
      logger.error('Error processing Kafka message', {
        error,
        topic,
        partition,
        offset: message.offset,
      });
      
      // In a production environment, you might want to send failed messages
      // to a dead letter queue for later analysis
      await this.handleProcessingError(topic, partition, message, error);
    }
  }

  private isValidEvent(event: any): event is LearningEvent {
    return (
      event &&
      typeof event.id === 'string' &&
      typeof event.userId === 'string' &&
      typeof event.sessionId === 'string' &&
      typeof event.eventType === 'string' &&
      event.eventData &&
      event.context &&
      event.timestamp
    );
  }

  private async trackProcessingMetrics(eventType: EventType, processingTime: number): Promise<void> {
    try {
      // This would typically integrate with your monitoring system
      // For now, we'll log the metrics
      logger.debug('Processing metrics', {
        eventType,
        processingTime,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to track processing metrics', error);
    }
  }

  private async handleProcessingError(
    topic: string,
    partition: number,
    message: KafkaMessage,
    error: any
  ): Promise<void> {
    try {
      // In a production environment, you would send this to a dead letter queue
      // or error tracking system
      logger.error('Message processing failed - would send to DLQ', {
        topic,
        partition,
        offset: message.offset,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } catch (dlqError) {
      logger.error('Failed to handle processing error', dlqError);
    }
  }

  async getTopicMetadata(topic: string): Promise<any> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
      
      await admin.disconnect();
      return metadata;
    } catch (error) {
      logger.error('Failed to fetch topic metadata', { error, topic });
      throw error;
    }
  }

  async createTopics(topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>): Promise<void> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      await admin.createTopics({
        topics: topics.map(t => ({
          topic: t.topic,
          numPartitions: t.numPartitions || 3,
          replicationFactor: t.replicationFactor || 1,
        })),
      });
      
      await admin.disconnect();
      logger.info('Topics created successfully', { topics: topics.map(t => t.topic) });
    } catch (error) {
      logger.error('Failed to create topics', { error, topics });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();
      
      // Try to list topics as a health check
      await admin.listTopics();
      
      await admin.disconnect();
      return true;
    } catch (error) {
      logger.error('Kafka health check failed', error);
      return false;
    }
  }

  isConnected(): boolean {
    return this.isConnected;
  }

  // Utility methods for common event publishing patterns
  async publishLearningEvent(event: LearningEvent): Promise<void> {
    await this.publishEvent('learning-events', event);
  }

  async publishUserEvent(event: LearningEvent): Promise<void> {
    await this.publishEvent('user-events', event);
  }

  async publishContentEvent(event: LearningEvent): Promise<void> {
    await this.publishEvent('content-events', event);
  }

  async publishAssessmentEvent(event: LearningEvent): Promise<void> {
    await this.publishEvent('assessment-events', event);
  }

  // Method to pause/resume consumption (useful for maintenance)
  async pauseConsumer(): Promise<void> {
    await this.consumer.pause(config.kafka.topics.map(topic => ({ topic })));
    logger.info('Kafka consumer paused');
  }

  async resumeConsumer(): Promise<void> {
    await this.consumer.resume(config.kafka.topics.map(topic => ({ topic })));
    logger.info('Kafka consumer resumed');
  }
}

export const kafkaService = new KafkaService();
export default kafkaService;