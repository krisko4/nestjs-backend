import { Exclude, Expose } from 'class-transformer';

export class UserSerializer {
  @Expose()
  firstName: string;
  @Expose()
  lastName: string;
  @Expose()
  email: string;
  @Expose()
  birthdate: Date;
  @Expose()
  img: string;
}
