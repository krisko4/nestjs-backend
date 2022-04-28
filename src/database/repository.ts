import {
  ClientSession,
  Model,
  FilterQuery,
  Document,
  UpdateQuery,
  Types,
} from 'mongoose';

export abstract class IRepository<T extends Document> {
  constructor(protected readonly entityModel: Model<T>) {}

  async findOne(
    entityFilterQuery: FilterQuery<T>,
    projection?: Record<string, unknown>,
  ): Promise<T | null> {
    return this.entityModel
      .findOne(entityFilterQuery, {
        __v: 0,
        ...projection,
      })
      .exec();
  }

  async findById(
    id: string,
    entityFilterQuery?: FilterQuery<T>,
    projection?: Record<string, unknown>,
  ): Promise<T | null> {
    return this.entityModel
      .findById(
        id,
        {
          __v: 0,
          ...projection,
        },
        entityFilterQuery,
      )
      .exec();
  }

  async find(entityFilterQuery?: FilterQuery<T>): Promise<T[] | null> {
    return this.entityModel.find(entityFilterQuery).exec();
  }

  async findAndSort(
    entityFilterQuery?: FilterQuery<T>,
    sortQuery?: FilterQuery<T>,
  ): Promise<T[] | null> {
    return this.entityModel.find(entityFilterQuery).sort(sortQuery).exec();
  }

  async create(createEntityData: unknown, session?: ClientSession): Promise<T> {
    const entity = new this.entityModel(createEntityData);
    return entity.save({ session });
  }

  async findOneAndUpdate(
    entityFilterQuery: FilterQuery<T>,
    updateEntityData: UpdateQuery<unknown>,
  ): Promise<T | null> {
    return this.entityModel.findOneAndUpdate(
      entityFilterQuery,
      updateEntityData,
      {
        new: true,
        upsert: true,
      },
    );
  }

  async findOneAndDelete(entityFilterQuery: FilterQuery<T>): Promise<boolean> {
    return this.entityModel.findOneAndDelete(entityFilterQuery);
  }

  async deleteMany(entityFilterQuery: FilterQuery<T>): Promise<boolean> {
    const deleteResult = await this.entityModel.deleteMany(entityFilterQuery);
    return deleteResult.deletedCount >= 1;
  }
}
