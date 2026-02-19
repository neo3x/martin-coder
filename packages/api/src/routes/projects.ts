import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.js'
import { db } from '../db/index.js'
import { projects } from '../db/schema.js'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { existsSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import type { User } from '../db/schema.js'

type Variables = {
  user: User
}

const projectsRoutes = new Hono<{ Variables: Variables }>()
projectsRoutes.use('*', authMiddleware)

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().optional(),
  localPath: z.string().optional(),
  gitUrl: z.string().url().optional().or(z.literal('')),
  gitBranch: z.string().optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  localPath: z.string().optional(),
  gitUrl: z.string().url().optional().or(z.literal('')),
  gitBranch: z.string().optional(),
})

function detectLanguageAndFramework(dirPath: string): {
  language: string | null
  framework: string | null
} {
  if (!existsSync(dirPath)) return { language: null, framework: null }

  const files = readdirSync(dirPath)

  let language: string | null = null
  let framework: string | null = null

  // Detect language
  if (files.includes('package.json')) {
    language = 'typescript'
    try {
      const pkg = JSON.parse(
        Bun.file(join(dirPath, 'package.json')).toString()
      )
      if (pkg.dependencies?.next || pkg.devDependencies?.next) framework = 'nextjs'
      else if (pkg.dependencies?.react || pkg.devDependencies?.react) framework = 'react'
      else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) framework = 'vue'
      else if (pkg.dependencies?.svelte || pkg.devDependencies?.svelte) framework = 'svelte'
      else if (pkg.dependencies?.express || pkg.devDependencies?.express) framework = 'express'
      else if (pkg.dependencies?.fastify || pkg.devDependencies?.fastify) framework = 'fastify'
      else if (pkg.dependencies?.hono || pkg.devDependencies?.hono) framework = 'hono'
    } catch {
      // Ignore parse errors
    }
  } else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
    language = 'python'
    if (files.includes('manage.py')) framework = 'django'
    else if (files.some((f) => f.includes('flask'))) framework = 'flask'
    else if (files.some((f) => f.includes('fastapi'))) framework = 'fastapi'
  } else if (files.includes('Cargo.toml')) {
    language = 'rust'
  } else if (files.includes('go.mod')) {
    language = 'go'
  } else if (files.includes('pom.xml') || files.includes('build.gradle')) {
    language = 'java'
    if (files.includes('pom.xml')) framework = 'maven'
    else framework = 'gradle'
  } else if (files.includes('composer.json')) {
    language = 'php'
  }

  return { language, framework }
}

function listFilesRecursive(
  dirPath: string,
  maxDepth = 3,
  currentDepth = 0
): Array<{ path: string; type: string; size: number }> {
  if (currentDepth >= maxDepth || !existsSync(dirPath)) return []

  const results: Array<{ path: string; type: string; size: number }> = []
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.cache', 'target']

  try {
    const entries = readdirSync(dirPath)

    for (const entry of entries) {
      if (entry.startsWith('.')) continue
      if (ignoreDirs.includes(entry)) continue

      const fullPath = join(dirPath, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        results.push({ path: fullPath, type: 'directory', size: 0 })
        results.push(...listFilesRecursive(fullPath, maxDepth, currentDepth + 1))
      } else {
        results.push({ path: fullPath, type: 'file', size: stat.size })
      }
    }
  } catch {
    // Skip unreadable entries
  }

  return results
}

projectsRoutes.get('/', async (c) => {
  const user = c.get('user')

  try {
    const userProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.ownerId, user.id))
      .all()

    return c.json({ projects: userProjects })
  } catch (err) {
    return c.json({ error: 'Failed to list projects', details: String(err) }, 500)
  }
})

projectsRoutes.post('/', zValidator('json', createProjectSchema), async (c) => {
  const user = c.get('user')
  const data = c.req.valid('json')

  try {
    let detectedLanguage: string | null = null
    let detectedFramework: string | null = null

    if (data.localPath && existsSync(data.localPath)) {
      const detected = detectLanguageAndFramework(data.localPath)
      detectedLanguage = detected.language
      detectedFramework = detected.framework
    }

    const project = {
      id: nanoid(),
      name: data.name,
      description: data.description || null,
      localPath: data.localPath || null,
      gitUrl: data.gitUrl || null,
      gitBranch: data.gitBranch || 'main',
      detectedLanguage,
      detectedFramework,
      isIndexed: false,
      ownerId: user.id,
    }

    await db.insert(projects).values(project)

    console.log(`[Projects] Created project ${project.id}: ${project.name}`)
    return c.json({ project }, 201)
  } catch (err) {
    return c.json({ error: 'Failed to create project', details: String(err) }, 500)
  }
})

projectsRoutes.get('/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
      .get()

    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }

    return c.json({ project })
  } catch (err) {
    return c.json({ error: 'Failed to get project', details: String(err) }, 500)
  }
})

projectsRoutes.patch('/:id', zValidator('json', updateProjectSchema), async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()
  const data = c.req.valid('json')

  try {
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
      .get()

    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }

    await db
      .update(projects)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(projects.id, id))

    const updated = await db.select().from(projects).where(eq(projects.id, id)).get()
    return c.json({ project: updated })
  } catch (err) {
    return c.json({ error: 'Failed to update project', details: String(err) }, 500)
  }
})

projectsRoutes.delete('/:id', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
      .get()

    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }

    await db.delete(projects).where(eq(projects.id, id))
    return c.json({ message: 'Project deleted' })
  } catch (err) {
    return c.json({ error: 'Failed to delete project', details: String(err) }, 500)
  }
})

projectsRoutes.post('/:id/analyze', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
      .get()

    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }

    if (!project.localPath || !existsSync(project.localPath)) {
      return c.json({ error: 'Project local path not found or not accessible' }, 400)
    }

    const { language, framework } = detectLanguageAndFramework(project.localPath)
    const files = listFilesRecursive(project.localPath, 2)

    await db
      .update(projects)
      .set({
        detectedLanguage: language || project.detectedLanguage,
        detectedFramework: framework || project.detectedFramework,
        isIndexed: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(projects.id, id))

    return c.json({
      analysis: {
        language,
        framework,
        fileCount: files.filter((f) => f.type === 'file').length,
        directoryCount: files.filter((f) => f.type === 'directory').length,
        topLevelFiles: readdirSync(project.localPath).slice(0, 20),
      },
    })
  } catch (err) {
    return c.json({ error: 'Failed to analyze project', details: String(err) }, 500)
  }
})

projectsRoutes.get('/:id/files', async (c) => {
  const user = c.get('user')
  const { id } = c.req.param()

  try {
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.ownerId, user.id)))
      .get()

    if (!project) {
      return c.json({ error: 'Project not found' }, 404)
    }

    if (!project.localPath || !existsSync(project.localPath)) {
      return c.json({ error: 'Project local path not accessible' }, 400)
    }

    const depthStr = c.req.query('depth')
    const depth = depthStr ? parseInt(depthStr) : 3
    const files = listFilesRecursive(project.localPath, depth)

    return c.json({ files, count: files.length })
  } catch (err) {
    return c.json({ error: 'Failed to list files', details: String(err) }, 500)
  }
})

export { projectsRoutes }
