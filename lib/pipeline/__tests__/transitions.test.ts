// Tests pure-logic des transitions de pipeline.
// Pas de vitest/jest à installer — on s'appuie sur `node:test` + ts-node CJS.
//
// Lancement local :
//   node -e "require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node',esModuleInterop:true}});require('./lib/pipeline/__tests__/transitions.test.ts');"

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canTransitionSession,
  canTransitionProspect,
  nextSessionStage,
  prevSessionStage,
  nextProspectStage,
  prevProspectStage,
} from "../transitions.ts";

// ============ SESSION ============

test("session: admin avance d'une étape", () => {
  assert.deepEqual(
    canTransitionSession("preparation", "convocations", "admin"),
    { ok: true },
  );
});

test("session: admin recule d'une étape", () => {
  assert.deepEqual(
    canTransitionSession("convocations", "preparation", "admin"),
    { ok: true },
  );
});

test("session: saut de 2 étapes interdit", () => {
  const r = canTransitionSession("preparation", "en_cours", "admin");
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /Saut/);
});

test("session: formateur ne peut pas faire avancer", () => {
  const r = canTransitionSession("preparation", "convocations", "formateur");
  assert.equal(r.ok, false);
});

test("session: client ne peut pas faire avancer", () => {
  const r = canTransitionSession("preparation", "convocations", "client");
  assert.equal(r.ok, false);
});

test("session: depuis clos, aucune transition", () => {
  const r = canTransitionSession("clos", "facturation", "admin");
  assert.equal(r.ok, false);
  assert.match(r.reason ?? "", /terminale/);
});

test("session: depuis annulee, aucune transition", () => {
  const r = canTransitionSession("annulee", "preparation", "admin");
  assert.equal(r.ok, false);
});

test("session: annulation autorisée depuis non-terminal", () => {
  for (const from of ["preparation", "convocations", "en_cours", "cloture", "facturation"]) {
    assert.deepEqual(
      canTransitionSession(from, "annulee", "admin"),
      { ok: true },
      `annulation depuis ${from}`,
    );
  }
});

test("session: même étape interdit", () => {
  const r = canTransitionSession("preparation", "preparation", "admin");
  assert.equal(r.ok, false);
});

test("session: nextStage chaîne complète", () => {
  assert.equal(nextSessionStage("preparation"), "convocations");
  assert.equal(nextSessionStage("convocations"), "en_cours");
  assert.equal(nextSessionStage("en_cours"), "cloture");
  assert.equal(nextSessionStage("cloture"), "facturation");
  assert.equal(nextSessionStage("facturation"), "clos");
  assert.equal(nextSessionStage("clos"), null);
  assert.equal(nextSessionStage("annulee"), null);
});

test("session: prevStage chaîne complète", () => {
  assert.equal(prevSessionStage("preparation"), null);
  assert.equal(prevSessionStage("convocations"), "preparation");
  assert.equal(prevSessionStage("clos"), "facturation");
  assert.equal(prevSessionStage("annulee"), null);
});

// ============ PROSPECT ============

test("prospect: admin avance d'une étape", () => {
  assert.deepEqual(
    canTransitionProspect("nouveau", "qualifie", "admin"),
    { ok: true },
  );
});

test("prospect: depuis signe, aucune transition", () => {
  const r = canTransitionProspect("signe", "relance", "admin");
  assert.equal(r.ok, false);
});

test("prospect: perdu accessible depuis nouveau/qualifie/devis_envoye/relance", () => {
  for (const from of ["nouveau", "qualifie", "devis_envoye", "relance"]) {
    assert.deepEqual(
      canTransitionProspect(from, "perdu", "admin"),
      { ok: true },
      `perdu depuis ${from}`,
    );
  }
});

test("prospect: depuis perdu, aucune transition", () => {
  const r = canTransitionProspect("perdu", "nouveau", "admin");
  assert.equal(r.ok, false);
});

test("prospect: saut de 2 étapes interdit", () => {
  const r = canTransitionProspect("nouveau", "devis_envoye", "admin");
  assert.equal(r.ok, false);
});

test("prospect: nextStage chaîne", () => {
  assert.equal(nextProspectStage("nouveau"), "qualifie");
  assert.equal(nextProspectStage("relance"), "signe");
  assert.equal(nextProspectStage("signe"), null);
  assert.equal(nextProspectStage("perdu"), null);
});

test("prospect: prevStage chaîne", () => {
  assert.equal(prevProspectStage("nouveau"), null);
  assert.equal(prevProspectStage("signe"), "relance");
});
