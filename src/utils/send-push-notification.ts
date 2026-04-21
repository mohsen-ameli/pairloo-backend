import { expo } from "../server"

export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  try {
    await expo.sendPushNotificationsAsync([
      {
        to: expoPushToken,
        sound: "default",
        title,
        body,
        data: { title, body },
        priority: "high",
      },
    ])
  } catch (error) {
    console.error("Failed to send push notification:", error)
  }
}
