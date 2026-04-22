import { getObjectsByPrototype } from 'game/utils';
import { Creep, Flag, StructureTower, StructureContainer } from 'game/prototypes';
import { ATTACK, RANGED_ATTACK, CARRY, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';

function isDamaged(creep) {
    return creep.hits < creep.hitsMax;
}

function hasCombatParts(creep) {
    return creep.body.some(b => b.type === ATTACK || b.type === RANGED_ATTACK);
}

function hasCarryParts(creep) {
    return creep.body.some(b => b.type === CARRY);
}

export function loop() {
    const myCreeps = getObjectsByPrototype(Creep).filter(c => c.my);
    const enemyCreeps = getObjectsByPrototype(Creep).filter(c => !c.my);
    const enemyFlags = getObjectsByPrototype(Flag).filter(f => !f.my);
    const myTowers = getObjectsByPrototype(StructureTower).filter(t => t.my);
    const containers = getObjectsByPrototype(StructureContainer);

    // Towers act first
    runTowers(myTowers, enemyCreeps, myCreeps);
    runHaulers(myCreeps, myTowers, containers);
    runSoldiers(myCreeps, enemyCreeps, enemyFlags);
    runScouts(myCreeps, enemyFlags);
}

function runTowers(towers, enemies, allies) {
    // Towers attack before healing
    for (const tower of towers) {
        const closeEnemy = tower.findClosestByRange(enemies);
        const damagedFriend = tower.findClosestByRange(allies.filter(isDamaged));

        // Attack before healing
        if (closeEnemy && tower.store[RESOURCE_ENERGY] > 0) {
            tower.attack(closeEnemy);
        } else if (damagedFriend && tower.store[RESOURCE_ENERGY] > 0) {
            tower.heal(damagedFriend);
        }
    }
}

function runHaulers(creeps, towers, containers) {
    // Keeps soldiers fighting instead of picking up energy
    const haulers = creeps.filter(c => hasCarryParts(c) && !hasCombatParts(c));

    for (const creep of haulers) {
        // Find towers that need energy
        const emptyTower = creep.findClosestByPath(
            towers.filter(t => t.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        );

        if (emptyTower) {
            if (creep.store[RESOURCE_ENERGY] > 0) {
                // Deliver energy
                // Move if not in range
                creep.transfer(emptyTower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(emptyTower);
            } else {
                // Need to pick up energy first
                const source = creep.findClosestByPath(
                    containers.filter(c => c.store[RESOURCE_ENERGY] > 0)
                );
                if (source) {
                    creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(source);
                }
            }
        }
    }
}

function runSoldiers(creeps, enemies, flags) {
    const soldiers = creeps.filter(hasCombatParts);

    for (const creep of soldiers) {
        const target = creep.findClosestByPath(enemies);

        if (target) {
            // Melee vs Range
            const attackPart = creep.body.find(b => b.type === ATTACK || b.type === RANGED_ATTACK);
            if (attackPart.type === ATTACK) {
                creep.attack(target) === ERR_NOT_IN_RANGE && creep.moveTo(target);
            } else {
                creep.rangedAttack(target) === ERR_NOT_IN_RANGE && creep.moveTo(target);
            }
        } else {
            // Go back to flag
            const flag = creep.findClosestByPath(flags);
            flag && creep.moveTo(flag);
        }
    }
}

function runScouts(creeps, flags) {
    // Rush enemy flag
    const scouts = creeps.filter(c => !hasCarryParts(c) && !hasCombatParts(c));

    for (const creep of scouts) {
        const flag = creep.findClosestByPath(flags);
        flag && creep.moveTo(flag);
    }
}
