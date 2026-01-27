import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('file')
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, comment: '文件名' })
  filename: string;

  @Column({ type: 'varchar', length: 500, comment: '文件路径' })
  path: string;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: true, comment: '文件MD5值' })
  md5: string;

  @Column({ type: 'bigint', comment: '文件大小（字节）' })
  size: number;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'MIME类型' })
  mimeType: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '父目录路径' })
  parentPath: string;

  @Column({ type: 'tinyint', default: 0, comment: '是否为文件夹：0-文件，1-文件夹' })
  isDirectory: number;

  @Column({ type: 'int', nullable: true, comment: '上传用户ID' })
  createBy: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;
}

