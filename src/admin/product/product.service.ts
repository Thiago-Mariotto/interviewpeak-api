import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import {
  ProductResponseDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductPriceDto,
  ProductType,
} from './dto/product.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca todos os produtos ativos
   */
  async findAllProducts(): Promise<ProductResponseDto[]> {
    try {
      const products = await this.prisma.product.findMany({
        include: {
          prices: {
            where: { active: true },
          },
        },
      });

      return products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        productType: product.productType as ProductType,
        duration: product.duration,
        position: product.position,
        company: product.company,
        active: product.active,
        prices: product.prices.map((price) => ({
          id: price.id,
          amount: price.amount,
          currency: price.currency,
          quantity: price.quantity,
          expiryDays: price.expiryDays,
          active: price.active,
        })),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(`Error finding products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca um produto pelo ID
   */
  async findProductById(id: string): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.findUnique({
        where: { id },
        include: {
          prices: {
            where: { active: true },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        productType: product.productType as any,
        duration: product.duration,
        position: product.position,
        company: product.company,
        active: product.active,
        prices: product.prices.map((price) => ({
          id: price.id,
          amount: price.amount,
          currency: price.currency,
          quantity: price.quantity,
          expiryDays: price.expiryDays,
          active: price.active,
        })),
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error finding product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria um novo produto
   */
  async createProduct(createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    try {
      const product = await this.prisma.product.create({
        data: {
          id: uuidv4(),
          name: createProductDto.name,
          description: createProductDto.description,
          productType: createProductDto.productType,
          duration: createProductDto.duration,
          position: createProductDto.position,
          company: createProductDto.company,
          active: createProductDto.active ?? true,
        },
      });

      this.logger.log(`Created product: ${product.id}`);

      return {
        ...product,
        productType: product.productType as ProductType,
        prices: [],
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error creating product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Atualiza um produto
   */
  async updateProduct(id: string, updateProductDto: UpdateProductDto): Promise<ProductResponseDto> {
    try {
      // Verificar se o produto existe
      await this.findProductById(id);

      // Atualizar o produto
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: updateProductDto,
        include: {
          prices: {
            where: { active: true },
          },
        },
      });

      this.logger.log(`Updated product: ${id}`);

      return {
        id: updatedProduct.id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        productType: updatedProduct.productType as any,
        duration: updatedProduct.duration,
        position: updatedProduct.position,
        company: updatedProduct.company,
        active: updatedProduct.active,
        prices: updatedProduct.prices.map((price) => ({
          id: price.id,
          amount: price.amount,
          currency: price.currency,
          quantity: price.quantity,
          expiryDays: price.expiryDays,
          active: price.active,
        })),
        updatedAt: updatedProduct.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error updating product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cria um novo preço para um produto
   */
  async createPrice(priceData: any): Promise<any> {
    try {
      // Verificar se o produto existe
      const product = await this.prisma.product.findUnique({
        where: { id: priceData.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${priceData.productId} not found`);
      }

      // Criar o preço no banco de dados
      const price = await this.prisma.price.create({
        data: {
          id: uuidv4(),
          productId: priceData.productId,
          amount: priceData.amount,
          currency: priceData.currency || 'BRL',
          quantity: priceData.quantity,
          expiryDays: priceData.expiryDays || 30,
          active: priceData.active ?? true,
        },
        include: {
          product: true,
        },
      });

      this.logger.log(`Created price for product: ${priceData.productId}`);

      return {
        id: price.id,
        productId: price.productId,
        amount: price.amount,
        currency: price.currency,
        quantity: price.quantity,
        expiryDays: price.expiryDays,
        active: price.active,
        createdAt: price.createdAt.toISOString(),
        updatedAt: price.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error creating price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Atualiza um preço
   */
  async updatePrice(id: string, updatePriceDto: UpdateProductPriceDto): Promise<any> {
    try {
      // Verificar se o preço existe
      const price = await this.prisma.price.findUnique({
        where: { id },
      });

      if (!price) {
        throw new NotFoundException(`Price with ID ${id} not found`);
      }

      // Atualizar o preço
      const updatedPrice = await this.prisma.price.update({
        where: { id },
        data: updatePriceDto,
      });

      this.logger.log(`Updated price: ${id}`);

      return {
        id: updatedPrice.id,
        productId: updatedPrice.productId,
        amount: updatedPrice.amount,
        currency: updatedPrice.currency,
        quantity: updatedPrice.quantity,
        expiryDays: updatedPrice.expiryDays,
        active: updatedPrice.active,
        updatedAt: updatedPrice.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error updating price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desativa (soft delete) um preço
   */
  async deactivatePrice(id: string): Promise<void> {
    try {
      // Verificar se o preço existe
      const price = await this.prisma.price.findUnique({
        where: { id },
      });

      if (!price) {
        throw new NotFoundException(`Price with ID ${id} not found`);
      }

      // Desativar o preço
      await this.prisma.price.update({
        where: { id },
        data: { active: false },
      });

      this.logger.log(`Deactivated price: ${id}`);
    } catch (error) {
      this.logger.error(`Error deactivating price: ${error.message}`);
      throw error;
    }
  }
}
