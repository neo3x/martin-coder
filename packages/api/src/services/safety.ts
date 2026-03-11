export interface SessionSafetySettings {
  readOnlyMode: boolean
  requireApprovalForCommands: boolean
  writableRoots: string[]
  allowCommandPatterns: string[]
  denyCommandPatterns: string[]
}

export const DEFAULT_SESSION_SAFETY_SETTINGS: SessionSafetySettings = {
  readOnlyMode: false,
  requireApprovalForCommands: true,
  writableRoots: [],
  allowCommandPatterns: [],
  denyCommandPatterns: [
    'rm -rf',
    'sudo',
    'shutdown',
    'reboot',
    'mkfs',
    'dd if=',
    'chmod -R 777 /',
  ],
}

export function parseSessionSafetySettings(
  rawValue: string | null | undefined,
): SessionSafetySettings {
  if (!rawValue) return DEFAULT_SESSION_SAFETY_SETTINGS

  try {
    const parsed = JSON.parse(rawValue) as Partial<SessionSafetySettings>
    return {
      readOnlyMode: parsed.readOnlyMode ?? DEFAULT_SESSION_SAFETY_SETTINGS.readOnlyMode,
      requireApprovalForCommands:
        parsed.requireApprovalForCommands ??
        DEFAULT_SESSION_SAFETY_SETTINGS.requireApprovalForCommands,
      writableRoots: Array.isArray(parsed.writableRoots)
        ? parsed.writableRoots.filter((entry): entry is string => typeof entry === 'string')
        : DEFAULT_SESSION_SAFETY_SETTINGS.writableRoots,
      allowCommandPatterns: Array.isArray(parsed.allowCommandPatterns)
        ? parsed.allowCommandPatterns.filter((entry): entry is string => typeof entry === 'string')
        : DEFAULT_SESSION_SAFETY_SETTINGS.allowCommandPatterns,
      denyCommandPatterns: Array.isArray(parsed.denyCommandPatterns)
        ? parsed.denyCommandPatterns.filter((entry): entry is string => typeof entry === 'string')
        : DEFAULT_SESSION_SAFETY_SETTINGS.denyCommandPatterns,
    }
  } catch {
    return DEFAULT_SESSION_SAFETY_SETTINGS
  }
}
