import { handler } from "../src/lambda/embeddings";

test('Lambda Embeddings', async () => {
  await handler({
    openSearchEndpoint: 'https://opensearch-endpoint',
    bucket: 'bucket',
    key: 'key',
    chunkSize: 512,
    maxChunks: 1
  })
});