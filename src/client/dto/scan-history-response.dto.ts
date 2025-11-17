export class ScanHistoryItemDto {
  codeId: string;
  scannedAt: Date;
  scannedBy?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    img?: string;
  };
  placeEmployee?: {
    _id: string;
    name?: string;
  };
  placeName: string;
  placeId: string;
  location?: {
    _id: string;
    address?: string;
  };
  reward?: {
    id: string;
    name: string;
  };
}

export class ScanHistoryResponseDto {
  clientId: string;
  totalScans: number;
  scans: ScanHistoryItemDto[];
}
