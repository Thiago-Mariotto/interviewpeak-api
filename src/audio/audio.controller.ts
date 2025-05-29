import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  StreamableFile,
  Logger,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, Response } from 'express';

import { AudioService } from './audio.service';
import { TextToSpeechRequestDto, AudioTranscriptionResponseDto } from './dto/audio.dto';

@Controller('audio')
export class AudioController {
  private readonly logger = new Logger(AudioController.name);

  constructor(private readonly audioService: AudioService) {}

  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio_file'))
  async transcribeAudio(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AudioTranscriptionResponseDto> {
    if (!file) {
      throw new HttpException('No audio file provided', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.audioService.transcribeAudio(file.buffer);
    } catch (error) {
      this.logger.error(`Error transcribing audio: ${error.message}`);
      throw new HttpException(
        `Error transcribing audio: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('synthesize')
  async synthesizeSpeech(
    @Body() request: TextToSpeechRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    try {
      // Synthesize speech
      const audioBuffer = await this.audioService.synthesizeSpeech(request);

      // Return the audio file as a streaming response
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename=speech.mp3',
      });

      return new StreamableFile(audioBuffer);
    } catch (error) {
      this.logger.error(`Error synthesizing speech: ${error.message}`);
      throw new HttpException(
        `Error synthesizing speech: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
