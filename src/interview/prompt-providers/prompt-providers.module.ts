import { Module } from '@nestjs/common';

import { BasePromptProvider } from './base-prompt.provider';
import { PromptProviderRegistry } from './registry/prompt-provider.registry';
import { BackendDeveloperPromptProvider } from './specialized/backend-developer-prompt';
import { FrontendDeveloperPromptProvider } from './specialized/frontend-developer-prompt';
import { FullstackDeveloperPromptProvider } from './specialized/fullstack-developer-prompt';
import { SpecializedTechnicalPromptProvider } from './specialized-techinical-prompt.provider';

/**
 * Módulo para organizar todos os providers de prompts
 */
@Module({
  providers: [
    BasePromptProvider,
    BackendDeveloperPromptProvider,
    FrontendDeveloperPromptProvider,
    SpecializedTechnicalPromptProvider,
    PromptProviderRegistry,
    FullstackDeveloperPromptProvider,
  ],
  exports: [PromptProviderRegistry],
})
export class PromptProvidersModule {
  constructor(
    private readonly registry: PromptProviderRegistry,
    private readonly baseProvider: BasePromptProvider,
    private readonly specializedTechnicalProvider: SpecializedTechnicalPromptProvider,
    private readonly backendProvider: BackendDeveloperPromptProvider,
    private readonly frontendProvider: FrontendDeveloperPromptProvider,
    private readonly fullstackProvider: FullstackDeveloperPromptProvider,
  ) {
    this.registry.registerProvider(specializedTechnicalProvider);
    this.registry.registerProvider(backendProvider);
    this.registry.registerProvider(baseProvider);
    this.registry.registerProvider(frontendProvider);
    this.registry.registerProvider(fullstackProvider);
  }
}
