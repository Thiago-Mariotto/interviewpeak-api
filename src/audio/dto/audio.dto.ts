import { IsString, IsNumber, Min, Max, IsEnum, IsOptional } from 'class-validator';

import { VoiceType } from '../../interview/dto/interview.dto';

export class AudioTranscriptionRequestDto {
  @IsString()
  interviewId: string;

  @IsString()
  @IsOptional()
  audioFormat: string = 'wav';
}

export class AudioTranscriptionResponseDto {
  @IsString()
  text: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number = 1.0;
}

export class TextToSpeechRequestDto {
  @IsString()
  text: string;

  @IsEnum(VoiceType)
  @IsOptional()
  voice: VoiceType = VoiceType.ALLOY;

  @IsNumber()
  @Min(0.5)
  @Max(1.5)
  @IsOptional()
  speed: number = 1.0;
}
