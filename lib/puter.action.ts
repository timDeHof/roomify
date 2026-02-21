import puter from "@heyputer/puter.js";
import {
  getOrCreateHostingConfig,
  uploadImageToHosting,
} from "./puter.hosting";
import { isHostedUrl } from "./utils";
import { PUTER_WORKER_URL } from "./constants";

export const signIn = async () => await puter.auth.signIn();

export const signOut = () => puter.auth.signOut();

export const getCurrentUser = async () => {
  try {
    return await puter.auth.getUser();
  } catch {
    return null;
  }
};

export const createProject = async ({
  item, visibility = "private"
}: CreateProjectParams): Promise<DesignItem | null | undefined> => {
  const projectId = item.id;

  const hosting = await getOrCreateHostingConfig();

  const hostedSource = projectId
    ? await uploadImageToHosting({
        hosting,
        url: item.sourceImage,
        projectId,
        label: "source",
      })
    : null;

  const hostedRender =
    projectId && item.renderedImage
      ? await uploadImageToHosting({
          hosting,
          url: item.renderedImage,
          projectId,
          label: "rendered",
        })
      : null;

  const resolvedSource =
    hostedSource?.url ||
    (isHostedUrl(item.sourceImage) ? item.sourceImage : "");

  if (!resolvedSource) {
    console.warn(`failed to host source image, skipping save.`);
    return null;
  }

  const resolvedRender = hostedRender?.url
    ? hostedRender?.url
    : item.renderedImage && isHostedUrl(item.renderedImage)
      ? item.renderedImage
      : undefined;

  // if (!resolvedRender) {
  //   console.warn(`failed to host rendered image, skipping save.`);
  //   return null;
  // }

  const {
    sourcePath: _sourcePath,
    renderedPath: _renderedPath,
    publicPath: _publicPath,
    ...rest
  } = item;

  const payload = {
    ...rest,
    sourceImage: resolvedSource,
    renderedImage: resolvedRender,
  };

  try {
    const savedPayload = {
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    if (PUTER_WORKER_URL) {
      // Try worker-based save
      const response = await puter.workers.exec(`${PUTER_WORKER_URL}/api/projects/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({project: savedPayload, visibility}),
      });

      if (response.ok) {
        const data = (await response.json()) as { project?: DesignItem | null };
        return data?.project ?? savedPayload;
      }
      console.warn('Worker save failed, falling back to direct KV');
    }

    // Fall back to direct KV - user is already authenticated
    const key = `roomify_project_${item.id}`;
    await puter.kv.set(key, savedPayload);

    return savedPayload;
  } catch (error) {
    console.log('failed to save project:', error);
    return null;
  }
};

export const getProjects = async (): Promise<DesignItem[] | null | undefined> => {
  try {
    const allPairs = await puter.kv.list(true);
    const projectPairs = allPairs.filter((pair: any) => 
      pair.key.startsWith('roomify_project_') || pair.key.startsWith('roomify_public_')
    );
    
    return projectPairs.map((pair: any) => pair.value);
  } catch (error) {
    console.error('failed to get projects:', error);
    return [];
  }
}

export const getProjectById = async ({ id }: { id: string }): Promise<DesignItem | null> => {
  try {
    const privateKey = `roomify_project_${id}`;
    const publicKey = `roomify_public_${id}`;

    let project = await puter.kv.get(privateKey) as DesignItem | null;
    if (!project) {
      project = await puter.kv.get(publicKey) as DesignItem | null;
    }
    return project;
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
};

export const shareProject = async ({ id }: { id: string }): Promise<DesignItem | null> => {
  try {
    const privateKey = `roomify_project_${id}`;
    const publicKey = `roomify_public_${id}`;

    const project = await puter.kv.get(privateKey) as DesignItem | null;
    if (!project) {
      console.error("Project not found in private storage");
      return null;
    }

    const user = await puter.auth.getUser();
    const sharedProject: DesignItem = {
      ...project,
      isPublic: true,
      sharedBy: user?.username || null,
      sharedById: user?.uuid || null,
      sharedAt: new Date().toISOString(),
    };

    try {
      await puter.kv.del(privateKey);
      console.log(`Deleted private key: ${privateKey}`);
    } catch (delError) {
      console.error(`Failed to delete private key ${privateKey}:`, delError);
    }

    try {
      await puter.kv.set(publicKey, sharedProject);
      console.log(`Set public key: ${publicKey}`);
    } catch (setError) {
      console.error(`Failed to set public key ${publicKey}:`, setError);
      console.error("Inconsistent state: private key deleted but public key not set");
    }

    return sharedProject;
  } catch (error) {
    console.error("Failed to share project:", error);
    return null;
  }
};

export const unshareProject = async ({ id }: { id: string }): Promise<DesignItem | null> => {
  try {
    const privateKey = `roomify_project_${id}`;
    const publicKey = `roomify_public_${id}`;

    const project = await puter.kv.get(publicKey) as DesignItem | null;
    if (!project) {
      console.error("Project not found in public storage");
      return null;
    }

    const privateProject: DesignItem = {
      ...project,
      isPublic: false,
      sharedBy: undefined,
      sharedById: undefined,
      sharedAt: undefined,
    };

    await puter.kv.set(privateKey, privateProject);
    await puter.kv.del(publicKey);

    return privateProject;
  } catch (error) {
    console.error("Failed to unshare project:", error);
    return null;
  }
};
