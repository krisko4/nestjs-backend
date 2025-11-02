export class ScanHistoryItemDto {
  codeValue: string;
  codeId: string;
  scannedAt: Date;
  scannedBy: string;
  placeName: string;
  placeId: string;
  rewardDescription?: string;
}

export class ScanHistoryResponseDto {
  clientId: string;
  totalScans: number;
  scans: ScanHistoryItemDto[];
}
