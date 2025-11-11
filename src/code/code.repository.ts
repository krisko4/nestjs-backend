import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Code, CodeDocument, CreateCodeSchema } from './schemas/code.schema';
import { CreateCodeDto } from './dto/create-code.dto';
import { CodeType } from './queries/code-filter.query';
import { toMongoObjectId } from 'src/utils/mongo';

@Injectable()
export class CodeRepository extends MongoRepository<
  CodeDocument,
  CreateCodeSchema
> {
  constructor(
    @InjectModel(Code.name)
    private readonly codeModel: Model<CodeDocument>,
  ) {
    super(codeModel);
  }
  createCode(
    createCodeDto: CreateCodeDto,
    value: string,
    session?: ClientSession,
  ) {
    const { userId, rewardId, invitationId, locationId } = createCodeDto;
    return this.create(
      {
        user: toMongoObjectId(userId),
        reward: rewardId ? toMongoObjectId(rewardId) : undefined,
        invitation: invitationId ? toMongoObjectId(invitationId) : undefined,
        locationId: locationId ? toMongoObjectId(locationId) : undefined,
        value,
      },
      session,
    );
  }
  findByRewardId(rewardId: string) {
    return this.find({ reward: toMongoObjectId(rewardId) });
  }

  findByRewardsIds(rewardsIds: string[]) {
    const validRewardsIds = rewardsIds.map((id) => new Types.ObjectId(id));
    return this.find({ reward: { $in: validRewardsIds } });
  }

  findByValue(value: string) {
    return this.codeModel
      .findOne({ value })
      .populate({
        path: 'invitation',
        populate: {
          path: 'referral',
        },
      })
      .populate({
        path: 'reward',
        populate: {
          path: 'place',
        },
      });
  }

  useCode(value: string) {
    return this.findOneAndUpdate({ value }, { usedAt: new Date() });
  }

  useCodeById(id: string, usedBy: string) {
    return this.findByIdAndUpdate(id, {
      usedAt: new Date(),
      usedBy: toMongoObjectId(usedBy),
    });
  }

  async findReferralCodes(userId: string) {
    const codes = await this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'invitation',
        populate: {
          path: 'referral',
        },
      });

    return codes.filter((c) => c.invitation);
  }

  async findRewardCodes(userId: string) {
    const codes = await this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'reward',
        populate: {
          path: 'event',
          populate: {
            path: 'place',
          },
        },
      });

    return codes.filter((c) => c.reward);
  }

  async findByRewardIdAndUserId(rewardId: string, userId: string) {
    return this.codeModel.findOne({
      user: toMongoObjectId(userId),
      reward: toMongoObjectId(rewardId),
    });
  }

  async findByUserId(userId: string) {
    return this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'reward',
        populate: {
          path: 'event',
          populate: {
            path: 'place',
          },
        },
      })
      .populate({
        path: 'invitation',
        populate: {
          path: 'referral',
        },
      });
  }

  async findByRewardIdAndDelete(rewardId: string, session?: ClientSession) {
    return this.codeModel.deleteMany(
      { reward: new Types.ObjectId(rewardId) },
      { session },
    );
  }

  async findUnusedCodeByLocationIdAndUserId(
    locationId: string,
    userId: string,
  ) {
    return this.codeModel.findOne({
      locationId: toMongoObjectId(locationId),
      user: toMongoObjectId(userId),
      usedAt: { $exists: false },
    });
  }

  /**
   * Pobiera wszystkich unikalnych klientów (użytkowników którzy zeskanowali kody)
   * dla place'ów należących do danego użytkownika (owner/employee)
   * @param placeIds - Lista ID place'ów należących do użytkownika
   * @param page - Numer strony (zaczyna się od 1)
   * @param limit - Liczba elementów na stronę
   * @param placeId - Opcjonalny filtr po konkretnym placeId
   * @param locationId - Opcjonalny filtr po locationId
   * @param email - Opcjonalny filtr po emailu klienta
   * @param minScans - Minimalna liczba skanów
   * @param maxScans - Maksymalna liczba skanów
   * @param lastScanDateFrom - Data początkowa ostatniej wizyty
   * @param lastScanDateTo - Data końcowa ostatniej wizyty
   * @param sortBy - Pole według którego sortować (domyślnie: lastScanDate)
   * @param sortOrder - Kierunek sortowania (domyślnie: desc)
   */
  async findClientsByPlaceIds(
    placeIds: string[],
    page: number = 1,
    limit: number = 10,
    placeId?: string,
    locationId?: string,
    email?: string,
    minScans?: number,
    maxScans?: number,
    lastScanDateFrom?: string,
    lastScanDateTo?: string,
    sortBy: string = 'lastScanDate',
    sortOrder: string = 'desc',
  ) {
    const placeObjectIds = placeIds.map((id) => new Types.ObjectId(id));
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        // Tylko kody które zostały użyte
        $match: {
          usedAt: { $exists: true },
        },
      },
      {
        // Populujemy reward żeby dostać się do place i locationId
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: '$rewardData',
      },
      {
        // Filtrujemy tylko kody z place'ów użytkownika
        // ORAZ opcjonalnie po placeId lub locationId jeśli zostały podane
        $match: {
          'rewardData.place': placeId
            ? new Types.ObjectId(placeId)
            : { $in: placeObjectIds },
          ...(locationId && {
            'rewardData.locationId': new Types.ObjectId(locationId),
          }),
        },
      },
      {
        // Grupujemy po user (klient) i place
        $group: {
          _id: {
            userId: '$user',
            placeId: '$rewardData.place',
          },
          scanCount: { $sum: 1 },
          lastScanDate: { $max: '$usedAt' },
          firstScanDate: { $min: '$usedAt' },
        },
      },
      {
        // Grupujemy ponownie tylko po userId żeby dostać wszystkie place'y
        $group: {
          _id: '$_id.userId',
          totalScans: { $sum: '$scanCount' },
          lastScanDate: { $max: '$lastScanDate' },
          firstScanDate: { $min: '$firstScanDate' },
          places: {
            $push: {
              placeId: '$_id.placeId',
              scanCount: '$scanCount',
            },
          },
        },
      },
      {
        // Populujemy dane użytkownika
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData',
        },
      },
      {
        $unwind: '$userData',
      },
      {
        // Filtrujemy po kryteriach dodatkowych
        $match: {
          ...(email && {
            'userData.email': { $regex: email, $options: 'i' },
          }),
          ...((minScans !== undefined || maxScans !== undefined) && {
            totalScans: {
              ...(minScans !== undefined && { $gte: minScans }),
              ...(maxScans !== undefined && { $lte: maxScans }),
            },
          }),
          ...((lastScanDateFrom || lastScanDateTo) && {
            lastScanDate: {
              ...(lastScanDateFrom && { $gte: new Date(lastScanDateFrom) }),
              ...(lastScanDateTo && { $lte: new Date(lastScanDateTo) }),
            },
          }),
        },
      },
      {
        // Sortujemy według wybranego pola i kierunku
        $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
      },
    ];

    // Wykonujemy agregację z facet żeby dostać zarówno dane jak i total count
    const result = await this.codeModel.aggregate([
      ...(pipeline as any[]),
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          metadata: [{ $count: 'total' }],
        },
      },
    ]);

    return {
      data: result[0]?.data || [],
      total: result[0]?.metadata[0]?.total || 0,
    };
  }

  /**
   * Pobiera historię skanów dla konkretnego rewarda (kuponu)
   * @param rewardId - ID rewarda
   * @param start - Offset (skip) - liczba elementów do pominięcia
   * @param limit - Liczba elementów na stronę
   */
  async findScanHistoryByRewardId(
    rewardId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    const skip = start;

    const pipeline: any[] = [
      {
        // Tylko kody dla tego konkretnego rewarda które zostały użyte
        $match: {
          reward: new Types.ObjectId(rewardId),
          usedAt: { $exists: true },
        },
      },
      {
        // Sortujemy po dacie użycia (najnowsze pierwsze)
        $sort: { usedAt: -1 },
      },
      {
        // Populujemy dane użytkownika który otrzymał kod (user)
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'codeOwner',
        },
      },
      {
        $unwind: {
          path: '$codeOwner',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Populujemy dane rewarda żeby dostać się do place
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardInfo',
        },
      },
      {
        $unwind: {
          path: '$rewardInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Populujemy dane place
        $lookup: {
          from: 'places',
          localField: 'rewardInfo.place',
          foreignField: '_id',
          as: 'placeInfo',
        },
      },
      {
        $unwind: {
          path: '$placeInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Filtrujemy employees żeby znaleźć tego który zeskanował kod
        $addFields: {
          scannedByEmployee: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$placeInfo.employees',
                  as: 'emp',
                  cond: { $eq: ['$$emp.user', '$usedBy'] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        // Populujemy dane użytkownika w scannedByEmployee
        $lookup: {
          from: 'users',
          localField: 'scannedByEmployee.user',
          foreignField: '_id',
          as: 'scannedByUserData',
        },
      },
      {
        $addFields: {
          scannedByEmployee: {
            $cond: {
              if: { $ne: ['$scannedByEmployee', null] },
              then: {
                $mergeObjects: [
                  '$scannedByEmployee',
                  {
                    user: { $arrayElemAt: ['$scannedByUserData', 0] },
                  },
                ],
              },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          value: 1,
          usedAt: 1,
          codeOwner: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            img: 1,
          },
          scannedBy: {
            _id: '$scannedByEmployee._id',
            role: '$scannedByEmployee.role',
            status: '$scannedByEmployee.status',
            email: '$scannedByEmployee.email',
            name: '$scannedByEmployee.name',
            user: {
              _id: '$scannedByEmployee.user._id',
              firstName: '$scannedByEmployee.user.firstName',
              lastName: '$scannedByEmployee.user.lastName',
              email: '$scannedByEmployee.user.email',
              img: '$scannedByEmployee.user.img',
            },
          },
        },
      },
    ];

    // Wykonujemy agregację z facet żeby dostać zarówno dane jak i total count
    const result = await this.codeModel.aggregate([
      ...pipeline,
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          metadata: [
            { $count: 'total' },
            {
              $addFields: {
                start: start,
                limit: limit,
              },
            },
          ],
        },
      },
    ]);

    const metadata = result[0]?.metadata[0] || { total: 0, start, limit };

    return {
      data: result[0]?.data || [],
      metadata: [
        {
          total: metadata.total || 0,
          start: start,
          limit: limit,
        },
      ],
    };
  }

  /**
   * Pobiera historię skanowanych kodów dla konkretnego klienta (user)
   * w place'ach należących do danego właściciela
   * @param clientUserId - ID klienta
   * @param placeIds - Lista ID place'ów należących do właściciela
   * @param page - Numer strony (zaczyna się od 1)
   * @param limit - Liczba elementów na stronę
   */
  async findScanHistoryByClientAndPlaceIds(
    clientUserId: string,
    placeIds: string[],
    page: number = 1,
    limit: number = 10,
  ) {
    const placeObjectIds = placeIds.map((id) => new Types.ObjectId(id));
    const skip = (page - 1) * limit;

    // Najpierw pobieramy wszystkie kody i filtrujemy
    const allCodes = await this.codeModel
      .find({
        user: toMongoObjectId(clientUserId),
        usedAt: { $exists: true },
      })
      .populate({
        path: 'reward',
        populate: {
          path: 'place',
        },
      })
      .populate('usedBy')
      .sort({ usedAt: -1 });

    // Filtrujemy tylko kody z place'ów użytkownika
    const filteredCodes = allCodes.filter((code) => {
      if (!code.reward || !code.reward.place) return false;
      return placeObjectIds.some(
        (id) => id.toString() === code.reward.place._id.toString(),
      );
    });

    // Zwracamy tylko odpowiednią stronę
    return {
      data: filteredCodes.slice(skip, skip + limit),
      total: filteredCodes.length,
    };
  }

  async countUserRewardUsage(
    rewardId: string,
    userId: string,
  ): Promise<number> {
    return this.codeModel.countDocuments({
      reward: toMongoObjectId(rewardId),
      user: toMongoObjectId(userId),
      usedAt: { $exists: true },
    });
  }
}
