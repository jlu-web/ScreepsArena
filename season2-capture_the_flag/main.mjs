import { getObjectsByPrototype } from 'game/utils';
import { Creep, Flag, StructureTower, StructureContainer } from 'game/prototypes';
import { ATTACK, RANGED_ATTACK, HEAL, CARRY, MOVE, RESOURCE_ENERGY, ERR_NOT_IN_RANGE } from 'game/constants';

export function loop() {
    const myCreeps = getObjectsByPrototype(Creep).filter(c => c.my);
    const enemyCreeps = getObjectsByPrototype(Creep).filter(c => !c.my);
    const enemyFlags = getObjectsByPrototype(Flag).filter(f => !f.my);
    const myTowers = getObjectsByPrototype(StructureTower).filter(t => t.my);
    const containers = getObjectsByPrototype(StructureContainer);

    for (const tower of myTowers) {
        const closeEnemy = tower.findClosestByRange(enemyCreeps);
        const damagedCreep = tower.findClosestByRange(myCreeps.filter(c => c.hits < c.hitsMax));

        if (closeEnemy && tower.store[RESOURCE_ENERGY] > 0) {
            tower.attack(closeEnemy);
        } else if (damagedCreep && tower.store[RESOURCE_ENERGY] > 0) {
            tower.heal(damagedCreep);
        }
    }

    const fighters = myCreeps.filter(c => c.body.some(b => b.type === ATTACK || b.type === RANGED_ATTACK));
    const haulers = myCreeps.filter(c => c.body.some(b => b.type === CARRY) && !fighters.includes(c));

    for (const creep of haulers) {
        const emptyTower = creep.findClosestByPath(
            myTowers.filter(t => t.store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        );

        if (emptyTower) {
            if (creep.store[RESOURCE_ENERGY] > 0) {
                creep.transfer(emptyTower, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(emptyTower);
            } else {
                const source = creep.findClosestByPath(
                    containers.filter(c => c.store[RESOURCE_ENERGY] > 0)
                );
                if (source) {
                    creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE && creep.moveTo(source);
                }
            }
        }
    }

    for (const creep of fighters) {
        const target = creep.findClosestByPath(enemyCreeps);
        
        if (target) {
            const attackType = creep.body.find(b => b.type === ATTACK || b.type === RANGED_ATTACK);
            if (attackType.type === ATTACK) {
                creep.attack(target) === ERR_NOT_IN_RANGE && creep.moveTo(target);
            } else {
                creep.rangedAttack(target) === ERR_NOT_IN_RANGE && creep.moveTo(target);
            }
        } else {
            const flag = creep.findClosestByPath(enemyFlags);
            flag && creep.moveTo(flag);
        }
    }

    const runners = myCreeps.filter(c => !fighters.includes(c) && !haulers.includes(c));
    for (const creep of runners) {
        const flag = creep.findClosestByPath(enemyFlags);
        flag && creep.moveTo(flag);
    }
}