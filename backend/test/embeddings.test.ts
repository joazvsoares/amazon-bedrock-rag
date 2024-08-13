import { handler } from "../src/lambda/embeddings";

test('Lambda Embeddings', async () => {
  await handler({
    openSearchEndpoint:
      "https://trc47i90l1pnps2x0gb8.us-east-1.aoss.amazonaws.com",
    indexName: "bedrock-knowledge-base-default-index",
    bucket: "vml-test-bedrock-knowledge-bases",
    key: "Alices_Adventures_in_Wonderland.txt",
    chunkSize: 512,
    maxChunks: 1,
  });
});