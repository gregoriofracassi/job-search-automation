import { AggregateRoot } from '@nestjs/cqrs';

export interface UserPreferenceProps {
  id: string;
  systemPrompt: string;
  scoringCriteria: string[];
  excludedKeywords: string[];
  minScoreThreshold: number;
  llmProvider: string;
  llmModel: string;
  userId: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * UserPreference aggregate root
 * Stores LLM evaluation configuration and scoring criteria
 */
export class UserPreference extends AggregateRoot {
  #props: UserPreferenceProps;

  constructor(props: UserPreferenceProps) {
    super();
    this.#props = props;
  }

  get id(): string {
    return this.#props.id;
  }

  get systemPrompt(): string {
    return this.#props.systemPrompt;
  }

  get scoringCriteria(): string[] {
    return this.#props.scoringCriteria;
  }

  get excludedKeywords(): string[] {
    return this.#props.excludedKeywords;
  }

  get minScoreThreshold(): number {
    return this.#props.minScoreThreshold;
  }

  get llmProvider(): string {
    return this.#props.llmProvider;
  }

  get llmModel(): string {
    return this.#props.llmModel;
  }

  get userId(): string | null {
    return this.#props.userId;
  }

  get isDefault(): boolean {
    return this.#props.isDefault;
  }

  get createdAt(): Date {
    return this.#props.createdAt;
  }

  get updatedAt(): Date {
    return this.#props.updatedAt;
  }

  /**
   * Update evaluation configuration
   */
  updateConfiguration(
    systemPrompt?: string,
    scoringCriteria?: string[],
    excludedKeywords?: string[],
    minScoreThreshold?: number,
  ): void {
    if (systemPrompt !== undefined) this.#props.systemPrompt = systemPrompt;
    if (scoringCriteria !== undefined) this.#props.scoringCriteria = scoringCriteria;
    if (excludedKeywords !== undefined) this.#props.excludedKeywords = excludedKeywords;
    if (minScoreThreshold !== undefined) this.#props.minScoreThreshold = minScoreThreshold;
    this.#props.updatedAt = new Date();
  }

  /**
   * Update LLM provider settings
   */
  updateLlmSettings(provider: string, model: string): void {
    this.#props.llmProvider = provider;
    this.#props.llmModel = model;
    this.#props.updatedAt = new Date();
  }

  /**
   * Mark as default preference
   */
  markAsDefault(): void {
    this.#props.isDefault = true;
    this.#props.updatedAt = new Date();
  }

  /**
   * Unmark as default
   */
  unmarkAsDefault(): void {
    this.#props.isDefault = false;
    this.#props.updatedAt = new Date();
  }
}
