import { expo } from "../server"

export async function sendPushNotification(
  expoPushToken: string | undefined,
  title: string,
  body: string
) {
  if (!expoPushToken) {
    return
  }
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
