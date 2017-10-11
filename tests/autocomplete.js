"use strict";

var assert = require('assert');
const rpc = require('vscode-jsonrpc');

var daemon = require('./lsp/daemon');
var notification = require('./lsp/notifications/notification');
var request = require('./lsp/requests/request');

var table = require('./util/table');
var scenarioStore = gauge.dataStore.scenarioStore;
var expectedSteps = [];
var responseType = {
  Function: 3,
  Variable: 4
}

step("open file <filePath> <contents>", async function (filePath, contents) {
  var content = table.tableToArray(contents).join("\n")
  await notification.openFile(
    {
      path: filePath,
      content: content
    }, scenarioStore)
});

step("autocomplete at line <lineNumber> character <characterNumber> should give parameters <expectedResult>", async function (lineNumber, characterNumber, expectedResult, done) {
  expectedParameters = table.tableToArray(expectedResult)
  var position = {
    lineNumber: lineNumber,
    characterNumber: characterNumber
  }
  await request.autocomplete(position, scenarioStore);

  var reader = scenarioStore.get("reader");
  reader.listen(async (data) => await handleParameterResponse(data).catch((e) => done(e)));
  done();
});

step("autocomplete at line <lineNumber> character <characterNumber> should give steps <expectedResult>", async function (lineNumber, characterNumber, expectedResult, done) {
  expectedSteps = table.tableToArray(expectedResult)

  var position = {
    lineNumber: lineNumber,
    characterNumber: characterNumber
  }
  await request.autocomplete(position, scenarioStore);

  var reader = scenarioStore.get("reader");
  reader.listen(async (data) => await handleStepsResponse(data).catch((e) => done(e)));
  done();
});

step("start gauge daemon for project <relativePath>", async function (relativePath) {
  await daemon.startGaugeDaemon(scenarioStore, relativePath);
});

async function handleStepsResponse(responseMessage) {
  if (responseMessage.result) {
    for (var index = 0; index < responseMessage.result.items.length; index++) {
      var item = responseMessage.result.items[index]

      if (item.kind != responseType.Function)
        continue
      assert.equal(item.kind, responseType.Function);
      assert.ok(expectedSteps.indexOf(item.label) > -1, JSON.stringify(item))
    }
  }
}

async function handleParameterResponse(responseMessage) {
  if (responseMessage.result) {
    for (var index = 0; index < responseMessage.result.items.length; index++) {
      var item = responseMessage.result.items[index]
      if (item.kind != responseType.Variable)
        continue
      assert.ok(expectedParameters.indexOf(item.label) > -1, "item label not found " + item.label)
    }
  }
}
