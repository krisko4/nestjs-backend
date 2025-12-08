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
import { CodeSseService } from './code-sse.service';
import { EmployeeService } from 'src/employee/employee.service';

@Injectable()
export class CodeService {
  constructor(
    private readonly codeRepository: CodeRepository,
    private readonly codeSseService: CodeSseService,
    @Inject(forwardRef(() => EmployeeService))
    private readonly employeeService: EmployeeService,
    @Inject(forwardRef(() => PlaceService))
    private readonly placeService: PlaceService,
  ) {}
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

    let placeId: string;

    if (code.reward) {
      placeId = code.reward.place._id.toString();
    } else if (code.locationId) {
      const place = await this.placeService.findByLocationId(
        code.locationId.toString(),
      );
      if (!place) {
        throw new NotFoundException('PLACE_NOT_FOUND');
      }
      placeId = place._id.toString();
    } else {
      throw new BadRequestException('INVALID_CODE_CONFIGURATION');
    }

    const employee = await this.employeeService.findByPlaceIdAndUserId(
      placeId,
      uid,
    );
    if (!employee) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    const result = await this.codeRepository.useCodeById(code._id, uid);

    this.codeSseService.emitCodeScanned({
      codeValue: value,
      userId: code.user.toString(),
      scannedBy: uid,
      timestamp: new Date(),
    });

    return result;
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
    return code;
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

  async findUnusedCodeByLocationIdAndUserId(
    locationId: string,
    userId: string,
  ) {
    return this.codeRepository.findUnusedCodeByLocationIdAndUserId(
      locationId,
      userId,
    );
  }

  async findScanHistoryByRewardId(
    rewardId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    return this.codeRepository.findScanHistoryByRewardId(
      rewardId,
      start,
      limit,
    );
  }

  async countUserRewardUsage(
    rewardId: string,
    userId: string,
  ): Promise<number> {
    return this.codeRepository.countUserRewardUsage(rewardId, userId);
  }

  async countRewardUsage(rewardId: string): Promise<number> {
    return this.codeRepository.countRewardUsage(rewardId);
  }

  async findUsedCodesByUserId(
    userId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    return this.codeRepository.findUsedCodesByUserId(userId, start, limit);
  }

  async findClientsByPlaceIds(
    placeIds: string[],
    page: number = 1,
    limit: number = 10,
    placeId?: string,
    locationIds?: string[],
    email?: string,
    minScans?: number,
    maxScans?: number,
    lastScanDateFrom?: string,
    lastScanDateTo?: string,
    sortBy: string = 'lastScanDate',
    sortOrder: string = 'desc',
  ) {
    return this.codeRepository.findClientsByPlaceIds(
      placeIds,
      page,
      limit,
      placeId,
      locationIds,
      email,
      minScans,
      maxScans,
      lastScanDateFrom,
      lastScanDateTo,
      sortBy,
      sortOrder,
    );
  }

  async findScanHistoryByClientAndPlaceIds(
    clientUserId: string,
    placeIds: string[],
    page: number = 1,
    limit: number = 10,
  ) {
    return this.codeRepository.findScanHistoryByClientAndPlaceIds(
      clientUserId,
      placeIds,
      page,
      limit,
    );
  }

  async findScanHistoryByUserId(
    scannedByUserId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.codeRepository.findScanHistoryByUserId(
      scannedByUserId,
      page,
      limit,
    );
  }
}
