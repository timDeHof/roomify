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
    // Use Puter KV directly - user is already authenticated
    const allPairs = await puter.kv.list(true);
    const projectPairs = allPairs.filter((pair: any) => pair.key.startsWith('roomify_project_'));
    
    return projectPairs.map((pair: any) => pair.value);
  } catch (error) {
    console.log('failed to get projects:', error);
    return [];
  }
}

export const getProjectById = async ({ id }: { id: string }) => {
  try {
    // Use Puter KV directly - user is already authenticated
    const key = `roomify_project_${id}`;
    const project = await puter.kv.get(key);
    return project || null;
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
};
