/* eslint-disable @typescript-eslint/naming-convention */
import { createReadStream } from 'fs';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;
  private readonly logger = new Logger(OpenAIService.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.error(
        'OpenAI API key not found. Please set OPENAI_API_KEY environment variable.',
      );
      throw new Error('OpenAI API key not found');
    }

    this.openai = new OpenAI({
      apiKey,
    });

    this.logger.log('OpenAI client initialized');
  }

  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string; name?: string }>,
    model?: string,
    temperature: number = 0.7,
    maxTokens?: number,
  ): Promise<string> {
    try {
      if (!model) {
        model = this.configService.get<string>('OPENAI_CHAT_MODEL') || 'gpt-4o';
      }

      this.logger.log(`Making chat completion request with model: ${model}`);

      const response = await this.openai.chat.completions.create({
        model,
        messages: messages.map((message) => ({
          ...message,
          name: message.role === 'user' ? 'user_name' : undefined,
        })),
        temperature,
        max_tokens: maxTokens,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error(`Error during chat completion: ${error}`);
      throw error;
    }
  }

  async transcribeAudio(audioBuffer: Buffer, model?: string): Promise<string> {
    try {
      if (!model) {
        model = this.configService.get<string>('OPENAI_WHISPER_MODEL') || 'whisper-1';
      }

      this.logger.log(`Transcribing audio with model: ${model}`);

      const tempDir = os.tmpdir();
      const fileName = `${uuidv4()}.mp3`;
      const filePath = path.join(tempDir, fileName);

      fs.writeFileSync(filePath, audioBuffer);

      const fileStream = createReadStream(filePath);

      try {
        const response = await this.openai.audio.transcriptions.create({
          file: fileStream,
          model,
          language: 'pt',
        });

        return response.text;
      } finally {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupError) {
          this.logger.warn(`Failed to delete temporary file: ${cleanupError.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error during audio transcription: ${error}`);
      throw error;
    }
  }

  async textToSpeech(
    text: string,
    voice: string = 'alloy',
    model?: string,
    speed: number = 1.0,
  ): Promise<Buffer> {
    try {
      if (!model) {
        model = this.configService.get<string>('OPENAI_TTS_MODEL') || 'tts-1';
      }

      this.logger.log(`Converting text to speech with model: ${model}, voice: ${voice}`);

      const response = await this.openai.audio.speech.create({
        model,
        voice: voice as any,
        input: text,
        speed,
      });

      // Convert to buffer
      const buffer = Buffer.from(await response.arrayBuffer());

      return buffer;
    } catch (error) {
      this.logger.error(`Error during text-to-speech conversion: ${error}`);
      throw error;
    }
  }

  async chatCompletionStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string; name?: string }>,
    model?: string,
    temperature: number = 0.7,
    maxTokens?: number,
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    try {
      if (!model) {
        model = this.configService.get<string>('OPENAI_CHAT_MODEL') || 'gpt-4o';
      }

      this.logger.log(`Making streaming chat completion request with model: ${model}`);

      const stream = await this.openai.chat.completions.create({
        model,
        messages: messages.map((message) => ({
          ...message,
          name: message.role === 'user' ? 'user_name' : undefined,
        })),
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

      return stream;
    } catch (error) {
      this.logger.error(`Error during streaming chat completion: ${error}`);
      throw error;
    }
  }
}
