/* eslint-disable max-classes-per-file */
import { IsString, IsNumber, IsOptional, IsBoolean, IsInt, Min, IsEnum } from 'class-validator';

export enum ProductType {
  BASIC_INTERVIEW = 'basic_interview',
  SPECIALIZED = 'specialized',
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsEnum(ProductType)
  productType: ProductType;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  company?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreatePriceDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'BRL';

  @IsInt()
  @Min(1)
  quantity: number;

  @IsInt()
  @IsOptional()
  expiryDays?: number = 30;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;
}

export class CheckoutSessionDto {
  @IsString()
  priceId: string;

  @IsString()
  successUrl: string;

  @IsString()
  cancelUrl: string;
}

export class UseCreditDto {
  @IsString()
  sessionId: string;

  @IsString()
  creditType: string;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsString()
  @IsOptional()
  position?: string;

  @IsString()
  @IsOptional()
  company?: string;
}

export class ProductResponseDto {
  id: string;
  name: string;
  description: string;
  productType: string;
  duration?: number;
  position?: string;
  company?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  prices: PriceResponseDto[];
}

export class PriceResponseDto {
  id: string;
  productId: string;
  amount: number;
  currency: string;
  quantity: number;
  expiryDays: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class PurchaseResponseDto {
  id: string;
  userId: string;
  priceId: string;
  amount: number;
  status: string;
  stripeSessionId?: string;
  stripePaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
  price: PriceResponseDto;
  credits: CreditResponseDto[];
}

export class CreditResponseDto {
  id: string;
  userId: string;
  purchaseId: string;
  quantity: number;
  remaining: number;
  creditType: string;
  duration?: number;
  position?: string;
  company?: string;
  createdAt: Date;
  expiresAt: Date;
}
