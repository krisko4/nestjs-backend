import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { MongoRepository } from '../database/repository';
import {
  CreateEmployeeSchema,
  Employee,
  EmployeeDocument,
  EmployeePopulated,
} from './schemas/employee.schema';
import {
  LocationAssignment,
  PlaceAssignment,
  PlaceEmployeeRole,
  PlaceEmployeeStatus,
} from './schemas/place-assignment.schema';

@Injectable()
export class EmployeeRepository extends MongoRepository<
  EmployeeDocument,
  CreateEmployeeSchema
> {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {
    super(employeeModel);
  }

  async findByUserId(userId: string): Promise<EmployeeDocument[]> {
    return this.employeeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('user')
      .exec();
  }

  async findByEmail(email: string): Promise<EmployeeDocument | null> {
    return this.employeeModel.findOne({ email }).exec();
  }

  async updateEmployee(
    employeeId: string,
    updateData: { name?: string },
  ): Promise<EmployeeDocument | null> {
    return this.employeeModel
      .findByIdAndUpdate(
        employeeId,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async removeEmployee(employeeId: string): Promise<EmployeeDocument | null> {
    return this.employeeModel.findByIdAndDelete(employeeId).exec();
  }

  async findByIdWithPopulate(
    employeeId: string,
  ): Promise<EmployeePopulated | null> {
    return this.employeeModel
      .findById(employeeId)
      .populate('user')
      .populate('places.place')
      .populate('places.locations.locationId')
      .exec() as unknown as Promise<EmployeePopulated | null>;
  }

  async assignUser(
    employeeId: string,
    userId: Types.ObjectId,
    session?: ClientSession,
  ): Promise<EmployeeDocument | null> {
    return this.employeeModel
      .findByIdAndUpdate(
        employeeId,
        { $set: { user: userId } },
        { new: true, runValidators: true, session },
      )
      .exec();
  }

  // New methods for place assignment management

  async addPlaceAssignment(
    employeeId: string,
    placeId: Types.ObjectId,
    locationAssignments: LocationAssignment[],
    name?: string,
    session?: ClientSession,
  ): Promise<EmployeeDocument | null> {
    const placeAssignment: PlaceAssignment = {
      place: placeId,
      name,
      locations: locationAssignments,
    };

    return this.employeeModel
      .findByIdAndUpdate(
        employeeId,
        { $push: { places: placeAssignment } },
        { new: true, runValidators: true, session },
      )
      .exec();
  }

  async updatePlaceAssignment(
    employeeId: string,
    placeId: string,
    updates: {
      name?: string;
      locations?: LocationAssignment[];
    },
    session?: ClientSession,
  ): Promise<EmployeeDocument | null> {
    const updateFields: Record<string, unknown> = {};

    if (updates.name !== undefined) {
      updateFields['places.$.name'] = updates.name;
    }
    if (updates.locations !== undefined) {
      updateFields['places.$.locations'] = updates.locations;
    }

    return this.employeeModel
      .findOneAndUpdate(
        { _id: employeeId, 'places.place': new Types.ObjectId(placeId) },
        { $set: updateFields },
        { new: true, runValidators: true, session },
      )
      .exec();
  }

  async removePlaceAssignment(
    employeeId: string,
    placeId: string,
    session?: ClientSession,
  ): Promise<EmployeeDocument | null> {
    return this.employeeModel
      .findByIdAndUpdate(
        employeeId,
        { $pull: { places: { place: new Types.ObjectId(placeId) } } },
        { new: true, runValidators: true, session },
      )
      .exec();
  }

  async findByPlaceId(
    placeId: string,
    page: number = 0,
    limit: number = 10,
    locationIds?: string[],
  ) {
    const skip = page * limit;

    const matchQuery: Record<string, unknown> = {
      'places.place': new Types.ObjectId(placeId),
    };

    if (locationIds && locationIds.length > 0) {
      matchQuery['places.locations.locationId'] = {
        $in: locationIds.map((id) => new Types.ObjectId(id)),
      };
    }

    const [data, total] = await Promise.all([
      this.employeeModel
        .aggregate([
          { $match: matchQuery },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'places',
              localField: 'places.place',
              foreignField: '_id',
              as: 'placesData',
            },
          },
          {
            $addFields: {
              userId: '$user',
              places: {
                $map: {
                  input: '$places',
                  as: 'place',
                  in: {
                    $mergeObjects: [
                      '$$place',
                      {
                        place: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$placesData',
                                as: 'pd',
                                cond: { $eq: ['$$pd._id', '$$place.place'] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $project: {
              user: 0,
              placesData: 0,
            },
          },
        ])
        .exec(),
      this.employeeModel.countDocuments(matchQuery).exec(),
    ]);

    return {
      data: data as any,
      metadata: {
        total,
        start: page,
        limit,
      },
    };
  }

  async findByPlaceIdAndUserId(
    placeId: string,
    userId: string,
  ): Promise<EmployeeDocument | null> {
    return this.employeeModel
      .findOne({
        user: new Types.ObjectId(userId),
        'places.place': new Types.ObjectId(placeId),
      })
      .exec();
  }

  async isUserBossOfPlace(userId: string, placeId: string): Promise<boolean> {
    const employee = await this.employeeModel
      .findOne({
        user: new Types.ObjectId(userId),
        'places.place': new Types.ObjectId(placeId),
        'places.locations.role': PlaceEmployeeRole.BOSS,
        'places.locations.status': PlaceEmployeeStatus.ACTIVE,
      })
      .exec();

    return !!employee;
  }

  async isUserBossOfLocation(
    userId: string,
    locationId: string,
  ): Promise<boolean> {
    const employee = await this.employeeModel
      .findOne({
        user: new Types.ObjectId(userId),
        'places.locations': {
          $elemMatch: {
            location: new Types.ObjectId(locationId),
            role: PlaceEmployeeRole.BOSS,
            status: PlaceEmployeeStatus.ACTIVE,
          },
        },
      })
      .exec();

    return !!employee;
  }

  async updateLocationStatus(
    employeeId: string,
    placeId: string,
    locationId: string,
    status: PlaceEmployeeStatus,
    session?: ClientSession,
  ): Promise<EmployeeDocument | null> {
    return this.employeeModel
      .findOneAndUpdate(
        {
          _id: employeeId,
          'places.place': new Types.ObjectId(placeId),
          'places.locations.locationId': new Types.ObjectId(locationId),
        },
        {
          $set: {
            'places.$[place].locations.$[loc].status': status,
          },
        },
        {
          arrayFilters: [
            { 'place.place': new Types.ObjectId(placeId) },
            { 'loc.location': new Types.ObjectId(locationId) },
          ],
          new: true,
          runValidators: true,
          session,
        },
      )
      .exec();
  }

  async findEmployeesWithPendingInvitationsForPlace(
    placeId: string,
  ): Promise<EmployeeDocument[]> {
    return this.employeeModel
      .find({
        'places.place': new Types.ObjectId(placeId),
        'places.locations.status': PlaceEmployeeStatus.WAITING_FOR_CONFIRMATION,
      })
      .populate('user')
      .exec();
  }

  async getAllEmployeesByUserId(
    userId: string,
    page: number = 0,
    limit: number = 10,
  ): Promise<{ data: EmployeePopulated[]; total: number }> {
    const skip = page * limit;

    const [data, total] = await Promise.all([
      this.employeeModel
        .find({ user: new Types.ObjectId(userId) })
        .populate('user')
        .populate('places.place')
        .populate('places.locations.locationId')
        .skip(skip)
        .limit(limit)
        .exec() as unknown as Promise<EmployeePopulated[]>,
      this.employeeModel
        .countDocuments({ user: new Types.ObjectId(userId) })
        .exec(),
    ]);

    return { data, total };
  }
}
