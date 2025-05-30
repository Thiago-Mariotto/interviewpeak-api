/* eslint-disable @typescript-eslint/naming-convention */
// interview-engine.service.ts - Enhancements for specialized interviews

import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import {
  InterviewSettingsDto,
  MessageDto,
  InterviewProductType,
  Language,
} from './dto/interview.dto';
import { OpenAIService } from '../services/openai/openai.service';
import { PromptProviderRegistry } from './prompt-providers/registry/prompt-provider.registry';

@Injectable()
export class InterviewEngineService {
  private readonly _logger = new Logger(InterviewEngineService.name);

  constructor(
    private readonly _openaiService: OpenAIService,
    private readonly _promptProviderRegistry: PromptProviderRegistry,
  ) { }

  /**
   * Generate enhanced opening for specialized interviews
   */
  async generateSpecializedOpening(settings: InterviewSettingsDto): Promise<string> {
    const systemPrompt = this._getSystemPrompt(settings);
    const openingPrompt = this._getSpecializedOpeningPrompt(settings);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: openingPrompt },
    ];

    const openingStatement = await this._openaiService.chatCompletion(messages, undefined, 0.7);

    return openingStatement;
  }

  /**
   * Generate standard opening (existing method)
   */
  async generateOpening(settings: InterviewSettingsDto): Promise<string> {
    const systemPrompt = this._getSystemPrompt(settings);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Please start the interview with an introduction.' },
    ];

    const openingStatement = await this._openaiService.chatCompletion(messages, undefined, 0.7);

    return openingStatement;
  }

  /**
   * Enhanced response generation with better context management
   */
  async generateResponse(
    settings: InterviewSettingsDto,
    conversationHistory: MessageDto[],
  ): Promise<string> {
    const systemPrompt = this._getSystemPrompt(settings);
    const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add enhanced context for specialized interviews
    if (settings.productType === InterviewProductType.SPECIALIZED) {
      chatMessages.push({
        role: 'system',
        content: this._getSpecializedContextPrompt(settings, conversationHistory),
      });
    }

    // Add standard conversation pattern reminder
    chatMessages.push({
      role: 'system',
      content: `REMINDER: The conversation pattern MUST be:
      - 'interviewer' messages (YOU) -> mapped to 'assistant' in this API call
      - 'candidate' messages (HUMAN) -> mapped to 'user' in this API call
      NEVER deviate from this pattern.`,
    });

    chatMessages.push({
      role: 'system',
      content:
        'IMPORTANT: Stay in the interviewer role. Do not simulate or pretend to be the candidate. Respond directly to what the candidate just said.',
    });

    chatMessages.push({
      role: 'system',
      content: `This interview is in ${settings.language}. All responses must be in ${settings.language}.`,
    });

    // Add conversation history
    for (const message of conversationHistory) {
      const role: 'system' | 'user' | 'assistant' =
        message.role === 'interviewer' ? 'assistant' : 'user';
      chatMessages.push({
        role,
        content: message.content,
      });
    }

    const response = await this._openaiService.chatCompletion(chatMessages, undefined, 0.7);

    return response;
  }

  /**
   * Enhanced closing generation
   */
  async generateClosing(settings: InterviewSettingsDto): Promise<string> {
    const systemPrompt = this._getSystemPrompt(settings);
    const closingPrompt = this._getClosingPrompt(settings);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: closingPrompt },
    ];

    const closingStatement = await this._openaiService.chatCompletion(messages, undefined, 0.7);

    return closingStatement;
  }

  /**
   * Enhanced feedback generation
   */
  async generateFeedback(
    settings: InterviewSettingsDto,
    conversationHistory: MessageDto[],
  ): Promise<any> {
    const feedbackPrompt = this._getFeedbackPrompt(settings);

    let conversationText = '';
    for (const message of conversationHistory) {
      const role = message.role.charAt(0).toUpperCase() + message.role.slice(1);
      conversationText += `${role}: ${message.content}\n\n`;
    }

    // Add context about interview structure for specialized interviews
    let contextualInfo = '';
    if (settings.productType === InterviewProductType.SPECIALIZED) {
      contextualInfo = `\n\nINTERVIEW CONTEXT:
      - Type: Specialized ${settings.specializedType} interview
      - Level: ${settings.careerLevel?.toUpperCase()}
      - Duration: ${settings.interviewDurationMinutes} minutes
      - This was a structured technical interview covering multiple competency areas.`;
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: feedbackPrompt },
      {
        role: 'user',
        content: `Here is the interview conversation:${contextualInfo}\n\n${conversationText}`,
      },
    ];

    const feedbackText = await this._openaiService.chatCompletion(messages, undefined, 0.3);

    try {
      let cleanedFeedbackText = feedbackText;
      if (feedbackText.includes('```json')) {
        cleanedFeedbackText = feedbackText.split('```json')[1].split('```')[0].trim();
      } else if (feedbackText.includes('```')) {
        cleanedFeedbackText = feedbackText.split('```')[1].split('```')[0].trim();
      }

      const feedbackData = JSON.parse(cleanedFeedbackText);
      return feedbackData;
    } catch (error) {
      this._logger.error(`Error parsing feedback JSON: ${error}`);
      this._logger.error(`Raw feedback text: ${feedbackText}`);
      throw new Error(`Failed to parse feedback response as JSON: ${error}`);
    }
  }

  /**
   * Enhanced time running out response
   */
  async generateTimeRunningOutResponse(
    settings: InterviewSettingsDto,
    conversationHistory: MessageDto[],
    timeRunningOutPrompt: string,
  ): Promise<string> {
    const systemPrompt = this._getSystemPrompt(settings);
    const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const message of conversationHistory) {
      const role: 'system' | 'user' | 'assistant' =
        message.role === 'interviewer' ? 'assistant' : 'user';
      chatMessages.push({
        role,
        content: message.content,
      });
    }

    // Add the time running out instruction
    chatMessages.push({
      role: 'system',
      content: timeRunningOutPrompt,
    });

    // Enhanced final question prompt for specialized interviews
    const finalQuestionPrompt =
      settings.productType === InterviewProductType.SPECIALIZED
        ? 'Please provide a professional closing that acknowledges the technical discussion and asks if the candidate has any final questions about the role or company.'
        : 'Please ask your final question to close the interview gracefully.';

    chatMessages.push({
      role: 'user',
      content: finalQuestionPrompt,
    });

    const response = await this._openaiService.chatCompletion(chatMessages, undefined, 0.7);

    return response;
  }

  /**
   * Enhanced response stream generation
   */
  async generateResponseStream(
    settings: InterviewSettingsDto,
    conversationHistory: MessageDto[],
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const systemPrompt = this._getSystemPrompt(settings);
    const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add enhanced context for specialized interviews
    if (settings.productType === InterviewProductType.SPECIALIZED) {
      chatMessages.push({
        role: 'system',
        content: this._getSpecializedContextPrompt(settings, conversationHistory),
      });
    }

    // Add instruction to maintain the interviewer role
    chatMessages.push({
      role: 'system',
      content:
        "IMPORTANT: Stay in the role of the interviewer. Do not simulate or pretend to be the candidate. Do not invent questions or answers from the candidate. Ask only one question at a time and wait for the candidate's response.",
    });

    // Add the original conversation history without modifications
    for (const message of conversationHistory) {
      const role: 'system' | 'user' | 'assistant' =
        message.role === 'interviewer' ? 'assistant' : 'user';
      chatMessages.push({
        role,
        content: message.content,
      });
    }

    const stream = await this._openaiService.chatCompletionStream(chatMessages, undefined, 0.7);
    return stream;
  }

  // Private helper methods

  /**
   * Generate specialized opening prompt
   */
  private _getSpecializedOpeningPrompt(settings: InterviewSettingsDto): string {
    const specializationType = settings.specializedType?.replace(/_/g, ' ').toLowerCase();
    const careerLevel = settings.careerLevel?.toUpperCase();
    return `
    LANGUAGE INSTRUCTION: The candidate's interview was conducted in ${settings.language}. Your instructions should also be in ${settings.language}. Translate all instructions to ${settings.language === Language.PT_BR ? 'Portuguese' : 'English'}.

    Please start this specialized ${specializationType} interview for ${careerLevel} level with:
      1. A warm and professional introduction  
      2. Brief explanation about the structure of this specialized technical interview (25-40 minutes)
      3. Invitation for the candidate to briefly introduce themselves and discuss their most relevant experience
      4. Maintain a ${settings.interviewerPersonality} tone as per your personality
      
      Don't mention specific interview phases, just indicate it will be a structured technical conversation.`;
  }

  /**
   * Get specialized context prompt for ongoing conversation
   */
  private _getSpecializedContextPrompt(
    settings: InterviewSettingsDto,
    conversationHistory: MessageDto[],
  ): string {
    const interviewerMessageCount = conversationHistory.filter(
      (m) => m.role === 'interviewer',
    ).length;

    // Determine suggested phase based on message count
    let phaseGuidance = '';
    if (interviewerMessageCount <= 4) {
      phaseGuidance =
        "CURRENT PHASE: Warm-up - Continue exploring candidate's experience and background.";
    } else if (interviewerMessageCount <= 8) {
      phaseGuidance =
        "CURRENT PHASE: Core Technical - Focus on main technical areas of specialization. Use transitions like 'Now let's talk about...'";
    } else if (interviewerMessageCount <= 12) {
      phaseGuidance =
        "CURRENT PHASE: Practical Application - Discuss practical scenarios and problem-solving. Use 'Let's shift our focus to discuss...'";
    } else if (interviewerMessageCount <= 15) {
      phaseGuidance =
        'CURRENT PHASE: Advanced Topics - Explore advanced concepts and system thinking. Use the user background to guide the conversation if possible.';
    } else {
      phaseGuidance =
        'CURRENT PHASE: Preparing to Close - Start directing towards interview closure.';
    }

    return `SPECIALIZED INTERVIEW CONTEXT:
    ${phaseGuidance}
    
    Interview Progress: ${interviewerMessageCount} interviewer responses so far
    Specialization: ${settings.specializedType}
    Career Level: ${settings.careerLevel}
    
    Remember to use clear transitions when moving between topics and maintain the structured flow of the specialized interview.`;
  }

  /**
   * Get enhanced closing prompt
   */
  private _getClosingPrompt(settings: InterviewSettingsDto): string {
    if (settings.productType === InterviewProductType.SPECIALIZED) {
      return `Please end this specialized ${settings.specializedType} interview with:
        1. Thanks for the rich technical discussion
        2. Brief positive comment about the knowledge demonstrated  
        3. Explanation of next steps in the process
        4. Invitation for final questions from the candidate
        5. Professional and cordial closing
        
        Maintain a professional and positive tone, appropriate for a specialized technical interview.`;
    } else {
      return 'Please end the interview with an appropriate closing statement.';
    }
  }

  // Existing private methods

  private _getSystemPrompt(settings: InterviewSettingsDto): string {
    try {
      const provider = this._promptProviderRegistry.getProvider(settings);
      return provider.getSystemPrompt(settings);
    } catch (error) {
      this._logger.error(`Error getting system prompt: ${error.message}`);
      throw error;
    }
  }

  private _getFeedbackPrompt(settings: InterviewSettingsDto): string {
    try {
      const provider = this._promptProviderRegistry.getProvider(settings);
      return provider.getFeedbackPrompt(settings);
    } catch (error) {
      this._logger.error(`Error getting feedback prompt: ${error.message}`);
      throw error;
    }
  }
}
