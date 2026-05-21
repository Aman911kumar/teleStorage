import { createStorageProvider } from "../../providers/index.js";

export class StorageService {
  private provider = createStorageProvider();

  get activeProvider() {
    return this.provider.name;
  }

  getProvider() {
    return this.provider;
  }
}
