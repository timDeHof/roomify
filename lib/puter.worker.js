const PROJECT_PREFIX = 'roomify_project_';

const jsonError = (status, message, details = {}) => {
  return new Response(JSON.stringify({ error: message,status: status, ...details }), {
    status,
    headers: { 'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
    }
  });
};

const getUserId = async (userPuter) => {
  try {
    const user = await userPuter.auth.getUser();
    return user?.uuid | null;
  } catch {
    return null;
  }
};

router.post('/api/projects/save', async ({request, user}) => {
  try {
    const userPuter = user?.puter;

    if(!userPuter) return jsonError(401, 'Authentication failed');
    const body = await request.json();
    const project = body?.project;

    if (!project?.id || !project?.sourceImage) return jsonError(400, 'Project not found');

    const payload = {
      ...project,
      updatedAt: new Date().toISOString(),
    }

    const userId = await getUserId(userPuter);

    if (!userId) return jsonError(401, 'Authentication failed');
    const key = `${PROJECT_PREFIX}${project.id}`;
    await userPuter.kv.set(key, payload);

    return {
      saved: true, id: project.id, project: payload
    }
  } catch (error) {
    return jsonError(500,'Failed to save project', { error: error.message || 'Unknown error' });
  }
});

router.get('/api/projects/list', async ({ user }) => {
  try {
    const userPuter = user.puter;

    if (!userPuter) return jsonError(401, 'Authentication failed');

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, 'Authentication failed');

    const allKeys = await userPuter.kv.getKeys();
    const projectKeys = allKeys.filter(key => key.startsWith(PROJECT_PREFIX));

    const projects = [];
    for (const key of projectKeys) {
      const project = await userPuter.kv.get(key);
      if (project) projects.push(project);
    }

    return { projects };
  } catch (error) {
    return jsonError(500, 'Failed to list projects', { error: error.message || 'Unknown error' });
  }
});

router.get('/api/projects/get', async ({ request, user }) => {
  try {
    const userPuter = user.puter;

    if (!userPuter) return jsonError(401, 'Authentication failed');

    const userId = await getUserId(userPuter);
    if (!userId) return jsonError(401, 'Authentication failed');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) return jsonError(400, 'Project ID is required');

    const key = `${PROJECT_PREFIX}${id}`;
    const project = await userPuter.kv.get(key);

    if (!project) return jsonError(404, 'Project not found');

    return { project };
  } catch (error) {
    return jsonError(500, 'Failed to get project', { error: error.message || 'Unknown error' });
  }
});
