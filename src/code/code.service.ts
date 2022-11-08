import { ReferralService } from './../referral/referral.service';
import { CodeFilterQuery } from './queries/code-filter.query';
import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
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

  async findByCodeValue(value: string) {
    const code = await this.codeRepository.findByCodeValue(value);
    if (!code) return null;
    if (code.isUsed) {
      throw new InternalServerErrorException('CODE_USED');
    }
    if (code.isExpired) {
      throw new InternalServerErrorException('CODE_EXPIRED');
    }
    return code;
  }

  findByQuery(codeFilterQuery: CodeFilterQuery, uid: string) {
    const { rewardId, value } = codeFilterQuery;
    if (value) {
      return this.findByCodeValue(value);
    }
    if (rewardId) {
      return this.codeRepository.findByRewardId(rewardId);
    }
    return this.codeRepository.findByUserId(uid);
  }
}
