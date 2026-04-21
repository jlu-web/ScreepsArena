import { getObjectsByPrototype, findClosestByRange } from 'game/utils';
import { Creep } from 'game/prototypes';
import { ERR_NOT_IN_RANGE, ATTACK, RANGED_ATTACK, HEAL } from 'game/constants';

export function loop() {
    const myCreeps = getObjectsByPrototype(Creep).filter(creep => creep.my);
    const enemyCreeps = getObjectsByPrototype(Creep).filter(creep => !creep.my);

    for (const creep of myCreeps) {
        if (enemyCreeps.length === 0) {
            continue;
        }

        // Find damaged friendly creeps
        const myDamagedCreeps = myCreeps.filter(c => c.hits < c.hitsMax);

        // Healers heal first
        if (creep.body.some(bodyPart => bodyPart.type === HEAL)) {
            const damagedFriend = findClosestByRange(creep, myDamagedCreeps);

            if (damagedFriend) {
                if (creep.heal(damagedFriend) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(damagedFriend);
                }
                continue;
            }
        }

        // Attackers and ranged attackers target the closest enemy
        const closestEnemy = findClosestByRange(creep, enemyCreeps);

        if (!closestEnemy) {
            continue;
        }

        if (creep.body.some(bodyPart => bodyPart.type === ATTACK)) {
            if (creep.attack(closestEnemy) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closestEnemy);
            }
            continue;
        }

        if (creep.body.some(bodyPart => bodyPart.type === RANGED_ATTACK)) {
            if (creep.rangedAttack(closestEnemy) === ERR_NOT_IN_RANGE) {
                creep.moveTo(closestEnemy);
            }
        }
    }
}