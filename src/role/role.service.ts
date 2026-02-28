import { BadRequestException, Injectable } from '@nestjs/common';
import { Role } from './role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Like, Repository } from 'typeorm';
import { CreateRoleDto, RolePageQueryDto } from './role.dto';
import {
  parsePaginationParams,
  buildPaginatedResponse,
} from '../common/pagination';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const { name, code } = createRoleDto;
    if (code) {
      const existRole = await this.roleRepository.findOne({ where: { code } });
      if (existRole) {
        throw new BadRequestException('角色编码已存在');
      }
    }

    const newRole = this.roleRepository.create({
      name,
      code,
    });
    await this.roleRepository.save(newRole);
    return {
      id: newRole.id,
      name: newRole.name,
      code: newRole.code,
    };
  }

  findAll() {
    return this.roleRepository.find({
      order: { id: 'ASC' },
    });
  }

  async page(query: RolePageQueryDto) {
    const { page: p, pageSize: ps, skip } = parsePaginationParams(query);
    const { name } = query;
    const where: FindOptionsWhere<Role> = {};
    if (name) {
      where.name = Like(`%${name}%`);
    }
    const [data, total] = await this.roleRepository.findAndCount({
      where,
      order: { id: 'ASC' },
      take: ps,
      skip,
    });
    return buildPaginatedResponse(data, total, p, ps);
  }

  findById(id: number) {
    return this.roleRepository.findOne({ where: { id } });
  }

  findByCode(code: string) {
    return this.roleRepository.findOne({ where: { code } });
  }
}
