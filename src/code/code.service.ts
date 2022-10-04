import { CodeFilterQuery } from './queries/code-filter.query';
import { Injectable } from '@nestjs/common';
import { CodeRepository } from './code.repository';
import { CreateCodeDto } from './dto/create-code.dto';
import { ClientSession } from 'mongoose';

@Injectable()
export class CodeService {
  constructor(private readonly codeRepository: CodeRepository) {}
  async create(createCodeDto: CreateCodeDto, session?: ClientSession) {
    let isDuplicate = true;
    let value = Math.random().toString(36).substring(2, 7);
    while (isDuplicate) {
      const duplicateCode = await this.findByCodeValue(value);
      if (duplicateCode) {
        value = Math.random().toString(36).substring(2, 7);
        continue;
      }
      isDuplicate = false;
    }
    return this.codeRepository.createCode(createCodeDto, value, session);
  }
  findByCodeValue(value: string) {
    return this.codeRepository.findOne({ value });
  }
  findByQuery(codeFilterQuery: CodeFilterQuery, uid: string) {
    const { rewardId } = codeFilterQuery;
    if (rewardId) {
      return this.codeRepository.findByRewardId(rewardId);
    }
    return this.codeRepository.findByUserId(uid);
  }
}
