export function parseBashCommands(text: string): string[] {
  const regex = /```bash\n([\s\S]*?)\n```/gi;
  const commands: string[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    commands.push(match[1]!.trim());
  }

  if (commands.length > 0) {
    return [commands[commands.length - 1]!];
  }

  return [];
}

export function parsePlanAndNextStep(text: string): { plan?: string; nextStep?: string } {
  const result: { plan?: string; nextStep?: string } = {};
  
  // Extract plan block
  const planRegex = /<plan>\s*([\s\S]*?)\s*<\/plan>/i;
  const planMatch = text.match(planRegex);
  if (planMatch) {
    result.plan = planMatch[1]!.trim();
  }
  
  // Extract next_step block
  const nextStepRegex = /<next_step>\s*([\s\S]*?)\s*<\/next_step>/i;
  const nextStepMatch = text.match(nextStepRegex);
  if (nextStepMatch) {
    result.nextStep = nextStepMatch[1]!.trim();
  }
  
  return result;
}

export function parseDelegationNextStep(nextStep?: string): { target: string; task: string } | null {
  if (!nextStep) {
    return null;
  }

  const match = nextStep.match(/@([^\s:]+)\s*:\s*(.+)/);
  if (!match) {
    return null;
  }

  const target = match[1]?.trim();
  const task = match[2]?.trim();

  if (!target || !task) {
    return null;
  }

  return { target, task };
}
