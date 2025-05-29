import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import {
  ProductResponseDto,
  CreateProductDto,
  UpdateProductDto,
  CreateProductPriceDto,
  UpdateProductPriceDto,
  ToggleProductStatusResponseDto,
} from './dto/product.dto';
import { ProductService } from './product.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminProductController {
  private readonly logger = new Logger(AdminProductController.name);

  constructor(private readonly productService: ProductService) {}

  @Get()
  async getAllProducts(): Promise<ProductResponseDto[]> {
    try {
      return await this.productService.findAllProducts();
    } catch (error) {
      this.logger.error(`Error getting all products: ${error.message}`);
      throw new HttpException(
        `Error getting all products: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createProduct(@Body() createProductDto: CreateProductDto): Promise<ProductResponseDto> {
    try {
      return await this.productService.createProduct(createProductDto);
    } catch (error) {
      this.logger.error(`Error creating product: ${error.message}`);
      throw new HttpException(
        `Error creating product: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    try {
      return await this.productService.updateProduct(id, updateProductDto);
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

  @Patch(':id/toggle-status')
  async toggleProductStatus(@Param('id') id: string): Promise<ToggleProductStatusResponseDto> {
    try {
      const product = await this.productService.findProductById(id);
      const updatedProduct = await this.productService.updateProduct(id, {
        active: !product.active,
      });
      return {
        id: updatedProduct.id,
        active: updatedProduct.active,
        updatedAt: updatedProduct.updatedAt,
      } as ToggleProductStatusResponseDto;
    } catch (error) {
      this.logger.error(`Error toggling product status: ${error.message}`);
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Error toggling product status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/prices')
  async addProductPrice(
    @Param('id') id: string,
    @Body() createPriceDto: CreateProductPriceDto,
  ): Promise<any> {
    try {
      return await this.productService.createPrice({
        productId: id,
        ...createPriceDto,
      });
    } catch (error) {
      this.logger.error(`Error adding product price: ${error.message}`);
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Error adding product price: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('prices/:id')
  async updateProductPrice(
    @Param('id') id: string,
    @Body() updatePriceDto: UpdateProductPriceDto,
  ): Promise<any> {
    try {
      return await this.productService.updatePrice(id, updatePriceDto);
    } catch (error) {
      this.logger.error(`Error updating product price: ${error.message}`);
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Error updating product price: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('prices/:id')
  async deleteProductPrice(@Param('id') id: string): Promise<{ success: boolean }> {
    try {
      await this.productService.deactivatePrice(id);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting product price: ${error.message}`);
      if (error.name === 'NotFoundException') {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        `Error deleting product price: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
