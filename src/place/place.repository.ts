import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types, FilterQuery } from 'mongoose';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import {
  CreatePlaceSchema,
  Place,
  PlaceDocument,
  PlaceWithPopulatedEmployees,
} from './schemas/place.schema';
import { PlaceFilterQuery } from './queries/place.filter.query';
import { getGroupedLocationData } from './aggregations/grouped-location-data';
import { getPaginatedPlaceData } from './aggregations/paginated-place-data';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  LocationIdsDto,
  UpdateOpeningHoursDto,
} from './dto/update-opening-hours.dto';
import { toMongoObjectId } from 'src/utils/mongo';
import { getPaginatedEmployees } from './aggregations/paginated-employees-data';
import { PaginationQuery } from './queries/pagination.query';
import {
  CreatePlaceEmployeeSchema,
  PlaceEmployeeRole,
  PlaceEmployeeStatus,
} from './schemas/place-employee.schema';
import { AddPlaceEmployeeDto } from './dto/add-place-employee.dto';
import { User, UserDocument } from 'src/user/schemas/user.schema';

@Injectable()
export class PlaceRepository extends MongoRepository<
  PlaceDocument,
  CreatePlaceSchema
> {
  constructor(
    @InjectModel(Place.name) private readonly placeModel: Model<PlaceDocument>,
  ) {
    super(placeModel);
  }
  async findActive() {
    return this.find({ 'locations.isActive': true });
  }

  updatePlace(
    updatePlaceDto: UpdatePlaceDto,
    userId: Types.ObjectId,
    session: ClientSession,
    imageUrls?: string[],
    logoUrl?: string,
  ) {
    const location = updatePlaceDto.locations[0];
    const { name, subtitle, description, type } = updatePlaceDto;
    return this.findOneAndUpdate(
      { 'locations._id': updatePlaceDto.locationId },
      {
        name,
        subtitle,
        description,
        type,
        logoUrl,
        imageUrls,
        userId,
        'locations.$.email': location.email,
        'locations.$.phone': location.phone,
        'locations.$.website': location.website,
        'locations.$.facebook': location.facebook,
        'locations.$.instagram': location.instagram,
        'locations.$.lat': location.lat,
        'locations.$.lng': location.lng,
        'locations.$.address': location.address,
        'locations.$.countryCode': location.countryCode,
      },
      session,
    );
  }

  createPlace(
    imageUrls: string[],
    logoUrl: string | null,
    createPlaceDto: CreatePlaceDto,
    user: UserDocument,
    session: ClientSession,
  ) {
    return this.create(
      {
        images: imageUrls,
        logo: logoUrl,
        ...createPlaceDto,
        employees: [
          {
            user: user._id,
            email: user.email,
            role: PlaceEmployeeRole.BOSS,
            status: PlaceEmployeeStatus.ACTIVE,
          },
        ],
      },
      session,
    );
  }

  async findByUserId(id: string, shouldPopulateUsers?: boolean) {
    const query = this.placeModel.find({
      'employees.user': toMongoObjectId(id),
      'employees.role': PlaceEmployeeRole.BOSS,
    });

    if (shouldPopulateUsers) {
      query.populate('employees.user');
    }

    return query.exec();
  }

  async findPlacesByEmployeeUserId(userId: string) {
    return this.placeModel
      .find({
        'employees.user': toMongoObjectId(userId),
        'employees.status': PlaceEmployeeStatus.ACTIVE,
      })
      .select('-employees')
      .exec();
  }

  setStatus(locationId: string, updateStatusDto: UpdateStatusDto) {
    const { status } = updateStatusDto;
    return this.findOneAndUpdate(
      { 'locations._id': locationId },
      { 'locations.$.status': status },
    );
  }

  private async findActiveAndSortAndPaginate(
    start: number,
    limit: number,
    sortQuery: FilterQuery<Model<PlaceDocument>>,
    entityFilterQuery: FilterQuery<Model<PlaceDocument>>,
  ) {
    return this.placeModel
      .aggregate()
      .unwind('locations')
      .match({
        'locations.isActive': true,
        ...entityFilterQuery,
      })
      .sort(sortQuery)
      .facet(getPaginatedPlaceData(start, limit));
  }

  private createFilterQuery(name: string, type: string, address: string) {
    const filterQuery = {};
    if (name) filterQuery['name'] = new RegExp(name, 'i');
    if (address) filterQuery['locations.address'] = new RegExp(address, 'i');
    if (type) filterQuery['type'] = new RegExp(type, 'i');
    return filterQuery;
  }

  async findPopular(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { 'locations.visitCount': -1 };
    return this.findSorted(placeFilterQuery, sortQuery);
  }

  private async findSorted(
    placeFilterQuery: PlaceFilterQuery,
    sortQuery: FilterQuery<Model<PlaceDocument>>,
  ) {
    const { start, limit, name, type, address } = placeFilterQuery;
    const filterQuery = this.createFilterQuery(name, type, address);
    const result = await this.findActiveAndSortAndPaginate(
      start,
      limit,
      sortQuery,
      filterQuery,
    );
    return result[0];
  }

  async findRecentlyAdded(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { createdAt: -1 };
    return this.findSorted(placeFilterQuery, sortQuery);
  }

  async findTopRated(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { 'locations.averageNote.average': -1 };
    return this.findSorted(placeFilterQuery, sortQuery);
  }

  async incrementVisitCount(id: string) {
    return this.findOneAndUpdate(
      { 'locations._id': id },
      { $inc: { visitCount: 1 } },
    );
  }

  async findLocationIdsByUserId(uid: string) {
    const locationIdDocs = await this.placeModel
      .aggregate()
      .match({ userId: new Types.ObjectId(uid) })
      .unwind('$locations')
      .replaceRoot('$locations')
      .project({
        _id: 1,
      });
    return locationIdDocs.map((doc) => doc._id);
  }

  async findLocation(id: string, locationId: string) {
    const foundPlaces = await this.placeModel
      .aggregate()
      .unwind('locations')
      .match({
        _id: new Types.ObjectId(id),
        'locations._id': new Types.ObjectId(locationId),
      })
      .group(getGroupedLocationData());
    const place = foundPlaces[0];
    if (!place) throw new InternalServerErrorException('Invalid locationId');
    return place;
  }

  async findAverageNote(locationId: string) {
    const aggregationResult = await this.placeModel
      .aggregate()
      .match({ 'locations._id': new Types.ObjectId(locationId) })
      .unwind('locations')
      .replaceRoot('$locations')
      .project({
        averageNote: {
          _id: 0,
        },
      });
    const averageNoteObj = aggregationResult[0];
    if (Object.keys(averageNoteObj).length === 0) return null;
    return averageNoteObj.averageNote;
  }

  async findStatus(locationId: string): Promise<string> {
    const aggregationResult = await this.placeModel
      .aggregate()
      .match({ 'locations._id': new Types.ObjectId(locationId) })
      .unwind('locations')
      .replaceRoot('$locations')
      .project({
        status: 1,
        _id: 0,
      });
    return aggregationResult[0].status;
  }

  setOpeningHours(id: string, updateOpeningHoursDto: UpdateOpeningHoursDto) {
    const { openingHours, locationIds } = updateOpeningHoursDto;
    return this.findByIdAndUpdate(
      id,
      {
        'locations.$[item].openingHours': openingHours,
        'locations.$[item].isActive': true,
        'locations.$[item].alwaysOpen': false,
      },
      { arrayFilters: [{ 'item._id': { $in: locationIds } }] },
    );
  }

  setAlwaysOpen(id: string, locationIdsDto: LocationIdsDto) {
    const { locationIds } = locationIdsDto;
    return this.findByIdAndUpdate(
      id,
      {
        'locations.$[item].alwaysOpen': true,
        'locations.$[item].isActive': true,
      },
      {
        arrayFilters: [{ 'item._id': { $in: locationIds } }],
      },
    );
  }

  async findByLocationId(locationId: string) {
    return this.findOne({ 'locations._id': new Types.ObjectId(locationId) });
  }

  async findOpeningHours(locationId: string) {
    const aggregationResult = await this.placeModel
      .aggregate()
      .match({ 'locations._id': new Types.ObjectId(locationId) })
      .unwind('locations')
      .replaceRoot('$locations')
      .project({
        openingHours: 1,
        alwaysOpen: 1,
        isActive: 1,
        _id: 0,
      });
    return aggregationResult[0];
  }

  async findByLatLng(lat: number, lng: number) {
    return this.findOne({ 'locations.lat': lat, 'locations.lng': lng });
  }

  async findByLocationIds(
    placeFilterQuery: PlaceFilterQuery,
    favIds: string[],
  ) {
    const ids = favIds.map((el) => new Types.ObjectId(el));
    const { start, limit, name, type, address } = placeFilterQuery;
    const filterQuery = this.createFilterQuery(name, type, address);
    const sortQuery = { createdAt: -1 };
    const aggregationResult = await this.findActiveAndSortAndPaginate(
      start,
      limit,
      sortQuery,
      {
        ...filterQuery,
        'locations._id': {
          $in: ids,
        },
      },
    );
    return aggregationResult[0];
  }

  async findPaginatedEmployees(
    userId: string,
    paginationQuery: PaginationQuery,
  ) {
    const data = await this.placeModel
      .aggregate()
      .facet(
        getPaginatedEmployees(
          userId,
          paginationQuery.start,
          paginationQuery.limit,
        ),
      );
    return data[0];
  }

  async findByIdWithEmployees(id: string) {
    return this.placeModel
      .findById(id)
      .populate('employees.user')
      .exec() as unknown as Promise<PlaceWithPopulatedEmployees | undefined>;
  }

  async addEmployee(
    placeId: string,
    addEmployeeDto: AddPlaceEmployeeDto,
    userId?: Types.ObjectId,
  ) {
    const newEmployee: CreatePlaceEmployeeSchema = {
      role: addEmployeeDto.role,
      name: addEmployeeDto.name,
      email: addEmployeeDto.email,
      status: PlaceEmployeeStatus.WAITING_FOR_CONFIRMATION,
      user: userId,
    };
    return this.placeModel
      .findByIdAndUpdate(
        placeId,
        {
          $push: {
            employees: newEmployee,
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();
  }

  async removeEmployee(placeId: string, employeeId: string) {
    return this.placeModel
      .findByIdAndUpdate(
        placeId,
        {
          $pull: {
            employees: { _id: employeeId },
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();
  }
}
