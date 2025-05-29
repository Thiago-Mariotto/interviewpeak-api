import { IsString, IsBoolean, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export enum ProductType {
  BASIC_INTERVIEW = 'basic_interview',
  specialized = 'specialized',
}

export class ProductPriceDto {
  id: string;
  amount: number;
  currency: string;
  quantity: number;
  expiryDays: number;
  active: boolean;
}

export class ProductResponseDto {
  id: string;
  name: string;
  description: string;
  productType: ProductType;
  duration?: number;
  position?: string;
  company?: string;
  active: boolean;
  prices: ProductPriceDto[];
  createdAt?: string;
  updatedAt?: string;
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
  active: boolean = true;
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

export class CreateProductPriceDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  currency: string = 'BRL';

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(1)
  expiryDays: number;

  @IsBoolean()
  @IsOptional()
  active: boolean = true;
}

export class UpdateProductPriceDto {
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  expiryDays?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class ToggleProductStatusResponseDto {
  id: string;
  active: boolean;
  updatedAt: string;
}
