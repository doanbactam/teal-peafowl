export function adjustResources(resources, deltas = {}) {
  for (const [resource, delta] of Object.entries(deltas)) {
    if (typeof resources[resource] !== 'number' || typeof delta !== 'number') {
      continue;
    }

    resources[resource] = Math.max(0, resources[resource] + delta);
  }

  return true;
}

export function applyMoodToFaction(creatures, { faction = 0, name, amount = 0, duration = 0 }) {
  let affected = 0;

  for (const creature of creatures) {
    if (creature.alive && creature.type === 'human' && creature.faction === faction && creature.addMoodModifier) {
      creature.addMoodModifier(name, amount, duration);
      affected++;
    }
  }

  return affected > 0;
}
