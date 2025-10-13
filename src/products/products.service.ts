import { BadRequestException, HttpStatus, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from 'generated/prisma';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('ProductsService');

  onModuleInit() {
    this.$connect();
    this.logger.log('Connected to the database');
  }
  async create(createProductDto: CreateProductDto) {
    try {
      return await this.product.create({
        data: createProductDto
      });
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`, error.stack);
      throw new Error('Could not create product. Please try again later.');
    }
  }

  async findAll(paginationDto: PaginationDto) {

    const { page = 1, limit = 10 } = paginationDto;

    const totalPages = await this.product.count({ where: { available: true } });

    const lastPage = Math.ceil(totalPages / limit);

    if (page > lastPage) {
      throw new BadRequestException('Page number exceeds total pages available');
    }

    return {
      data: await this.product.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: { available: true }
    }),
    metadata: {
      page,
      total: totalPages,
      lastPage,
    }

    }
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id, available: true }
    });
    if (!product) {
      // throw new NotFoundException(`Product with id ${id} not found`);

      throw new RpcException({
        message: `Product with id ${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const {id:_, ...data} = updateProductDto;
    await this.findOne(id); // Ensure the product exists

    return this.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Ensure the product exists
    
    
    // return this.product.delete({
    //   where: { id }
    // });


    const product = await this.product.update({
      where: { id },
      data: {
        available: false
      }
    });

    return product;
  }
}
