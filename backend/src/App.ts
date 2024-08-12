import { existsSync } from "fs";
import EmbeddingService from "./EmbeddingService";

async function run() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage: npm run query <queryText>");
    process.exit(1);
  }

  const queryText = args.join(" ");

  const service = new EmbeddingService("us-east-1");
  const db = service.getDatabase();

  if (!existsSync("database.json")) {
    const filePath = "data/Alices_Adventures_in_Wonderland.txt";
    const chunkSize = 512;
    await service.processFile(filePath, chunkSize);
    await db.dumpFile("database.json");
  } else {
    await db.loadFile("database.json");
  }

  const result = await service.queryEmbeddings(queryText, 3);
  console.log(result.map((r: any) => r.document.metadata));
}

run();
