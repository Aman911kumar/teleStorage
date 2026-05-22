import { AppError, NotFoundError } from "../../core/errors.js";
import { MediaModel } from "../media/media.model.js";
import { WorkspaceModel } from "../workspaces/workspace.model.js";
import { FolderModel } from "./folder.model.js";

function cleanName(value: string) {
  return value.trim().replace(/[\\/]+/g, "-").slice(0, 80);
}

function joinPath(parentPath: string | undefined, name: string) {
  return `${parentPath ? `${parentPath}/` : ""}${name}`.replace(/\/+/g, "/");
}

export class FolderService {
  async assertWorkspaceOwner(workspaceId: string, ownerId: string) {
    const workspace = await WorkspaceModel.findOne({ _id: workspaceId, createdBy: ownerId, isActive: true }).lean();
    if (!workspace) throw new NotFoundError("Workspace not found");
  }

  async create(workspaceId: string, ownerId: string, input: { name: string; parentId?: string; metadata?: Record<string, string> }) {
    await this.assertWorkspaceOwner(workspaceId, ownerId);
    const name = cleanName(input.name);
    if (!name) throw new AppError("Folder name is required.", 400, "FOLDER_NAME_REQUIRED");
    const parent = input.parentId ? await FolderModel.findOne({ _id: input.parentId, workspaceId }).lean() : undefined;
    if (input.parentId && !parent) throw new NotFoundError("Parent folder not found");

    const folder = await FolderModel.create({
      workspaceId,
      createdBy: ownerId,
      parentId: input.parentId,
      name,
      path: joinPath(parent?.path, name),
      metadata: input.metadata ?? {}
    });
    return folder.toObject();
  }

  async ensurePath(workspaceId: string, ownerId: string, input: { path: string; parentId?: string }) {
    await this.assertWorkspaceOwner(workspaceId, ownerId);
    const parts = input.path.split(/[\\/]+/g).map(cleanName).filter(Boolean);
    if (!parts.length) throw new AppError("Folder path is required.", 400, "FOLDER_PATH_REQUIRED");

    let parentId = input.parentId;
    let parentPath: string | undefined;
    if (parentId) {
      const parent = await FolderModel.findOne({ _id: parentId, workspaceId }).lean();
      if (!parent) throw new NotFoundError("Parent folder not found");
      parentPath = parent.path;
    }

    let folder;
    for (const name of parts) {
      const folderPath = joinPath(parentPath, name);
      folder = await FolderModel.findOne({ workspaceId, path: folderPath });
      if (!folder) {
        try {
          folder = await FolderModel.create({
            workspaceId,
            createdBy: ownerId,
            parentId,
            name,
            path: folderPath,
            metadata: {}
          });
        } catch (error) {
          if ((error as { code?: number }).code !== 11000) throw error;
          folder = await FolderModel.findOne({ workspaceId, path: folderPath });
          if (!folder) throw error;
        }
      }
      parentId = String(folder._id);
      parentPath = folder.path;
    }

    return folder!.toObject();
  }

  async list(workspaceId: string, parentId?: string) {
    const filter: Record<string, unknown> = { workspaceId };
    if (parentId) filter.parentId = parentId;
    return FolderModel.find(filter).sort({ name: 1 }).lean();
  }

  async listForOwner(workspaceId: string, ownerId: string, parentId?: string) {
    await this.assertWorkspaceOwner(workspaceId, ownerId);
    return this.list(workspaceId, parentId);
  }

  async rename(workspaceId: string, id: string, name: string) {
    const folder = await FolderModel.findOne({ _id: id, workspaceId });
    if (!folder) throw new NotFoundError("Folder not found");
    const nextName = cleanName(name);
    if (!nextName) throw new AppError("Folder name is required.", 400, "FOLDER_NAME_REQUIRED");
    const parent = folder.parentId ? await FolderModel.findOne({ _id: folder.parentId, workspaceId }).lean() : undefined;
    folder.name = nextName;
    folder.path = joinPath(parent?.path, nextName);
    await folder.save();
    return folder.toObject();
  }

  async renameForOwner(workspaceId: string, ownerId: string, id: string, name: string) {
    await this.assertWorkspaceOwner(workspaceId, ownerId);
    return this.rename(workspaceId, id, name);
  }

  async deleteForOwner(workspaceId: string, ownerId: string, id: string) {
    await this.assertWorkspaceOwner(workspaceId, ownerId);
    const hasChildren = await FolderModel.exists({ workspaceId, parentId: id });
    if (hasChildren) throw new AppError("Folder contains nested folders.", 409, "FOLDER_NOT_EMPTY");
    const hasFiles = await MediaModel.exists({ workspaceId, folderId: id, status: { $ne: "deleted" } });
    if (hasFiles) throw new AppError("Folder contains files.", 409, "FOLDER_NOT_EMPTY");
    const deleted = await FolderModel.findOneAndDelete({ _id: id, workspaceId });
    if (!deleted) throw new NotFoundError("Folder not found");
  }
}
