import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';

import { ProductService } from './product.service';
import { StripeService } from './stripe.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('payments')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly productService: ProductService,
  ) { }

  @Get('products')
  async getAllProducts() {
    try {
      return await this.productService.findAllProducts();
    } catch (error) {
      this.logger.error(`Error getting products: ${error.message}`);
      throw new HttpException(
        `Error getting products: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('products/:id')
  async getProductById(@Param('id') id: string) {
    try {
      return await this.productService.findProductById(id);
    } catch (error) {
      this.logger.error(`Error getting product: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error getting product: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('products/type/:type')
  async getProductsByType(@Param('type') type: string) {
    try {
      return await this.productService.findProductsByType(type);
    } catch (error) {
      this.logger.error(`Error getting products by type: ${error.message}`);
      throw new HttpException(
        `Error getting products by type: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async createCheckoutSession(
    @Body() body: { priceId: string; successUrl: string; cancelUrl: string },
    @Request() req,
  ) {
    try {
      const { priceId, successUrl, cancelUrl } = body;
      const userId = req.user.id;

      // Validar o preço
      await this.productService.findPriceById(priceId);

      // Criar sessão de checkout
      const session = await this.stripeService.createCheckoutSession(
        priceId,
        userId,
        successUrl,
        cancelUrl,
      );

      return session;
    } catch (error) {
      this.logger.error(`Error creating checkout session: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error creating checkout session: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('checkout/success')
  async handleCheckoutSuccess(@Query('session_id') sessionId: string, @Request() req) {
    try {
      // Verificar a sessão do Stripe
      const session = await this.stripeService.retrieveCheckoutSession(sessionId);

      // Verificar se o usuário é o mesmo que iniciou o checkout
      if (session.metadata.userId !== req.user.id) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }

      // Buscar detalhes da compra
      const purchase = await this.productService.getUserPurchaseHistory(req.user.id);
      const currentPurchase = purchase.find((p) => p.stripeSessionId === sessionId);

      if (!currentPurchase) {
        throw new HttpException('Purchase not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        purchase: currentPurchase,
      };
    } catch (error) {
      this.logger.error(`Error handling checkout success: ${error.message}`);
      throw new HttpException(
        `Error handling checkout success: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('credits')
  async getUserCredits(@Request() req) {
    try {
      return await this.productService.getUserCredits(req.user.id);
    } catch (error) {
      this.logger.error(`Error getting user credits: ${error.message}`);
      throw new HttpException(
        `Error getting user credits: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('purchases')
  async getUserPurchaseHistory(@Request() req) {
    try {
      return await this.productService.getUserPurchaseHistory(req.user.id);
    } catch (error) {
      this.logger.error(`Error getting user purchase history: ${error.message}`);
      throw new HttpException(
        `Error getting user purchase history: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Endpoints de administração - restritos a administradores

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products')
  async createProduct(@Body() productData: any) {
    try {
      return await this.productService.createProduct(productData);
    } catch (error) {
      this.logger.error(`Error creating product: ${error.message}`);
      throw new HttpException(
        `Error creating product: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('prices')
  async createPrice(@Body() priceData: any) {
    try {
      return await this.productService.createPrice(priceData);
    } catch (error) {
      this.logger.error(`Error creating price: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error creating price: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products/:id/update')
  async updateProduct(@Param('id') id: string, @Body() productData: any) {
    try {
      return await this.productService.updateProduct(id, productData);
    } catch (error) {
      this.logger.error(`Error updating product: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error updating product: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('products/:id/deactivate')
  async deactivateProduct(@Param('id') id: string) {
    try {
      return await this.productService.deactivateProduct(id);
    } catch (error) {
      this.logger.error(`Error deactivating product: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error deactivating product: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('prices/:id/deactivate')
  async deactivatePrice(@Param('id') id: string) {
    try {
      return await this.productService.deactivatePrice(id);
    } catch (error) {
      this.logger.error(`Error deactivating price: ${error.message}`);

      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }

      throw new HttpException(
        `Error deactivating price: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('initialize-products')
  async initializeDefaultProducts() {
    try {
      await this.productService.initializeDefaultProducts();
      return { message: 'Default products initialized successfully' };
    } catch (error) {
      this.logger.error(`Error initializing default products: ${error.message}`);
      throw new HttpException(
        `Error initializing default products: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
