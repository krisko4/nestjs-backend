import { Injectable } from '@nestjs/common';
import { ContactRepository } from './contact.repository';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly contactRepository: ContactRepository) {}
  create(createContactDto: CreateContactDto) {
    return this.contactRepository.create(createContactDto);
  }
}
