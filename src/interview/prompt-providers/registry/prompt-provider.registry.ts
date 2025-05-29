import { Injectable } from '@nestjs/common';

import { InterviewSettingsDto } from '../../dto/interview.dto';
import { IPromptProvider } from '../interview-prompt.interface';

/**
 * Serviço Registry que gerencia e fornece os providers adequados
 * de acordo com as configurações da entrevista
 */
@Injectable()
export class PromptProviderRegistry {
  private promptProviders: IPromptProvider[] = [];

  /**
   * Registra um provider no registry
   */
  registerProvider(provider: IPromptProvider): void {
    this.promptProviders.push(provider);
  }

  /**
   * Retorna o provider adequado para as configurações fornecidas
   */
  getProvider(settings: InterviewSettingsDto): IPromptProvider {
    // Procura um provider especializado que possa lidar com essas configurações
    const provider = this.promptProviders.find((p) => p.canHandle(settings));

    if (!provider) {
      throw new Error(
        `No provider registered for interview type: ${settings.interviewType}, specialized type: ${settings.specializedType}`,
      );
    }

    return provider;
  }
}
