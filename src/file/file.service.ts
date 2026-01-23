import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from './file.entity';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class FileService {
  private readonly uploadBasePath: string;
  private readonly chunkBasePath: string;

  constructor(
    @InjectRepository(File)
    private fileRepository: Repository<File>,
    private configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    // 从配置中获取上传路径，如果没有则使用默认路径
    this.uploadBasePath =
      this.configService.get<string>('UPLOAD_PATH') ||
      path.join(process.cwd(), 'uploads');
    this.chunkBasePath = path.join(this.uploadBasePath, '.chunks');

    // 确保目录存在
    this.ensureDirectoryExists(this.uploadBasePath);
    this.ensureDirectoryExists(this.chunkBasePath);
  }

  private async ensureDirectoryExists(dirPath: string) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 计算文件的MD5值
   */
  private async calculateMD5(fileBuffer: Buffer): Promise<string> {
    return createHash('md5').update(fileBuffer).digest('hex');
  }

  /**
   * 检查文件是否已存在（秒传逻辑）
   */
  async checkFileExists(md5: string, filename: string): Promise<File | null> {
    const existingFile = await this.fileRepository.findOne({
      where: { md5, isDirectory: 0 },
    });

    if (existingFile) {
      return existingFile;
    }

    return null;
  }

  /**
   * 普通文件上传
   */
  async uploadFile(
    file: Express.Multer.File,
    parentPath?: string,
    userId?: number,
  ) {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }

    // 计算文件MD5
    const md5 = await this.calculateMD5(file.buffer);

    // 检查文件是否已存在（秒传）
    const existingFile = await this.checkFileExists(md5, file.originalname);
    if (existingFile) {
      // 如果文件已存在，创建新的文件记录但指向同一个物理文件
      const newFileRecord = this.fileRepository.create({
        filename: file.originalname,
        path: existingFile.path,
        md5: md5,
        size: file.size,
        mimeType: file.mimetype,
        parentPath: parentPath || '/',
        isDirectory: 0,
        userId: userId,
      });
      await this.fileRepository.save(newFileRecord);

      return {
        success: true,
        message: '文件秒传成功',
        file: {
          id: newFileRecord.id,
          filename: newFileRecord.filename,
          path: newFileRecord.path,
          size: newFileRecord.size,
          md5: newFileRecord.md5,
        },
        instantUpload: true,
      };
    }

    // 文件不存在，需要上传
    const fileDir = parentPath
      ? path.join(this.uploadBasePath, parentPath)
      : this.uploadBasePath;
    await this.ensureDirectoryExists(fileDir);

    const fileExtension = path.extname(file.originalname);
    const fileNameWithoutExt = path.basename(
      file.originalname,
      fileExtension,
    );
    const timestamp = Date.now();
    const uniqueFileName = `${fileNameWithoutExt}_${timestamp}${fileExtension}`;
    const filePath = path.join(fileDir, uniqueFileName);

    // 保存文件
    await fs.writeFile(filePath, file.buffer);

    // 保存文件记录到数据库
    const newFile = this.fileRepository.create({
      filename: file.originalname,
      path: filePath,
      md5: md5,
      size: file.size,
      mimeType: file.mimetype,
      parentPath: parentPath || '/',
      isDirectory: 0,
      userId: userId,
    });
    await this.fileRepository.save(newFile);

    return {
      success: true,
      message: '文件上传成功',
      file: {
        id: newFile.id,
        filename: newFile.filename,
        path: newFile.path,
        size: newFile.size,
        md5: newFile.md5,
      },
      instantUpload: false,
    };
  }

  /**
   * 保存分片文件
   */
  async saveChunk(
    chunk: Express.Multer.File,
    md5: string,
    chunkIndex: number,
  ): Promise<void> {
    if (!chunk) {
      throw new BadRequestException('分片文件不能为空');
    }

    const chunkDir = path.join(this.chunkBasePath, md5);
    await this.ensureDirectoryExists(chunkDir);

    const chunkPath = path.join(chunkDir, `chunk_${chunkIndex}`);
    await fs.writeFile(chunkPath, chunk.buffer);

    // 将已上传的分片索引存储到Redis，用于断点续传
    const redisKey = `upload:chunks:${md5}`;
    await this.redis.sadd(redisKey, chunkIndex.toString());
    // 设置过期时间为7天
    await this.redis.expire(redisKey, 7 * 24 * 60 * 60);
  }

  /**
   * 获取已上传的分片列表（用于断点续传）
   */
  async getUploadedChunks(md5: string): Promise<number[]> {
    const redisKey = `upload:chunks:${md5}`;
    const chunks = await this.redis.smembers(redisKey);
    return chunks.map((chunk) => parseInt(chunk, 10)).sort((a, b) => a - b);
  }

  /**
   * 合并分片文件
   */
  async mergeChunks(
    md5: string,
    filename: string,
    totalChunks: number,
    totalSize: number,
    parentPath?: string,
    userId?: number,
  ) {
    // 检查文件是否已存在（秒传）
    const existingFile = await this.checkFileExists(md5, filename);
    if (existingFile) {
      // 清理分片文件
      await this.cleanupChunks(md5);

      // 创建新的文件记录
      const newFileRecord = this.fileRepository.create({
        filename: filename,
        path: existingFile.path,
        md5: md5,
        size: totalSize,
        mimeType: this.getMimeType(filename),
        parentPath: parentPath || '/',
        isDirectory: 0,
        userId: userId,
      });
      await this.fileRepository.save(newFileRecord);

      return {
        success: true,
        message: '文件秒传成功',
        file: {
          id: newFileRecord.id,
          filename: newFileRecord.filename,
          path: newFileRecord.path,
          size: newFileRecord.size,
          md5: newFileRecord.md5,
        },
        instantUpload: true,
      };
    }

    const chunkDir = path.join(this.chunkBasePath, md5);
    const fileDir = parentPath
      ? path.join(this.uploadBasePath, parentPath)
      : this.uploadBasePath;
    await this.ensureDirectoryExists(fileDir);

    // 检查所有分片是否存在
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `chunk_${i}`);
      try {
        await fs.access(chunkPath);
      } catch {
        throw new BadRequestException(`分片 ${i} 不存在`);
      }
    }

    // 生成最终文件路径
    const fileExtension = path.extname(filename);
    const fileNameWithoutExt = path.basename(filename, fileExtension);
    const timestamp = Date.now();
    const uniqueFileName = `${fileNameWithoutExt}_${timestamp}${fileExtension}`;
    const finalFilePath = path.join(fileDir, uniqueFileName);

    // 合并分片
    const fileHandle = await fs.open(finalFilePath, 'w');
    try {
      let position = 0;
      for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunkDir, `chunk_${i}`);
        const chunkBuffer = await fs.readFile(chunkPath);
        const { bytesWritten } = await fileHandle.write(
          chunkBuffer,
          0,
          chunkBuffer.length,
          position,
        );
        position += bytesWritten;
      }
    } finally {
      await fileHandle.close();
    }

    // 验证合并后的文件大小
    const stats = await fs.stat(finalFilePath);
    if (stats.size !== totalSize) {
      await fs.unlink(finalFilePath);
      throw new InternalServerErrorException('文件合并失败，大小不匹配');
    }

    // 验证MD5（可选，对于大文件可能耗时较长）
    // const finalFileBuffer = await fs.readFile(finalFilePath);
    // const finalMD5 = await this.calculateMD5(finalFileBuffer);
    // if (finalMD5 !== md5) {
    //   await fs.unlink(finalFilePath);
    //   throw new InternalServerErrorException('文件MD5校验失败');
    // }

    // 保存文件记录到数据库
    const newFile = this.fileRepository.create({
      filename: filename,
      path: finalFilePath,
      md5: md5,
      size: totalSize,
      mimeType: this.getMimeType(filename),
      parentPath: parentPath || '/',
      isDirectory: 0,
      userId: userId,
    });
    await this.fileRepository.save(newFile);

    // 清理分片文件和Redis记录
    await this.cleanupChunks(md5);

    return {
      success: true,
      message: '文件合并成功',
      file: {
        id: newFile.id,
        filename: newFile.filename,
        path: newFile.path,
        size: newFile.size,
        md5: newFile.md5,
      },
      instantUpload: false,
    };
  }

  /**
   * 清理分片文件
   */
  private async cleanupChunks(md5: string): Promise<void> {
    const chunkDir = path.join(this.chunkBasePath, md5);
    try {
      const files = await fs.readdir(chunkDir);
      await Promise.all(
        files.map((file) => fs.unlink(path.join(chunkDir, file))),
      );
      await fs.rmdir(chunkDir);
    } catch (error) {
      // 忽略清理错误
    }

    // 清理Redis记录
    const redisKey = `upload:chunks:${md5}`;
    await this.redis.del(redisKey);
  }

  /**
   * 创建文件夹
   */
  async createFolder(
    folderName: string,
    parentPath?: string,
    userId?: number,
  ) {
    if (!folderName || folderName.trim() === '') {
      throw new BadRequestException('文件夹名称不能为空');
    }

    // 检查文件夹名称是否包含非法字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(folderName)) {
      throw new BadRequestException('文件夹名称包含非法字符');
    }

    const folderPath = parentPath
      ? path.join(parentPath, folderName)
      : folderName;
    const fullFolderPath = path.join(this.uploadBasePath, folderPath);

    // 检查文件夹是否已存在
    try {
      await fs.access(fullFolderPath);
      throw new BadRequestException('文件夹已存在');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // 创建文件夹
    await fs.mkdir(fullFolderPath, { recursive: true });

    // 保存文件夹记录到数据库
    const folder = this.fileRepository.create({
      filename: folderName,
      path: fullFolderPath,
      md5: null, // 文件夹没有MD5
      size: 0,
      mimeType: null,
      parentPath: parentPath || '/',
      isDirectory: 1,
      userId: userId,
    });
    await this.fileRepository.save(folder);

    return {
      success: true,
      message: '文件夹创建成功',
      folder: {
        id: folder.id,
        filename: folder.filename,
        path: folder.path,
        parentPath: folder.parentPath,
      },
    };
  }

  /**
   * 根据文件名获取MIME类型
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

