import EmbeddingService from '../EmbeddingService';

export const handler = async (event: any): Promise<any> => {
  try {
    // Extract parameters from the event
    const region = process.env.AWS_REGION || 'us-east-1';
    const openSearchEndpoint = event.openSearchEndpoint || process.env.OPENSEARCH_ENDPOINT;
    const indexName = event.indexName || 'default-index';
    const bucket = event.bucket;
    const key = event.key;
    const chunkSize = event.chunkSize || 512;
    const maxChunks = event.maxChunks || Infinity;

    if (!bucket || !key) {
      throw new Error('Bucket and key must be provided in the event.');
    }

    if (!openSearchEndpoint) {
      throw new Error('OpenSearch endpoint must be provided in the event or environment variables.');
    }

    // Initialize the EmbeddingService
    const embeddingService = new EmbeddingService(region, openSearchEndpoint, indexName);

    // Process the S3 object
    await embeddingService.processS3Object(bucket, key, chunkSize, maxChunks);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Processing completed successfully',
      }),
    };
  } catch (error) {
    console.error('Error processing S3 object:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing S3 object',
      }),
    };
  }
};
