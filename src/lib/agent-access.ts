/** Agents with no creator are global defaults every signed-in user can browse and chat with. */
export function userCanUseAgent(agent: { creatorId: string | null }, userId: string): boolean {
  return agent.creatorId === null || agent.creatorId === userId
}
