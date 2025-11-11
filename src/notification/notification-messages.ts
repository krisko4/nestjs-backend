import { NotificationType } from './schemas/notification.schema';

export type NotificationMessage = {
  title: string;
  body: string;
};

export type NotificationMessages = {
  [key in NotificationType]: {
    [language: string]: NotificationMessage;
  };
};

export const notificationMessages: NotificationMessages = {
  [NotificationType.REWARD]: {
    en: {
      title: 'New coupon from {{placeName}}!',
      body: '{{rewardName}}',
    },
    pl: {
      title: 'Nowy kupon od {{placeName}}!',
      body: '{{rewardName}}',
    },
  },
  [NotificationType.EVENT_REMINDER]: {
    en: {
      title: 'A reward drawing starts in 5 minutes!',
      body: 'Event: {{eventTitle}}\nFingers crossed',
    },
    pl: {
      title: 'Losowanie nagrody rozpocznie się za 5 minut!',
      body: 'Event: {{eventTitle}}\nTrzymamy kciuki',
    },
  },
  [NotificationType.EVENT_TODAY_NEARBY]: {
    en: {
      title: 'New events happening near you today!',
      body: "Check out what's happening in your area",
    },
    pl: {
      title: 'Nowe wydarzenia w Twojej okolicy dzisiaj!',
      body: 'Zobacz co dzieje się w Twojej okolicy',
    },
  },
  [NotificationType.NEW_EVENT]: {
    en: {
      title: 'New event nearby!',
      body: "Check out what's happening in your area",
    },
    pl: {
      title: 'Nowe wydarzenie w pobliżu!',
      body: 'Zobacz co dzieje się w Twojej okolicy',
    },
  },
  [NotificationType.NEW_REFERRAL]: {
    en: {
      title: 'Someone joined using your referral code!',
      body: "You've earned bonus points",
    },
    pl: {
      title: 'Ktoś dołączył używając Twojego kodu polecającego!',
      body: 'Zdobyłeś punkty bonusowe',
    },
  },
  [NotificationType.REFERRAL_REWARD]: {
    en: {
      title: 'Referral reward earned!',
      body: "You've earned a reward from your referral",
    },
    pl: {
      title: 'Nagroda za polecenie!',
      body: 'Otrzymałeś nagrodę za polecenie',
    },
  },
  [NotificationType.RATING_REQUEST]: {
    en: {
      title: 'How was your experience?',
      body: "We'd love to hear your feedback about {{placeName}}",
    },
    pl: {
      title: 'Jak oceniasz swoje doświadczenie?',
      body: 'Chcielibyśmy poznać Twoją opinię o {{placeName}}',
    },
  },
};

export function getNotificationMessage(
  notificationType: NotificationType,
  language: string = 'en',
  variables: Record<string, string> = {},
): NotificationMessage {
  const messageTemplates = notificationMessages[notificationType];

  if (!messageTemplates) {
    console.error(`Notification type "${notificationType}" not found`);
    return { title: '', body: '' };
  }

  const template = messageTemplates[language] || messageTemplates['en'];

  if (!template) {
    console.error(
      `Language "${language}" not found for notification type "${notificationType}"`,
    );
    return messageTemplates['en'] || { title: '', body: '' };
  }

  const replaceVariables = (text: string): string => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  };

  return {
    title: replaceVariables(template.title),
    body: replaceVariables(template.body),
  };
}
