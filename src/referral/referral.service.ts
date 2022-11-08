import { InvitationService } from './../invitation/invitation.service';
import { CodeService } from 'src/code/code.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { UserService } from 'src/user/user.service';
import { ReferralQuery } from './queries/referral.query';
import { PlaceService } from 'src/place/place.service';
import { ReferralRepository } from './referral.repository';
import {
  Injectable,
  InternalServerErrorException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { CreateReferralDto } from './dto/create-referral.dto';
import mongoose from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';

@Injectable()
export class ReferralService {
  constructor(
    private readonly referralRepository: ReferralRepository,
    private readonly placeService: PlaceService,
    private readonly userService: UserService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => InvitationService))
    private invitationService: InvitationService,
    private readonly codeService: CodeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
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

  async findByCodeValueAndLocationId(value: string, locationId: string) {
    const code = await this.codeService.findByCodeValue(value);
    const ref = await this.findByInvitationId(code.invitation._id);
    if (ref.locationId.toString() !== locationId.toString()) {
      throw new InternalServerErrorException('INVALID_CODE');
    }
    return code;
  }

  async findByLocationId(locationId: string, userId: string) {
    const place = await this.placeService.findByLocationId(locationId);
    const isUserOwner = place.userId.toString() === userId.toString();
    const refs = await this.referralRepository.findByLocationId(locationId);
    const subscriptions = await this.subscriptionService.findByLocationId(
      locationId,
    );
    if (isUserOwner) return refs;
    return Promise.all(
      refs.map(async (ref) => {
        const invitation =
          await this.invitationService.findByReferralIdAndReferrerId(
            ref._id,
            userId,
          );
        return {
          ...ref,
          invitations: invitation
            ? [
                {
                  ...invitation,
                  invitedUsers: invitation.invitedUsers.filter((uid) =>
                    subscriptions.some(
                      (sub) => sub.user._id.toString() === uid.toString(),
                    ),
                  ),
                },
              ]
            : [],
        };
      }),
    );
  }

  async findByInvitationId(invitationId: string) {
    return this.referralRepository.findByInvitationId(invitationId);
  }

  async findById(id: string) {
    return this.referralRepository.findById(id);
  }

  async findByQuery(query: ReferralQuery, userId: string) {
    const { locationId, codeValue } = query;
    if (locationId && codeValue) {
      return this.findByCodeValueAndLocationId(codeValue, locationId);
    }
    if (locationId) {
      return this.findByLocationId(locationId, userId);
    }
  }
}
