import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Query,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import {
  UploadFileDto,
  CreateFolderDto,
  ChunkUploadDto,
  CheckFileDto,
  MergeChunksDto,
} from './file.dto';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from 'src/auth/auth.service';

@Controller('file')
export class FileController {
  constructor(
    private readonly fileService: FileService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 普通文件上传
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @Headers('Authorization') authorization: string,
  ) {
    const { username } = this.authService.getInfo(authorization);
    return this.fileService.uploadFile(
      file,
      uploadFileDto.parentPath,
      username,
    );
  }

  /**
   * 检查文件是否存在（秒传检查）
   */
  @Post('check')
  async checkFile(@Body() checkFileDto: CheckFileDto) {
    const existingFile = await this.fileService.checkFileExists(
      checkFileDto.md5,
      checkFileDto.filename,
    );

    if (existingFile) {
      return {
        exists: true,
        file: {
          id: existingFile.id,
          filename: existingFile.filename,
          path: existingFile.path,
          size: existingFile.size,
          md5: existingFile.md5,
        },
      };
    }

    return {
      exists: false,
    };
  }

  /**
   * 大文件分片上传
   */
  @Post('chunk/upload')
  @UseInterceptors(FileInterceptor('chunk'))
  async uploadChunk(
    @UploadedFile() chunk: Express.Multer.File,
    @Body() chunkUploadDto: ChunkUploadDto,
  ) {
    if (!chunk) {
      throw new BadRequestException('分片文件不能为空');
    }

    await this.fileService.saveChunk(
      chunk,
      chunkUploadDto.md5,
      chunkUploadDto.chunkIndex,
    );

    return {
      success: true,
      message: '分片上传成功',
      chunkIndex: chunkUploadDto.chunkIndex,
    };
  }

  /**
   * 获取已上传的分片列表（用于断点续传）
   */
  @Get('chunk/list')
  async getUploadedChunks(@Query('md5') md5: string) {
    if (!md5) {
      throw new BadRequestException('MD5参数不能为空');
    }

    const chunks = await this.fileService.getUploadedChunks(md5);
    return {
      success: true,
      md5: md5,
      uploadedChunks: chunks,
      totalUploaded: chunks.length,
    };
  }

  /**
   * 合并分片文件
   */
  @Post('chunk/merge')
  async mergeChunks(@Body() mergeChunksDto: MergeChunksDto) {
    return this.fileService.mergeChunks(
      mergeChunksDto.md5,
      mergeChunksDto.filename,
      mergeChunksDto.totalChunks,
      mergeChunksDto.totalSize,
      mergeChunksDto.parentPath,
      // TODO: 从请求中获取用户ID（需要实现认证中间件）
      undefined,
    );
  }

  /**
   * 创建文件夹
   */
  @Post('folder/create')
  async createFolder(@Body() createFolderDto: CreateFolderDto) {
    return this.fileService.createFolder(
      createFolderDto.folderName,
      createFolderDto.parentPath,
      // TODO: 从请求中获取用户ID（需要实现认证中间件）
      undefined,
    );
  }
}
