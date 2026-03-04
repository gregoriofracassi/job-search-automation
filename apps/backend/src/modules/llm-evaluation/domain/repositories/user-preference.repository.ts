import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UserPreference } from '../models/user-preference.model';

@Injectable()
export class UserPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find the default user preference
   */
  async findDefault(): Promise<UserPreference | null> {
    const prismaPreference = await this.prisma.userPreference.findFirst({
      where: { isDefault: true },
    });

    if (!prismaPreference) return null;

    return new UserPreference({
      id: prismaPreference.id,
      systemPrompt: prismaPreference.systemPrompt,
      scoringCriteria: prismaPreference.scoringCriteria,
      excludedKeywords: prismaPreference.excludedKeywords,
      minScoreThreshold: prismaPreference.minScoreThreshold,
      llmProvider: prismaPreference.llmProvider,
      llmModel: prismaPreference.llmModel,
      userId: prismaPreference.userId,
      isDefault: prismaPreference.isDefault,
      createdAt: prismaPreference.createdAt,
      updatedAt: prismaPreference.updatedAt,
    });
  }

  /**
   * Find preference by ID
   */
  async findById(id: string): Promise<UserPreference | null> {
    const prismaPreference = await this.prisma.userPreference.findUnique({
      where: { id },
    });

    if (!prismaPreference) return null;

    return new UserPreference({
      id: prismaPreference.id,
      systemPrompt: prismaPreference.systemPrompt,
      scoringCriteria: prismaPreference.scoringCriteria,
      excludedKeywords: prismaPreference.excludedKeywords,
      minScoreThreshold: prismaPreference.minScoreThreshold,
      llmProvider: prismaPreference.llmProvider,
      llmModel: prismaPreference.llmModel,
      userId: prismaPreference.userId,
      isDefault: prismaPreference.isDefault,
      createdAt: prismaPreference.createdAt,
      updatedAt: prismaPreference.updatedAt,
    });
  }

  /**
   * Save (create or update) user preference
   */
  async save(preference: UserPreference): Promise<void> {
    await this.prisma.userPreference.upsert({
      where: { id: preference.id },
      create: {
        id: preference.id,
        systemPrompt: preference.systemPrompt,
        scoringCriteria: preference.scoringCriteria,
        excludedKeywords: preference.excludedKeywords,
        minScoreThreshold: preference.minScoreThreshold,
        llmProvider: preference.llmProvider,
        llmModel: preference.llmModel,
        userId: preference.userId,
        isDefault: preference.isDefault,
        createdAt: preference.createdAt,
        updatedAt: preference.updatedAt,
      },
      update: {
        systemPrompt: preference.systemPrompt,
        scoringCriteria: preference.scoringCriteria,
        excludedKeywords: preference.excludedKeywords,
        minScoreThreshold: preference.minScoreThreshold,
        llmProvider: preference.llmProvider,
        llmModel: preference.llmModel,
        isDefault: preference.isDefault,
        updatedAt: preference.updatedAt,
      },
    });
  }
}
