import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
  InvokeModelCommandOutput,
} from "@aws-sdk/client-bedrock-runtime";

class BedrockEmbeddingGenerator {
  private client: BedrockRuntimeClient;
  private modelName: string;

  constructor(
    region: string,
    modelName: string = "amazon.titan-embed-text-v1"
  ) {
    this.client = new BedrockRuntimeClient({ region });
    this.modelName = modelName;
  }

  public async generateEmbeddings(inputText: string): Promise<any> {
    // Construct the input for the InvokeModelCommand
    const params: InvokeModelCommandInput = {
      modelId: this.modelName,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        inputText: inputText,
      }),
    };

    try {
      // Call the model to generate embeddings
      const command = new InvokeModelCommand(params);
      const response: InvokeModelCommandOutput = await this.client.send(
        command
      );

      // Process the response to extract embeddings (assume JSON output)
      if (response.body) {
        const embeddings = JSON.parse(
          new TextDecoder("utf-8").decode(response.body)
        );
        return embeddings.embedding;
      } else {
        throw new Error("Failed to generate embeddings: Empty response body");
      }
    } catch (error) {
      console.error("Error generating embeddings:", error);
      throw error;
    }
  }
}

export default BedrockEmbeddingGenerator;
