import {
  IsEmail,
  IsMobilePhone,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  address: string;
  @IsString()
  @IsNotEmpty()
  addressId: string;
  @IsString()
  @IsNotEmpty()
  addressLanguage: string;
  @IsMobilePhone()
  phone: string;
  @IsEmail()
  email: string;
  @IsUrl()
  website: string;
  @IsUrl()
  facebook: string;
  @IsUrl()
  instagram: string;
  @IsNumber()
  @Max(90)
  @Min(-90)
  lat: number;
  @Max(180)
  @Min(-180)
  lng: number;
}
