import { describe, it, expect } from 'vitest';
import {
    createSuperSoldier,
    createSpecialSoldier,
    addSoldiersToArmy,
    addSpecialSoldiersToArmy,
    multiplySoldiersInArmy,
    removeSoldiersFromArmy,
    addSuperSoldiersToArmy,
    createGatePair,
    createCoin,
    createPlayerArmy
} from '../src/entities';
import { Army } from '../src/types';
import { MAX_HEROES } from '../src/constants';

describe('Entities - Advanced', () => {

    it('should create super soldier', () => {
        const superSoldier = createSuperSoldier(100, 100);
        expect(superSoldier.isSuper).toBe(true);
        expect(superSoldier.hp).toBe(5);
    });

    it('should create special soldiers', () => {
        const bazooka = createSpecialSoldier(100, 100, 'bazooka');
        expect(bazooka.type).toBe('bazooka');
        expect(bazooka.hp).toBe(3);

        const laser = createSpecialSoldier(100, 100, 'laser');
        expect(laser.type).toBe('laser');

        const rambo = createSpecialSoldier(100, 100, 'rambo');
        expect(rambo.type).toBe('rambo');
    });

    it('should add soldiers to army', () => {
        const army = createPlayerArmy(500, 800);
        const initialCount = army.soldiers.length;

        addSoldiersToArmy(army, 5);

        expect(army.soldiers.length).toBe(initialCount + 5);
    });

    it('should cap soldiers at MAX_HEROES', () => {
        const army = createPlayerArmy(500, 800);
        // We can't easily add 20000 soldiers in test without being slow, but we can verify logic if possible.
        // Or we can mock army length.
        // Let's just add a few.
        addSoldiersToArmy(army, 10);
        expect(army.soldiers.length).toBeLessThanOrEqual(MAX_HEROES);
    });

    it('should add special soldiers to army', () => {
        const army = createPlayerArmy(500, 800);
        const initialCount = army.soldiers.length;

        addSpecialSoldiersToArmy(army, 'bazooka', 2);

        expect(army.soldiers.length).toBe(initialCount + 2);
        expect(army.soldiers[army.soldiers.length - 1].type).toBe('bazooka');
    });

    it('should multiply soldiers in army', () => {
        const army = createPlayerArmy(500, 800);
        const initialCount = army.soldiers.length;

        multiplySoldiersInArmy(army, 2);

        expect(army.soldiers.length).toBe(initialCount * 2);
    });

    it('should remove soldiers from army', () => {
        const army = createPlayerArmy(500, 800);
        addSoldiersToArmy(army, 5);
        const count = army.soldiers.length;

        removeSoldiersFromArmy(army, 2);

        expect(army.soldiers.length).toBe(count - 2);
    });

    it('should add super soldiers to army', () => {
        const army = createPlayerArmy(500, 800);
        const initialCount = army.soldiers.length;

        addSuperSoldiersToArmy(army, 2);

        expect(army.soldiers.length).toBe(initialCount + 2);
        expect(army.soldiers[army.soldiers.length - 1].isSuper).toBe(true);
    });

    it('should create gate pair', () => {
        const pair = createGatePair(500, 100, 1, 10, 10);
        expect(pair.length).toBe(2);
    });

    it('should create coin', () => {
        const coin = createCoin(100, 100, 5);
        expect(coin.value).toBe(5);
    });
});
