import * as readline from "readline";
import { performance } from "perf_hooks";
import BedrockEmbeddingGenerator from "./BedrockEmbeddingGenerator";
import { Client as OpenSearchClient } from "@opensearch-project/opensearch";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

class EmbeddingService {
  private embeddingGenerator: BedrockEmbeddingGenerator;
  private openSearchClient: OpenSearchClient;
  private s3Client: S3Client;
  private indexName: string;

  constructor(region: string, openSearchEndpoint: string, indexName: string) {
    this.embeddingGenerator = new BedrockEmbeddingGenerator(region);
    this.openSearchClient = new OpenSearchClient({
      node: openSearchEndpoint,
    });
    this.s3Client = new S3Client({ region });
    this.indexName = indexName;
  }

  public async processS3Object(
    bucket: string,
    key: string,
    chunkSize: number = 512,
    maxChunks: number = Infinity
  ): Promise<void> {
    const startTime = performance.now();
    const s3Stream = await this.getS3ObjectStream(bucket, key);

    const rl = readline.createInterface({
      input: s3Stream,
      crlfDelay: Infinity,
    });

    let buffer: string[] = [];
    let idCounter = 1;

    for await (const line of rl) {
      buffer.push(line);

      if (buffer.join(" ").length >= chunkSize) {
        await this.processChunk(buffer.join(" "), idCounter.toString());
        buffer = []; // Clear buffer
        idCounter++;

        // Stop processing if the max chunk limit is reached
        if (idCounter > maxChunks) {
          console.log(`Max chunks limit of ${maxChunks} reached. Stopping processing.`);
          break;
        }
      }
    }

    // Process any remaining text in the buffer
    if (buffer.length > 0 && idCounter <= maxChunks) {
      await this.processChunk(buffer.join(" "), idCounter.toString());
    }

    const endTime = performance.now();
    console.log(
      `File processing completed. Total time: ${(endTime - startTime).toFixed(
        2
      )} ms`
    );
  }

  private async getS3ObjectStream(bucket: string, key: string): Promise<Readable> {
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const { Body } = await this.s3Client.send(command);
      return Body as Readable;
    } catch (error) {
      console.error(`Failed to retrieve S3 object ${key} from bucket ${bucket}`, error);
      throw error;
    }
  }

  private async processChunk(text: string, id: string): Promise<void> {
    const startEmbeddingTime = performance.now();

    try {
      console.log(`Processing chunk ID: ${id}...`);

      // Measure time for generating embeddings
      const embedding = await this.embeddingGenerator.generateEmbeddings(text);

      const endEmbeddingTime = performance.now();
      console.log(
        `Time taken to generate embeddings for chunk ID ${id}: ${(
          endEmbeddingTime - startEmbeddingTime
        ).toFixed(2)} ms`
      );

      const startStoreTime = performance.now();

      // Store the embedding in OpenSearch
      await this.openSearchClient.index({
        index: this.indexName,
        id: id,
        body: {
          "bedrock-knowledge-base-default-vector": embedding,
          AMAZON_BEDROCK_TEXT_CHUNK: text,
          AMAZON_BEDROCK_METADATA: "", // Add any relevant metadata here
          "x-amz-bedrock-kb-data-source-id": "source-id", // Replace with your source ID
          "x-amz-bedrock-kb-source-uri": "source-uri",   // Replace with your source URI
        },
      });

      const endStoreTime = performance.now();
      console.log(
        `Time taken to store embedding for chunk ID ${id}: ${(
          endStoreTime - startStoreTime
        ).toFixed(2)} ms`
      );
    } catch (error) {
      console.error(`Failed to process chunk with ID: ${id}`, error);
    }
  }

  public async queryEmbeddings(
    queryText: string,
    topK: number = 5
  ): Promise<any> {
    try {
      console.log(`Generating embeddings for query text: "${queryText}"...`);

      // Generate embeddings for the query text
      const queryEmbedding = await this.embeddingGenerator.generateEmbeddings(
        queryText
      );

      console.log("Querying OpenSearch for similar embeddings...");

      // Query OpenSearch for the most similar embeddings using the specified parameters
      const response = await this.openSearchClient.search({
        index: this.indexName,
        body: {
          query: {
            script_score: {
              query: { match_all: {} },
              script: {
                source: `
                  1.0 / (1.0 + l2norm(params.queryVector, 'bedrock-knowledge-base-default-vector'))
                `,
                params: {
                  queryVector: queryEmbedding,
                },
              },
            },
          },
          size: topK,
        },
      });

      return response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        text: hit._source.AMAZON_BEDROCK_TEXT_CHUNK,
        metadata: hit._source.AMAZON_BEDROCK_METADATA,
      }));
    } catch (error) {
      console.error("Error querying embeddings:", error);
      throw error;
    }
  }

  public getOpenSearchClient(): OpenSearchClient {
    return this.openSearchClient;
  }
}

export default EmbeddingService;
