import { Injectable, Logger } from '@nestjs/common';

import { OpenAIService } from '../services/openai/openai.service';
import { TextToSpeechRequestDto, AudioTranscriptionResponseDto } from './dto/audio.dto';
import { VoiceType } from '../interview/dto/interview.dto';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  constructor(private readonly openaiService: OpenAIService) { }

  async transcribeAudio(audioBuffer: Buffer): Promise<AudioTranscriptionResponseDto> {
    try {
      const text = await this.openaiService.transcribeAudio(audioBuffer);

      // Log the transcription (without the full text for privacy)
      const textPreview = text.length > 50 ? `${text.substring(0, 50)}...` : text;
      this.logger.log(`Audio transcribed successfully: ${textPreview}`);

      return {
        text,
        confidence: 1.0, // Whisper doesn't provide confidence scores yet
      };
    } catch (error) {
      this.logger.error(`Error transcribing audio: ${error.message}`);
      throw error;
    }
  }

  async synthesizeSpeech(request: TextToSpeechRequestDto): Promise<Buffer> {
    try {
      const { text, voice, speed } = request;

      // Synthesize speech
      const audioData = await this.openaiService.textToSpeech(
        text,
        voice || VoiceType.NOVA,
        undefined,
        speed || 1.2,
      );

      // Log the synthesis
      const textPreview = text.length > 50 ? `${text.substring(0, 50)}...` : text;
      this.logger.log(`Text synthesized successfully: ${textPreview}`);

      return audioData;
    } catch (error) {
      this.logger.error(`Error synthesizing speech: ${error.message}`);
      throw error;
    }
  }
}
