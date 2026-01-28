import { type LLMClient } from './llmClient';
import { JailClient } from './jailClient';
import { parseBashCommands } from './responseParser';
import { SYSTEM_PROMPT } from './prompts';

const MAX_ITERATIONS = 10;

export class SWEAgent {
  private conversationHistory: { role: string; content: string }[] = [];

  constructor(
    private readonly llmClient: LLMClient,
    private readonly jailClient: JailClient,
    systemPrompt: string = SYSTEM_PROMPT,
  ) {
    this.conversationHistory.push({ role: 'system', content: systemPrompt });
  }

  get currentJailClient(): JailClient {
    return this.jailClient;
  }

  async run(task: string): Promise<{ role: string; content: string }[]> {
    this.conversationHistory.push({ role: 'user', content: task });

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const modelResponse = await this.llmClient.send(this.getPrompt());
      this.conversationHistory.push({ role: 'assistant', content: modelResponse });

      const commands = parseBashCommands(modelResponse);

      if (commands.length > 0) {
        const commandOutput = await this.jailClient.execute(commands[0]!);
        this.conversationHistory.push({ role: 'tool', content: commandOutput });
      } else {
        // If the model doesn't return a command, we assume it's done.
        break;
      }
    }

    return this.conversationHistory;
  }

  private getPrompt(): string {
    return this.conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n\n');
  }
}
