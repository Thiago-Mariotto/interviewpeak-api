import { Module } from '@nestjs/common';

import { BasePromptProvider } from './base-prompt.provider';
import { PromptProviderRegistry } from './registry/prompt-provider.registry';
import { BackendDeveloperPromptProvider } from './specialized/backend-developer-prompt';
import { SpecializedTechnicalPromptProvider } from './specialized-techinical-prompt.provider';

/**
 * Módulo para organizar todos os providers de prompts
 */
@Module({
  providers: [
    BasePromptProvider,
    BackendDeveloperPromptProvider,
    SpecializedTechnicalPromptProvider,
    PromptProviderRegistry,
  ],
  exports: [PromptProviderRegistry],
})
export class PromptProvidersModule {
  constructor(
    private readonly registry: PromptProviderRegistry,
    private readonly baseProvider: BasePromptProvider,
    private readonly backendProvider: BackendDeveloperPromptProvider,
    private readonly specializedTechnicalProvider: SpecializedTechnicalPromptProvider,
  ) {
    this.registry.registerProvider(specializedTechnicalProvider);
    this.registry.registerProvider(backendProvider);
    this.registry.registerProvider(baseProvider);
  }
}
