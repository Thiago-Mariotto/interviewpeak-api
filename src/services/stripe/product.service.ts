import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { StripeService } from './stripe.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) { }

  /**
   * Cria um novo produto
   */
  async createProduct(productData: any): Promise<any> {
    try {
      // Criar o produto no banco de dados
      const product = await this.prisma.product.create({
        data: {
          id: uuidv4(),
          name: productData.name,
          description: productData.description,
          productType: productData.productType,
          position: productData.position,
          company: productData.company,
          duration: productData.duration,
          active: true,
        },
      });

      // Sincronizar com Stripe
      await this.stripeService.syncProductWithStripe(product.id);

      return product;
    } catch (error) {
      this.logger.error(`Error creating product: ${error.message}`);
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
          active: true,
        },
        include: {
          product: true,
        },
      });

      // Sincronizar com Stripe
      await this.stripeService.syncPriceWithStripe(price.id);

      return price;
    } catch (error) {
      this.logger.error(`Error creating price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca todos os produtos ativos
   */
  async findAllProducts(): Promise<any[]> {
    try {
      return await this.prisma.product.findMany({
        where: { active: true },
        include: {
          prices: {
            where: { active: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error finding products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca um produto pelo ID
   */
  async findProductById(id: string): Promise<any> {
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

      return product;
    } catch (error) {
      this.logger.error(`Error finding product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca produtos por tipo
   */
  async findProductsByType(productType: string): Promise<any[]> {
    try {
      return await this.prisma.product.findMany({
        where: {
          productType,
          active: true,
        },
        include: {
          prices: {
            where: { active: true },
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error finding products by type: ${error.message}`);
      throw error;
    }
  }

  /**
   * Atualiza um produto
   */
  async updateProduct(id: string, productData: any): Promise<any> {
    try {
      // Verificar se o produto existe
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Atualizar o produto
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: {
          name: productData.name,
          description: productData.description,
          productType: productData.productType,
          position: productData.position,
          company: productData.company,
          duration: productData.duration,
          active: productData.active !== undefined ? productData.active : true,
        },
      });

      // Sincronizar com Stripe
      await this.stripeService.syncProductWithStripe(id);

      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desativa um produto (soft delete)
   */
  async deactivateProduct(id: string): Promise<any> {
    try {
      // Verificar se o produto existe
      const product = await this.prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // Desativar o produto
      const updatedProduct = await this.prisma.product.update({
        where: { id },
        data: { active: false },
      });

      // Desativar todos os preços associados
      await this.prisma.price.updateMany({
        where: { productId: id },
        data: { active: false },
      });

      // Sincronizar com Stripe
      await this.stripeService.syncProductWithStripe(id);

      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error deactivating product: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca um preço pelo ID
   */
  async findPriceById(id: string): Promise<any> {
    try {
      const price = await this.prisma.price.findUnique({
        where: { id },
        include: {
          product: true,
        },
      });

      if (!price) {
        throw new NotFoundException(`Price with ID ${id} not found`);
      }

      return price;
    } catch (error) {
      this.logger.error(`Error finding price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Desativa um preço (soft delete)
   */
  async deactivatePrice(id: string): Promise<any> {
    try {
      // Verificar se o preço existe
      const price = await this.prisma.price.findUnique({
        where: { id },
      });

      if (!price) {
        throw new NotFoundException(`Price with ID ${id} not found`);
      }

      // Desativar o preço
      return await this.prisma.price.update({
        where: { id },
        data: { active: false },
      });
    } catch (error) {
      this.logger.error(`Error deactivating price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca os créditos disponíveis de um usuário
   */
  async getUserCredits(userId: string): Promise<any[]> {
    try {
      const now = new Date();

      return await this.prisma.interviewCredit.findMany({
        where: {
          userId,
          remaining: { gt: 0 },
          expiresAt: { gt: now },
        },
        orderBy: {
          expiresAt: 'asc',
        },
      });
    } catch (error) {
      this.logger.error(`Error getting user credits: ${error.message}`);
      throw error;
    }
  }

  /**
   * Busca o histórico de compras de um usuário
   */
  async getUserPurchaseHistory(userId: string): Promise<any[]> {
    try {
      return await this.prisma.purchase.findMany({
        where: {
          userId,
        },
        include: {
          price: {
            include: {
              product: true,
            },
          },
          credits: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      this.logger.error(`Error getting user purchase history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica e usa um crédito para uma entrevista
   */
  async useCredit(
    userId: string,
    sessionId: string,
    creditType: string,
    duration?: number,
    position?: string,
    company?: string,
  ): Promise<boolean> {
    try {
      const now = new Date();

      // Buscar créditos disponíveis
      let credits = await this.prisma.interviewCredit.findMany({
        where: {
          userId,
          remaining: { gt: 0 },
          expiresAt: { gt: now },
        },
        orderBy: {
          expiresAt: 'asc', // Usar primeiro os que irão expirar mais cedo
        },
      });

      this.logger.log(
        `Encontrados ${credits.length} créditos disponíveis para o usuário ${userId}`,
      );

      // Filtrar primeiro por tipo de crédito, se fornecido
      if (creditType) {
        credits = credits.filter((c) => c.creditType === creditType);
        this.logger.log(`Após filtro por tipo ${creditType}: ${credits.length} créditos`);
      }

      // Filtros adicionais
      this.logger.log(`creditType: ${creditType}`);
      if (duration && creditType === 'basic_interview') {
        credits = credits.filter((c) => c.duration === duration);
        this.logger.log(`Após filtro por duração ${duration}: ${credits.length} créditos`);
      }

      if (position) {
        credits = credits.filter((c) => !c.position || c.position === position);
      }

      if (company) {
        credits = credits.filter((c) => !c.company || c.company === company);
      }

      if (credits.length === 0) {
        // Se nenhum crédito foi encontrado com o tipo exato, tentar buscar um crédito
        // que possa servir (por exemplo, um crédito de 30 min pode ser usado para uma entrevista de 15 min)
        if (creditType === 'basic_15min') {
          // Tentar encontrar créditos de duração maior
          return await this.useCredit(userId, sessionId, 'basic_30min', 30);
        }

        throw new BadRequestException(
          `No available credits for this interview type (${creditType}, duration: ${duration})`,
        );
      }

      // Usar o primeiro crédito disponível
      const credit = credits[0];
      this.logger.log(`Usando crédito ${credit.id} do tipo ${credit.creditType}`);

      // Atualizar o crédito
      await this.prisma.interviewCredit.update({
        where: { id: credit.id },
        data: { remaining: credit.remaining - 1 },
      });

      // Vincular o crédito à sessão de entrevista
      await this.prisma.interviewSession.update({
        where: { id: sessionId },
        data: {
          creditId: credit.id,
          // Atualizar também o tipo de entrevista para corresponder ao crédito usado
          interviewType: credit.creditType.startsWith('specialized') ? 'specialized' : 'basic',
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Error using credit: ${error.message}`);
      throw error;
    }
  }

  /**
   * Inicializa produtos e preços padrão
   */
  async initializeDefaultProducts(): Promise<void> {
    try {
      // Verificar se já existem produtos
      const existingProducts = await this.prisma.product.count();

      if (existingProducts > 0) {
        this.logger.log('Products already initialized');
        return;
      }

      // Criar produtos básicos
      const basicProduct15min = await this.createProduct({
        name: 'Entrevista Básica 15 min',
        description: 'Simulação de entrevista básica com duração de 15 minutos',
        productType: 'basic_interview',
        duration: 15,
      });

      const basicProduct30min = await this.createProduct({
        name: 'Entrevista Básica 30 min',
        description: 'Simulação de entrevista básica com duração de 30 minutos',
        productType: 'basic_interview',
        duration: 30,
      });

      // Criar produtos especializados
      const specializedProduct = await this.createProduct({
        name: 'Entrevista Especializada FAANG',
        description: 'Simulação de processo completo para empresas de tecnologia',
        productType: 'specialized',
        position: 'software_engineer',
        company: 'faang',
      });

      // Criar preços para produtos básicos
      // 15 min
      await this.createPrice({
        productId: basicProduct15min.id,
        amount: 1990, // R$ 19,90
        quantity: 1,
        expiryDays: 30,
      });

      await this.createPrice({
        productId: basicProduct15min.id,
        amount: 4990, // R$ 49,90
        quantity: 3,
        expiryDays: 30,
      });

      await this.createPrice({
        productId: basicProduct15min.id,
        amount: 7990, // R$ 79,90
        quantity: 5,
        expiryDays: 45,
      });

      // 30 min
      await this.createPrice({
        productId: basicProduct30min.id,
        amount: 2990, // R$ 29,90
        quantity: 1,
        expiryDays: 30,
      });

      await this.createPrice({
        productId: basicProduct30min.id,
        amount: 7990, // R$ 79,90
        quantity: 3,
        expiryDays: 30,
      });

      await this.createPrice({
        productId: basicProduct30min.id,
        amount: 12990, // R$ 129,90
        quantity: 5,
        expiryDays: 45,
      });

      // Especializado
      await this.createPrice({
        productId: specializedProduct.id,
        amount: 14990, // R$ 149,90
        quantity: 1, // Um processo completo
        expiryDays: 60,
      });

      await this.createPrice({
        productId: specializedProduct.id,
        amount: 29990, // R$ 299,90
        quantity: 3, // Três processos completos
        expiryDays: 90,
      });

      this.logger.log('Default products and prices initialized');
    } catch (error) {
      this.logger.error(`Error initializing default products: ${error.message}`);
      throw error;
    }
  }
}
