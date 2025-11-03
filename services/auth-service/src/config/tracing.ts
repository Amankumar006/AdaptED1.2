/**
 * OpenTelemetry tracing configuration
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.SERVICE_NAME || 'auth-service';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
const otelCollectorUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector.educational-platform-monitoring:4318';

export function initTracing() {
  const traceExporter = new OTLPTraceExporter({
    url: `${otelCollectorUrl}/v1/traces`,
  });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation for less noise
        },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('OpenTelemetry tracing terminated'))
      .catch((error) => console.error('Error terminating OpenTelemetry tracing', error))
      .finally(() => process.exit(0));
  });

  console.log(`OpenTelemetry tracing initialized for ${serviceName}`);
}
