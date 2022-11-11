import { UserService } from 'src/user/user.service';
import { MessagingPayload } from 'firebase-admin/lib/messaging/messaging-api';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as firebase from 'firebase-admin';

@Injectable()
export class FirebaseService {
  constructor() {
    firebase.initializeApp({
      credential: firebase.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }

  sendToDevice(tokens: string[], payload: MessagingPayload) {
    return firebase.messaging().sendToDevice(tokens, payload, {
      contentAvailable: true,
    });
  }
}
