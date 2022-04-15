import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { IRepository } from '../database/repository';
import { Contact, ContactDocument } from './schemas/contact.schema';

@Injectable()
export class ContactRepository extends IRepository<ContactDocument> {
  constructor(
    @InjectModel(Contact.name)
    private readonly contactModel: Model<ContactDocument>,
  ) {
    super(contactModel);
  }
}
