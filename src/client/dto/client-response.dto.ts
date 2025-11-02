export class ClientResponseDto {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  img?: string;
  totalScans: number;
  firstScanDate: Date;
  lastScanDate: Date;
  places: {
    placeId: string;
    placeName: string;
    scanCount: number;
  }[];
}
