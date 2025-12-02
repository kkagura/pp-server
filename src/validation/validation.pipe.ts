import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    // 如果没有提供元类型或者不是需要校验的类型，直接返回原值
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // 使用 class-transformer 将普通对象转换为类实例
    const object = plainToInstance(metatype, value);
    
    // 使用 class-validator 进行校验
    const errors: ValidationError[] = await validate(object, {
      whitelist: true, // 自动去除未定义的属性
      forbidNonWhitelisted: true, // 禁止未定义的属性
      transform: true, // 自动进行类型转换
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式类型转换
      },
    });

    // 如果有校验错误，抛出异常
    if (errors.length > 0) {
      const messages = this.formatErrors(errors);
      throw new BadRequestException({
        message: '参数校验失败',
        errors: messages,
      });
    }

    return object;
  }

  /**
   * 检查是否需要校验
   */
  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * 格式化错误信息
   */
  private formatErrors(errors: ValidationError[]): string[] {
    const messages: string[] = [];
    
    errors.forEach((error) => {
      if (error.constraints) {
        // 获取所有约束错误信息
        Object.values(error.constraints).forEach((message) => {
          messages.push(`${error.property}: ${message}`);
        });
      }
      
      // 递归处理嵌套对象的错误
      if (error.children && error.children.length > 0) {
        const childMessages = this.formatErrors(error.children);
        childMessages.forEach((message) => {
          messages.push(`${error.property}.${message}`);
        });
      }
    });
    
    return messages;
  }
}
