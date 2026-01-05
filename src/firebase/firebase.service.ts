import { MessagingPayload } from 'firebase-admin/lib/messaging/messaging-api';
import { Injectable } from '@nestjs/common';
import * as firebase from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class FirebaseService {
  private expo: Expo;

  constructor() {
    firebase.initializeApp({
      credential: firebase.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    // Inicjalizuj Expo SDK
    this.expo = new Expo();
  }

  /**
   * Sprawdza czy token jest tokenem Expo
   */
  private isExpoToken(token: string): boolean {
    return Expo.isExpoPushToken(token);
  }

  private async sendToExpo(
    tokens: string[],
    payload: MessagingPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token,
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
      sound: 'default',
      priority: 'high',
    }));

    const chunks = this.expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failureCount = 0;

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        ticketChunk.forEach((ticket) => {
          if (ticket.status === 'ok') {
            successCount++;
          } else {
            failureCount++;
            console.error('Expo error:', ticket);
          }
        });
      } catch (error) {
        console.error('Error sending Expo notifications:', error);
        failureCount += chunk.length;
      }
    }

    return { successCount, failureCount };
  }

  private async sendToFCM(
    tokens: string[],
    payload: MessagingPayload,
  ): Promise<{ successCount: number; failureCount: number }> {
    const messaging = firebase.messaging();
    const promises = tokens.map(async (token) => {
      const message = {
        token: token,
        notification: payload.notification
          ? {
              title: payload.notification.title || '',
              body: payload.notification.body || '',
            }
          : undefined,
        data: payload.data || undefined,
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
            },
          },
        },
        android: {
          priority: 'high' as const,
        },
      };

      try {
        await messaging.send(message);
        return { success: true };
      } catch (error) {
        console.error(`Error sending to FCM token ${token}:`, error);
        return { success: false, error };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return { successCount, failureCount };
  }

  async sendToDevice(tokens: string[], payload: MessagingPayload) {
    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0, responses: [] };
    }

    const expoTokens = tokens.filter((token) => this.isExpoToken(token));
    const fcmTokens = tokens.filter((token) => !this.isExpoToken(token));

    let totalSuccess = 0;
    let totalFailure = 0;

    if (expoTokens.length > 0) {
      const expoResult = await this.sendToExpo(expoTokens, payload);
      totalSuccess += expoResult.successCount;
      totalFailure += expoResult.failureCount;
    }

    if (fcmTokens.length > 0) {
      const fcmResult = await this.sendToFCM(fcmTokens, payload);
      totalSuccess += fcmResult.successCount;
      totalFailure += fcmResult.failureCount;
    }

    return {
      successCount: totalSuccess,
      failureCount: totalFailure,
      responses: [],
    };
  }
}
