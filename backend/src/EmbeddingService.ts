import * as fs from "fs";
import * as readline from "readline";
import { performance } from "perf_hooks";
import BedrockEmbeddingGenerator from "./BedrockEmbeddingGenerator";
import { VectorDB } from "imvectordb";

class EmbeddingService {
  private embeddingGenerator: BedrockEmbeddingGenerator;
  private db: VectorDB;

  constructor(region: string) {
    this.embeddingGenerator = new BedrockEmbeddingGenerator(region);
    this.db = new VectorDB();
  }

  public async processFile(
    filePath: string,
    chunkSize: number = 512
  ): Promise<void> {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let buffer: string[] = [];
    let idCounter = 1;
    const startTime = performance.now();

    for await (const line of rl) {
      buffer.push(line);

      if (buffer.join(" ").length >= chunkSize) {
        await this.processChunk(buffer.join(" "), idCounter.toString());
        buffer = []; // Clear buffer
        idCounter++;
      }
    }

    // Process any remaining text in the buffer
    if (buffer.length > 0) {
      await this.processChunk(buffer.join(" "), idCounter.toString());
    }

    const endTime = performance.now();
    console.log(
      `File processing completed. Total time: ${(endTime - startTime).toFixed(
        2
      )} ms`
    );
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

      // Store the embedding in the database
      this.db.add({
        id: id,
        embedding: embedding,
        metadata: { text: text },
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

      console.log("Querying the database for similar embeddings...");

      // Query the database for the most similar embeddings
      const results = this.db.query(queryEmbedding, topK);

      return results;
    } catch (error) {
      console.error("Error querying embeddings:", error);
      throw error;
    }
  }

  public getDatabase(): VectorDB {
    return this.db;
  }
}

export default EmbeddingService;
