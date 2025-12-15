import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface CodeScannedEvent {
  codeValue: string;
  userId: string;
  scannedBy: string;
  timestamp: Date;
}

@Injectable()
export class CodeSseService {
  private codeScannedSubject = new Subject<CodeScannedEvent>();

  emitCodeScanned(event: CodeScannedEvent): void {
    this.codeScannedSubject.next(event);
  }

  getCodeScannedStream(userId: string): Observable<MessageEvent> {
    return this.codeScannedSubject.pipe(
      filter((event) => event.userId === userId),
      map((event) => {
        return {
          data: JSON.stringify({
            codeValue: event.codeValue,
            scannedBy: event.scannedBy,
            timestamp: event.timestamp,
          }),
          type: 'code-scanned',
        } as MessageEvent;
      }),
    );
  }

  getCodeScannedStreamByCodeValue(codeValue: string): Observable<MessageEvent> {
    return this.codeScannedSubject.pipe(
      filter((event) => event.codeValue === codeValue),
      map((event) => {
        return {
          data: JSON.stringify({
            codeValue: event.codeValue,
            scannedBy: event.scannedBy,
            timestamp: event.timestamp,
          }),
          type: 'code-scanned',
        } as MessageEvent;
      }),
    );
  }
}
