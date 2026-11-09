import{describe,it,expect}from'vitest';
import{decodeTournament,isUuid}from'./repository';
import{makeTournament}from'@/domain/testing';
describe('remote snapshot boundary',()=>{it('decodes valid data without mutating it',()=>{const t=makeTournament();expect(decodeTournament(t)).toEqual(t);});it('rejects partial or cross-slot podiums and skipped matches',()=>{const t=makeTournament();t.matches[0].placements=[1,1,3];expect(()=>decodeTournament(t)).toThrow();t.matches[0].placements=null;t.matches[1].placements=[1,2,3];expect(()=>decodeTournament(t)).toThrow();expect(()=>decodeTournament({})).toThrow();});it('rejects malformed IDs before database lookups',()=>{expect(isUuid('bad')).toBe(false);expect(isUuid('00000000-0000-0000-0000-000000000001')).toBe(true);});});
