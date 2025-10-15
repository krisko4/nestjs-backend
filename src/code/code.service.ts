import { PlaceService } from 'src/place/place.service';
import { CodeFilterQuery, CodeType } from './queries/code-filter.query';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CodeRepository } from './code.repository';
import { CreateCodeDto } from './dto/create-code.dto';
import { ClientSession } from 'mongoose';
import { UseCodeDto } from './dto/use-code.dto';
import { NotFoundError } from 'rxjs';

@Injectable()
export class CodeService {
  constructor(private readonly codeRepository: CodeRepository) {}
  async create(createCodeDto: CreateCodeDto, session?: ClientSession) {
    let isDuplicate = true;
    let value = Math.random().toString(36).substring(2, 7);
    while (isDuplicate) {
      const duplicateCode = await this.findByValue(value);
      if (duplicateCode) {
        value = Math.random().toString(36).substring(2, 7);
        continue;
      }
      isDuplicate = false;
    }
    return this.codeRepository.createCode(createCodeDto, value, session);
  }

  async use(useCodeDto: UseCodeDto, uid: string) {
    const { value } = useCodeDto;
    const code = await this.findByValue(value);
    if (!code) {
      throw new NotFoundException('INVALID_CODE');
    }
    if (code.usedAt) {
      throw new BadRequestException('CODE_ALREADY_USED');
    }
    const place = code.reward.place;
    const isUserEmployee = place.employees.some(
      (u) => u.user.toString() === uid,
    );
    if (!isUserEmployee) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }
    return this.codeRepository.useCodeById(code._id, uid);
  }

  useById(id: string, usedBy: string) {
    return this.codeRepository.useCodeById(id, usedBy);
  }

  async findByValue(value: string) {
    return this.codeRepository.findByValue(value);
  }

  async findValidCodeByValue(
    value: string,
    userId: string,
    locationId?: string,
  ) {
    const code = await this.findByValue(value);
    if (!code) throw new InternalServerErrorException('CODE_INVALID');
    if (code.usedAt) throw new InternalServerErrorException('CODE_USED');
    const isUserCodeReceiver = code.user.toString() === userId.toString();
    if (!isUserCodeReceiver) {
      throw new InternalServerErrorException('CODE_INVALID');
    }
    if (
      locationId &&
      (!code.invitation ||
        code.invitation.referral.locationId.toString() !==
          locationId.toString())
    ) {
      throw new InternalServerErrorException('CODE_INVALID');
    }
    return code;
  }

  async findReferralCodes(userId: string) {
    const codes = await this.codeRepository.findReferralCodes(userId);
    return codes.map((code) => {
      return {
        _id: code._id,
        value: code.value,
        description: code.invitation.referral.description,
        date: code.invitation.createdAt,
        placeLogo: 'something',
      };
    });
    // return Promise.all(
    //   codes.map(async (code) => {
    //     const place = await this.placeService.findByLocationId(
    //       code.invitation.referral.locationId,
    //     );
    //     return {
    //       _id: code._id,
    //       value: code.value,
    //       description: code.invitation.referral.description,
    //       date: code.invitation.createdAt,
    //       placeLogo: `${process.env.CLOUDI_URL}/${place.logo}`,
    //     };
    //   }),
    // );
  }

  async findRewardCodes(userId: string) {
    const codes = await this.codeRepository.findRewardCodes(userId);
    return codes.map((code) => {
      return {
        _id: code._id,
        value: code.value,
        description: code.reward.description,
        date: code.reward.date,
        eventName: code.reward.event.title,
        placeLogo: `${process.env.CLOUDI_URL}/${code.reward.event.place.logo}`,
      };
    });
  }

  findByRewardIdAndUserId(rewardId: string, userId: string) {
    return this.codeRepository.findByRewardIdAndUserId(rewardId, userId);
  }

  findByUserId(userId: string, type: CodeType) {
    switch (type) {
      case CodeType.REFERRAL:
        return this.findReferralCodes(userId);
      case CodeType.REWARD:
        return this.findRewardCodes(userId);
      default:
        return this.codeRepository.findByUserId(userId);
    }
  }

  async findByRewardsIds(rewardsIds: string[]) {
    return this.codeRepository.findByRewardsIds(rewardsIds);
  }

  async findByRewardId(rewardId: string) {
    return this.codeRepository.findByRewardId(rewardId);
  }

  findByQuery(codeFilterQuery: CodeFilterQuery, userId: string) {
    const { rewardId, value, locationId, type } = codeFilterQuery;
    if (value) {
      return this.findValidCodeByValue(value, userId, locationId);
    }
    if (rewardId) {
      return this.codeRepository.findByRewardId(rewardId);
    }
    return this.findByUserId(userId, type);
  }

  async findByRewardIdAndDelete(rewardId: string, session?: ClientSession) {
    return this.codeRepository.findByRewardIdAndDelete(rewardId, session);
  }

  async findUnusedCodeByLocationIdAndUserId(locationId: string, userId: string) {
    return this.codeRepository.findUnusedCodeByLocationIdAndUserId(locationId, userId);
  }
}
