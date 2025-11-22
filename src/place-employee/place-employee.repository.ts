import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoRepository } from '../database/repository';
import {
  CreatePlaceEmployeeSchema,
  PlaceEmployee,
  PlaceEmployeeDocument,
  PlaceEmployeePopulated,
  PlaceEmployeeRole,
  PlaceEmployeeStatus,
} from './schemas/place-employee.schema';

@Injectable()
export class PlaceEmployeeRepository extends MongoRepository<
  PlaceEmployeeDocument,
  CreatePlaceEmployeeSchema
> {
  constructor(
    @InjectModel(PlaceEmployee.name)
    private readonly placeEmployeeModel: Model<PlaceEmployeeDocument>,
  ) {
    super(placeEmployeeModel);
  }

  async findByPlaceId(placeId: string): Promise<PlaceEmployeeDocument[]> {
    return this.placeEmployeeModel
      .find({ place: new Types.ObjectId(placeId) })
      .populate('employee')
      .exec();
  }

  async findByPlaceIdAndPopulate(
    placeId: string,
    page: number = 1,
    limit: number = 10,
    locationIds?: string[],
  ) {
    const skip = (page - 1) * limit;

    // Buduj match query
    const matchQuery: any = { place: new Types.ObjectId(placeId) };

    // Jeśli podano locationIds, dodaj filtr
    if (locationIds && locationIds.length > 0) {
      matchQuery.location = {
        $in: locationIds.map((id) => new Types.ObjectId(id)),
      };
    }

    // Agregacja grupująca po employee i zbierająca wszystkie locationIds
    const aggregationPipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: '$employee',
          place: { $first: '$place' },
          role: { $first: '$role' },
          status: { $first: '$status' },
          locationIds: { $push: '$location' },
          placeEmployeeIds: { $push: '$_id' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee',
        },
      },
      {
        $unwind: '$employee',
      },
      {
        $lookup: {
          from: 'places',
          localField: 'place',
          foreignField: '_id',
          as: 'place',
        },
      },
      {
        $unwind: '$place',
      },
      {
        $project: {
          _id: { $arrayElemAt: ['$placeEmployeeIds', 0] },
          employee: 1,
          place: 1,
          role: 1,
          status: 1,
          locationIds: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ];

    const [data, totalResult] = await Promise.all([
      this.placeEmployeeModel
        .aggregate([...aggregationPipeline, { $skip: skip }, { $limit: limit }])
        .exec(),
      this.placeEmployeeModel
        .aggregate([...aggregationPipeline, { $count: 'total' }])
        .exec(),
    ]);

    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    return {
      data,
      metadata: {
        start: skip,
        limit,
        total,
      },
    };
  }

  async findByEmployeeId(employeeId: string): Promise<PlaceEmployeeDocument[]> {
    return this.placeEmployeeModel
      .find({ employee: new Types.ObjectId(employeeId) })
      .populate('place')
      .exec();
  }

  async findByPlaceIdAndEmployeeId(
    placeId: string,
    employeeId: string,
  ): Promise<PlaceEmployeeDocument | null> {
    return this.placeEmployeeModel
      .findOne({
        place: new Types.ObjectId(placeId),
        employee: new Types.ObjectId(employeeId),
      })
      .exec();
  }

  async isEmployeeBossOfPlace(
    employeeId: string,
    placeId: string,
  ): Promise<boolean> {
    const placeEmployee = await this.placeEmployeeModel
      .findOne({
        place: new Types.ObjectId(placeId),
        employee: new Types.ObjectId(employeeId),
        role: PlaceEmployeeRole.BOSS,
      })
      .exec();
    return !!placeEmployee;
  }

  async updatePlaceEmployee(
    placeEmployeeId: string,
    updateData: { role?: PlaceEmployeeRole },
  ): Promise<PlaceEmployeeDocument | null> {
    return this.placeEmployeeModel
      .findByIdAndUpdate(
        placeEmployeeId,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async removePlaceEmployee(
    placeEmployeeId: string,
  ): Promise<PlaceEmployeeDocument | null> {
    return this.placeEmployeeModel.findByIdAndDelete(placeEmployeeId).exec();
  }

  async findByIdWithPopulate(
    placeEmployeeId: string,
  ): Promise<PlaceEmployeePopulated | null> {
    return this.placeEmployeeModel
      .findById(placeEmployeeId)
      .populate('employee')
      .populate('place')
      .exec() as unknown as Promise<PlaceEmployeePopulated | null>;
  }

  async findByUserId(userId: string): Promise<PlaceEmployeeDocument[]> {
    console.log('findByUserId called with userId:', userId);

    // Debug: sprawdź czy są jakieś rekordy z tym employee.user
    const debugResult = await this.placeEmployeeModel
      .aggregate([
        {
          $lookup: {
            from: 'employees',
            localField: 'employee',
            foreignField: '_id',
            as: 'employeeData',
          },
        },
        {
          $unwind: {
            path: '$employeeData',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            employee: 1,
            'employeeData.user': 1,
            'employeeData._id': 1,
          },
        },
      ])
      .exec();
    console.log('Debug - all placeEmployees with employee data:', JSON.stringify(debugResult, null, 2));

    const result = await this.placeEmployeeModel
      .aggregate([
        {
          $lookup: {
            from: 'employees',
            localField: 'employee',
            foreignField: '_id',
            as: 'employee',
          },
        },
        {
          $unwind: '$employee',
        },
        {
          $match: {
            'employee.user': new Types.ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: 'places',
            localField: 'place',
            foreignField: '_id',
            as: 'place',
          },
        },
        {
          $unwind: {
            path: '$place',
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .exec();

    console.log('findByUserId result:', result);
    return result;
  }

  async isUserBossOfPlace(userId: string, placeId: string): Promise<boolean> {
    const placeEmployee = await this.placeEmployeeModel
      .findOne({
        place: new Types.ObjectId(placeId),
        role: PlaceEmployeeRole.BOSS,
      })
      .populate({
        path: 'employee',
        match: { user: new Types.ObjectId(userId) },
      })
      .exec();

    return !!(placeEmployee && placeEmployee.employee);
  }

  async isUserBossOfLocation(
    userId: string,
    locationId: string,
  ): Promise<boolean> {
    const placeEmployee = await this.placeEmployeeModel
      .findOne({
        location: new Types.ObjectId(locationId),
        role: PlaceEmployeeRole.BOSS,
      })
      .populate({
        path: 'employee',
        match: { user: new Types.ObjectId(userId) },
      })
      .exec();

    return !!(placeEmployee && placeEmployee.employee);
  }

  async findByPlaceIdAndUserId(
    placeId: string,
    userId: string,
  ): Promise<PlaceEmployeeDocument | null> {
    const placeEmployees = await this.placeEmployeeModel
      .find({ place: new Types.ObjectId(placeId) })
      .populate({
        path: 'employee',
        match: { user: new Types.ObjectId(userId) },
      })
      .exec();

    const result = placeEmployees.find((pe) => pe.employee != null);
    return result || null;
  }

  async findAllEmployeesByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Najpierw znajdź wszystkie miejsca użytkownika
    const userPlaces = await this.findByUserId(userId);
    const placeIds = userPlaces.map((pe) => pe.place._id);

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.placeEmployeeModel
        .find({
          place: { $in: placeIds },
        })
        .populate('employee')
        .populate('place')
        .skip(skip)
        .limit(limit)
        .exec() as unknown as Promise<PlaceEmployeePopulated[]>,
      this.placeEmployeeModel.countDocuments({
        place: { $in: placeIds },
      }),
    ]);

    return {
      data,
      metadata: {
        start: skip,
        limit,
        total,
      },
    };
  }

  /**
   * Sprawdź czy pracownik ma inne przypisania do miejsc
   */
  async countEmployeePlaceAssignments(employeeId: string): Promise<number> {
    return this.placeEmployeeModel
      .countDocuments({ employee: new Types.ObjectId(employeeId) })
      .exec();
  }

  /**
   * Zaktualizuj rolę dla wszystkich lokacji danego pracownika w miejscu
   */
  async updateRoleForAllLocations(
    placeId: string,
    employeeId: string,
    role: PlaceEmployeeRole,
  ): Promise<void> {
    await this.placeEmployeeModel
      .updateMany(
        {
          place: new Types.ObjectId(placeId),
          employee: new Types.ObjectId(employeeId),
        },
        { $set: { role } },
      )
      .exec();
  }

  /**
   * Znajdź wszystkie przypisania pracownika do lokacji w danym miejscu
   */
  async findAllByPlaceIdAndEmployeeId(
    placeId: string,
    employeeId: string,
  ): Promise<PlaceEmployeeDocument[]> {
    return this.placeEmployeeModel
      .find({
        place: new Types.ObjectId(placeId),
        employee: new Types.ObjectId(employeeId),
      })
      .exec();
  }

  /**
   * Usuń pracownika z konkretnej lokacji w miejscu
   */
  async removeByPlaceEmployeeAndLocation(
    placeId: string,
    employeeId: string,
    locationId: string,
  ): Promise<void> {
    await this.placeEmployeeModel
      .deleteOne({
        place: new Types.ObjectId(placeId),
        employee: new Types.ObjectId(employeeId),
        location: new Types.ObjectId(locationId),
      })
      .exec();
  }

  async updateStatus(
    placeEmployeeId: string,
    status: PlaceEmployeeStatus,
  ): Promise<PlaceEmployeeDocument | null> {
    return this.placeEmployeeModel
      .findByIdAndUpdate(
        placeEmployeeId,
        { $set: { status } },
        { new: true, runValidators: true },
      )
      .exec();
  }
}
