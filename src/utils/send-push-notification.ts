import { expo } from "../server"

export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const ticket = await expo.sendPushNotificationsAsync([
    {
      to: expoPushToken,
      sound: "default",
      title,
      body,
      data: { title, body },
      priority: "high",
    },
  ])
  console.log("Push notification ticket:", ticket)
}
