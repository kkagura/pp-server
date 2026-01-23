import { IsNotEmpty, IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString({ message: '父目录路径必须是字符串' })
  parentPath?: string;
}

export class CreateFolderDto {
  @IsNotEmpty({ message: '文件夹名称不能为空' })
  @IsString({ message: '文件夹名称必须是字符串' })
  folderName: string;

  @IsOptional()
  @IsString({ message: '父目录路径必须是字符串' })
  parentPath?: string;
}

export class ChunkUploadDto {
  @IsNotEmpty({ message: '文件MD5不能为空' })
  @IsString({ message: '文件MD5必须是字符串' })
  md5: string;

  @IsNotEmpty({ message: '文件名不能为空' })
  @IsString({ message: '文件名必须是字符串' })
  filename: string;

  @IsNotEmpty({ message: '分片索引不能为空' })
  @IsInt({ message: '分片索引必须是整数' })
  @Min(0, { message: '分片索引不能小于0' })
  chunkIndex: number;

  @IsNotEmpty({ message: '总分片数不能为空' })
  @IsInt({ message: '总分片数必须是整数' })
  @Min(1, { message: '总分片数不能小于1' })
  totalChunks: number;

  @IsNotEmpty({ message: '文件大小不能为空' })
  @IsNumber({}, { message: '文件大小必须是数字' })
  @Min(0, { message: '文件大小不能小于0' })
  totalSize: number;

  @IsOptional()
  @IsString({ message: '父目录路径必须是字符串' })
  parenId?: string;
}

export class CheckFileDto {
  @IsNotEmpty({ message: '文件MD5不能为空' })
  @IsString({ message: '文件MD5必须是字符串' })
  md5: string;

  @IsNotEmpty({ message: '文件名不能为空' })
  @IsString({ message: '文件名必须是字符串' })
  filename: string;
}

export class MergeChunksDto {
  @IsNotEmpty({ message: '文件MD5不能为空' })
  @IsString({ message: '文件MD5必须是字符串' })
  md5: string;

  @IsNotEmpty({ message: '文件名不能为空' })
  @IsString({ message: '文件名必须是字符串' })
  filename: string;

  @IsNotEmpty({ message: '总分片数不能为空' })
  @IsInt({ message: '总分片数必须是整数' })
  @Min(1, { message: '总分片数不能小于1' })
  totalChunks: number;

  @IsNotEmpty({ message: '文件大小不能为空' })
  @IsNumber({}, { message: '文件大小必须是数字' })
  @Min(0, { message: '文件大小不能小于0' })
  totalSize: number;

  @IsOptional()
  @IsString({ message: '父目录路径必须是字符串' })
  parentPath?: string;
}

