import { WizardServant, IPayloadResponse } from "../wizardServant";
import { ExtensionCommand } from "../constants";
import latestVersion from "latest-version";
import RequirementsService from "../utils/requirements/requirementsService";
import { Logger } from "../utils/logger";
const axios = require("axios");

export class DependenciesModule extends WizardServant {
  private requirementsService = new RequirementsService();
  clientCommandMap: Map<ExtensionCommand, (message: any) => Promise<IPayloadResponse>> = new Map([
    [ExtensionCommand.CheckDependency, this.requirementIsInstalled],
    [ExtensionCommand.GetLatestVersion, this.getLatestVersion],
  ]);

  async requirementIsInstalled(message: any): Promise<IPayloadResponse> {
    const dependency = message.payload.dependency as string;
    const installed = await this.requirementsService.isInstalled(dependency);
    return {
      payload: {
        dependency,
        installed,
      },
    };
  }

  public async getLatestVersion(message: any): Promise<any> {
    const checkVersionPackageName = message.payload.checkVersionPackageName;
    const checkVersionPackageSource = message.payload.checkVersionPackageSource;
    let latestVersionStr = "";
    if (checkVersionPackageSource === "npm") {
      latestVersionStr = await latestVersion(checkVersionPackageName);
    }
    if (checkVersionPackageSource === "github") {
      latestVersionStr = await this.getLatestVersionFromGithub(checkVersionPackageName);
    }

    return {
      payload: {
        scope: message.payload.scope,
        latestVersion: latestVersionStr,
      },
    };
  }

  private async getLatestVersionFromGithub(packageName: string): Promise<string> {
    let latestVersion = "";
    try {
      const urlGitHub = "https://api.github.com/repos/" + packageName + "/releases";
      const response = await axios.get(urlGitHub);
      latestVersion = response.data
        .map((release: any) => release.tag_name)
        .find((version: string) => !version.toLowerCase().includes("preview"));

        //ASP.NET version start with 'v', remove this
        latestVersion = latestVersion.replace('v', '');
    } catch (error) {
      Logger.appendError("EXTENSION", `Error getting latest version of ${packageName} package from GitHub:`, error);
    }
    return latestVersion;
  }
}
