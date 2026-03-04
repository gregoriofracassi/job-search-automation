import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seedUserPreferences() {
  const defaultPreference = await prisma.userPreference.findFirst({
    where: { isDefault: true },
  });

  if (defaultPreference) {
    console.log('Default user preference already exists, skipping seed');
    return;
  }

  await prisma.userPreference.create({
    data: {
      id: randomUUID(),
      systemPrompt: `You are an expert job evaluator. Score jobs based on how well they match the candidate's preferences for:
- Remote-first companies
- TypeScript/Node.js/React stack
- Product-focused engineering culture
- Competitive compensation

Be objective and thorough in your evaluation. Provide specific reasoning for your scores.`,

      scoringCriteria: [
        'Remote work flexibility',
        'Modern tech stack (TypeScript/React/Node.js)',
        'Product engineering culture',
        'Company growth stage and funding',
        'Competitive salary range',
      ],

      excludedKeywords: ['php', 'python', 'java '], // Note: space after "java" to exclude Java but keep JavaScript

      minScoreThreshold: 70,

      llmProvider: 'openrouter',
      llmModel: 'google/gemini-2.5-flash', // Fast, cost-effective reasoning model

      userId: null, // No user association yet
      isDefault: true,
    },
  });

  console.log('✅ Default user preference seeded');
}

seedUserPreferences()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
