import { InterviewSettingsDto } from '../dto/interview.dto';

export interface IPromptProvider {
  /**
   * Gera o prompt do sistema para a entrevista
   */
  getSystemPrompt(settings: InterviewSettingsDto): string;

  /**
   * Gera o prompt para feedback da entrevista
   */
  getFeedbackPrompt(settings: InterviewSettingsDto): string;

  /**
   * Verifica se este provider pode lidar com as configurações fornecidas
   */
  canHandle(settings: InterviewSettingsDto): boolean;
}
