import { nanoid } from "nanoid";
import { NotFoundError } from "../../core/errors.js";
import { decryptSecret, encryptSecret, maskTelegramToken } from "../../utils/encryption.js";
import { TelegramValidationService } from "./telegram-validation.service.js";
import { WorkspaceModel } from "./workspace.model.js";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

export class WorkspaceService {
  private validator = new TelegramValidationService();

  async create(owner: string, input: { name: string; telegramBotToken: string; telegramChannelId: string }) {
    const validation = await this.validator.validate(input.telegramBotToken, input.telegramChannelId);
    const workspace = await WorkspaceModel.create({
      name: input.name,
      slug: `${slugify(input.name)}-${nanoid(6)}`,
      telegramBotTokenEncrypted: encryptSecret(input.telegramBotToken),
      telegramChannelId: input.telegramChannelId,
      telegramBotUsername: validation.botUsername,
      telegramChannelTitle: validation.channelTitle,
      createdBy: owner,
      health: { status: "healthy", checkedAt: new Date(), message: "Telegram connection validated" }
    });
    return this.safe(workspace.toObject());
  }

  async list(owner: string) {
    const workspaces = await WorkspaceModel.find({ createdBy: owner, isActive: true }).sort({ createdAt: -1 }).lean();
    return workspaces.map((workspace) => this.safe(workspace));
  }

  async validateConfig(input: { telegramBotToken: string; telegramChannelId: string }) {
    return this.validator.validate(input.telegramBotToken, input.telegramChannelId);
  }

  async reconnect(owner: string, id: string, input: { telegramBotToken: string; telegramChannelId: string }) {
    const validation = await this.validator.validate(input.telegramBotToken, input.telegramChannelId);
    const workspace = await WorkspaceModel.findOneAndUpdate(
      { _id: id, createdBy: owner },
      {
        telegramBotTokenEncrypted: encryptSecret(input.telegramBotToken),
        telegramChannelId: input.telegramChannelId,
        telegramBotUsername: validation.botUsername,
        telegramChannelTitle: validation.channelTitle,
        health: { status: "healthy", checkedAt: new Date(), message: "Telegram connection validated" }
      },
      { new: true }
    ).lean();
    if (!workspace) throw new NotFoundError("Workspace not found");
    return this.safe(workspace);
  }

  async update(owner: string, id: string, input: { name?: string; telegramBotToken?: string; telegramChannelId?: string }) {
    const workspace = await WorkspaceModel.findOne({ _id: id, createdBy: owner, isActive: true });
    if (!workspace) throw new NotFoundError("Workspace not found");

    const update: Record<string, unknown> = {};
    if (input.name) {
      update.name = input.name;
      update.slug = `${slugify(input.name)}-${nanoid(6)}`;
    }

    if (input.telegramBotToken || input.telegramChannelId) {
      const currentToken = decryptSecret(workspace.telegramBotTokenEncrypted);
      const botToken = input.telegramBotToken || currentToken;
      const channelId = input.telegramChannelId || workspace.telegramChannelId;
      const validation = await this.validator.validate(botToken, channelId);
      update.telegramBotTokenEncrypted = encryptSecret(botToken);
      update.telegramChannelId = channelId;
      update.telegramBotUsername = validation.botUsername;
      update.telegramChannelTitle = validation.channelTitle;
      update.health = { status: "healthy", checkedAt: new Date(), message: "Telegram connection validated" };
    }

    const updated = await WorkspaceModel.findOneAndUpdate({ _id: id, createdBy: owner }, update, { new: true }).lean();
    if (!updated) throw new NotFoundError("Workspace not found");
    return this.safe(updated);
  }

  async delete(owner: string, id: string) {
    const workspace = await WorkspaceModel.findOneAndUpdate(
      { _id: id, createdBy: owner, isActive: true },
      { isActive: false, health: { status: "warning", checkedAt: new Date(), message: "Workspace deleted" } },
      { new: true }
    );
    if (!workspace) throw new NotFoundError("Workspace not found");
  }

  async getTokenForUpload(owner: string, id: string) {
    const workspace = await WorkspaceModel.findOne({ _id: id, createdBy: owner, isActive: true }).lean();
    if (!workspace) throw new NotFoundError("Workspace not found");
    return {
      botToken: decryptSecret(workspace.telegramBotTokenEncrypted),
      channelId: workspace.telegramChannelId,
      workspace
    };
  }

  async getCredentialsById(id: string) {
    const workspace = await WorkspaceModel.findOne({ _id: id, isActive: true }).lean();
    if (!workspace) throw new NotFoundError("Workspace not found");
    return {
      botToken: decryptSecret(workspace.telegramBotTokenEncrypted),
      channelId: workspace.telegramChannelId,
      workspace
    };
  }

  private safe(workspace: any) {
    const encrypted = workspace.telegramBotTokenEncrypted;
    let masked = "********";
    try {
      masked = maskTelegramToken(decryptSecret(encrypted));
    } catch {
      masked = "********";
    }
    const rest = { ...workspace };
    delete rest.telegramBotTokenEncrypted;
    return { ...rest, telegramBotTokenMasked: masked };
  }
}
