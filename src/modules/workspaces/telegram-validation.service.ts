import { AppError } from "../../core/errors.js";
import { telegramRequest } from "../../providers/telegram/telegramRequest.js";

type BotInfo = { id: number; username: string; first_name: string };
type ChatInfo = { id: number; title?: string; type: string };
type ChatMember = { status: string; can_post_messages?: boolean; can_delete_messages?: boolean };

export class TelegramValidationService {
  async validate(botToken: string, channelId: string) {
    const baseUrl = `https://api.telegram.org/bot${botToken}`;
    const bot = await this.call<BotInfo>(`${baseUrl}/getMe`, "Invalid Telegram bot token");
    const chat = await this.call<ChatInfo>(`${baseUrl}/getChat?chat_id=${encodeURIComponent(channelId)}`, "Bot cannot access channel");
    const member = await this.call<ChatMember>(
      `${baseUrl}/getChatMember?chat_id=${encodeURIComponent(channelId)}&user_id=${bot.id}`,
      "Unable to verify bot channel permissions"
    );

    const adminStatuses = new Set(["administrator", "creator"]);
    if (!adminStatuses.has(member.status)) {
      throw new AppError("Bot must be an admin in the Telegram channel", 400, "TELEGRAM_BOT_NOT_ADMIN");
    }

    return {
      botId: bot.id,
      botUsername: bot.username,
      botName: bot.first_name,
      channelId: String(chat.id),
      channelTitle: chat.title,
      channelType: chat.type,
      permissions: {
        status: member.status,
        canPostMessages: member.can_post_messages ?? true,
        canDeleteMessages: member.can_delete_messages ?? false
      }
    };
  }

  private async call<T>(url: string, fallbackMessage: string) {
    const body = await telegramRequest<T>(url);
    if (!body.ok || !body.result) {
      throw new AppError(body.description ?? fallbackMessage, 400, "TELEGRAM_VALIDATION_FAILED");
    }
    return body.result;
  }
}
