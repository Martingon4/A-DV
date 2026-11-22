import { describe, it, expect } from "vitest";
import { allocate } from "../lib/allocation";
describe("reparto proporcional",()=>{
 const needs=[{id:"a",pending:80},{id:"b",pending:60},{id:"c",pending:40}];
 it("reproduce los ejemplos del plan",()=>{
   expect(allocate(90,needs).map(r=>r.quantity)).toEqual([40,30,20]);
   expect(allocate(120,needs).map(r=>r.quantity)).toEqual([53,40,27]);
 });
 it("conserva inventario y respeta límites para distintos escenarios",()=>{
   for(let stock=0;stock<210;stock++) {
     const rows=allocate(stock,needs);
     expect(rows.reduce((s,r)=>s+r.quantity,0)).toBe(Math.min(stock,180));
     rows.forEach((r,i)=>expect(r.quantity).toBeLessThanOrEqual(needs[i].pending));
   }
 });
 it("resuelve empates de forma estable y maneja ceros",()=>{
   expect(allocate(1,[{id:"b",pending:1},{id:"a",pending:1}]).map(r=>r.quantity)).toEqual([0,1]);
   expect(allocate(0,needs).every(r=>r.quantity===0)).toBe(true);
   expect(allocate(10,[])).toEqual([]);
   expect(allocate(10,[{id:"a",pending:0}])[0].quantity).toBe(0);
 });
 it("rechaza cantidades inválidas",()=>{
   expect(()=>allocate(-1,needs)).toThrow();
   expect(()=>allocate(1,[{id:"a",pending:1.5}])).toThrow();
 });
});
