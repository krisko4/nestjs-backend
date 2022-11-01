import { UserService } from 'src/user/user.service';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { ReferralQuery } from './queries/referral.query';
import { PlaceService } from 'src/place/place.service';
import { ReferralRepository } from './referral.repository';
import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { CreateReferralDto } from './dto/create-referral.dto';

@Injectable()
export class ReferralService {
  constructor(
    private readonly referralRepository: ReferralRepository,
    private readonly placeService: PlaceService,
    private readonly userService: UserService,
  ) {}
  async create(createReferralDto: CreateReferralDto, userId: string) {
    const { locationId } = createReferralDto;
    await this.validateReferralLocation(locationId, userId);
    return this.referralRepository.createReferral(createReferralDto);
  }

  private async validateReferralLocation(locationId: string, userId: string) {
    const place = await this.placeService.findByLocationId(locationId);
    if (!place)
      throw new InternalServerErrorException(
        'Place not found for locationId:' + locationId,
      );
    if (place.userId.toString() !== userId.toString()) {
      throw new InternalServerErrorException('Operation forbidden');
    }
    return place;
  }

  async findByLocationId(locationId: string) {
    return this.referralRepository.findByLocationId(locationId);
  }

  async invite(
    id: string,
    userId: string,
    updateReferralDto: UpdateReferralDto,
  ) {
    const { invitedEmail } = updateReferralDto;
    const invitedUser = await this.userService.findByEmail(invitedEmail);
    if (!invitedUser) {
      throw new InternalServerErrorException('USER_NOT_FOUND');
    }
    const referral = await this.referralRepository.findByIdPopulated(id);
    if (!referral) {
      throw new BadRequestException('INVALID_REFERRAL_ID');
    }
    const existingInvitation = referral.invitations.find(
      (i) => i.referrer._id.toString() === userId.toString(),
    );
    if (!existingInvitation) {
      return this.referralRepository.invite(id, userId, [invitedUser._id]);
    }
    if (
      existingInvitation.invitedUsers.some(
        (uid) => uid.toString === invitedUser._id.toString(),
      )
    ) {
      throw new InternalServerErrorException('USER_ALREADY_INVITED');
    }
    const invitedUsers = [...existingInvitation.invitedUsers, invitedUser._id];
    return this.referralRepository.invite(id, userId, invitedUsers);
  }

  async findByQuery(query: ReferralQuery) {
    const { locationId } = query;
    if (locationId) {
      return this.findByLocationId(locationId);
    }
  }
}
